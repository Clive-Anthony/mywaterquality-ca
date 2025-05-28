// netlify/functions/test-order-confirmation-email.js
// Test function to verify order confirmation email functionality

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
    console.log('=== ORDER CONFIRMATION EMAIL TEST ===');
    
    // Check environment variables
    const envCheck = {
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      hasAppUrl: !!process.env.VITE_APP_URL,
      appUrl: process.env.VITE_APP_URL || 'NOT SET'
    };
    
    console.log('Environment variables:', envCheck);
    
    // Get test email from query params or use default
    const testEmail = event.queryStringParameters?.email || 'test@example.com';
    const testFirstName = event.queryStringParameters?.firstName || 'Test Customer';
    
    console.log(`Testing with email: ${testEmail}, firstName: ${testFirstName}`);
    
    if (!process.env.VITE_LOOPS_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Loops API key not configured',
          envCheck
        })
      };
    }

    // Test the confirmation email with sample data
    const testOrderData = {
      email: testEmail,
      firstName: testFirstName,
      orderNumber: 'TEST-' + Date.now(),
      orderTotal: '$129.97',
      orderData: {
        id: 'test-order-id',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        total_amount: 129.97
      }
    };

    console.log('Sending test order confirmation email...');
    console.log('Test data:', JSON.stringify(testOrderData, null, 2));

    // Get the current host for the function call
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Call our order confirmation email function
    const response = await fetch(`${baseUrl}/.netlify/functions/send-order-confirmation-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrderData)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    const testResult = {
      success: response.ok,
      status: response.status,
      response: responseData,
      testData: testOrderData,
      envCheck,
      templateId: 'cmb6pqu9c02qht60i7w92yalf',
      timestamp: new Date().toISOString()
    };

    if (response.ok) {
      console.log('✅ Order confirmation email test successful!');
      console.log('🎉 Email sent to:', testEmail);
      console.log('📧 Order number:', testOrderData.orderNumber);
    } else {
      console.error('❌ Order confirmation email test failed');
      console.error('Error details:', responseData);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResult, null, 2)
    };

  } catch (error) {
    console.error('Test function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test function failed',
        message: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};