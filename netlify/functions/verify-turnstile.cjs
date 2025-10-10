// netlify/functions/verify-turnstile.cjs
// Cloudflare Turnstile verification function

exports.handler = async (event) => {
  console.log('=== Turnstile Verification Function Called ===');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Token is required' 
        })
      };
    }

    // Get secret key from environment (no VITE_ prefix for server-side)
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        })
      };
    }

    // Verify the token with Cloudflare
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await response.json();

    console.log('Turnstile verification result:', {
      success: data.success,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: data.success,
        challenge_ts: data.challenge_ts,
        hostname: data.hostname,
        error_codes: data['error-codes'] || [],
      }),
    };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Verification failed',
        details: error.message 
      })
    };
  }
};