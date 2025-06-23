// netlify/functions/process-order.js - FIXED VERSION with proper email notifications for all orders
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

// FIXED: Customer order confirmation email with order items included
async function sendOrderConfirmationEmailDirect(orderData, orderItems, customerEmail, firstName, requestId) {
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

    // Format order items for customer email
    const orderItemsText = orderItems?.map(item => 
      `• ${item.product_name} (Qty: ${item.quantity}) - ${new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(item.unit_price)} each`
    ).join('\n') || 'No items listed';

    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';

    const emailData = {
      transactionalId: 'cmb6pqu9c02qht60i7w92yalf', // Customer order confirmation template ID
      email: customerEmail,
      dataVariables: {
        firstName: firstName || 'Valued Customer',
        orderNumber: orderData.order_number,
        orderTotal: orderTotal,
        orderItems: orderItemsText,
        dashboardLink: `${baseUrl}/dashboard`,
        websiteURL: baseUrl,
        orderDate: new Date(orderData.created_at).toLocaleDateString('en-CA'),
        orderStatus: orderData.status || 'confirmed',
        couponApplied: orderData.coupon_code || 'None'
      }
    };

    log('info', `📧 Prepared customer email data for order ${orderData.order_number}`, {
      templateId: emailData.transactionalId,
      itemCount: orderItems?.length || 0,
      orderTotal: emailData.dataVariables.orderTotal,
      isFreeOrder: emailData.dataVariables.isFreeOrder
    });

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
    log('info', `📧 Customer email Loops API response: ${response.status}`, { responseText });

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

// FIXED: Admin order notification with correct template ID and proper data structure
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
    const orderDate = new Date(orderData.created_at).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });

    // Format customer name
    const customerName = shippingAddress ? 
      `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() : 
      'Not provided';

    // Format shipping address for display
    const formattedShippingAddress = shippingAddress ? 
      `${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.address}
${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.postalCode}
${shippingAddress.country || 'Canada'}
Email: ${shippingAddress.email}` : 'Not provided';

    // Format order items for display
    const orderItemsText = orderItems?.map(item => 
      `• ${item.product_name} (Qty: ${item.quantity}) - ${new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(item.unit_price)} each`
    ).join('\n') || 'No items listed';

    // Use the correct admin template ID
    const emailData = {
      transactionalId: 'cmbax4sey1n651h0it0rm6f8k', // Admin notification template ID
      email: 'david.phillips@bookerhq.ca',
      dataVariables: {
        customerName: customerName,
        orderNumber: orderData.order_number,
        orderDate: orderDate,
        orderTotal: orderTotal,
        customerEmail: shippingAddress?.email || 'Not provided',
        shippingAddress: formattedShippingAddress,
        orderItems: orderItemsText,
        totalAmount: orderData.total_amount,
        paymentMethod: orderData.payment_method || 'PayPal',
        orderStatus: orderData.status || 'confirmed',
        specialInstructions: orderData.special_instructions || 'None provided',
        couponApplied: orderData.coupon_code || 'None'
      }
    };

    log('info', `📧 Prepared admin notification data for order ${orderData.order_number}`, {
      templateId: emailData.transactionalId,
      customerEmail: emailData.dataVariables.customerEmail,
      orderTotal: emailData.dataVariables.orderTotal
    });

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

// Record coupon usage in the database
async function recordCouponUsage(supabaseAdmin, couponId, userId, orderId, discountAmount, requestId) {
  try {
    log('info', `🎫 Recording coupon usage [${requestId}]`, {
      couponId,
      userId,
      orderId,
      discountAmount
    });

    // Insert coupon usage record
    const { error: usageError } = await supabaseAdmin
      .from('coupon_usage')
      .insert([{
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount
      }]);

    if (usageError) {
      throw usageError;
    }

    // Update coupon usage count
    const { error: updateError } = await supabaseAdmin
      .from('coupons')
      .update({ 
        usage_count: supabaseAdmin.sql`usage_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('coupon_id', couponId);

    if (updateError) {
      throw updateError;
    }

    log('info', `✅ Coupon usage recorded successfully [${requestId}]`);
    return { success: true };

  } catch (error) {
    log('error', `❌ Failed to record coupon usage: ${error.message}`, {
      couponId,
      userId,
      orderId,
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

    // Environment validation
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          requestId
        })
      };
    }

    // Parse request body
    let orderData;
    try {
      orderData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          requestId
        })
      };
    }

    // Enhanced validation for coupon orders
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

    // Create Supabase client
    const supabaseAdmin = createClient(
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
          error: 'Authorization required',
          requestId
        })
      };
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await withFunctionTimeout(
      supabaseAdmin.auth.getUser(token),
      8000
    );
    
    if (userError || !userData?.user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          requestId
        })
      };
    }

    const user = userData.user;
    log('info', 'User authenticated successfully', { 
      userId: user.id, 
      email: user.email,
      isFreeOrder: orderData.is_free_order || false
    });

    // Create order with timeout
    const orderResult = await withFunctionTimeout(
      createOrderWithRetry(supabaseAdmin, orderData, user, requestId),
      20000
    );

    if (!orderResult.success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Order creation failed',
          requestId,
          details: orderResult.error.message
        })
      };
    }

    // Record coupon usage if applicable
    if (orderData.coupon_id && orderData.discount_amount > 0) {
      const couponUsageResult = await recordCouponUsage(
        supabaseAdmin, 
        orderData.coupon_id, 
        user.id, 
        orderResult.order.id, 
        orderData.discount_amount, 
        requestId
      );
      
      if (!couponUsageResult.success) {
        log('warn', 'Coupon usage recording failed but order was successful', {
          error: couponUsageResult.error,
          orderId: orderResult.order.id
        });
      }
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

    // FIXED: Send both customer and admin emails with proper error handling and await
    log('info', `📧 Starting email notifications [${requestId}]`);
    
    if (process.env.VITE_LOOPS_API_KEY) {
      const customerEmail = orderData.shipping_address?.email;
      const firstName = orderData.shipping_address?.firstName || 'Valued Customer';
      
      // FIXED: Properly await both email functions and handle all cases
      try {
        // Send customer confirmation email
        if (customerEmail) {
          log('info', `📧 Sending customer confirmation email to ${customerEmail} [${requestId}]`);
          const customerEmailResult = await sendOrderConfirmationEmailDirect(
            orderResult.order, 
            orderData.items, // Pass order items to customer email
            customerEmail, 
            firstName, 
            requestId
          );
          
          if (customerEmailResult.success) {
            log('info', '✅ Customer order confirmation email sent successfully');
          } else {
            log('warn', '⚠️ Customer order confirmation email failed (non-critical)', { 
              error: customerEmailResult.error 
            });
          }
        } else {
          log('warn', '⚠️ No customer email found, skipping customer confirmation email');
        }

        // FIXED: Send admin order notification email with proper template ID and await
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
          log('warn', '⚠️ Admin order notification failed (non-critical)', { 
            error: adminEmailResult.error 
          });
        }
        
      } catch (emailError) {
        log('error', '❌ Email notification process failed', { error: emailError.message });
        // Don't fail the order - emails are non-critical
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
          total_amount: orderResult.order.total_amount,
          discount_amount: orderResult.order.discount_amount,
          coupon_code: orderResult.order.coupon_code,
          is_free_order: orderResult.order.total_amount === 0,
          created_at: orderResult.order.created_at
        },
        message: orderResult.order.total_amount === 0 ? 
          'Free order created successfully!' : 
          'Order created successfully',
        processing_time_ms: processingTime,
        request_id: requestId
      })
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('error', 'Unexpected function error', { 
      error: error.message,
      requestId,
      processingTime 
    });
    
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

// Enhanced order creation with coupon support
async function createOrderWithRetry(supabaseAdmin, orderData, user, requestId, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log('info', `Order creation attempt ${attempt}/${maxRetries} [${requestId}]`);
      
      // Determine payment status based on whether it's a free order
      const isFreeOrder = orderData.is_free_order || orderData.total_amount === 0;
      
      const orderInsertData = {
        user_id: user.id,
        status: 'confirmed',
        payment_status: isFreeOrder ? 'not_required' : 'paid',
        fulfillment_status: 'unfulfilled',
        subtotal: Number(orderData.subtotal) || 0,
        shipping_cost: Number(orderData.shipping_cost) || 0,
        tax_amount: Number(orderData.tax_amount) || 0,
        total_amount: Number(orderData.total_amount),
        discount_amount: Number(orderData.discount_amount) || 0,
        coupon_code: orderData.coupon_code || null,
        coupon_id: orderData.coupon_id || null,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        special_instructions: orderData.special_instructions || null,
        payment_method: isFreeOrder ? 'free' : (orderData.payment_method || 'paypal'),
        payment_data: isFreeOrder ? 
          { type: 'free_order', completed_at: new Date().toISOString() } :
          (orderData.payment_reference ? 
            { reference: orderData.payment_reference, completed_at: new Date().toISOString() } : null)
      };

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
            discount_amount,
            coupon_code,
            coupon_id,
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

      log('info', `Order created successfully on attempt ${attempt} [${requestId}]`, {
        orderId: createdOrder.id,
        orderNumber: createdOrder.order_number,
        isFreeOrder: createdOrder.total_amount === 0,
        discountAmount: createdOrder.discount_amount
      });
      
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

// Enhanced validation function
function validateOrderData(orderData) {
  const errors = [];
  
  if (!orderData.shipping_address) errors.push('shipping_address is required');
  if (!orderData.billing_address) errors.push('billing_address is required');
  if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items array is required');
  if (orderData.total_amount === undefined || orderData.total_amount < 0) errors.push('valid total_amount is required');
  
  // For non-free orders, require payment reference
  const isFreeOrder = orderData.is_free_order || orderData.total_amount === 0;
  if (!isFreeOrder && !orderData.payment_reference) {
    errors.push('payment_reference is required for paid orders');
  }

  return { isValid: errors.length === 0, errors };
}