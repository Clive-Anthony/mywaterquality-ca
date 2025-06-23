// netlify/functions/validate-coupon.js
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

    // Get coupon from database
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid or inactive coupon code',
          valid: false
        })
      };
    }

    // Check if coupon is expired
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Coupon has expired',
          valid: false
        })
      };
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Coupon is not yet valid',
          valid: false
        })
      };
    }

    // Check minimum order value
    if (coupon.minimum_order_value && orderTotal < coupon.minimum_order_value) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Minimum order value of ${coupon.minimum_order_value} required`,
          valid: false
        })
      };
    }

    // Check total usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Coupon usage limit reached',
          valid: false
        })
      };
    }

    // Check per-user usage limit
    if (coupon.per_user_limit) {
      const { data: userUsage, error: usageError } = await supabase
        .from('coupon_usage')
        .select('usage_id')
        .eq('coupon_id', coupon.coupon_id)
        .eq('user_id', user.id);

      if (usageError) {
        log('error', 'Error checking user usage', { error: usageError });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error validating coupon usage'
          })
        };
      }

      if (userUsage && userUsage.length >= coupon.per_user_limit) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'You have already used this coupon the maximum number of times',
            valid: false
          })
        };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (orderTotal * coupon.value) / 100;
    } else if (coupon.type === 'fixed_amount') {
      discountAmount = Math.min(coupon.value, orderTotal);
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal);
    
    const finalTotal = Math.max(0, orderTotal - discountAmount);
    const isFreeOrder = finalTotal === 0;

    log('info', 'Coupon validation successful', {
      couponId: coupon.coupon_id,
      discountAmount,
      finalTotal,
      isFreeOrder
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.coupon_id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
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