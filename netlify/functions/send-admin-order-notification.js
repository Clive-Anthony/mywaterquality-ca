// netlify/functions/send-admin-order-notification.js
// Sends order notification emails to admin after successful orders

const { createClient } = require('@supabase/supabase-js');

// Enhanced logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [ADMIN-NOTIFICATION] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Send admin notification email via Loops
async function sendAdminNotificationEmail(orderData, requestId) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    log('info', `📧 Sending admin notification for order ${orderData.order_number} [${requestId}]`);

    // Format the order total as currency
    const orderTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(orderData.total_amount);

    // Format order date
    const orderDate = new Date(orderData.created_at).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });

    // Format shipping address for display
    const shippingAddress = orderData.shipping_address;
    const formattedAddress = `${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.address}
${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.postalCode}
${shippingAddress.country || 'Canada'}
Email: ${shippingAddress.email}`;

    // Format order items for display
    const orderItemsText = orderData.order_items.map(item => 
      `• ${item.product_name} (Qty: ${item.quantity})`
    ).join('\n');

    const emailData = {
      transactionalId: 'cmbax4sey1n651h0it0rm6f8k', // TODO: Replace with actual Loops template ID
      email: 'david.phillips@bookerhq.ca',
      dataVariables: {
        customerName: orderData.customer_name,
        orderNumber: orderData.order_number,
        orderDate: orderDate,
        orderTotal: orderTotal,
        customerEmail: shippingAddress.email,
        shippingAddress: formattedAddress,
        orderItems: orderItemsText,
        itemCount: orderData.order_items.length,
        totalAmount: orderData.total_amount,
        // Additional useful fields for admin
        paymentMethod: orderData.payment_method || 'PayPal',
        orderStatus: orderData.status || 'confirmed',
        specialInstructions: orderData.special_instructions || 'None'
      }
    };

    log('info', `📧 Prepared admin email data for order ${orderData.order_number}`);

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
    log('info', `📧 Loops API response for admin notification: ${response.status}`, { responseText });

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

// Get complete order data with customer info and items
async function getCompleteOrderData(orderId, supabaseAdmin, requestId) {
  try {
    log('info', `📊 Fetching complete order data for order ID: ${orderId} [${requestId}]`);

    // Get order details with customer name from profiles
    const { data: orderWithCustomer, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        created_at,
        total_amount,
        shipping_address,
        billing_address,
        special_instructions,
        payment_method,
        status,
        profiles!inner (
          first_name,
          last_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        product_name,
        quantity,
        unit_price,
        total_price
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    // Combine the data
    const completeOrderData = {
      ...orderWithCustomer,
      customer_name: `${orderWithCustomer.profiles.first_name} ${orderWithCustomer.profiles.last_name}`,
      order_items: orderItems || []
    };

    log('info', `✅ Complete order data fetched successfully`, {
      orderNumber: completeOrderData.order_number,
      customerName: completeOrderData.customer_name,
      itemCount: completeOrderData.order_items.length
    });

    return { success: true, orderData: completeOrderData };

  } catch (error) {
    log('error', `❌ Failed to fetch complete order data: ${error.message}`, { orderId });
    return { success: false, error: error.message };
  }
}

exports.handler = async function(event, context) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  
  log('info', `🚀 ADMIN NOTIFICATION START [${requestId}]`);
  
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
      log('error', 'Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          requestId
        })
      };
    }

    if (!process.env.VITE_LOOPS_API_KEY) {
      log('warn', 'Loops API key not configured, skipping admin notification');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Admin notification skipped - Loops API not configured',
          requestId
        })
      };
    }

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
      log('info', 'Request parsed successfully', { orderId: requestData.orderId });
    } catch (parseError) {
      log('error', 'Failed to parse request body', { error: parseError.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          requestId
        })
      };
    }

    const { orderId } = requestData;
    if (!orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Order ID is required',
          requestId
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

    // Get complete order data
    const orderResult = await getCompleteOrderData(orderId, supabaseAdmin, requestId);
    
    if (!orderResult.success) {
      log('error', 'Failed to fetch order data', { error: orderResult.error });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch order data',
          details: orderResult.error,
          requestId
        })
      };
    }

    // Send admin notification email
    const emailResult = await sendAdminNotificationEmail(orderResult.orderData, requestId);
    
    if (!emailResult.success) {
      log('error', 'Failed to send admin notification', { error: emailResult.error });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to send admin notification',
          details: emailResult.error,
          requestId
        })
      };
    }

    const processingTime = Date.now() - startTime;
    log('info', `✅ Admin notification completed successfully in ${processingTime}ms [${requestId}]`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Admin notification sent successfully',
        orderNumber: orderResult.orderData.order_number,
        customerName: orderResult.orderData.customer_name,
        adminEmail: 'david.phillips@bookerhq.ca',
        processing_time_ms: processingTime,
        request_id: requestId
      })
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    log('error', 'Unexpected function error', { 
      error: error.message,
      stack: error.stack 
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