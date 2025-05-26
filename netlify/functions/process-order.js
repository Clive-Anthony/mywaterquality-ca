// netlify/functions/process-order.js - FIXED to match your database schema
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
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.VITE_SUPABASE_SERVICE_KEY,
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      supabaseUrlLength: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.length : 0,
      serviceKeyLength: process.env.VITE_SUPABASE_SERVICE_KEY ? process.env.VITE_SUPABASE_SERVICE_KEY.length : 0
    });
    
    // Validate environment variables
    if (!process.env.VITE_SUPABASE_URL) {
      console.error('❌ Missing VITE_SUPABASE_URL environment variable');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Missing Supabase URL - check Netlify environment variables'
        })
      };
    }

    if (!process.env.VITE_SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing VITE_SUPABASE_SERVICE_KEY environment variable');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Missing Supabase service key - check Netlify environment variables'
        })
      };
    }

    console.log('✅ Environment variables validated');

    // Parse request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
      console.log('✅ Order data parsed for:', orderData.shipping_address?.email);
      console.log('Order total:', orderData.total_amount);
      console.log('Item count:', orderData.items?.length);
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
    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_KEY
      );
      console.log('✅ Supabase admin client created');
    } catch (supabaseError) {
      console.error('❌ Failed to create Supabase client:', supabaseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed',
          details: supabaseError.message
        })
      };
    }

    // Get user from authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Missing or invalid authorization header',
          details: 'Please provide a valid Bearer token'
        })
      };
    }

    const token = authHeader.substring(7);
    console.log('🔍 Attempting to authenticate user...');
    
    let user;
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error('❌ User authentication failed:', userError);
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
        console.error('❌ No user data returned from authentication');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'Authentication failed',
            details: 'Invalid or expired token'
          })
        };
      }
      
      user = userData.user;
      console.log('✅ User authenticated:', user.email);
    } catch (authError) {
      console.error('❌ Authentication exception:', authError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication error',
          details: authError.message
        })
      };
    }

    // Test database connection first
    console.log('🔍 Testing database connection...');
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database connection test failed:', testError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Database connection failed',
            details: `Cannot access orders table: ${testError.message}`,
            code: testError.code,
            hint: testError.hint
          })
        };
      }
      console.log('✅ Database connection test passed');
    } catch (dbTestError) {
      console.error('❌ Database test exception:', dbTestError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database test failed',
          details: dbTestError.message
        })
      };
    }

    // Create the order in database
    console.log('📝 Creating order in database...');
    let order;
    try {
      // Note: Using your schema where primary key is 'id', not 'order_id'
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
        status: 'confirmed', // Set to confirmed for demo
        payment_status: 'paid', // Set to paid for demo
        fulfillment_status: 'unfulfilled'
        // order_number will be auto-generated by your trigger
      };

      console.log('📋 Order insert data prepared:', {
        user_id: orderInsertData.user_id,
        total_amount: orderInsertData.total_amount,
        status: orderInsertData.status
      });

      const { data: orderData, error: orderError } = await supabaseAdmin
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
            hint: orderError.hint,
            postgresErrorCode: orderError.details
          })
        };
      }

      order = orderData;
      console.log('✅ Order created successfully:', order.order_number, 'with ID:', order.id);
    } catch (dbError) {
      console.error('❌ Exception creating order:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database operation failed',
          details: dbError.message
        })
      };
    }

    // Create order items
    console.log('📦 Creating order items...');
    try {
      const orderItems = orderData.items.map(item => ({
        order_id: order.id, // Using 'id' from the created order (matches your schema)
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
          .eq('id', order.id); // Using 'id' not 'order_id'
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to create order items',
            details: itemsError.message,
            code: itemsError.code,
            hint: itemsError.hint
          })
        };
      }

      console.log('✅ Order items created successfully:', createdItems.length, 'items');
    } catch (itemsException) {
      console.error('❌ Exception creating order items:', itemsException);
      
      // Clean up the order
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', order.id);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order items',
          details: itemsException.message
        })
      };
    }

    // Clear user's cart (non-blocking)
    console.log('🧹 Clearing user cart...');
    clearUserCart(supabaseAdmin, user.id).catch(error => {
      console.warn('⚠️ Failed to clear cart (non-critical):', error);
    });

    // Send order confirmation email (non-blocking)
    console.log('📧 Sending order confirmation email...');
    sendLoopsEmail({
      transactionalId: 'cmazp7ib41er0z60iagt7cw00', // Using existing welcome email template
      to: orderData.shipping_address.email,
      variables: {
        firstName: orderData.shipping_address.firstName,
        orderNumber: order.order_number,
        orderTotal: formatPrice(order.total_amount),
        itemCount: orderData.items.length,
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
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at
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
        message: error.message || 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};