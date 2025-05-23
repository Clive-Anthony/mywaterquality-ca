// netlify/functions/generate-verification-link.js
const { createClient } = require('@supabase/supabase-js');

// Send email via Loops API - EXACT format that worked in test
async function sendLoopsEmail({ transactionalId, to, variables }) {
  try {
    const apiKey = process.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key not configured');
    }

    console.log(`Sending email to ${to} with template ${transactionalId}`);
    console.log('Variables:', JSON.stringify(variables, null, 2));

    // Use the exact format that returned {"success":true} in the test
    const requestBody = {
      transactionalId: transactionalId,
      email: to,
      dataVariables: variables
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Loops API response status:', response.status);
    console.log('Loops API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Loops API response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText };
      }
      
      throw new Error(`Loops API Error ${response.status}: ${errorData.message || responseText}`);
    }

    // Parse JSON response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { success: true };
    }

    console.log('Email sent successfully:', responseData);
    return responseData;
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
    console.log('=== VERIFICATION EMAIL DEBUG ===');
    console.log('Raw request body:', event.body);
    
    const { email, firstName = 'Valued Customer' } = JSON.parse(event.body);
    
    console.log('Processing verification email for:', email);
    console.log('First name:', firstName);
    
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
    
    // Generate verification link
    console.log('Generating verification link...');
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:8888'}/auth/callback`,
      }
    });
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to generate verification link: ${error.message}`);
    }
    
    const verificationLink = data?.properties?.action_link;
    if (!verificationLink) {
      throw new Error('No verification link generated');
    }
    
    console.log('Verification link generated successfully');
    console.log('Verification link (first 50 chars):', verificationLink.substring(0, 50) + '...');
    
    // Send verification email via Loops using the EXACT format that worked in test
    console.log('=== SENDING WITH EXACT TEST FORMAT ===');
    await sendLoopsEmail({
      transactionalId: 'cmay9ss140qtu2u0hrqjhb0or',
      to: email,
      variables: {
        firstName,
        verificationLink,
        websiteURL: process.env.VITE_APP_URL || 'http://localhost:8888'
      }
    });
    
    console.log(`Verification email sent successfully to ${email}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Verification email sent successfully'
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