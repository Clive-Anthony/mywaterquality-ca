// netlify/functions/test-env.js
// Create this temporary file to test your environment variables

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('=== ENVIRONMENT TEST ===');
    
    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.VITE_SUPABASE_SERVICE_KEY,
      hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
      hasAppUrl: !!process.env.VITE_APP_URL,
      nodeEnv: process.env.NODE_ENV
    };

    console.log('Environment variables:', envCheck);

    if (!process.env.VITE_SUPABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing VITE_SUPABASE_URL',
          envCheck
        })
      };
    }

    if (!process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing VITE_SUPABASE_SERVICE_KEY',
          envCheck
        })
      };
    }

    // Test Supabase connection
    console.log('Testing Supabase connection...');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Test database access
    console.log('Testing database access...');
    const { data: tablesTest, error: tablesError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('Database test failed:', tablesError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database access failed',
          details: tablesError.message,
          code: tablesError.code,
          hint: tablesError.hint,
          envCheck
        })
      };
    }

    console.log('Database test passed');

    // Test user authentication (if possible)
    let authTest = 'No auth header provided';
    const authHeader = event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          authTest = `Auth failed: ${userError.message}`;
        } else if (userData?.user) {
          authTest = `Auth successful: ${userData.user.email}`;
        } else {
          authTest = 'Auth failed: No user data';
        }
      } catch (authException) {
        authTest = `Auth exception: ${authException.message}`;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'All tests passed!',
        envCheck,
        databaseTest: 'PASSED',
        authTest,
        timestamp: new Date().toISOString()
      })
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
      })
    };
  }
};