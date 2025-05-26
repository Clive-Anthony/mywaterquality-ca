// netlify/functions/process-order.js
const { createClient } = require('@supabase/supabase-js');

// Send email via Loops API
async function sendLoopsEmail({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
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
    throw error;
  }
}

// Clear user's cart after successful order
async function clearUserCart(supabaseAdmin, userId) {
  try {
    console.log('Clearing cart for user:', userId);
    
    // Get user's cart
    const { data: cart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('cart_id')
      .eq('user_id', userId)
      .single();

    if (cartError || !cart) {
      console.log('No cart found for user, skipping cart clear');
      return { success: true };
    }

    // Delete all cart items
    const { error: deleteError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.cart_id);

    if (deleteError) {
      console.error('Error clearing cart:', deleteError);
      // Don't throw - order was successful, this is just cleanup
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

  // Check required fields
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

  // Validate shipping address
  if (orderData.shipping_address) {
    const required = ['firstName', 'lastName', 'address', 'city', 'province', 'postalCode', 'email'];
    required.forEach(field => {
      if (!orderData.shipping_address[field]) {
        errors.push(`Shipping address ${field} is required`);
      }
    });

    // Validate postal code format for Canada
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
    console.log('=== ORDER PROCESSING FUNCTION ===');
    
    // Validate environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Parse request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    console.log('Processing order for:', orderData.shipping_address?.email);

    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      console.error('Order validation failed:', validation.errors);
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

    // Get user from authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid authorization header' })
      };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }

    console.log('Authenticated user:', user.email);

    // Create the order in database
    console.log('Creating order in database...');
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        user_id: user.id,
        subtotal: orderData.subtotal,
        shipping_cost: orderData.shipping_cost || 0,
        tax_amount: orderData.tax_amount || 0,
        total_amount: orderData.total_amount,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        special_instructions: orderData.special_instructions || null,
        payment_method: orderData.payment_method || 'demo',
        status: 'confirmed', // Set to confirmed for demo
        payment_status: 'paid', // Set to paid for demo
        fulfillment_status: 'unfulfilled'
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order',
          details: orderError.message
        })
      };
    }

    console.log('Order created successfully:', order.order_number);

    // Create order items
    console.log('Creating order items...');
    const orderItems = orderData.items.map(item => ({
      order_id: order.order_id,
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
      console.error('Error creating order items:', itemsError);
      
      // Clean up - delete the order if items creation failed
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('order_id', order.order_id);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order items',
          details: itemsError.message
        })
      };
    }

    console.log('Order items created successfully:', createdItems.length);

    // Clear user's cart (non-blocking)
    clearUserCart(supabaseAdmin, user.id).catch(error => {
      console.warn('Failed to clear cart (non-critical):', error);
    });

    // Send order confirmation email
    console.log('Sending order confirmation email...');
    try {
      await sendLoopsEmail({
        transactionalId: 'cmazp7ib41er0z60iagt7cw00', // You'll need to create this template in Loops
        to: orderData.shipping_address.email,
        variables: {
          firstName: orderData.shipping_address.firstName,
          orderNumber: order.order_number,
          orderTotal: formatPrice(order.total_amount),
          itemCount: orderData.items.length,
          itemDetails: orderData.items.map(item => 
            `${item.product_name} (Qty: ${item.quantity}) - ${formatPrice(item.quantity * item.unit_price)}`
          ).join('\n'),
          shippingAddress: `${orderData.shipping_address.address}, ${orderData.shipping_address.city}, ${orderData.shipping_address.province} ${orderData.shipping_address.postalCode}`,
          dashboardLink: `${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/dashboard`,
          websiteURL: process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'
        }
      });
      
      console.log('Order confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send confirmation email (non-critical):', emailError);
      // Don't fail the order just because email failed
    }

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          order_id: order.order_id,
          order_number: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at
        },
        message: 'Order created successfully'
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
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