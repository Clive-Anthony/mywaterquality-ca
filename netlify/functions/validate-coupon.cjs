// netlify/functions/validate-coupon.cjs - FIXED VERSION
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
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Validate environment
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error'
        })
      };
    }

    // Parse request
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body'
        })
      };
    }

    const { couponCode, orderTotal, cartItems } = requestData;

    if (!couponCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Coupon code is required'
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
    log('info', 'Validating coupon', { 
      userId: user.id, 
      couponCode: couponCode,
      orderTotal 
    });

    // CRITICAL: First, get the coupon_id from the code
    const { data: couponLookup, error: lookupError } = await supabase
      .from('coupons')
      .select('coupon_id, code')
      .eq('code', couponCode)
      .single();

    if (lookupError || !couponLookup) {
      log('warn', 'Coupon not found', { couponCode });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid coupon code',
          valid: false
        })
      };
    }

    // CRITICAL: Use the proper database validation function
    log('info', 'Calling database validation function', {
      couponId: couponLookup.coupon_id,
      userId: user.id,
      orderTotal
    });

    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_and_reserve_coupon', {
        p_coupon_id: couponLookup.coupon_id,
        p_user_id: user.id,
        p_order_subtotal: orderTotal
      });

    if (validationError) {
      log('error', 'Database validation function error', { 
        error: validationError.message 
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error validating coupon',
          valid: false
        })
      };
    }

    if (!validationResult || validationResult.length === 0) {
      log('error', 'No validation result returned');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Coupon validation failed',
          valid: false
        })
      };
    }

    const result = validationResult[0];

    log('info', 'Validation result', {
      isValid: result.is_valid,
      reason: result.reason,
      couponCode: result.coupon_code
    });

    if (!result.is_valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: result.reason,
          valid: false
        })
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (result.coupon_type === 'percentage') {
      discountAmount = (orderTotal * parseFloat(result.coupon_value)) / 100;
    } else if (result.coupon_type === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(result.coupon_value), orderTotal);
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal);
    
    const finalTotal = Math.max(0, orderTotal - discountAmount);
    const isFreeOrder = finalTotal === 0;

    log('info', 'Coupon validation successful', {
      couponId: couponLookup.coupon_id,
      couponCode: result.coupon_code,
      discountAmount,
      finalTotal,
      isFreeOrder,
      totalUsage: result.actual_usage_count,
      userUsage: result.user_usage_count
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        coupon: {
          coupon_id: couponLookup.coupon_id, // ✓ Return as coupon_id
          id: couponLookup.coupon_id,         // ✓ Also return as id for compatibility
          code: result.coupon_code,
          type: result.coupon_type,
          value: parseFloat(result.coupon_value),
          actual_usage_count: result.actual_usage_count,
          user_usage_count: result.user_usage_count
        },
        discountAmount,
        finalTotal,
        isFreeOrder,
        message: isFreeOrder ? 'Your order is free! No payment required.' : `Discount of ${discountAmount.toFixed(2)} applied.`
      })
    };

  } catch (error) {
    log('error', 'Unexpected error in coupon validation', { error: error.message });
    
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