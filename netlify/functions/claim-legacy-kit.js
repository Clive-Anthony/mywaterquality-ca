// netlify/functions/claim-legacy-kit.js
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
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

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { kit_code } = requestData;

    if (!kit_code || !kit_code.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Kit code is required' })
      };
    }

    const cleanKitCode = kit_code.trim().toUpperCase();

    log('info', 'Attempting to claim legacy kit', { 
      userId: user.id, 
      kitCode: cleanKitCode,
      userEmail: user.email
    });

    // Check if kit exists and is unclaimed
    const { data: existingKit, error: findError } = await supabase
      .from('legacy_kit_registrations')
      .select(`
        id,
        kit_code,
        user_id,
        is_active,
        registration_status,
        test_kits (
          name,
          description
        )
      `)
      .eq('kit_code', cleanKitCode)
      .single();

    if (findError || !existingKit) {
      log('warn', 'Kit code not found', { 
        kitCode: cleanKitCode,
        error: findError?.message 
      });
      
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: `No matches were found for kit code "${cleanKitCode}". Please double-check the code on your delivery box lid.`,
          success: false
        })
      };
    }

    // Check if kit is already claimed
    if (existingKit.user_id) {
      // Check if it's claimed by the same user
      if (existingKit.user_id === user.id) {
        log('info', 'Kit already claimed by same user', { 
          kitCode: cleanKitCode,
          userId: user.id
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'This kit is already claimed by you',
            kit: {
              id: existingKit.id,
              kit_code: existingKit.kit_code,
              product_name: existingKit.test_kits.name,
              already_owned: true
            }
          })
        };
      } else {
        log('warn', 'Kit already claimed by different user', { 
          kitCode: cleanKitCode,
          claimedByUserId: existingKit.user_id,
          attemptingUserId: user.id
        });
        
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            error: `This kit code has already been claimed by another user. If you believe this is an error, please contact support.`,
            success: false
          })
        };
      }
    }

    // Check if kit is active
    if (!existingKit.is_active) {
      log('warn', 'Inactive kit claim attempted', { 
        kitCode: cleanKitCode,
        userId: user.id
      });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `This kit code is not available for claiming. Please contact support for assistance.`,
          success: false
        })
      };
    }

    // Claim the kit by updating user_id
    const { data: claimedKit, error: claimError } = await supabase
      .from('legacy_kit_registrations')
      .update({ 
        user_id: user.id,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingKit.id)
      .eq('user_id', null) // Ensure it's still unclaimed
      .select(`
        id,
        kit_code,
        display_id,
        user_id,
        registration_status,
        test_kits (
          name,
          description
        )
      `)
      .single();

    if (claimError) {
      log('error', 'Failed to claim kit', { 
        kitCode: cleanKitCode,
        userId: user.id,
        error: claimError.message
      });
      
      // Check if it was a race condition (someone else claimed it)
      if (claimError.code === 'PGRST116') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            error: `This kit was just claimed by another user. Please try a different kit code.`,
            success: false
          })
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to claim kit. Please try again.',
          success: false
        })
      };
    }

    if (!claimedKit) {
      log('error', 'Kit claim succeeded but no data returned', { 
        kitCode: cleanKitCode,
        userId: user.id
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Kit claiming failed. Please try again.',
          success: false
        })
      };
    }

    log('info', 'Kit successfully claimed', { 
      kitCode: cleanKitCode,
      userId: user.id,
      kitId: claimedKit.id,
      userEmail: user.email
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Kit ${cleanKitCode} successfully claimed!`,
        kit: {
          id: claimedKit.id,
          kit_code: claimedKit.kit_code,
          display_id: claimedKit.display_id || claimedKit.kit_code,
          product_name: claimedKit.test_kits.name,
          registration_status: claimedKit.registration_status,
          already_owned: false
        }
      })
    };

  } catch (error) {
    log('error', 'Unexpected error in claim-legacy-kit function', { 
      error: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        success: false
      })
    };
  }
};