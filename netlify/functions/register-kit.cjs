// netlify/functions/register-kit.js - Complete optimized version with status field
const { createClient } = require('@supabase/supabase-js');
const { processChainOfCustody } = require('./utils/chainOfCustodyProcessor');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Helper function to format time to 24-hour format
function formatTimeTo24Hour(timeString) {
  if (!timeString) return 'Not specified';
  
  try {
    // If already in 24-hour format, just clean it up
    if (timeString.includes(':')) {
      const timeParts = timeString.split(':');
      let hours = parseInt(timeParts[0]);
      const minutes = timeParts[1] ? timeParts[1].replace(/[^\d]/g, '') : '00';
      
      // Check for AM/PM
      const lowerTime = timeString.toLowerCase();
      const isAM = lowerTime.includes('am');
      const isPM = lowerTime.includes('pm');
      
      // Convert to 24-hour format
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (isAM && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // Environment validation
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }

    const user = userData.user;

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      return await getAvailableKitRegistrations(supabase, user, headers);
    } else if (event.httpMethod === 'POST') {
      return await registerKit(supabase, user, event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    log('error', 'Unexpected function error', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Get available kit registrations for user (simplified with view)
async function getAvailableKitRegistrations(supabase, user, headers) {
  try {
    log('info', 'Getting available kit registrations for user', { userId: user.id });

    // Use the customer view for simplified querying
    const { data: kits, error } = await supabase
      .from('vw_customer_kit_registration')
      .select('*')
      .eq('user_id', user.id)
      .order('order_created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format kits using a unified formatter
    const formattedKits = (kits || []).map(kit => ({
      kit_registration_id: kit.kit_id,
      display_id: kit.display_id,
      is_registered: kit.registration_status === 'registered',
      status: kit.status,
      source: kit.kit_type,
      product_name: kit.test_kit_name,
      order_number: kit.order_number,
      order_date: kit.order_created_at,
      claimed_at: kit.claimed_at,
      is_claimed: kit.is_claimed
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        kits: formattedKits
      })
    };

  } catch (error) {
    log('error', 'Error getting kit registrations', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get kit registrations',
        message: error.message
      })
    };
  }
}

// Unified kit formatter
function formatKit(kit, source) {
  const baseFormat = {
    kit_registration_id: source === 'legacy' ? kit.id : kit.kit_registration_id,
    display_id: source === 'legacy' ? (kit.display_id || kit.kit_code) : kit.display_id,
    is_registered: !['confirmed', 'en_route_to_customer', 'delivered_awaiting_registration'].includes(kit.status),
    status: kit.status,
    source
  };

  if (source === 'legacy') {
    return {
      ...baseFormat,
      product_name: kit.test_kits.name,
      order_number: `LEGACY-${kit.kit_code}`,
      order_date: kit.claimed_at || kit.created_at,  // Use claimed_at if available
      claimed_at: kit.claimed_at,
      is_claimed: kit.is_claimed
    };
  } else {
    return {
      ...baseFormat,
      product_name: kit.order_items.product_name,
      order_number: kit.order_items.orders.order_number,
      order_date: kit.order_items.orders.created_at
    };
  }
}

// Main registration function that routes to appropriate handler
async function registerKit(supabase, user, event, headers) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  
  try {
    // Parse and validate request
    const registrationData = parseAndValidateRequest(event.body);
    if (registrationData.error) {
      return createErrorResponse(400, registrationData.error, headers);
    }

    log('info', 'Registering kit', { 
      userId: user.id, 
      kitRegistrationId: registrationData.kit_registration_id,
      requestId
    });

    // Determine kit type and get kit data
    const isAdminRegistration = registrationData.is_admin_registration || false;
    const kitInfo = await determineKitType(supabase, registrationData.kit_registration_id, user.id, isAdminRegistration);
    if (kitInfo.error) {
      return createErrorResponse(404, kitInfo.error, headers);
    }

    // Register the kit
    const result = await processKitRegistration(
      supabase, 
      user, 
      registrationData, 
      kitInfo, 
      requestId
    );

    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        kit_registration: {
          kit_registration_id: result.kit_registration_id,
          display_id: result.display_id,
          status: 'registered',
          source: kitInfo.source
        },
        message: `${kitInfo.source === 'legacy' ? 'Legacy kit' : 'Kit'} registered successfully`,
        processing_time_ms: processingTime,
        request_id: requestId
      })
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('error', 'Error registering kit', { 
      error: error.message,
      requestId,
      processingTime
    });
    
    return createErrorResponse(500, 'Failed to register kit', headers, {
      message: error.message,
      request_id: requestId,
      processing_time_ms: processingTime
    });
  }
}

// Parse and validate request data
function parseAndValidateRequest(body) {
  try {
    const registrationData = JSON.parse(body);
    const validation = validateRegistrationData(registrationData);
    
    if (!validation.isValid) {
      return { 
        error: 'Validation failed', 
        details: validation.errors 
      };
    }
    
    return registrationData;
  } catch (parseError) {
    return { error: 'Invalid JSON in request body' };
  }
}

// Determine if kit is legacy or regular and fetch kit data - CORRECTED VERSION
async function determineKitType(supabase, kitRegistrationId, userId, isAdminRegistration = false) {
  // For admin registrations, get kit data without user constraint first
  if (isAdminRegistration) {
    const { data: kit, error } = await supabase
      .from('vw_test_kits_admin')
      .select('*')
      .eq('kit_id', kitRegistrationId)
      .eq('registration_status', 'unregistered')
      .single();

    if (error || !kit) {
      return { error: 'Kit registration not found or not available for admin registration' };
    }

    return { 
      source: kit.kit_type, 
      kit: transformAdminViewToKitFormat(kit),
      customerUserId: kit.user_id // Return the customer's user ID
    };
  }

  // For customer registrations, use the customer view with user constraint
  const { data: kit, error } = await supabase
    .from('vw_customer_kit_registration')
    .select('*')
    .eq('kit_id', kitRegistrationId)
    .eq('user_id', userId)
    .eq('registration_status', 'unregistered')
    .single();

  if (error || !kit) {
    return { error: 'Kit registration not found, access denied, or already registered' };
  }

  return { 
    source: kit.kit_type, 
    kit: transformCustomerViewToKitFormat(kit),
    customerUserId: userId // For customer registrations, it's the same as userId
  };
}

// Helper function to transform admin view data to expected kit format
function transformAdminViewToKitFormat(adminKit) {
  if (adminKit.kit_type === 'legacy') {
    return {
      id: adminKit.kit_id,
      kit_code: adminKit.kit_code,
      display_id: adminKit.kit_code,
      status: adminKit.kit_status,
      sample_date: adminKit.sample_date,
      person_taking_sample: adminKit.person_taking_sample,
      waybill_reference_number: adminKit.waybill_reference_number,
      test_kits: { 
        name: adminKit.test_kit_name, 
        description: adminKit.test_kit_description 
      }
    };
  } else {
    return {
      kit_registration_id: adminKit.kit_id,
      display_id: adminKit.kit_code,
      status: adminKit.kit_status,
      sample_date: adminKit.sample_date,
      person_taking_sample: adminKit.person_taking_sample,
      waybill_reference_number: adminKit.waybill_reference_number,
      order_items: {
        product_name: adminKit.test_kit_name,
        orders: { 
          order_number: adminKit.order_number,
          shipping_address: {
            firstName: adminKit.customer_first_name,
            lastName: adminKit.customer_last_name
          }
        }
      }
    };
  }
}

// Helper function to transform customer view data to expected kit format
function transformCustomerViewToKitFormat(customerKit) {
  if (customerKit.kit_type === 'legacy') {
    return {
      id: customerKit.kit_id,
      kit_code: customerKit.display_id,
      display_id: customerKit.display_id,
      status: customerKit.status,
      sample_date: customerKit.sample_date,
      person_taking_sample: customerKit.person_taking_sample,
      is_claimed: customerKit.is_claimed,
      claimed_at: customerKit.claimed_at,
      waybill_reference_number: customerKit.waybill_reference_number,
      test_kits: { 
        name: customerKit.test_kit_name, 
        description: customerKit.test_kit_description 
      }
    };
  } else {
    return {
      kit_registration_id: customerKit.kit_id,
      display_id: customerKit.display_id,
      status: customerKit.status,
      sample_date: customerKit.sample_date,
      person_taking_sample: customerKit.person_taking_sample,
      waybill_reference_number: customerKit.waybill_reference_number,
      order_items: {
        product_name: customerKit.test_kit_name,
        orders: { 
          order_number: customerKit.order_number,
          shipping_address: customerKit.shipping_address
        }
      }
    };
  }
}

// Process the actual kit registration
// Updated processKitRegistration to use correct user ID
async function processKitRegistration(supabase, user, registrationData, kitInfo, requestId) {
  const { source, kit, customerUserId } = kitInfo;
  const isAdminRegistration = registrationData.is_admin_registration || false;
  
  // Use customerUserId for the database update, not the admin's user ID
  const userIdForUpdate = customerUserId || user.id;
  
  // Prepare update data (same structure for both types)
  const updateData = {
    sample_date: registrationData.sample_date,
    sample_time: registrationData.sample_time,
    sample_description: registrationData.sample_description || null,
    person_taking_sample: registrationData.person_taking_sample,
    location_name: registrationData.location_name || null,
    address: registrationData.address || null,
    city: registrationData.city || null,
    province: registrationData.province || null,
    postal_code: registrationData.postal_code || null,
    country: registrationData.country || 'Canada',
    status: 'registered',
    registration_status: 'registered',
    updated_at: new Date().toISOString()
  };

  // Add registered_at for legacy kits
  if (source === 'legacy') {
    updateData.registered_at = new Date().toISOString();
  }

  // Update the appropriate table using the customer's user ID
  const tableName = source === 'legacy' ? 'legacy_kit_registrations' : 'kit_registrations';
  const idField = source === 'legacy' ? 'id' : 'kit_registration_id';
  const kitId = source === 'legacy' ? kit.id : kit.kit_registration_id;

  const { data: updatedKit, error: updateError } = await supabase
    .from(tableName)
    .update(updateData)
    .eq(idField, kitId)
    .eq('user_id', userIdForUpdate) // Use customer's user ID
    .select(source === 'legacy' ? '*, test_kits (name, description)' : '*')
    .single();

  if (updateError) {
    throw updateError;
  }

  log('info', `${source} kit registered successfully`, { 
    kitId: kitId,
    displayId: updatedKit.display_id || (source === 'legacy' ? updatedKit.kit_code : null),
    status: updatedKit.status,
    registeredBy: isAdminRegistration ? 'admin' : 'customer',
    customerUserId: userIdForUpdate,
    requestId
  });

  // Get customer info for Chain of Custody and emails
  let customerInfo;
  if (isAdminRegistration) {
    // For admin registrations, get customer info from the kit data
    if (source === 'legacy') {
      customerInfo = {
        email: user.email, // We'll need to get customer email from kit data
        user_metadata: { firstName: 'Customer', lastName: '' }
      };
    } else {
      // Get customer info from shipping address or user profile
      customerInfo = {
        email: user.email, // This should be the customer's email from kit data
        user_metadata: { 
          firstName: kit.order_items?.orders?.shipping_address?.firstName || 'Customer',
          lastName: kit.order_items?.orders?.shipping_address?.lastName || ''
        }
      };
    }
  } else {
    customerInfo = user;
  }

  // Get order info for Chain of Custody processing
  let orderInfo;
  if (source === 'legacy') {
    orderInfo = {
      product_name: updatedKit.test_kits.name,
      order_number: `LEGACY-${updatedKit.kit_code}`,
      customer_email: customerInfo.email
    };
  } else {
    // Get order data for regular kit
    const { data: orderData, error: orderError } = await supabase
      .from('kit_registrations')
      .select(`
        order_items!inner (
          product_name,
          orders!inner (order_number)
        )
      `)
      .eq('kit_registration_id', updatedKit.kit_registration_id)
      .single();

    if (orderError) {
      log('error', 'Could not fetch order data for Chain of Custody', { 
        error: orderError.message, requestId 
      });
      throw new Error('Failed to get order information for Chain of Custody processing');
    }

    orderInfo = {
      product_name: orderData.order_items.product_name,
      order_number: orderData.order_items.orders.order_number,
      customer_email: customerInfo.email
    };
  }

  // Process Chain of Custody
  log('info', 'Processing Chain of Custody', { requestId });
  const cocResult = await processChainOfCustody(supabase, updatedKit, orderInfo, requestId);

  if (!cocResult.success) {
    log('error', 'Chain of Custody processing failed', { 
      error: cocResult.error, requestId 
    });
  } else {
    // Save CoC URL to database
    try {
      const { error: updateCocError } = await supabase
        .from(tableName)
        .update({ 
          chain_of_custody_url: cocResult.fileUrl,
          updated_at: new Date().toISOString()
        })
        .eq(idField, kitId)
        .eq('user_id', userIdForUpdate);

      if (updateCocError) {
        log('warn', 'Failed to update Chain of Custody URL in database', { 
          error: updateCocError.message, requestId 
        });
      } else {
        log('info', 'Chain of Custody URL saved to database', { 
          kitId, fileUrl: cocResult.fileUrl, requestId 
        });
      }
    } catch (updateError) {
      log('warn', 'Exception updating Chain of Custody URL', { 
        error: updateError.message, requestId 
      });
    }
  }

  // Send email notifications with Chain of Custody
  await sendKitRegistrationEmails(supabase, updatedKit, kitInfo, customerInfo, orderInfo, cocResult, requestId);

  return {
    kit_registration_id: kitId,
    display_id: updatedKit.display_id || (source === 'legacy' ? updatedKit.kit_code : null),
    chainOfCustody: cocResult
  };
}

// Unified email sending function
async function sendKitRegistrationEmails(supabase, updatedKit, kitInfo, user, orderInfo, cocResult, requestId) {
  if (!process.env.VITE_LOOPS_API_KEY) {
    log('warn', '⚠️ Loops API key not configured, skipping email notifications');
    return;
  }

  try {
    const { source } = kitInfo;
    let shippingAddress;

    if (source === 'legacy') {
      // Create shipping address from legacy kit data
      const nameParts = updatedKit.person_taking_sample?.split(' ') || [];
      shippingAddress = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
      };
    } else {
      // Get order data for regular kit
      const { data: orderData, error: orderError } = await supabase
        .from('kit_registrations')
        .select(`
          order_items!inner (
            orders!inner (shipping_address)
          )
        `)
        .eq('kit_registration_id', updatedKit.kit_registration_id)
        .single();

      if (orderError) {
        log('warn', 'Could not fetch shipping address for email notification', { 
          error: orderError.message, requestId 
        });
        shippingAddress = {
          firstName: updatedKit.person_taking_sample?.split(' ')[0] || '',
          lastName: updatedKit.person_taking_sample?.split(' ').slice(1).join(' ') || ''
        };
      } else {
        shippingAddress = orderData.order_items.orders.shipping_address;
      }
    }

    // Send customer confirmation email
    const customerEmailPromise = sendKitRegistrationEmail(
      updatedKit, 
      orderInfo, 
      shippingAddress, 
      'customer', 
      source, 
      null, // No CoC attachment for customer
      requestId
    );

    // Send lab notification email with Chain of Custody attachment (CC'd to admin)
    const labEmailPromise = sendLabNotificationEmail(
      supabase,
      updatedKit, 
      orderInfo, 
      shippingAddress, 
      cocResult, 
      source, 
      requestId
    );

    // Send separate admin notification email with CoC status info
    const adminEmailPromise = sendKitRegistrationEmail(
      updatedKit, 
      orderInfo, 
      shippingAddress, 
      'admin', 
      source, 
      cocResult, // Include CoC info for admin
      requestId
    );

    const emailResults = await Promise.allSettled([customerEmailPromise, labEmailPromise, adminEmailPromise]);
    
    emailResults.forEach((result, index) => {
      const emailType = ['customer', 'lab', 'admin'][index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        log('info', `✅ ${emailType} ${source} kit registration notification sent successfully`);
      } else {
        log('warn', `⚠️ ${emailType} ${source} kit registration notification failed`, {
          error: result.reason || result.value?.error
        });
      }
    });

  } catch (emailError) {
    log('error', '❌ Email notification process failed', { 
      error: emailError.message, requestId
    });
  }
}

// Lab notification emails with CoC
// Complete sendLabNotificationEmail function using existing Supabase client
async function sendLabNotificationEmail(supabase, kitData, orderInfo, shippingAddress, cocResult, source, requestId) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    // Lab email configuration
    const labEmail = 'customer.service@testmark.ca'; // Placeholder lab email
    const transactionalId = 'cmd3gjdkx24n40o0i7zkv95it';

    // Format sample date and time to match your template expectation
    const sampleDate = new Date(kitData.sample_date).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const sampleTime = kitData.sample_time ? 
      formatTimeTo24Hour(kitData.sample_time) : 'Not specified';

    // Email data for lab notification - exact format match
    const emailData = {
      transactionalId: transactionalId,
      email: labEmail,
      dataVariables: {
        kitDisplayID: kitData.display_id || kitData.kit_code || '',
        sampler: kitData.person_taking_sample || 'Not specified',
        sampleDate: sampleDate,
        sampleTime: sampleTime,
        sampleDescription: kitData.sample_description || 'No description provided',
        waybillReference: kitData.waybill_reference_number || 'Not provided'
      }
    };

    // Add attachment if Chain of Custody was generated successfully
    if (cocResult.success && cocResult.filename) {
      try {
        // Use the existing Supabase client
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('generated-chain-of-custody')
          .download(cocResult.filename);
        
        if (downloadError) {
          throw new Error(`Supabase download error: ${downloadError.message}`);
        }
        
        if (!fileData) {
          throw new Error('No file data received from Supabase');
        }
        
        // Convert file to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        emailData.attachments = [{
          filename: cocResult.filename,
          data: base64Data,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }];
        
        console.log(`[${requestId}] Attachment prepared: ${cocResult.filename} (${Math.round(base64Data.length / 1024)}KB)`);
      } catch (attachmentError) {
        console.error(`[${requestId}] Failed to prepare attachment:`, attachmentError);
        // Continue without attachment rather than failing the entire email
      }
    }

    // Log the email data for debugging (without attachment data for brevity)
    const logData = { ...emailData };
    if (logData.attachments) {
      logData.attachments = logData.attachments.map(att => ({ 
        filename: att.filename, 
        size: `${Math.round(att.data.length / 1024)}KB` 
      }));
    }
    console.log(`[${requestId}] Lab email data:`, JSON.stringify(logData, null, 2));

    // Send email
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[${requestId}] Loops API response status:`, response.status);
      console.log(`[${requestId}] Loops API response text:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.log(`[${requestId}] Loops API error data:`, errorData);
      } catch (e) {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      throw new Error(`Loops API Error ${response.status}: ${errorData.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    console.log(`[${requestId}] Lab email sent successfully:`, responseData);

    return { success: true, emailType: 'lab', recipient: labEmail };

  } catch (error) {
    console.error(`[${requestId}] Lab email error:`, error);
    return { success: false, error: error.message, emailType: 'lab' };
  }
}

// Unified email sending function for both kit types
async function sendKitRegistrationEmail(kitData, orderInfo, shippingAddress, emailType, source, cocResult, requestId) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    // Email configuration
    const emailConfig = {
      admin: {
        transactionalId: 'cmcb0nosp16ha110iygtfk839',
        email: 'orders@mywaterquality.ca',
        description: 'admin notification'
      },
      customer: {
        transactionalId: 'cmcb295hs1tgsvy0induc3kka',
        email: orderInfo.customer_email,
        description: 'customer confirmation'
      }
    };

    const config = emailConfig[emailType];
    if (!config?.email) {
      throw new Error(`No email address available for ${emailType} notification`);
    }

    // Format sample date and time
    const sampleDate = new Date(kitData.sample_date).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const sampleTime = kitData.sample_time ? 
      formatTimeTo24Hour(kitData.sample_time) : 'Not specified';

    // Email data
    const emailData = {
      transactionalId: config.transactionalId,
      email: config.email,
      dataVariables: {
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        kitDisplayID: kitData.display_id || kitData.kit_code || '',
        testKitName: orderInfo.product_name || 'Test Kit',
        orderNumber: orderInfo.order_number,
        sampleDate: sampleDate,
        sampleTime: sampleTime,
        sampler: kitData.person_taking_sample,
        SampleDescription: kitData.sample_description || 'No description provided',
        locationName: kitData.location_name || 'Not specified',
        address: kitData.address || 'Not provided',
        city: kitData.city || 'Not provided',
        province: kitData.province || 'Not provided',
        postalCode: kitData.postal_code || 'Not provided',
        country: kitData.country || 'Canada',
        waybillReference: kitData.waybill_reference_number || 'Not provided'
      }
    };

    // Send email
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      throw new Error(`Loops API Error ${response.status}: ${errorData.message}`);
    }

    return { success: true, emailType, recipient: emailData.email };

  } catch (error) {
    return { success: false, error: error.message, emailType };
  }
}

// Validation function
function validateRegistrationData(data) {
  const errors = [];

  if (!data.kit_registration_id) errors.push('kit_registration_id is required');
  if (!data.sample_date) errors.push('sample_date is required');
  if (!data.sample_time) errors.push('sample_time is required');
  if (!data.person_taking_sample) errors.push('person_taking_sample is required');
  
  if (data.sample_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.sample_date)) {
    errors.push('sample_date must be in YYYY-MM-DD format');
  }
  
  if (data.sample_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(data.sample_time)) {
    errors.push('sample_time must be in HH:MM or HH:MM:SS format');
  }
  
  if (data.postal_code && data.postal_code.trim() && 
      !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.postal_code.trim())) {
    errors.push('postal_code must be a valid Canadian postal code format');
  }

  return { isValid: errors.length === 0, errors };
}

// Helper function to create error responses
function createErrorResponse(statusCode, error, headers, additionalData = {}) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({ 
      error,
      ...additionalData
    })
  };
}