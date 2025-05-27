// netlify/functions/process-order.js - FIXED VERSION with enhanced debugging
const { createClient } = require('@supabase/supabase-js');

// Enhanced logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

// Send email via Loops API (non-blocking with better error handling)
async function sendLoopsEmailAsync({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      log('⚠️ Loops API key not configured - skipping email');
      return { success: true, skipped: true };
    }

    const requestBody = {
      transactionalId,
      email: to,
      dataVariables: variables
    };

    // Use shorter timeout for email to prevent function timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Loops API Error ${response.status}`);
    }

    log('✅ Email sent successfully via Loops');
    return { success: true };
  } catch (error) {
    log('❌ Loops API error (non-critical)', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Clear user's cart (non-blocking with better error handling)
async function clearUserCartAsync(supabaseAdmin, userId) {
  try {
    log('🧹 Starting cart clear for user', { userId });
    
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('cart_id')
      .eq('user_id', userId)
      .single();

    if (cartError) {
      if (cartError.code === 'PGRST116') {
        log('ℹ️ No cart found for user - nothing to clear');
        return { success: true };
      }
      throw cartError;
    }

    if (!cart) {
      log('ℹ️ No cart data returned - nothing to clear');
      return { success: true };
    }

    const { error: deleteError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.cart_id);

    if (deleteError) {
      throw deleteError;
    }

    log('✅ Cart cleared successfully');
    return { success: true };
  } catch (error) {
    log('❌ Cart clear error (non-critical)', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Validate order data (optimized)
function validateOrderData(orderData) {
  const errors = [];
  const required = ['shipping_address', 'billing_address', 'items', 'total_amount'];
  
  for (const field of required) {
    if (!orderData[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (orderData.items && orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  if (orderData.total_amount && orderData.total_amount <= 0) {
    errors.push('Order total must be greater than zero');
  }

  // Validate shipping address required fields
  if (orderData.shipping_address) {
    const requiredShippingFields = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    for (const field of requiredShippingFields) {
      if (!orderData.shipping_address[field]) {
        errors.push(`shipping_address.${field} is required`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Format price for display
function formatPrice(price) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(price);
}

exports.handler = async function(event, context) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  log(`🚀 ORDER PROCESSING START [${requestId}]`);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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

  let supabaseAdmin;
  let user;
  let createdOrder = null;

  try {
    // Validate environment variables quickly
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      log('❌ Missing environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error - missing environment variables'
        })
      };
    }

    log('✅ Environment variables validated');

    // Parse and validate request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
      log('✅ Request body parsed successfully');
    } catch (parseError) {
      log('❌ JSON parse error', { error: parseError.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body'
        })
      };
    }

    log('📋 Order validation starting', { 
      email: orderData.shipping_address?.email,
      total: orderData.total_amount,
      itemCount: orderData.items?.length,
      paymentMethod: orderData.payment_method
    });

    // Quick validation
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      log('❌ Order validation failed', { errors: validation.errors });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order validation failed',
          details: validation.errors
        })
      };
    }

    log('✅ Order data validation passed');

    // Create Supabase admin client
    try {
      supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_KEY
      );
      log('✅ Supabase client created');
    } catch (supabaseError) {
      log('❌ Supabase client creation failed', { error: supabaseError.message });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed'
        })
      };
    }

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log('❌ Missing or invalid authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      };
    }

    const token = authHeader.substring(7);
    log('🔑 Authenticating user with token...');
    
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        log('❌ User authentication failed', { error: userError.message });
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'Authentication failed',
            details: userError.message
          })
        };
      }

      if (!userData?.user) {
        log('❌ No user data returned from authentication');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid authentication token'
          })
        };
      }

      user = userData.user;
      log('✅ User authenticated successfully', { 
        userId: user.id, 
        email: user.email 
      });
    } catch (authError) {
      log('❌ Authentication exception', { error: authError.message });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          details: authError.message
        })
      };
    }

    // Prepare order data for database
    const orderInsertData = {
      user_id: user.id,
      subtotal: Number(orderData.subtotal),
      shipping_cost: Number(orderData.shipping_cost || 0),
      tax_amount: Number(orderData.tax_amount || 0),
      total_amount: Number(orderData.total_amount),
      shipping_address: orderData.shipping_address,
      billing_address: orderData.billing_address,
      special_instructions: orderData.special_instructions || null,
      payment_method: orderData.payment_method || 'unknown',
      payment_data: orderData.payment_reference ? 
        { reference: orderData.payment_reference, timestamp: new Date().toISOString() } : 
        null,
      status: 'confirmed',
      payment_status: orderData.payment_method === 'paypal' ? 'paid' : 'pending',
      fulfillment_status: 'unfulfilled'
    };

    log('💾 Creating order in database...', {
      userId: orderInsertData.user_id,
      total: orderInsertData.total_amount,
      paymentMethod: orderInsertData.payment_method
    });

    // Create order (critical operation with enhanced error handling)
    try {
      const { data: orderResult, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([orderInsertData])
        .select()
        .single();

      if (orderError) {
        log('❌ Order creation failed', { 
          error: orderError.message,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to create order in database',
            details: orderError.message,
            code: orderError.code
          })
        };
      }

      if (!orderResult) {
        log('❌ Order creation returned no data');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Order creation failed - no data returned'
          })
        };
      }

      createdOrder = orderResult;
      log('✅ Order created successfully', { 
        orderId: createdOrder.id,
        orderNumber: createdOrder.order_number,
        total: createdOrder.total_amount
      });
    } catch (orderException) {
      log('❌ Order creation exception', { error: orderException.message });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error during order creation',
          details: orderException.message
        })
      };
    }

    // Create order items (critical operation with enhanced error handling)
    log('📦 Creating order items...');
    
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      test_kit_id: item.test_kit_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.quantity) * Number(item.unit_price),
      product_name: item.product_name,
      product_description: item.product_description || null
    }));

    log('📦 Order items prepared', { itemCount: orderItems.length });

    try {
      const { data: createdItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        log('❌ Order items creation failed', { 
          error: itemsError.message,
          code: itemsError.code,
          details: itemsError.details
        });
        
        // Clean up - delete the order
        log('🧹 Cleaning up order due to items creation failure');
        try {
          await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
          log('✅ Order cleanup completed');
        } catch (cleanupError) {
          log('❌ Order cleanup failed', { error: cleanupError.message });
        }
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to create order items',
            details: itemsError.message
          })
        };
      }

      if (!createdItems || createdItems.length === 0) {
        log('❌ Order items creation returned no data');
        
        // Clean up - delete the order
        try {
          await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
        } catch (cleanupError) {
          log('❌ Order cleanup failed', { error: cleanupError.message });
        }
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Order items creation failed - no data returned'
          })
        };
      }

      log('✅ Order items created successfully', { 
        itemCount: createdItems.length,
        items: createdItems.map(item => ({
          id: item.order_item_id,
          name: item.product_name,
          quantity: item.quantity
        }))
      });
    } catch (itemsException) {
      log('❌ Order items creation exception', { error: itemsException.message });
      
      // Clean up - delete the order
      try {
        await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
      } catch (cleanupError) {
        log('❌ Order cleanup failed', { error: cleanupError.message });
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error during order items creation',
          details: itemsException.message
        })
      };
    }

    const processingTime = Date.now() - startTime;
    log(`⏱️ Critical operations completed successfully in ${processingTime}ms`);

    // Prepare success response
    const successResponse = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          id: createdOrder.id,
          order_number: createdOrder.order_number,
          status: createdOrder.status,
          payment_status: createdOrder.payment_status,
          fulfillment_status: createdOrder.fulfillment_status,
          total_amount: createdOrder.total_amount,
          created_at: createdOrder.created_at,
          payment_method: createdOrder.payment_method,
          shipping_address: createdOrder.shipping_address
        },
        message: 'Order created successfully',
        processing_time_ms: processingTime,
        request_id: requestId
      })
    };

    // Start non-critical operations asynchronously (don't await)
    setImmediate(async () => {
      try {
        log('🔄 Starting background tasks...');
        
        // Clear cart (non-blocking)
        clearUserCartAsync(supabaseAdmin, user.id);

        // Send confirmation email (non-blocking)
        sendLoopsEmailAsync({
          transactionalId: 'cmazp7ib41er0z60iagt7cw00',
          to: orderData.shipping_address.email,
          variables: {
            firstName: orderData.shipping_address.firstName,
            orderNumber: createdOrder.order_number,
            orderTotal: formatPrice(createdOrder.total_amount),
            itemCount: orderData.items.length,
            paymentMethod: orderData.payment_method === 'paypal' ? 'PayPal' : orderData.payment_method,
            dashboardLink: `${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/dashboard`,
            websiteURL: process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'
          }
        });

        log('🎉 Background tasks initiated successfully');
      } catch (bgError) {
        log('❌ Background task error', { error: bgError.message });
      }
    });

    log(`✅ Order processing completed successfully [${requestId}] in ${processingTime}ms`);
    return successResponse;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log(`💥 Unexpected function error after ${processingTime}ms [${requestId}]`, { 
      error: error.message,
      stack: error.stack
    });
    
    // If we created an order but failed later, try to clean it up
    if (createdOrder && supabaseAdmin) {
      try {
        log('🧹 Attempting emergency cleanup of partial order');
        await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
        log('✅ Emergency cleanup completed');
      } catch (cleanupError) {
        log('❌ Emergency cleanup failed', { error: cleanupError.message });
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        request_id: requestId,
        processing_time_ms: processingTime
      })
    };
  }
};