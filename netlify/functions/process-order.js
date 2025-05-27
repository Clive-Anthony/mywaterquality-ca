// netlify/functions/process-order.js - FIXED VERSION
const { createClient } = require('@supabase/supabase-js');

// Enhanced logging with better formatting
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Send email via Loops API (completely non-blocking)
async function sendConfirmationEmailBackground(orderData, userEmail) {
  setTimeout(async () => {
    try {
      const apiKey = process.env.VITE_LOOPS_API_KEY;
      if (!apiKey) {
        log('warn', 'Loops API key not configured - skipping confirmation email');
        return;
      }

      const response = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          transactionalId: 'cmazp7ib41er0z60iagt7cw00',
          email: userEmail,
          dataVariables: {
            firstName: orderData.shipping_address.firstName || 'Customer',
            orderNumber: orderData.order_number,
            orderTotal: new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(orderData.total_amount),
            dashboardLink: `${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/dashboard`,
            websiteURL: process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'
          }
        })
      });

      if (response.ok) {
        log('info', 'Confirmation email sent successfully');
      } else {
        log('warn', 'Confirmation email failed', { status: response.status });
      }
    } catch (error) {
      log('warn', 'Confirmation email error (non-critical)', { error: error.message });
    }
  }, 100);
}

// Clear user cart (completely non-blocking)
async function clearUserCartBackground(supabaseAdmin, userId) {
  setTimeout(async () => {
    try {
      const { data: cart } = await supabaseAdmin
        .from('carts')
        .select('cart_id')
        .eq('user_id', userId)
        .single();

      if (cart) {
        await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.cart_id);
        
        log('info', 'User cart cleared successfully');
      }
    } catch (error) {
      log('warn', 'Cart clear error (non-critical)', { error: error.message });
    }
  }, 50);
}

// Validate order data with detailed error reporting
function validateOrderData(orderData) {
  const errors = [];
  
  // Required top-level fields
  if (!orderData.shipping_address) errors.push('shipping_address is required');
  if (!orderData.billing_address) errors.push('billing_address is required');
  if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items array is required');
  if (!orderData.total_amount || orderData.total_amount <= 0) errors.push('valid total_amount is required');

  // Validate items
  if (orderData.items && orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate shipping address
  if (orderData.shipping_address) {
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    for (const field of requiredFields) {
      if (!orderData.shipping_address[field] || orderData.shipping_address[field].trim() === '') {
        errors.push(`shipping_address.${field} is required and cannot be empty`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

// FIXED: Check and create orders table if it doesn't exist
async function ensureOrdersTableExists(supabaseAdmin) {
  try {
    // Test if we can query the orders table
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist
      log('warn', 'Orders table does not exist - this needs to be created in Supabase');
      throw new Error('Orders table not found. Please create the orders table in your Supabase database.');
    } else if (error) {
      log('warn', 'Error checking orders table', { error: error.message, code: error.code });
      throw error;
    }
    
    log('info', 'Orders table exists and is accessible');
    return true;
  } catch (error) {
    log('error', 'Orders table check failed', { error: error.message });
    throw error;
  }
}

exports.handler = async function(event, context) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  
  log('info', `ORDER PROCESSING START [${requestId}]`);
  
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
      log('error', 'Missing critical environment variables');
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
      log('info', 'Request body parsed', { 
        hasItems: !!orderData.items,
        itemCount: orderData.items?.length,
        total: orderData.total_amount,
        paymentMethod: orderData.payment_method
      });
    } catch (parseError) {
      log('error', 'JSON parse error', { error: parseError.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      log('error', 'Order validation failed', { errors: validation.errors });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order validation failed',
          details: validation.errors
        })
      };
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if orders table exists
    try {
      await ensureOrdersTableExists(supabaseAdmin);
    } catch (tableError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database configuration error',
          details: tableError.message
        })
      };
    }

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      log('error', 'Missing authorization header');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    const token = authHeader.substring(7);
    let user;
    
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !userData?.user) {
        log('error', 'User authentication failed', { error: userError?.message });
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication failed' })
        };
      }
      
      user = userData.user;
      log('info', 'User authenticated', { userId: user.id, email: user.email });
    } catch (authError) {
      log('error', 'Authentication error', { error: authError.message });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }

    // FIXED: Prepare order data with correct field mapping
    const orderInsertData = {
      user_id: user.id,
      subtotal: Number(orderData.subtotal) || 0,
      shipping_cost: Number(orderData.shipping_cost) || 0,
      tax_amount: Number(orderData.tax_amount) || 0,
      total_amount: Number(orderData.total_amount),
      shipping_address: orderData.shipping_address,
      billing_address: orderData.billing_address,
      special_instructions: orderData.special_instructions || null,
      payment_method: orderData.payment_method || 'paypal',
      payment_data: orderData.payment_reference ? 
        { reference: orderData.payment_reference, completed_at: new Date().toISOString() } : null,
      status: 'confirmed',
      payment_status: 'paid',
      fulfillment_status: 'unfulfilled'
    };

    log('info', 'Creating order in database', {
      userId: user.id,
      total: orderInsertData.total_amount,
      paymentMethod: orderInsertData.payment_method
    });

    // FIXED: Create order with better error handling and field selection
    let createdOrder;
    try {
      const { data, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([orderInsertData])
        .select(`
          id,
          order_number,
          user_id,
          status,
          payment_status,
          fulfillment_status,
          total_amount,
          shipping_address,
          billing_address,
          created_at
        `)
        .single();

      if (orderError) {
        log('error', 'DETAILED ORDER CREATION ERROR', { 
          error: orderError.message,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint,
          orderData: orderInsertData
        });
        
        // Provide specific error messages based on common issues
        if (orderError.code === '42P01') {
          throw new Error('Orders table does not exist in the database');
        } else if (orderError.code === '42703') {
          throw new Error(`Database column missing: ${orderError.message}`);
        } else if (orderError.code === '23505') {
          throw new Error('Duplicate order detected');
        } else if (orderError.code === '42501') {
          throw new Error('Database permission denied - check RLS policies');
        } else {
          throw new Error(`Database error: ${orderError.message}`);
        }
      }

      if (!data) {
        log('error', 'Order creation returned no data');
        throw new Error('Order creation failed - no data returned');
      }

      createdOrder = data;
      log('info', 'Order created successfully', { 
        orderId: createdOrder.id,
        orderNumber: createdOrder.order_number
      });

    } catch (insertError) {
      log('error', 'Order insert failed', { error: insertError.message });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create order',
          details: insertError.message
        })
      };
    }

    // FIXED: Create order items with proper error handling
    if (orderData.items && orderData.items.length > 0) {
      try {
        const orderItems = orderData.items.map(item => ({
          order_id: createdOrder.id, // Use the correct field name
          test_kit_id: item.test_kit_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.quantity) * Number(item.unit_price),
          product_name: item.product_name,
          product_description: item.product_description || null
        }));

        const { data: createdItems, error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems)
          .select();

        if (itemsError) {
          log('error', 'Order items creation failed', { 
            error: itemsError.message,
            code: itemsError.code,
            orderItems
          });
          
          // Clean up the order if items creation fails
          await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
          
          throw new Error(`Failed to create order items: ${itemsError.message}`);
        }

        log('info', 'Order items created successfully', { itemCount: createdItems?.length });
      } catch (itemsError) {
        log('error', 'Order items processing failed', { error: itemsError.message });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to create order items',
            details: itemsError.message
          })
        };
      }
    }

    const processingTime = Date.now() - startTime;
    log('info', `Order processing completed successfully in ${processingTime}ms [${requestId}]`);

    // Start background tasks (non-blocking)
    sendConfirmationEmailBackground(createdOrder, orderData.shipping_address.email);
    clearUserCartBackground(supabaseAdmin, user.id);
    
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
          fulfillment_status: createdOrder.fulfillment_status,
          total_amount: createdOrder.total_amount,
          created_at: createdOrder.created_at,
          shipping_address: createdOrder.shipping_address
        },
        message: 'Order created successfully',
        processing_time_ms: processingTime,
        request_id: requestId
      })
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('error', `Unexpected error after ${processingTime}ms [${requestId}]`, { 
      error: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        request_id: requestId
      })
    };
  }
};