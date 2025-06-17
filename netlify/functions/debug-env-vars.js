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
      console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
      
      // Check what environment variables are available
      const envCheck = {
        // Required variables
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_SERVICE_KEY: !!process.env.VITE_SUPABASE_SERVICE_KEY,
        VITE_LOOPS_API_KEY: !!process.env.VITE_LOOPS_API_KEY,
        VITE_APP_URL: process.env.VITE_APP_URL || 'NOT SET',
        
        // Netlify specific variables
        NETLIFY: !!process.env.NETLIFY,
        NETLIFY_DEV: !!process.env.NETLIFY_DEV,
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        
        // Context info
        CONTEXT: process.env.CONTEXT || 'NOT SET',
        BRANCH: process.env.BRANCH || 'NOT SET',
        
        // Partial values (first 10 characters) for debugging without exposing secrets
        SUPABASE_URL_PREVIEW: process.env.VITE_SUPABASE_URL ? 
          process.env.VITE_SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
        SUPABASE_KEY_PREVIEW: process.env.VITE_SUPABASE_SERVICE_KEY ? 
          process.env.VITE_SUPABASE_SERVICE_KEY.substring(0, 10) + '...' : 'MISSING',
        LOOPS_KEY_PREVIEW: process.env.VITE_LOOPS_API_KEY ? 
          process.env.VITE_LOOPS_API_KEY.substring(0, 10) + '...' : 'MISSING'
      };
  
      console.log('Environment check results:', envCheck);
  
      // Test Supabase connection if variables are present
      let supabaseTest = { skipped: 'Missing environment variables' };
      if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_SERVICE_KEY) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_SERVICE_KEY
          );
          
          // Simple test query
          const { data, error } = await supabase
            .from('test_kits')
            .select('id')
            .limit(1);
          
          supabaseTest = {
            connectionWorks: !error,
            error: error?.message,
            hasData: !!data?.length
          };
        } catch (err) {
          supabaseTest = { error: err.message };
        }
      }
  
      const result = {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        supabaseTest,
        recommendations: []
      };
  
      // Add recommendations
      if (!envCheck.VITE_SUPABASE_URL) {
        result.recommendations.push('Set VITE_SUPABASE_URL in Netlify environment variables');
      }
      if (!envCheck.VITE_SUPABASE_SERVICE_KEY) {
        result.recommendations.push('Set VITE_SUPABASE_SERVICE_KEY in Netlify environment variables');
      }
      if (!envCheck.VITE_LOOPS_API_KEY) {
        result.recommendations.push('Set VITE_LOOPS_API_KEY in Netlify environment variables');
      }
      if (!envCheck.VITE_APP_URL || envCheck.VITE_APP_URL === 'NOT SET') {
        result.recommendations.push('Set VITE_APP_URL in Netlify environment variables');
      }
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result, null, 2)
      };
  
    } catch (error) {
      console.error('Debug function error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Debug function failed',
          message: error.message,
          stack: error.stack
        }, null, 2)
      };
    }
  };