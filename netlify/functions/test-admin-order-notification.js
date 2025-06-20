// netlify/functions/test-admin-order-notification.js
// Test function to verify admin order notification works correctly

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🧪 ========== TESTING ADMIN ORDER NOTIFICATION ==========');
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_SERVICE_KEY,
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      appUrl: process.env.VITE_APP_URL || 'NOT SET'
    };

    console.log('✅ Environment check:', envCheck);

    if (!process.env.VITE_LOOPS_API_KEY) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Loops API key not configured',
          envCheck
        })
      };
    }

    // Use test order ID from query params or create mock data
    const testOrderId = event.queryStringParameters?.orderId;
    
    if (testOrderId) {
      console.log('🧪 Testing with real order ID:', testOrderId);
      
      // Test with real order data
      if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
        throw new Error('Supabase credentials missing for real order test');
      }

      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_SERVICE_KEY
      );

      // Call the admin notification function with real data
      const { sendAdminOrderNotification } = require('./process-order');
      
      // Since we can't directly import from process-order, let's test the API directly
      const testResponse = await fetch('/.netlify/functions/send-admin-order-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: testOrderId })
      });

      const testResult = await testResponse.json();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Real order test completed',
          testOrderId,
          result: testResult,
          envCheck
        })
      };
      
    } else {
      console.log('🧪 Testing with mock data (no orderId provided)');
      
      // Create mock order data for testing
      const mockOrderData = {
        order_number: 'TEST-ADMIN-' + Date.now(),
        customer_name: 'John Doe Test Customer',
        total_amount: 149.99,
        created_at: new Date().toISOString(),
        shipping_address: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          address: '123 Test Street',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5V 3A8',
          country: 'Canada'
        },
        order_items: [
          {
            product_name: 'Comprehensive Water Testing Kit',
            quantity: 1,
            unit_price: 129.99,
            total_price: 129.99
          },
          {
            product_name: 'Basic Water Testing Kit',
            quantity: 1,
            unit_price: 19.99,
            total_price: 19.99
          }
        ],
        payment_method: 'PayPal',
        status: 'confirmed',
        special_instructions: 'Please handle with care - test order'
      };

      // Format data for admin email
      const orderTotal = new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(mockOrderData.total_amount);

      const orderDate = new Date(mockOrderData.created_at).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Toronto'
      });

      const formattedAddress = `${mockOrderData.shipping_address.firstName} ${mockOrderData.shipping_address.lastName}
${mockOrderData.shipping_address.address}
${mockOrderData.shipping_address.city}, ${mockOrderData.shipping_address.province} ${mockOrderData.shipping_address.postalCode}
${mockOrderData.shipping_address.country}
Email: ${mockOrderData.shipping_address.email}`;

      const orderItemsText = mockOrderData.order_items.map(item => 
        `• ${item.product_name} (Qty: ${item.quantity}) - ${new Intl.NumberFormat('en-CA', {
          style: 'currency',
          currency: 'CAD',
        }).format(item.total_price)}`
      ).join('\n');

      // Test email data
      const testEmailData = {
        transactionalId: 'cmbax4sey1n651h0it0rm6f8k', // TODO: Replace with actual template ID
        email: 'development@mywaterquality.ca', //development@mywaterquality.ca
        dataVariables: {
          customerName: mockOrderData.customer_name,
          orderNumber: mockOrderData.order_number,
          orderDate: orderDate,
          orderTotal: orderTotal,
          customerEmail: mockOrderData.shipping_address.email,
          shippingAddress: formattedAddress,
          orderItems: orderItemsText,
          itemCount: mockOrderData.order_items.length,
          totalAmount: mockOrderData.total_amount,
          paymentMethod: mockOrderData.payment_method,
          orderStatus: mockOrderData.status,
          specialInstructions: mockOrderData.special_instructions
        }
      };

      console.log('🧪 Test email data prepared:', JSON.stringify(testEmailData, null, 2));

      // Test Loops API call (but don't actually send to avoid spam)
      console.log('🧪 Would send to Loops API with this data:');
      console.log('📧 To:', testEmailData.email);
      console.log('📧 Template ID:', testEmailData.transactionalId);
      console.log('📧 Variables:', testEmailData.dataVariables);

      // Uncomment this section to actually test the email sending:
      /*
      const response = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`
        },
        body: JSON.stringify(testEmailData)
      });

      const responseText = await response.text();
      console.log('🧪 Loops API Response:', response.status, responseText);
      */

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Mock admin notification test completed (email not actually sent)',
          mockData: mockOrderData,
          emailData: testEmailData,
          note: 'Uncomment the Loops API call in the function to actually send test emails',
          instructions: 'To test with a real order, add ?orderId=YOUR_ORDER_ID to the URL',
          envCheck
        }, null, 2)
      };
    }

  } catch (error) {
    console.error('🧪 ❌ Test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        message: '❌ Admin notification test failed: ' + error.message
      }, null, 2)
    };
  }
};