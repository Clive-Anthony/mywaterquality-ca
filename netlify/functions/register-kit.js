// netlify/functions/register-kit.js - Kit registration API
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
        body: JSON.stringify({ 
          error: 'Server configuration error'
        })
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
        body: JSON.stringify({ 
          error: 'Authorization required'
        })
      };
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed'
        })
      };
    }

    const user = userData.user;

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      // Get available kit registrations for user
      return await getAvailableKitRegistrations(supabase, user, headers);
    } else if (event.httpMethod === 'POST') {
      // Register a kit
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

// Get available kit registrations for user
async function getAvailableKitRegistrations(supabase, user, headers) {
  try {
    log('info', 'Getting available kit registrations for user', { userId: user.id });

    // Get kit registrations that haven't been filled out yet
    const { data: kitRegistrations, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by order items and mark which are available for registration
    const availableKits = kitRegistrations.map(kit => ({
      kit_registration_id: kit.kit_registration_id,
      display_id: kit.display_id,
      product_name: kit.order_items.product_name,
      order_number: kit.order_items.orders.order_number,
      order_date: kit.order_items.orders.created_at,
      is_registered: !!(kit.sample_date && kit.person_taking_sample),
      registration_status: kit.registration_status
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        kits: availableKits
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

// Register a kit with sample and location information
async function registerKit(supabase, user, event, headers) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 8);
    
    try {
      // Parse request body
      let registrationData;
      try {
        registrationData = JSON.parse(event.body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body'
          })
        };
      }
  
      // Validate required fields
      const validation = validateRegistrationData(registrationData);
      if (!validation.isValid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Validation failed',
            details: validation.errors
          })
        };
      }
  
      log('info', 'Registering kit', { 
        userId: user.id, 
        kitRegistrationId: registrationData.kit_registration_id,
        requestId: requestId
      });
  
      // Verify the kit registration belongs to the user and is not already registered
      const { data: existingKit, error: verifyError } = await supabase
        .from('kit_registrations')
        .select('kit_registration_id, sample_date, person_taking_sample')
        .eq('kit_registration_id', registrationData.kit_registration_id)
        .eq('user_id', user.id)
        .single();
  
      if (verifyError || !existingKit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Kit registration not found or access denied'
          })
        };
      }
  
      // Check if already registered
      if (existingKit.sample_date && existingKit.person_taking_sample) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'This kit has already been registered'
          })
        };
      }
  
      // Update the kit registration with sample and location data
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
  
      const { data: updatedKit, error: updateError } = await supabase
        .from('kit_registrations')
        .update(updateData)
        .eq('kit_registration_id', registrationData.kit_registration_id)
        .eq('user_id', user.id)
        .select()
        .single();
  
      if (updateError) {
        throw updateError;
      }
  
      log('info', 'Kit registered successfully', { 
        kitRegistrationId: updatedKit.kit_registration_id,
        displayId: updatedKit.display_id,
        requestId: requestId
      });
  
      // FIXED: Send admin email notifications with proper error handling and await
      log('info', `📧 Starting email notifications [${requestId}]`);
      
      if (process.env.VITE_LOOPS_API_KEY) {
        try {
          // Get additional order data for email
          log('info', `📧 Fetching order data for email notification [${requestId}]`);
          
          const { data: orderData, error: orderError } = await supabase
            .from('kit_registrations')
            .select(`
              *,
              order_items!inner (
                product_name,
                orders!inner (
                  order_number,
                  shipping_address
                )
              )
            `)
            .eq('kit_registration_id', updatedKit.kit_registration_id)
            .single();
  
          if (orderError) {
            log('warn', 'Could not fetch order data for email notification', { 
              error: orderError.message,
              requestId: requestId 
            });
          } else {
            // Send admin notification email
            log('info', `📧 Sending admin kit registration notification [${requestId}]`);
            
            const adminEmailResult = await sendAdminKitRegistrationEmailDirect(
              updatedKit,
              {
                product_name: orderData.order_items.product_name,
                order_number: orderData.order_items.orders.order_number
              },
              orderData.order_items.orders.shipping_address,
              requestId
            );
            
            if (adminEmailResult.success) {
              log('info', '✅ Admin kit registration notification sent successfully');
            } else {
              log('warn', '⚠️ Admin kit registration notification failed (non-critical)', { 
                error: adminEmailResult.error,
                requestId: requestId
              });
            }
          }
          
        } catch (emailError) {
          log('error', '❌ Email notification process failed', { 
            error: emailError.message,
            requestId: requestId
          });
          // Don't fail the registration - emails are non-critical
        }
        
      } else {
        log('warn', '⚠️ Loops API key not configured, skipping admin email notification', {
          requestId: requestId
        });
      }
  
      const processingTime = Date.now() - startTime;
      log('info', `✅ Kit registration completed successfully in ${processingTime}ms [${requestId}]`);
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          kit_registration: {
            kit_registration_id: updatedKit.kit_registration_id,
            display_id: updatedKit.display_id,
            registration_status: updatedKit.registration_status
          },
          message: 'Kit registered successfully',
          processing_time_ms: processingTime,
          request_id: requestId
        })
      };
  
    } catch (error) {
      const processingTime = Date.now() - startTime;
      log('error', 'Error registering kit', { 
        error: error.message,
        requestId: requestId,
        processingTime: processingTime
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to register kit',
          message: error.message,
          request_id: requestId,
          processing_time_ms: processingTime
        })
      };
    }
  }

// Validate registration data
function validateRegistrationData(data) {
  const errors = [];

  if (!data.kit_registration_id) {
    errors.push('kit_registration_id is required');
  }

  if (!data.sample_date) {
    errors.push('sample_date is required');
  }

  if (!data.sample_time) {
    errors.push('sample_time is required');
  }

  if (!data.person_taking_sample) {
    errors.push('person_taking_sample is required');
  }

  if (data.number_of_containers && data.number_of_containers < 1) {
    errors.push('number_of_containers must be at least 1');
  }

  // Validate date format
  if (data.sample_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.sample_date)) {
    errors.push('sample_date must be in YYYY-MM-DD format');
  }

  // Validate time format
  if (data.sample_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(data.sample_time)) {
    errors.push('sample_time must be in HH:MM or HH:MM:SS format');
  }

  // Validate postal code format for Canada if provided
  if (data.postal_code && data.postal_code.trim() && 
      !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.postal_code.trim())) {
    errors.push('postal_code must be a valid Canadian postal code format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Send admin notification email for kit registration
async function sendAdminKitRegistrationEmailDirect(kitRegistration, orderData, shippingAddress, requestId) {
    try {
      const apiKey = process.env.VITE_LOOPS_API_KEY;
      if (!apiKey) {
        throw new Error('Loops API key not configured');
      }
  
      log('info', `📧 Sending admin kit registration notification for kit ${kitRegistration.display_id} [${requestId}]`);
  
      // Format the sample date and time for display
      const sampleDate = new Date(kitRegistration.sample_date).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  
      const sampleTime = new Date(`1970-01-01T${kitRegistration.sample_time}`).toLocaleTimeString('en-CA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
  
      // Format customer name
      const customerName = shippingAddress ? 
        `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() : 
        'Not provided';
  
      const emailData = {
        transactionalId: 'cmcb0nosp16ha110iygtfk839', // Admin kit registration template ID
        email: 'orders@mywaterquality.ca',
        dataVariables: {
          customerName: customerName,
          kitDisplayID: kitRegistration.display_id,
          testKitName: orderData.product_name || 'Unknown Product',
          orderNumber: orderData.order_number || 'N/A',
          sampleDate: sampleDate,
          sampleTime: sampleTime,
          numContainers: kitRegistration.number_of_containers.toString(),
          sampler: kitRegistration.person_taking_sample,
          SampleDescription: kitRegistration.sample_description || 'No description provided',
          locationName: kitRegistration.location_name || 'Not specified',
          address: kitRegistration.address || 'Not provided',
          city: kitRegistration.city || 'Not provided',
          province: kitRegistration.province || 'Not provided',
          postalCode: kitRegistration.postal_code || 'Not provided',
          country: kitRegistration.country || 'Canada'
        }
      };
  
      log('info', `📧 Prepared admin kit registration email data for kit ${kitRegistration.display_id}`, {
        templateId: emailData.transactionalId,
        kitDisplayID: emailData.dataVariables.kitDisplayID,
        customerName: emailData.dataVariables.customerName
      });
  
      // Call Loops API directly
      const response = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(emailData)
      });
  
      const responseText = await response.text();
      log('info', `📧 Admin kit registration email Loops API response: ${response.status}`, { responseText });
  
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText || `HTTP ${response.status}` };
        }
        throw new Error(`Loops API Error ${response.status}: ${errorData.message}`);
      }
  
      log('info', `✅ Admin kit registration notification sent successfully for kit ${kitRegistration.display_id}`);
      return { success: true };
  
    } catch (error) {
      log('error', `❌ Failed to send admin kit registration email: ${error.message}`, { 
        kitDisplayID: kitRegistration.display_id,
        error: error.message 
      });
      return { success: false, error: error.message };
    }
  }