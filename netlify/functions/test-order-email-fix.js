// netlify/functions/test-order-email-fix.js
// Simple test to verify the fixed email integration works

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
    console.log('🧪 ========== TESTING FIXED EMAIL INTEGRATION ==========');
    
    // Check environment
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('❌ VITE_LOOPS_API_KEY not found');
    }
    
    console.log('✅ API Key found');
    
    // Test email from query params
    const testEmail = event.queryStringParameters?.email || 'test@example.com';
    const testName = event.queryStringParameters?.name || 'Test Customer';
    
    // Mock order data (similar to what would be created)
    const mockOrderData = {
      order_number: 'TEST-' + Date.now(),
      total_amount: 129.99,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    
    console.log('🧪 Testing with mock order:', mockOrderData);
    console.log('🧪 Sending to email:', testEmail);
    
    // Use the same direct email function logic from the fixed process-order.js
    const orderTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(mockOrderData.total_amount);

    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';

    const emailData = {
      transactionalId: 'cmb6pqu9c02qht60i7w92yalf', // Order confirmation template ID
      email: testEmail,
      dataVariables: {
        firstName: testName,
        orderNumber: mockOrderData.order_number,
        orderTotal: orderTotal,
        dashboardLink: `${baseUrl}/dashboard`,
        websiteURL: baseUrl,
        orderDate: new Date(mockOrderData.created_at).toLocaleDateString('en-CA'),
        orderStatus: mockOrderData.status
      }
    };
    
    console.log('🧪 Email data prepared:', JSON.stringify(emailData, null, 2));
    
    // Call Loops API directly (same as in the fixed function)
    console.log('🧪 Calling Loops API directly...');
    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(emailData)
    });
    
    const responseText = await response.text();
    console.log('🧪 Loops API Response Status:', response.status);
    console.log('🧪 Loops API Response:', responseText);
    
    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseText,
      emailData: emailData,
      mockOrderData: mockOrderData,
      timestamp: new Date().toISOString(),
      testEmail: testEmail,
      message: response.ok 
        ? `✅ SUCCESS! Test order confirmation email sent to ${testEmail}` 
        : `❌ FAILED! Status: ${response.status}`
    };
    
    if (response.ok) {
      console.log('🧪 ✅ SUCCESS! Email integration is working!');
      console.log('🧪 📧 Test email sent to:', testEmail);
      console.log('🧪 📦 Mock order number:', mockOrderData.order_number);
    } else {
      console.log('🧪 ❌ FAILED! Email integration is not working');
      console.log('🧪 ❌ Error:', responseText);
    }
    
    console.log('🧪 ========== TEST COMPLETED ==========');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

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
        message: '❌ Test failed with error: ' + error.message
      }, null, 2)
    };
  }
};