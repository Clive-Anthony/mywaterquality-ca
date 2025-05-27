// netlify/functions/process-order.js - OPTIMIZED VERSION to prevent timeouts
const { createClient } = require('@supabase/supabase-js');

// Send email via Loops API (non-blocking)
async function sendLoopsEmailAsync({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      console.warn('Loops API key not configured - skipping email');
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

    return { success: true };
  } catch (error) {
    console.error('Loops API error (non-critical):', error.message);
    return { success: false, error: error.message };
  }
}

// Clear user's cart (non-blocking)
async function clearUserCartAsync(supabaseAdmin, userId) {
  try {
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('cart_id')
      .eq('user_id', userId)
      .single();

    if (cartError || !cart) {
      return { success: true };
    }

    const { error: deleteError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.cart_id);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error('Cart clear error (non-critical):', error);
    return { success: false, error };
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

  try {
    console.log('🚀 ORDER PROCESSING START');
    
    // Validate environment variables quickly
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error'
        })
      };
    }

    // Parse and validate request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body'
        })
      };
    }

    console.log('📋 Order validation for:', orderData.shipping_address?.email);

    // Quick validation
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order validation failed',
          details: validation.errors
        })
      };
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing authorization header' })
      };
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
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
    console.log('✅ User authenticated:', user.email);

    // Prepare order data for database
    const orderInsertData = {
      user_id: user.id,
      subtotal: orderData.subtotal,
      shipping_cost: orderData.shipping_cost || 0,
      tax_amount: orderData.tax_amount || 0,
      total_amount: orderData.total_amount,
      shipping_address: orderData.shipping_address,
      billing_address: orderData.billing_address,
      special_instructions: orderData.special_instructions || null,
      payment_method: orderData.payment_method || 'demo',
      payment_data: orderData.payment_reference ? { reference: orderData.payment_reference } : null,
      status: 'confirmed',
      payment_status: orderData.payment_method === 'paypal' ? 'paid' : 'pending',
      fulfillment_status: 'unfulfilled'
    };

    console.log('💾 Creating order in database...');

    // Create order (critical operation)
    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderInsertData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order',
          details: orderError.message
        })
      };
    }

    console.log('✅ Order created:', createdOrder.order_number);

    // Create order items (critical operation)
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      test_kit_id: item.test_kit_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      product_name: item.product_name,
      product_description: item.product_description || null
    }));

    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('❌ Order items creation failed:', itemsError);
      
      // Clean up - delete the order
      await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order items'
        })
      };
    }

    console.log('✅ Order items created:', createdItems.length);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Critical operations completed in ${processingTime}ms`);

    // Return success immediately to prevent timeout
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
          total_amount: createdOrder.total_amount,
          created_at: createdOrder.created_at,
          payment_method: createdOrder.payment_method
        },
        message: 'Order created successfully'
      })
    };

    // Start non-critical operations asynchronously (don't await)
    setImmediate(async () => {
      try {
        console.log('🧹 Starting background tasks...');
        
        // Clear cart (non-blocking)
        clearUserCartAsync(supabaseAdmin, user.id).then(result => {
          if (result.success) {
            console.log('✅ Cart cleared in background');
          } else {
            console.warn('⚠️ Cart clear failed:', result.error);
          }
        });

        // Send confirmation email (non-blocking)
        sendLoopsEmailAsync({
          transactionalId: 'cmazp7ib41er0z60iagt7cw00',
          to: orderData.shipping_address.email,
          variables: {
            firstName: orderData.shipping_address.firstName,
            orderNumber: createdOrder.order_number,
            orderTotal: formatPrice(createdOrder.total_amount),
            itemCount: orderData.items.length,
            paymentMethod: orderData.payment_method === 'paypal' ? 'PayPal' : 'Demo',
            dashboardLink: `${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/dashboard`,
            websiteURL: process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'
          }
        }).then(result => {
          if (result.success && !result.skipped) {
            console.log('✅ Confirmation email sent in background');
          } else if (result.skipped) {
            console.log('⚠️ Email skipped (API key not configured)');
          } else {
            console.warn('⚠️ Email failed in background:', result.error);
          }
        });

        console.log('🎉 Background tasks initiated');
      } catch (bgError) {
        console.error('Background task error:', bgError);
      }
    });

    return successResponse;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 Function error after ${processingTime}ms:`, error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};