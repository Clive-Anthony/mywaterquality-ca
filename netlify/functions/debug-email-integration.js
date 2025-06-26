// // netlify/functions/debug-email-integration.js
// // Comprehensive debugging function for email integration

// exports.handler = async function(event, context) {
//     const headers = {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Headers': 'Content-Type',
//       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//       'Content-Type': 'application/json'
//     };
  
//     if (event.httpMethod === 'OPTIONS') {
//       return { statusCode: 200, headers, body: '' };
//     }
  
//     try {
//       console.log('=== EMAIL INTEGRATION DEBUG STARTED ===');
      
//       const debugResults = {
//         timestamp: new Date().toISOString(),
//         environment: {},
//         loopsApiTest: {},
//         functionTest: {},
//         recommendations: []
//       };
  
//       // Step 1: Check Environment Variables
//       console.log('Step 1: Checking environment variables...');
//       debugResults.environment = {
//         hasLoopsKey: !!process.env.VITE_LOOPS_API_KEY,
//         loopsKeyLength: process.env.VITE_LOOPS_API_KEY ? process.env.VITE_LOOPS_API_KEY.length : 0,
//         loopsKeyPrefix: process.env.VITE_LOOPS_API_KEY ? process.env.VITE_LOOPS_API_KEY.substring(0, 8) + '...' : 'N/A',
//         hasAppUrl: !!process.env.VITE_APP_URL,
//         appUrl: process.env.VITE_APP_URL || 'NOT SET',
//         nodeEnv: process.env.NODE_ENV || 'NOT SET'
//       };
  
//       if (!process.env.VITE_LOOPS_API_KEY) {
//         debugResults.recommendations.push('❌ VITE_LOOPS_API_KEY not found in environment variables');
//         console.error('❌ Missing VITE_LOOPS_API_KEY');
//       } else {
//         console.log('✅ VITE_LOOPS_API_KEY found');
//       }
  
//       // Step 2: Test Direct Loops API Call
//       console.log('Step 2: Testing direct Loops API call...');
//       if (process.env.VITE_LOOPS_API_KEY) {
//         try {
//           const testResponse = await fetch('https://app.loops.so/api/v1/transactional', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`
//             },
//             body: JSON.stringify({
//               transactionalId: 'cmb6pqu9c02qht60i7w92yalf',
//               email: 'test@example.com',
//               dataVariables: {
//                 firstName: 'Debug Test',
//                 orderNumber: 'DEBUG-' + Date.now(),
//                 orderTotal: '$99.99',
//                 dashboardLink: 'https://example.com/dashboard',
//                 websiteURL: 'https://example.com'
//               }
//             })
//           });
  
//           const responseText = await testResponse.text();
//           debugResults.loopsApiTest = {
//             success: testResponse.ok,
//             status: testResponse.status,
//             statusText: testResponse.statusText,
//             response: responseText,
//             headers: Object.fromEntries(testResponse.headers.entries())
//           };
  
//           if (testResponse.ok) {
//             console.log('✅ Direct Loops API call successful');
//             debugResults.recommendations.push('✅ Direct Loops API call works - email should be sent');
//           } else {
//             console.error('❌ Direct Loops API call failed:', testResponse.status, responseText);
//             debugResults.recommendations.push(`❌ Loops API call failed: ${testResponse.status} - ${responseText}`);
//           }
//         } catch (loopsError) {
//           console.error('❌ Exception during Loops API test:', loopsError);
//           debugResults.loopsApiTest = {
//             success: false,
//             error: loopsError.message,
//             stack: loopsError.stack
//           };
//           debugResults.recommendations.push(`❌ Loops API exception: ${loopsError.message}`);
//         }
//       } else {
//         debugResults.loopsApiTest = { skipped: 'No API key available' };
//         debugResults.recommendations.push('⚠️ Skipping Loops API test - no API key');
//       }
  
//       // Step 3: Test Internal Function Call
//       console.log('Step 3: Testing internal function call...');
//       try {
//         const protocol = event.headers['x-forwarded-proto'] || 'https';
//         const host = event.headers.host;
//         const baseUrl = `${protocol}://${host}`;
//         const functionUrl = `${baseUrl}/.netlify/functions/send-order-confirmation-email`;
        
//         console.log('Testing function URL:', functionUrl);
        
//         const functionResponse = await fetch(functionUrl, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             email: 'debug@example.com',
//             firstName: 'Debug User',
//             orderNumber: 'DEBUG-FUNC-' + Date.now(),
//             orderTotal: '$129.99',
//             orderData: {
//               id: 'debug-order',
//               status: 'confirmed',
//               created_at: new Date().toISOString(),
//               total_amount: 129.99
//             }
//           })
//         });
  
//         const functionResponseText = await functionResponse.text();
//         debugResults.functionTest = {
//           success: functionResponse.ok,
//           status: functionResponse.status,
//           statusText: functionResponse.statusText,
//           response: functionResponseText,
//           url: functionUrl
//         };
  
//         if (functionResponse.ok) {
//           console.log('✅ Internal function call successful');
//           debugResults.recommendations.push('✅ Internal function call works');
//         } else {
//           console.error('❌ Internal function call failed:', functionResponse.status, functionResponseText);
//           debugResults.recommendations.push(`❌ Internal function failed: ${functionResponse.status}`);
//         }
//       } catch (functionError) {
//         console.error('❌ Exception during function test:', functionError);
//         debugResults.functionTest = {
//           success: false,
//           error: functionError.message,
//           stack: functionError.stack
//         };
//         debugResults.recommendations.push(`❌ Function test exception: ${functionError.message}`);
//       }
  
//       // Step 4: Check Template ID
//       console.log('Step 4: Validating template ID...');
//       const templateId = 'cmb6pqu9c02qht60i7w92yalf';
//       debugResults.templateInfo = {
//         templateId: templateId,
//         length: templateId.length,
//         format: /^[a-z0-9]{25}$/.test(templateId) ? 'Valid format' : 'Invalid format'
//       };
  
//       if (templateId.length === 25) {
//         console.log('✅ Template ID format looks correct');
//         debugResults.recommendations.push('✅ Template ID format is correct');
//       } else {
//         console.log('⚠️ Template ID format might be incorrect');
//         debugResults.recommendations.push('⚠️ Template ID format might be incorrect');
//       }
  
//       // Final Summary
//       const allTestsPassed = debugResults.environment.hasLoopsKey && 
//                             debugResults.loopsApiTest.success && 
//                             debugResults.functionTest.success;
  
//       debugResults.summary = {
//         allTestsPassed,
//         environmentOk: debugResults.environment.hasLoopsKey,
//         loopsApiOk: debugResults.loopsApiTest.success,
//         functionOk: debugResults.functionTest.success,
//         readyForProduction: allTestsPassed
//       };
  
//       if (allTestsPassed) {
//         console.log('🎉 All tests passed! Email integration should work.');
//         debugResults.recommendations.push('🎉 Everything looks good! Email integration should work.');
//       } else {
//         console.log('❌ Some tests failed. Check the recommendations.');
//       }
  
//       console.log('=== EMAIL INTEGRATION DEBUG COMPLETED ===');
//       console.log('Summary:', debugResults.summary);
//       console.log('Recommendations:', debugResults.recommendations);
  
//       return {
//         statusCode: 200,
//         headers,
//         body: JSON.stringify(debugResults, null, 2)
//       };
  
//     } catch (error) {
//       console.error('❌ Debug function error:', error);
      
//       return {
//         statusCode: 500,
//         headers,
//         body: JSON.stringify({
//           error: 'Debug function failed',
//           message: error.message,
//           stack: error.stack,
//           timestamp: new Date().toISOString()
//         }, null, 2)
//       };
//     }
//   };