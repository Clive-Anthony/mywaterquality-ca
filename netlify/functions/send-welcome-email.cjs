// netlify/functions/send-welcome-email.js

// Loops API configuration
const LOOPS_API_BASE_URL = 'https://app.loops.so/api/v1';

// Send email via Loops API
async function sendLoopsEmail({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    console.log(`Sending welcome email to ${to}`);

    const response = await fetch(`${LOOPS_API_BASE_URL}/transactional`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        transactionalId,
        email: to,
        dataVariables: variables  // Changed from dataFields to dataVariables
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Loops API error:', error);
    throw error;
  }
}

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { email, firstName = 'Valued Customer' } = JSON.parse(event.body);
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }
    
    // Send welcome email via Loops
    await sendLoopsEmail({
      transactionalId: 'cmazp7ib41er0z60iagt7cw00', // Updated to actual Loops ID
      to: email,
      variables: {
        firstName,
        dashboardLink: `${process.env.VITE_APP_URL || 'http://localhost:8888'}/dashboard`,
        websiteURL: process.env.VITE_APP_URL || 'http://localhost:8888' // Note: websiteURL (not websiteUrl)
      }
    });
    
    console.log(`Welcome email sent successfully to ${email}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully'
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};