// netlify/functions/send-password-reset-email.js
const { createClient } = require('@supabase/supabase-js');

// Send email via Loops API
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
    
    // Validate environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );
    
    // First, check if user exists with this email
    console.log('Checking if user exists...');
    const { data: existingUsers, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error checking users:', userError);
      throw new Error('Failed to verify user');
    }
    
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (!userExists) {
      console.log(`No user found with email: ${email}`);
      // For security, return success even if user doesn't exist
      // This prevents email enumeration attacks
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
    
    // Generate password reset link with FIXED redirect URL
    console.log('Generating password reset link...');
    
    // Get the base URL and ensure it's correct
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterquality.netlify.app';
    const redirectUrl = `${baseUrl}/auth/callback?type=recovery&next=/update-password`;
    
    console.log('Using redirect URL:', redirectUrl);
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
      }
    });
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to generate reset link: ${error.message}`);
    }
    
    const resetLink = data?.properties?.action_link;
    if (!resetLink) {
      throw new Error('No reset link generated');
    }
    
    console.log('Reset link generated successfully');
    console.log('Reset link (first 50 chars):', resetLink.substring(0, 50) + '...');
    
    // Send password reset email via Loops
    await sendLoopsEmail({
      transactionalId: 'cmb28rmz1and0430ibgyat1uw', // Your Loops template ID for password reset
      to: email,
      variables: {
        firstName,
        resetLink,
        websiteURL: baseUrl,
        // Optional: Add expiration time info
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
        message: error.message
      })
    };
  }
};