// netlify/functions/process-order.js - UPDATED: Added admin order notification

const { createClient } = require('@supabase/supabase-js');

// Enhanced logging with better error capture
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Enhanced error reporting for 502 debugging
function logCriticalError(error, context, requestId) {
  console.error('🚨 CRITICAL ERROR DETAILS:', {
    requestId,
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    },
    environment: {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_SERVICE_KEY,
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      nodeVersion: process.version,
      platform: process.platform
    }
  });
}

// FIXED: Direct Loops email function (no more function-to-function calls)
async function sendOrderConfirmationEmailDirect(orderData, customerEmail, firstName, requestId) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    log('info', `📧 Sending order confirmation email to ${customerEmail} [${requestId}]`);

    // Format the order total as a currency string
    const orderTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(orderData.total_amount);

    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';

    const emailData = {
      transactionalId: 'cmb6pqu9c02qht60i7w92yalf', // Order confirmation template ID
      email: customerEmail,
      dataVariables: {
        firstName: firstName || 'Valued Customer',
        orderNumber: orderData.order_number,
        orderTotal: orderTotal,
        dashboardLink: `${baseUrl}/dashboard`,
        websiteURL: baseUrl,
        orderDate: new Date(orderData.created_at).toLocaleDateString('en-CA'),
        orderStatus: orderData.status || 'confirmed'
      }
    };

    log('info', `📧 Prepared email data for order ${orderData.order_number}`);

    // Call Loops API directly (no more internal function calls)
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    const responseText = await response.text();
    log('info', `📧 Loops API response: ${response.status}`, { responseText });

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText || `HTTP ${response.status}` };
      }
      throw new Error(`Loops API Error ${response.status}: ${errorData.message}`);
    }

    log('info', `✅ Order confirmation email sent successfully to ${customerEmail} for order ${orderData.order_number}`);
    return { success: true };

  } catch (error) {
    log('error', `❌ Failed to send order confirmation email: ${error.message}`, { 
      orderNumber: orderData.order_number,
      customerEmail,
      error: error.message 
    });
    return { success: false, error: error.message };
  }
}

// NEW: Direct admin order notification function
async function sendAdminOrderNotificationDirect(orderData, orderItems, shippingAddress, requestId) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    log('info', `📧 Sending admin order notification for order ${orderData.order_number} [${requestId}]`);

    // Format the order total as a currency string
    const orderTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(orderData.total_amount);

    // Format the order date
    const orderDate = new Date(orderData.created_at).toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Format items list for email
    const itemsList = orderItems?.map(item => 
      `${item.quantity}x ${item.product_name} - ${new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(item.unit_price)}`
    ).join('\n') || 'No items listed';

    // Format customer name
    const customerName = shippingAddress ? 
      `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() : 
      'Not provided';

    // Format shipping address
    const formattedShippingAddress = shippingAddress ? 
      `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.postalCode}` : 
      'Not provided';

    const emailData = {
      transactionalId: 'cmb6u4tcl1n8dz10inz2llfzt', // Admin notification template ID (reusing contact template)
      email: 'david.phillips@bookerhq.ca',
      dataVariables: {
        // Map to contact notification template variables for now
        name: `NEW ORDER: ${orderData.order_number}`,
        email: shippingAddress?.email || 'Not provided',
        feedback: `
NEW ORDER RECEIVED!

Order Number: ${orderData.order_number}
Customer: ${customerName}
Customer Email: ${shippingAddress?.email || 'Not provided'}
Order Total: ${orderTotal}
Payment Method: ${orderData.payment_method || 'PayPal'}
Order Date: ${orderDate}

Items Ordered:
${itemsList}

Shipping Address:
${formattedShippingAddress}

Order Status: ${orderData.status || 'confirmed'}
Payment Status: ${orderData.payment_status || 'paid'}
Fulfillment Status: ${orderData.fulfillment_status || 'unfulfilled'}
        `.trim(),
        createdAt: orderDate,
        userStatus: 'New Order Notification'
      }
    };

    log('info', `📧 Prepared admin notification data for order ${orderData.order_number}`);

    // Call Loops API directly
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    const responseText = await response.text();
    log('info', `📧 Admin notification Loops API response: ${response.status}`, { responseText });

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText || `HTTP ${response.status}` };
      }
      throw new Error(`Loops API Error ${response.status}: ${errorData.message}`);
    }

    log('info', `✅ Admin order notification sent successfully for order ${orderData.order_number}`);
    return { success: true };

  } catch (error) {
    log('error', `❌ Failed to send admin order notification: ${error.message}`, { 
      orderNumber: orderData.order_number,
      error: error.message 
    });
    return { success: false, error: error.message };
  }
}

// CART CLEARING FUNCTION - IMPLEMENTATION WITH MULTIPLE FALLBACK METHODS
async function clearUserCart(userId, supabaseAdmin, requestId) {
  log('info', `🛒 Starting cart clearing for user ${userId} [${requestId}]`);
  
  // Method 1: Use the existing RPC function (preferred)
  try {
    log('info', 'Attempting cart clearing via RPC function...');
    
    const { data: deletedCount, error: rpcError } = await supabaseAdmin
      .rpc('delete_user_cart_items', { target_user_id: userId });
    
    if (rpcError) {
      throw new Error(`RPC function failed: ${rpcError.message}`);
    }
    
    log('info', `✅ Cart cleared via RPC function: ${deletedCount} items deleted`);
    return { success: true, method: 'rpc', itemsDeleted: deletedCount };
    
  } catch (rpcError) {
    log('warn', `RPC cart clearing failed, trying fallback methods: ${rpcError.message}`);
    
    // Method 2: Direct cart_items deletion (fallback)
    try {
      log('info', 'Attempting direct cart_items deletion...');
      
      // First, get the user's cart IDs
      const { data: userCarts, error: cartsError } = await supabaseAdmin
        .from('carts')
        .select('cart_id')
        .eq('user_id', userId);
      
      if (cartsError) {
        throw new Error(`Failed to get user carts: ${cartsError.message}`);
      }
      
      if (!userCarts || userCarts.length === 0) {
        log('info', 'No carts found for user, nothing to clear');
        return { success: true, method: 'no-cart', itemsDeleted: 0 };
      }
      
      const cartIds = userCarts.map(cart => cart.cart_id);
      log('info', `Found ${cartIds.length} carts for user: ${cartIds.join(', ')}`);
      
      // Delete cart items
      const { error: deleteItemsError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .in('cart_id', cartIds);
      
      if (deleteItemsError) {
        throw new Error(`Failed to delete cart items: ${deleteItemsError.message}`);
      }
      
      log('info', '✅ Cart items cleared via direct deletion');
      return { success: true, method: 'direct-items', cartsCleared: cartIds.length };
      
    } catch (directError) {
      log('warn', `Direct cart items deletion failed: ${directError.message}`);
      
      // Method 3: Delete entire cart records (nuclear option)
      try {
        log('info', 'Attempting cart record deletion (nuclear option)...');
        
        const { error: deleteCartError } = await supabaseAdmin
          .from('carts')
          .delete()
          .eq('user_id', userId);
        
        if (deleteCartError) {
          throw new Error(`Failed to delete cart records: ${deleteCartError.message}`);
        }
        
        log('info', '✅ Cart records deleted (nuclear option worked)');
        return { success: true, method: 'nuclear', note: 'Entire cart records deleted' };
        
      } catch (nuclearError) {
        log('error', `All cart clearing methods failed: ${nuclearError.message}`);
        return { 
          success: false, 
          error: `All methods failed - RPC: ${rpcError.message}, Direct: ${directError.message}, Nuclear: ${nuclearError.message}` 
        };
      }
    }
  }
}

// Payment recovery mechanism - stores failed payment details for manual processing
async function storeFailedPayment(paymentData, error, requestId) {
  try {
    log('warn', `Storing failed payment for manual recovery [${requestId}]`);
    
    // You could store this in a separate table or external service
    // For now, we'll log it in a structured way for manual processing
    console.error('💳 PAYMENT RECOVERY NEEDED:', {
      requestId,
      timestamp: new Date().toISOString(),
      paymentDetails: {
        paypalOrderId: paymentData.payment_reference,
        customerEmail: paymentData.shipping_address?.email,
        totalAmount: paymentData.total_amount,
        currency: 'CAD'
      },
      orderData: {
        items: paymentData.items?.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price
        })),
        shippingAddress: paymentData.shipping_address
      },
      error: {
        message: error.message,
        context: 'Order creation failed after successful payment'
      },
      actionRequired: 'MANUAL_ORDER_CREATION_NEEDED'
    });
    
  } catch (recoveryError) {
    console.error('Failed to store payment recovery data:', recoveryError);
  }
}

// Timeout wrapper to prevent function timeout
function withFunctionTimeout(promise, timeoutMs = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Function timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

exports.handler = async function(event, context) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  
  // Set context timeout to prevent hanging
  context.callbackWaitsForEmptyEventLoop = false;
  
  log('info', `🚀 ORDER PROCESSING START [${requestId}]`);
  
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
        body: JSON.stringify({ error: 'Method Not Allowed', requestId })
      };
    }

    // ENHANCED: Environment validation with detailed logging
    log('info', 'Validating environment variables...');
    const envIssues = [];
    
    if (!process.env.VITE_SUPABASE_URL) envIssues.push('VITE_SUPABASE_URL missing');
    if (!process.env.VITE_SUPABASE_SERVICE_KEY) envIssues.push('VITE_SUPABASE_SERVICE_KEY missing');
    
    if (envIssues.length > 0) {
      const error = new Error(`Environment configuration error: ${envIssues.join(', ')}`);
      logCriticalError(error, 'Environment validation', requestId);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          requestId,
          details: 'Missing required environment variables'
        })
      };
    }

    // Parse request body with enhanced error handling
    let orderData;
    try {
      log('info', 'Parsing request body...');
      orderData = JSON.parse(event.body);
      
      log('info', 'Request parsed successfully', { 
        hasItems: !!orderData.items,
        itemCount: orderData.items?.length,
        total: orderData.total_amount,
        paymentMethod: orderData.payment_method,
        paymentReference: orderData.payment_reference
      });
      
    } catch (parseError) {
      logCriticalError(parseError, 'JSON parsing', requestId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          requestId,
          details: parseError.message
        })
      };
    }

    // Enhanced validation
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      log('error', 'Order validation failed', { errors: validation.errors });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order validation failed',
          requestId,
          details: validation.errors
        })
      };
    }

    // Create Supabase client with timeout
    log('info', 'Creating Supabase client...');
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

    // Test database connection
    try {
      log('info', 'Testing database connection...');
      const { error: connectionError } = await withFunctionTimeout(
        supabaseAdmin.from('orders').select('id').limit(1),
        5000
      );
      
      if (connectionError) {
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }
      log('info', 'Database connection successful');
      
    } catch (connectionError) {
      logCriticalError(connectionError, 'Database connection', requestId);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed',
          requestId,
          details: connectionError.message
        })
      };
    }

    // Authenticate user with timeout
    log('info', 'Authenticating user...');
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authorization required',
          requestId
        })
      };
    }

    const token = authHeader.substring(7);
    let user;
    
    try {
      const { data: userData, error: userError } = await withFunctionTimeout(
        supabaseAdmin.auth.getUser(token),
        8000
      );
      
      if (userError || !userData?.user) {
        throw new Error(`Authentication failed: ${userError?.message || 'No user data'}`);
      }
      
      user = userData.user;
      log('info', 'User authenticated successfully', { 
        userId: user.id, 
        email: user.email 
      });
      
    } catch (authError) {
      logCriticalError(authError, 'User authentication', requestId);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          requestId,
          details: authError.message
        })
      };
    }

    // CRITICAL: Wrap order creation in timeout to prevent 502 errors
    log('info', 'Starting order creation process...');
    
    const orderResult = await withFunctionTimeout(
      createOrderWithRetry(supabaseAdmin, orderData, user, requestId),
      20000 // 20 second timeout for order creation
    );

    if (!orderResult.success) {
      // If order creation failed after successful payment, store for recovery
      if (orderData.payment_reference) {
        await storeFailedPayment(orderData, orderResult.error, requestId);
      }
      
      logCriticalError(orderResult.error, 'Order creation', requestId);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Order creation failed',
          requestId,
          details: orderResult.error.message,
          paymentCaptured: !!orderData.payment_reference,
          supportMessage: orderData.payment_reference ? 
            'Your payment was captured. Please contact support with this reference: ' + requestId :
            'No payment was captured.'
        })
      };
    }

    const processingTime = Date.now() - startTime;
    log('info', `✅ Order processing completed successfully in ${processingTime}ms [${requestId}]`);

    // CRITICAL: Clear cart immediately after successful order creation (blocking)
    log('info', `🛒 Clearing cart for user ${user.id} after successful order [${requestId}]`);
    const cartClearResult = await clearUserCart(user.id, supabaseAdmin, requestId);
    
    if (!cartClearResult.success) {
      log('warn', `Cart clearing failed but order was successful: ${cartClearResult.error}`, {
        orderId: orderResult.order.id,
        orderNumber: orderResult.order.order_number
      });
      // Don't fail the request - order was created successfully
    } else {
      log('info', `✅ Cart cleared successfully: ${JSON.stringify(cartClearResult)}`);
    }

    // FIXED: Send confirmation email directly (synchronously) instead of background task
    log('info', `📧 Sending order confirmation email [${requestId}]`);
    
    if (process.env.VITE_LOOPS_API_KEY) {
      const customerEmail = orderData.shipping_address?.email;
      const firstName = orderData.shipping_address?.firstName || 'Valued Customer';
      
      if (customerEmail) {
        const emailResult = await sendOrderConfirmationEmailDirect(
          orderResult.order, 
          customerEmail, 
          firstName, 
          requestId
        );
        
        if (emailResult.success) {
          log('info', '✅ Order confirmation email sent successfully');
        } else {
          log('warn', '⚠️ Order confirmation email failed (non-critical)', { error: emailResult.error });
        }
      } else {
        log('warn', '⚠️ No customer email found, skipping confirmation email');
      }

      // NEW: Send admin order notification email (non-blocking)
      log('info', `📧 Sending admin order notification [${requestId}]`);
      
      const adminEmailResult = await sendAdminOrderNotificationDirect(
        orderResult.order,
        orderData.items,
        orderData.shipping_address,
        requestId
      );
      
      if (adminEmailResult.success) {
        log('info', '✅ Admin order notification sent successfully');
      } else {
        log('warn', '⚠️ Admin order notification failed (non-critical)', { error: adminEmailResult.error });
      }
      
    } else {
      log('warn', '⚠️ Loops API key not configured, skipping all email notifications');
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          id: orderResult.order.id,
          order_number: orderResult.order.order_number,
          status: orderResult.order.status,
          payment_status: orderResult.order.payment_status,
          fulfillment_status: orderResult.order.fulfillment_status,
          total_amount: orderResult.order.total_amount,
          created_at: orderResult.order.created_at,
          shipping_address: orderResult.order.shipping_address
        },
        message: 'Order created successfully',
        processing_time_ms: processingTime,
        request_id: requestId,
        cart_cleared: cartClearResult.success,
        cart_clear_method: cartClearResult.success ? cartClearResult.method : 'failed'
      })
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logCriticalError(error, 'Unexpected function error', requestId);
    
    // Check if this was a payment that succeeded but order creation failed
    let orderData;
    try {
      orderData = JSON.parse(event.body);
      if (orderData?.payment_reference) {
        await storeFailedPayment(orderData, error, requestId);
      }
    } catch (e) {
      // Ignore parsing errors here
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        request_id: requestId,
        processing_time_ms: processingTime,
        paymentStatus: orderData?.payment_reference ? 'CAPTURED_ORDER_FAILED' : 'NO_PAYMENT_CAPTURED'
      })
    };
  }
};

// Enhanced order creation with retry logic
async function createOrderWithRetry(supabaseAdmin, orderData, user, requestId, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log('info', `Order creation attempt ${attempt}/${maxRetries} [${requestId}]`);
      
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

      // Create order with timeout
      const { data: createdOrder, error: orderError } = await withFunctionTimeout(
        supabaseAdmin
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
          .single(),
        10000
      );

      if (orderError) {
        throw new Error(`Order insert failed: ${orderError.message} (Code: ${orderError.code})`);
      }

      if (!createdOrder) {
        throw new Error('Order creation returned no data');
      }

      // Create order items
      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map(item => ({
          order_id: createdOrder.id,
          test_kit_id: item.test_kit_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.quantity) * Number(item.unit_price),
          product_name: item.product_name,
          product_description: item.product_description || null
        }));

        const { error: itemsError } = await withFunctionTimeout(
          supabaseAdmin.from('order_items').insert(orderItems),
          8000
        );

        if (itemsError) {
          // Clean up order if items creation fails
          await supabaseAdmin.from('orders').delete().eq('id', createdOrder.id);
          throw new Error(`Order items creation failed: ${itemsError.message}`);
        }
      }

      log('info', `Order created successfully on attempt ${attempt} [${requestId}]`);
      return { success: true, order: createdOrder };
      
    } catch (error) {
      lastError = error;
      log('warn', `Order creation attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 2000);
        log('info', `Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return { success: false, error: lastError };
}

// Validation function (implement based on your needs)
function validateOrderData(orderData) {
  const errors = [];
  
  if (!orderData.shipping_address) errors.push('shipping_address is required');
  if (!orderData.billing_address) errors.push('billing_address is required');
  if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items array is required');
  if (!orderData.total_amount || orderData.total_amount <= 0) errors.push('valid total_amount is required');
  if (!orderData.payment_reference) errors.push('payment_reference is required for completed payments');

  return { isValid: errors.length === 0, errors };
}