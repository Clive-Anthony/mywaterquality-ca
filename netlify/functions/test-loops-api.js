// netlify/functions/test-loops-api.js
// Simple test to debug Loops API connectivity

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
      const apiKey = process.env.VITE_LOOPS_API_KEY;
      
      if (!apiKey) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No API key found' })
        };
      }
  
      console.log('Testing Loops API...');
      console.log('API Key length:', apiKey.length);
      console.log('API Key starts with:', apiKey.substring(0, 8) + '...');
  
      // Test 1: Try to get contacts (basic API test)
      console.log('Testing contacts endpoint...');
      const contactsResponse = await fetch('https://app.loops.so/api/v1/contacts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
  
      console.log('Contacts response status:', contactsResponse.status);
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log('Contacts response:', contactsData);
      } else {
        const errorText = await contactsResponse.text();
        console.log('Contacts error:', errorText);
      }
  
      // Test 2: Try different transactional endpoints
      const endpointsToTest = [
        'https://app.loops.so/api/v1/transactional',
        'https://app.loops.so/api/v1/emails/send',
        'https://app.loops.so/api/v1/send'
      ];
  
      const testResults = {};
  
      for (const endpoint of endpointsToTest) {
        console.log(`Testing endpoint: ${endpoint}`);
        
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              transactionalId: 'cmay9ss140qtu2u0hrqjhb0or',
              email: 'test@example.com',
              dataVariables: {
                firstName: 'Test',
                verificationLink: 'https://example.com/test',
                websiteURL: 'https://example.com'
              }
            })
          });
  
          testResults[endpoint] = {
            status: response.status,
            statusText: response.statusText
          };
  
          console.log(`${endpoint} - Status: ${response.status}`);
          
          const responseText = await response.text();
          console.log(`${endpoint} - Response:`, responseText);
          
        } catch (error) {
          testResults[endpoint] = {
            error: error.message
          };
          console.log(`${endpoint} - Error:`, error.message);
        }
      }
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          apiKeyExists: true,
          apiKeyLength: apiKey.length,
          contactsStatus: contactsResponse.status,
          endpointTests: testResults,
          message: 'Check console for detailed logs'
        })
      };
  
    } catch (error) {
      console.error('Test error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: error.message,
          stack: error.stack
        })
      };
    }
  };