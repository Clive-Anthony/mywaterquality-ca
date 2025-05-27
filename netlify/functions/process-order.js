// netlify/functions/process-order.js - UPDATED with minimal PayPal support
const { createClient } = require('@supabase/supabase-js');

// Send email via Loops API
async function sendLoopsEmail({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      console.warn('Loops API key not configured - skipping email');
      return { success: true, skipped: true };
    }

    console.log(`Sending order confirmation email to ${to}`);

    const requestBody = {
      transactionalId,
      email: to,
      dataVariables: variables
    };

    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('Loops response:', response.status, responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText || `HTTP ${response.status}` };
      }
      throw new Error(`Loops API Error ${response.status}: ${errorData.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Loops API error:', error);
    return { success: false, error: error.message };
  }
}

// Clear user's cart after successful order
async function clearUserCart(supabaseAdmin, userId) {
  try {
    console.log('Clearing cart for user:', userId);
    
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('cart_id')
      .eq('user_id', userId)
      .single();

    if (cartError || !cart) {
      console.log('No cart found for user, skipping cart clear');
      return { success: true };
    }

    const { error: deleteError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.cart_id);

    if (deleteError) {
      console.error('Error clearing cart:', deleteError);
      return { success: false, error: deleteError };
    }

    console.log('Cart cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception clearing cart:', error);
    return { success: false, error };
  }
}

// Validate order data
function validateOrderData(orderData) {
  const errors = [];

  if (!orderData.shipping_address) {
    errors.push('Shipping address is required');
  }

  if (!orderData.billing_address) {
    errors.push('Billing address is required');
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  if (!orderData.total_amount || orderData.total_amount <= 0) {
    errors.push('Order total must be greater than zero');
  }

  if (orderData.shipping_address) {
    const required = ['firstName', 'lastName', 'address', 'city', 'province', 'postalCode', 'email'];
    required.forEach(field => {
      if (!orderData.shipping_address[field]) {
        errors.push(`Shipping address ${field} is required`);
      }
    });

    if (orderData.shipping_address.postalCode && 
        !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(orderData.shipping_address.postalCode)) {
      errors.push('Invalid postal code format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format price for display
function formatPrice(price) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(price);
}

exports.handler = async function(event, context) {
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
    console.log('=== ORDER PROCESSING FUNCTION START ===');
    
    // Validate environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing database configuration'
        })
      };
    }

    console.log('✅ Environment variables validated');

    // Parse request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
      console.log('✅ Order data parsed for:', orderData.shipping_address?.email);
      console.log('Payment method:', orderData.payment_method);
      console.log('Payment reference:', orderData.payment_reference);
      console.log('Order total:', orderData.total_amount);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        })
      };
    }

    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      console.error('❌ Order validation failed:', validation.errors);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order validation failed',
          details: validation.errors
        })
      };
    }
    console.log('✅ Order data validated');

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase admin client created');

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Missing or invalid authorization header'
        })
      };
    }

    const token = authHeader.substring(7);
    console.log('🔍 Attempting to authenticate user...');
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('❌ User authentication failed:', userError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message || 'Invalid token'
        })
      };
    }

    const user = userData.user;
    console.log('✅ User authenticated:', user.email);

    // Create the order in database
    console.log('📝 Creating order in database...');
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

    console.log('📋 Order insert data prepared:', {
      user_id: orderInsertData.user_id,
      total_amount: orderInsertData.total_amount,
      payment_method: orderInsertData.payment_method,
      payment_status: orderInsertData.payment_status
    });

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderInsertData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Database error creating order:', orderError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order in database',
          details: orderError.message,
          code: orderError.code,
          hint: orderError.hint
        })
      };
    }

    console.log('✅ Order created successfully:', createdOrder.order_number, 'with ID:', createdOrder.id);

    // Create order items
    console.log('📦 Creating order items...');
    const orderItems = orderData.items.map(item => ({
      order_id: createdOrder.id,
      test_kit_id: item.test_kit_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      product_name: item.product_name,
      product_description: item.product_description || null
    }));

    console.log('📋 Order items prepared:', orderItems.length, 'items');

    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('❌ Error creating order items:', itemsError);
      
      // Clean up - delete the order if items creation failed
      console.log('🧹 Cleaning up failed order...');
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', createdOrder.id);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order items',
          details: itemsError.message
        })
      };
    }

    console.log('✅ Order items created successfully:', createdItems.length, 'items');

    // Clear user's cart (non-blocking)
    console.log('🧹 Clearing user cart...');
    clearUserCart(supabaseAdmin, user.id).catch(error => {
      console.warn('⚠️ Failed to clear cart (non-critical):', error);
    });

    // Send order confirmation email (non-blocking)
    console.log('📧 Sending order confirmation email...');
    sendLoopsEmail({
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
        console.log('✅ Order confirmation email sent successfully');
      } else if (result.skipped) {
        console.log('⚠️ Email sending skipped (API key not configured)');
      } else {
        console.warn('⚠️ Failed to send confirmation email:', result.error);
      }
    }).catch(emailError => {
      console.warn('⚠️ Email sending exception (non-critical):', emailError);
    });

    // Return successful response
    console.log('🎉 Order processing completed successfully');
    return {
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

  } catch (error) {
    console.error('💥 Unexpected function error:', error);
    
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