// netlify/functions/send-order-confirmation-email.js
// Order confirmation email function - FIXED VERSION with correct template ID

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

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    console.log('=== ORDER CONFIRMATION EMAIL FUNCTION ===');
    
    // Log environment for debugging
    console.log('Environment check:', {
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      appUrl: process.env.VITE_APP_URL
    });
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { 
      email, 
      firstName = 'Valued Customer',
      orderNumber,
      orderTotal,
      orderData // Optional: additional order details
    } = parsedBody;
    
    // Validate required fields
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    if (!orderNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order number is required' })
      };
    }

    if (!orderTotal) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order total is required' })
      };
    }
    
    console.log(`Processing order confirmation email for: ${email}`);
    console.log('Order details:', { orderNumber, orderTotal, firstName });
    
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterquality.ca';
    
    // Send order confirmation email via Loops using the correct template ID
    await sendLoopsEmail({
      transactionalId: 'cmb6pqu9c02qht60i7w92yalf', // Correct template ID provided by client
      to: email,
      variables: {
        firstName,
        orderNumber,
        orderTotal,
        dashboardLink: `${baseUrl}/dashboard`,
        websiteURL: baseUrl,
        // Add any additional variables that might be useful for the template
        orderDate: orderData?.created_at ? new Date(orderData.created_at).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'),
        orderStatus: orderData?.status || 'confirmed'
      }
    });
    
    console.log(`Order confirmation email sent successfully to ${email} for order ${orderNumber}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Order confirmation email sent successfully',
        orderNumber,
        sentTo: email
      })
    };
    
  } catch (error) {
    console.error('Order confirmation email function error:', error);
    
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