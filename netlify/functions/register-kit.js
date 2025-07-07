// netlify/functions/register-kit.js - Complete optimized version
const { createClient } = require('@supabase/supabase-js');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
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

// Get available kit registrations for user (both regular and legacy)
async function getAvailableKitRegistrations(supabase, user, headers) {
  try {
    log('info', 'Getting available kit registrations for user', { userId: user.id });

    // Get both regular and legacy kits in parallel
    const [regularResult, legacyResult] = await Promise.allSettled([
      // Regular kit registrations
      supabase
        .from('kit_registrations')
        .select(`
          kit_registration_id,
          display_id,
          order_item_id,
          sample_date,
          sample_description,
          person_taking_sample,
          registration_status,
          order_items!inner (
            order_item_id,
            product_name,
            quantity,
            order_id,
            orders!inner (
              order_number,
              created_at
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      
      // Legacy kit registrations
      supabase
        .from('legacy_kit_registrations')
        .select(`
          id,
          display_id,
          kit_code,
          registration_status,
          sample_date,
          sample_description,
          person_taking_sample,
          created_at,
          test_kits!inner (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ]);

    // Handle results
    const regularKits = regularResult.status === 'fulfilled' ? regularResult.value.data || [] : [];
    const legacyKits = legacyResult.status === 'fulfilled' ? legacyResult.value.data || [] : [];

    if (regularResult.status === 'rejected') {
      log('warn', 'Failed to load regular kits', { error: regularResult.reason });
    }
    if (legacyResult.status === 'rejected') {
      log('warn', 'Failed to load legacy kits', { error: legacyResult.reason });
    }

    // Format kits using a unified formatter
    const formattedRegularKits = regularKits.map(kit => formatKit(kit, 'regular'));
    const formattedLegacyKits = legacyKits.map(kit => formatKit(kit, 'legacy'));

    // Combine and sort by date
    const allKits = [...formattedRegularKits, ...formattedLegacyKits]
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        kits: allKits
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
    is_registered: kit.registration_status === 'registered',
    registration_status: kit.registration_status,
    source
  };

  if (source === 'legacy') {
    return {
      ...baseFormat,
      product_name: kit.test_kits.name,
      order_number: `LEGACY-${kit.kit_code}`,
      order_date: kit.created_at
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
    const kitInfo = await determineKitType(supabase, registrationData.kit_registration_id, user.id);
    if (kitInfo.error) {
      return createErrorResponse(404, kitInfo.error, headers);
    }

    // Check if already registered
    const registrationCheck = checkIfAlreadyRegistered(kitInfo);
    if (registrationCheck.error) {
      return createErrorResponse(400, registrationCheck.error, headers);
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
          registration_status: 'registered',
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

// Determine if kit is legacy or regular and fetch kit data
async function determineKitType(supabase, kitRegistrationId, userId) {
  // Try legacy first
  const { data: legacyKit, error: legacyError } = await supabase
    .from('legacy_kit_registrations')
    .select(`
      id, kit_code, display_id, registration_status, sample_date, 
      person_taking_sample, test_kits (name, description)
    `)
    .eq('id', kitRegistrationId)
    .eq('user_id', userId)
    .single();

  if (!legacyError && legacyKit) {
    return { source: 'legacy', kit: legacyKit };
  }

  // Try regular kit
  const { data: regularKit, error: regularError } = await supabase
    .from('kit_registrations')
    .select(`
      kit_registration_id, display_id, registration_status, sample_date, 
      person_taking_sample, order_items!inner (
        product_name, orders!inner (order_number, shipping_address)
      )
    `)
    .eq('kit_registration_id', kitRegistrationId)
    .eq('user_id', userId)
    .single();

  if (!regularError && regularKit) {
    return { source: 'regular', kit: regularKit };
  }

  return { error: 'Kit registration not found or access denied' };
}

// Check if kit is already registered
function checkIfAlreadyRegistered(kitInfo) {
  const { kit } = kitInfo;
  
  if (kit.registration_status === 'registered' || 
      (kit.sample_date && kit.person_taking_sample)) {
    return { 
      error: `This ${kitInfo.source === 'legacy' ? 'legacy kit' : 'kit'} has already been registered` 
    };
  }
  
  return { success: true };
}

// Process the actual kit registration
async function processKitRegistration(supabase, user, registrationData, kitInfo, requestId) {
  const { source, kit } = kitInfo;
  
  // Prepare update data (same structure for both types)
  const updateData = {
    sample_date: registrationData.sample_date,
    sample_time: registrationData.sample_time,
    sample_description: registrationData.sample_description || null,
    number_of_containers: registrationData.number_of_containers || 1,
    person_taking_sample: registrationData.person_taking_sample,
    location_name: registrationData.location_name || null,
    address: registrationData.address || null,
    city: registrationData.city || null,
    province: registrationData.province || null,
    postal_code: registrationData.postal_code || null,
    country: registrationData.country || 'Canada',
    registration_status: 'registered',
    updated_at: new Date().toISOString()
  };

  // Add registered_at for legacy kits
  if (source === 'legacy') {
    updateData.registered_at = new Date().toISOString();
  }

  // Update the appropriate table
  const tableName = source === 'legacy' ? 'legacy_kit_registrations' : 'kit_registrations';
  const idField = source === 'legacy' ? 'id' : 'kit_registration_id';
  const kitId = source === 'legacy' ? kit.id : kit.kit_registration_id;

  const { data: updatedKit, error: updateError } = await supabase
    .from(tableName)
    .update(updateData)
    .eq(idField, kitId)
    .eq('user_id', user.id)
    .select(source === 'legacy' ? '*, test_kits (name, description)' : '*')
    .single();

  if (updateError) {
    throw updateError;
  }

  log('info', `${source} kit registered successfully`, { 
    kitId: kitId,
    displayId: updatedKit.display_id || (source === 'legacy' ? updatedKit.kit_code : null),
    registrationStatus: updatedKit.registration_status,
    requestId
  });

  // Send email notifications
  await sendKitRegistrationEmails(supabase, updatedKit, kitInfo, user, requestId);

  return {
    kit_registration_id: kitId,
    display_id: updatedKit.display_id || (source === 'legacy' ? updatedKit.kit_code : null)
  };
}

// Unified email sending function
async function sendKitRegistrationEmails(supabase, updatedKit, kitInfo, user, requestId) {
  if (!process.env.VITE_LOOPS_API_KEY) {
    log('warn', '⚠️ Loops API key not configured, skipping email notifications');
    return;
  }

  try {
    const { source } = kitInfo;
    let orderInfo, shippingAddress;

    if (source === 'legacy') {
      // Create order info for legacy kit
      orderInfo = {
        product_name: updatedKit.test_kits.name,
        order_number: `LEGACY-${updatedKit.kit_code}`,
        customer_email: user.email
      };
      
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
            product_name,
            orders!inner (order_number, shipping_address)
          )
        `)
        .eq('kit_registration_id', updatedKit.kit_registration_id)
        .single();

      if (orderError) {
        log('warn', 'Could not fetch order data for email notification', { 
          error: orderError.message, requestId 
        });
        return;
      }

      orderInfo = {
        product_name: orderData.order_items.product_name,
        order_number: orderData.order_items.orders.order_number,
        customer_email: user.email
      };
      
      shippingAddress = orderData.order_items.orders.shipping_address;
    }

    // Send both admin and customer emails
    const emailPromises = [
      sendKitRegistrationEmail(updatedKit, orderInfo, shippingAddress, 'admin', source, requestId),
      sendKitRegistrationEmail(updatedKit, orderInfo, shippingAddress, 'customer', source, requestId)
    ];

    const emailResults = await Promise.allSettled(emailPromises);
    
    emailResults.forEach((result, index) => {
      const emailType = index === 0 ? 'admin' : 'customer';
      
      if (result.status === 'fulfilled' && result.value.success) {
        log('info', `✅ ${emailType} ${source} kit registration notification sent successfully`);
      } else {
        log('warn', `⚠️ ${emailType} ${source} kit registration notification failed (non-critical)`);
      }
    });

  } catch (emailError) {
    log('error', '❌ Email notification process failed', { 
      error: emailError.message, requestId
    });
  }
}

// Unified email sending function for both kit types
async function sendKitRegistrationEmail(kitData, orderInfo, shippingAddress, emailType, source, requestId) {
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
      new Date(`1970-01-01T${kitData.sample_time}`).toLocaleTimeString('en-CA', {
        hour: '2-digit', minute: '2-digit', hour12: true
      }) : 'Not specified';

    // Email data
    const emailData = {
      transactionalId: config.transactionalId,
      email: config.email,
      dataVariables: {
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        kitDisplayID: kitData.display_id || (source === 'legacy' ? kitData.kit_code : ''),
        testKitName: orderInfo.product_name || 'Test Kit',
        orderNumber: orderInfo.order_number,
        sampleDate,
        sampleTime,
        numContainers: (kitData.number_of_containers || 1).toString(),
        sampler: kitData.person_taking_sample,
        SampleDescription: kitData.sample_description || 'No description provided',
        locationName: kitData.location_name || 'Not specified',
        address: kitData.address || 'Not provided',
        city: kitData.city || 'Not provided',
        province: kitData.province || 'Not provided',
        postalCode: kitData.postal_code || 'Not provided',
        country: kitData.country || 'Canada'
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
  
  if (data.number_of_containers && data.number_of_containers < 1) {
    errors.push('number_of_containers must be at least 1');
  }
  
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