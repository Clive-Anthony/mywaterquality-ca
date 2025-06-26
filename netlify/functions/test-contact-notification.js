// // netlify/functions/test-contact-notification.js
// const sendContactNotification = require('./send-contact-notification');

// exports.handler = async function(event, context) {
//   const headers = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Headers': 'Content-Type',
//     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
//   };

//   if (event.httpMethod === 'OPTIONS') {
//     return { statusCode: 200, headers, body: '' };
//   }

//   // Create test contact data
//   const testContactData = {
//     id: 'test-' + Date.now(),
//     name: event.queryStringParameters?.name || 'Test User',
//     email: event.queryStringParameters?.email || 'test@example.com',
//     feedback: event.queryStringParameters?.feedback || 'This is a test message from the manual testing function.',
//     user_id: event.queryStringParameters?.user_id || null,
//     created_at: new Date().toISOString()
//   };

//   console.log('Testing contact notification with data:', testContactData);

//   // Create a mock event for the notification handler
//   const mockEvent = {
//     httpMethod: 'POST',
//     body: JSON.stringify(testContactData)
//   };

//   try {
//     // Call the notification handler
//     const result = await sendContactNotification.handler(mockEvent, context);
    
//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({
//         success: true,
//         message: 'Test notification sent',
//         testData: testContactData,
//         result: JSON.parse(result.body)
//       })
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify({
//         error: 'Test failed',
//         message: error.message,
//         testData: testContactData
//       })
//     };
//   }
// };