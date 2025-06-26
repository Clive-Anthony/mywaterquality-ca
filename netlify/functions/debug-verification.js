// // netlify/functions/debug-verification.js
// // Debug version that logs everything

// exports.handler = async function(event, context) {
//     const headers = {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Headers': 'Content-Type',
//       'Access-Control-Allow-Methods': 'POST, OPTIONS'
//     };
  
//     if (event.httpMethod === 'OPTIONS') {
//       return { statusCode: 200, headers, body: '' };
//     }
  
//     if (event.httpMethod !== 'POST') {
//       return { 
//         statusCode: 405, 
//         headers,
//         body: JSON.stringify({ error: 'Method Not Allowed' })
//       };
//     }
  
//     try {
//       console.log('=== DEBUG VERIFICATION EMAIL ===');
//       console.log('Event body:', event.body);
      
//       const { email, firstName = 'Valued Customer' } = JSON.parse(event.body);
//       console.log('Parsed email:', email);
//       console.log('Parsed firstName:', firstName);
  
//       const apiKey = process.env.VITE_LOOPS_API_KEY;
//       console.log('API Key exists:', !!apiKey);
//       console.log('API Key length:', apiKey ? apiKey.length : 0);
//       console.log('API Key prefix:', apiKey ? apiKey.substring(0, 8) + '...' : 'none');
  
//       // Use the exact same format that worked in the test
//       const requestBody = {
//         transactionalId: 'cmay9ss140qtu2u0hrqjhb0or',
//         email: email,
//         dataVariables: {
//           firstName: firstName,
//           verificationLink: 'https://example.com/test-verification-link',
//           websiteURL: 'https://example.com'
//         }
//       };
  
//       console.log('Request body:', JSON.stringify(requestBody, null, 2));
//       console.log('Request URL:', 'https://app.loops.so/api/v1/transactional');
  
//       const response = await fetch('https://app.loops.so/api/v1/transactional', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${apiKey}`
//         },
//         body: JSON.stringify(requestBody)
//       });
  
//       console.log('Response status:', response.status);
//       console.log('Response statusText:', response.statusText);
//       console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
//       const responseText = await response.text();
//       console.log('Response body:', responseText);
  
//       // Compare with the working test format
//       console.log('=== COMPARISON WITH WORKING TEST ===');
//       console.log('Test email that worked: test@example.com');
//       console.log('Current email:', email);
//       console.log('Test template ID: cmay9ss140qtu2u0hrqjhb0or');
//       console.log('Current template ID: cmay9ss140qtu2u0hrqjhb0or');
//       console.log('Are they identical?', email === 'test@example.com' ? 'NO - different email' : 'Different emails');
  
//       return {
//         statusCode: response.ok ? 200 : response.status,
//         headers,
//         body: JSON.stringify({
//           success: response.ok,
//           status: response.status,
//           response: responseText,
//           debugInfo: {
//             email,
//             firstName,
//             apiKeyExists: !!apiKey,
//             requestBody
//           }
//         })
//       };
  
//     } catch (error) {
//       console.error('Debug function error:', error);
      
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