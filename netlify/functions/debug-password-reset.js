// netlify/functions/debug-password-reset.js
// Create this file to debug the password reset flow

exports.handler = async function(event, context) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    try {
      console.log('=== PASSWORD RESET DEBUG ===');
      
      // Check environment variables
      const envChecks = {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_SERVICE_KEY: !!process.env.VITE_SUPABASE_SERVICE_KEY,
        VITE_LOOPS_API_KEY: !!process.env.VITE_LOOPS_API_KEY,
        VITE_APP_URL: process.env.VITE_APP_URL || 'NOT SET'
      };
      
      console.log('Environment variables:', envChecks);
      
      // Test Loops API connectivity
      let loopsTest = { error: 'Not tested' };
      if (process.env.VITE_LOOPS_API_KEY) {
        try {
          const testResponse = await fetch('https://app.loops.so/api/v1/contacts', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          const responseText = await testResponse.text();
          loopsTest = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            responseText: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
          };
        } catch (error) {
          loopsTest = { error: error.message };
        }
      }
      
      // Test Supabase connectivity
      let supabaseTest = { error: 'Not tested' };
      if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_SERVICE_KEY) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_SERVICE_KEY
          );
          
          const { data, error } = await supabase.auth.admin.listUsers();
          if (error) {
            supabaseTest = { error: error.message };
          } else {
            supabaseTest = { 
              success: true, 
              userCount: data?.users?.length || 0 
            };
          }
        } catch (error) {
          supabaseTest = { error: error.message };
        }
      }
      
      // Test template ID if provided
      let templateTest = { skipped: 'No test email provided' };
      if (event.queryStringParameters?.testEmail) {
        const testEmail = event.queryStringParameters.testEmail;
        try {
          const response = await fetch('https://app.loops.so/api/v1/transactional', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`
            },
            body: JSON.stringify({
              transactionalId: 'cmb28rmz1and0430ibgyat1uw',
              email: testEmail,
              dataVariables: {
                firstName: 'Test User',
                resetLink: 'https://example.com/test-reset-link',
                websiteURL: 'https://example.com',
                expirationTime: '60 minutes'
              }
            })
          });
          
          const responseText = await response.text();
          templateTest = {
            status: response.status,
            statusText: response.statusText,
            responseText: responseText.substring(0, 500)
          };
        } catch (error) {
          templateTest = { error: error.message };
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          environment: envChecks,
          loopsApiTest: loopsTest,
          supabaseTest: supabaseTest,
          templateTest: templateTest,
          instructions: 'Add ?testEmail=your@email.com to test the template',
          timestamp: new Date().toISOString()
        }, null, 2)
      };
      
    } catch (error) {
      console.error('Debug error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: error.message,
          stack: error.stack
        }, null, 2)
      };
    }
  };