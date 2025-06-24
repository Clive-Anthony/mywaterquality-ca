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
      kitRegistrationId: registrationData.kit_registration_id 
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
      displayId: updatedKit.display_id
    });

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
        message: 'Kit registered successfully'
      })
    };

  } catch (error) {
    log('error', 'Error registering kit', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to register kit',
        message: error.message
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