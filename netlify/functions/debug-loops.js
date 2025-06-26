// // netlify/functions/debug-loops.js
// // Debug function to test Loops API connectivity

// exports.handler = async function(event, context) {
//     const headers = {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Headers': 'Content-Type',
//       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
//     };
  
//     if (event.httpMethod === 'OPTIONS') {
//       return { statusCode: 200, headers, body: '' };
//     }
  
//     try {
//       const apiKey = process.env.VITE_LOOPS_API_KEY;
      
//       console.log('API Key exists:', !!apiKey);
//       console.log('API Key length:', apiKey ? apiKey.length : 0);
//       console.log('API Key prefix:', apiKey ? apiKey.substring(0, 8) + '...' : 'none');
      
//       // Test 1: Check if API key works by calling a simple endpoint
//       const testResponse = await fetch('https://app.loops.so/api/v1/contacts', {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${apiKey}`,
//           'Content-Type': 'application/json'
//         }
//       });
      
//       console.log('Contacts API response status:', testResponse.status);
      
//       // Test 3: Try sending a test email with actual template ID
//       console.log('Testing verification email template...');
//       const testEmailResponse = await fetch(`${LOOPS_API_BASE_URL}/transactional`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${apiKey}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           transactionalId: 'cmay9ss140qtu2u0hrqjhb0or',
//           email: 'test@example.com',
//           dataVariables: {  // Changed from dataFields to dataVariables
//             firstName: 'Test',
//             verificationLink: 'https://example.com/verify',
//             websiteURL: 'https://example.com'
//           }
//         })
//       });
      
//       console.log('Test email response status:', testEmailResponse.status);
//       if (!testEmailResponse.ok) {
//         const errorText = await testEmailResponse.text();
//         console.log('Test email error:', errorText);
//       }
      
//       return {
//         statusCode: 200,
//         headers,
//         body: JSON.stringify({
//           apiKeyExists: !!apiKey,
//           apiKeyLength: apiKey ? apiKey.length : 0,
//           contactsStatus: testResponse.status,
//           templatesStatus: templatesResponse.status,
//           message: 'Debug info logged to console'
//         })
//       };
      
//     } catch (error) {
//       console.error('Debug error:', error);
      
//       return {
//         statusCode: 500,
//         headers,
//         body: JSON.stringify({
//           error: error.message,
//           stack: error.stack
//         })
//       };
//     }
//   };