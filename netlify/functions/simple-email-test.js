// netlify/functions/simple-email-test.js
// Simplest possible test - just sends an email directly to Loops

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
      console.log('🧪 ========== SIMPLE EMAIL TEST START ==========');
      
      // Get test email from query params
      const testEmail = event.queryStringParameters?.email || 'test@example.com';
      const testName = event.queryStringParameters?.name || 'Test User';
      
      console.log('🧪 Testing with:', { email: testEmail, name: testName });
      
      // Check API key
      const apiKey = process.env.VITE_LOOPS_API_KEY;
      if (!apiKey) {
        throw new Error('❌ VITE_LOOPS_API_KEY not found in environment');
      }
      
      console.log('🧪 API Key found:', {
        length: apiKey.length,
        prefix: apiKey.substring(0, 8) + '...'
      });
      
      // Prepare email data
      const emailData = {
        transactionalId: 'cmb6pqu9c02qht60i7w92yalf',
        email: testEmail,
        dataVariables: {
          firstName: testName,
          orderNumber: 'TEST-' + Date.now(),
          orderTotal: '$99.99',
          dashboardLink: 'https://example.com/dashboard',
          websiteURL: 'https://example.com',
          orderDate: new Date().toLocaleDateString('en-CA'),
          orderStatus: 'confirmed'
        }
      };
      
      console.log('🧪 Email data prepared:', JSON.stringify(emailData, null, 2));
      
      // Call Loops API directly
      console.log('🧪 Calling Loops API...');
      const response = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(emailData)
      });
      
      console.log('🧪 Loops API response status:', response.status);
      console.log('🧪 Loops API response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('🧪 Loops API response body:', responseText);
      
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        emailData,
        timestamp: new Date().toISOString()
      };
      
      if (response.ok) {
        console.log('🧪 ✅ SUCCESS! Email should be sent to:', testEmail);
        result.message = `✅ SUCCESS! Email sent to ${testEmail}`;
      } else {
        console.log('🧪 ❌ FAILED! Email was not sent');
        result.message = `❌ FAILED! Status: ${response.status}`;
      }
      
      console.log('🧪 ========== SIMPLE EMAIL TEST END ==========');
      
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
          timestamp: new Date().toISOString()
        }, null, 2)
      };
    }
  };