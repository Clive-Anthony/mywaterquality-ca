// netlify/functions/send-password-reset-email.js - FIXED VERSION
const { createClient } = require('@supabase/supabase-js');

async function sendLoopsEmail({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    console.log(`Sending password reset email to ${to}`);

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
    console.log('=== PASSWORD RESET FUNCTION ===');
    
    // Log environment for debugging
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_SERVICE_KEY,
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

    const { email, firstName = 'User' } = parsedBody;
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }
    
    // Validate environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );
    
    // Check if user exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error checking users:', userError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to verify user' })
      };
    }
    
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (!userExists) {
      console.log(`No user found with email: ${email}`);
      // Return success anyway for security (prevent email enumeration)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'If an account with that email exists, you will receive a password reset email.'
        })
      };
    }
    
    console.log(`User found with email: ${email}`);
    
    // FIXED: Use the correct site URL with callback path
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';
    const redirectUrl = `${baseUrl}/auth/callback`;
    
    console.log('Using redirect URL:', redirectUrl);
    
    // Generate password reset link with shorter expiration to avoid timeout issues
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
        // Add explicit expiration time (default might be too long)
        // Note: This is in seconds, 3600 = 1 hour
        expiresIn: 3600
      }
    });
    
    if (error) {
      console.error('Supabase generateLink error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Failed to generate reset link: ${error.message}` })
      };
    }
    
    const resetLink = data?.properties?.action_link;
    if (!resetLink) {
      console.error('No reset link generated from Supabase');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to generate reset link' })
      };
    }
    
    console.log('Reset link generated successfully');
    console.log('Reset link domain:', new URL(resetLink).hostname);
    console.log('Redirect URL in link:', new URL(resetLink).searchParams.get('redirect_to'));
    
    // Send password reset email via Loops
    await sendLoopsEmail({
      transactionalId: 'cmb28rmz1and0430ibgyat1uw',
      to: email,
      variables: {
        firstName,
        resetLink,
        websiteURL: baseUrl,
        expirationTime: '60 minutes'
      }
    });
    
    console.log(`Password reset email sent successfully to ${email}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully'
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
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