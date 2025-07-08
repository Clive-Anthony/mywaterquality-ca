// netlify/functions/claim-legacy-kit.js - UPDATED for is_claimed/claimed_at
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

    // Check if kit exists - UPDATED to use is_claimed 
    const { data: existingKit, error: findError } = await supabase
      .from('legacy_kit_registrations')
      .select(`
        id,
        kit_code,
        user_id,
        is_claimed,
        claimed_at,
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

    // UPDATED: Check if kit is already claimed - reject ALL claimed kits
    if (existingKit.is_claimed || existingKit.user_id) {
        log('warn', 'Kit already claimed', { 
        kitCode: cleanKitCode,
        isClaimedFlag: existingKit.is_claimed,
        hasUserId: !!existingKit.user_id,
        claimedByUserId: existingKit.user_id,
        attemptingUserId: user.id,
        claimedAt: existingKit.claimed_at
        });
        
        return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
            error: `This kit code has already been claimed. Each kit can only be claimed once.`,
            success: false
        })
        };
    }

    // Claim the kit - UPDATED to set both is_claimed and claimed_at
    const claimTimestamp = new Date().toISOString();
    const { data: claimedKit, error: claimError } = await supabase
      .from('legacy_kit_registrations')
      .update({ 
        user_id: user.id,
        is_claimed: true,
        claimed_at: claimTimestamp,
        updated_at: claimTimestamp
      })
      .eq('id', existingKit.id)
      .eq('is_claimed', false) // Ensure it's still unclaimed
      .is('user_id', null)
      .select(`
        id,
        kit_code,
        display_id,
        user_id,
        is_claimed,
        claimed_at,
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
      userEmail: user.email,
      claimedAt: claimedKit.claimed_at
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
          is_claimed: claimedKit.is_claimed,
          claimed_at: claimedKit.claimed_at,
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