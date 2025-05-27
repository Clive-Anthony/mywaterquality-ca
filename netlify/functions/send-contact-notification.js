// netlify/functions/send-contact-notification.js - SIMPLIFIED VERSION
async function sendLoopsEmail({ transactionalId, to, variables }) {
    try {
      const apiKey = process.env.VITE_LOOPS_API_KEY;
      if (!apiKey) {
        throw new Error('Loops API key not configured');
      }
  
      console.log(`Sending contact notification to ${to}`);
  
      const response = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          transactionalId,
          email: to,
          dataVariables: variables
        })
      });
  
      const responseText = await response.text();
      console.log('Loops API response:', response.status, responseText);
  
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        throw new Error(`Loops API error: ${errorData.message}`);
      }
  
      return { success: true };
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
  
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
  
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }
  
    try {
      console.log('=== CONTACT NOTIFICATION HANDLER ===');
      
      // Validate environment variables
      if (!process.env.VITE_LOOPS_API_KEY) {
        throw new Error('Missing Loops API configuration');
      }
  
      // Parse request body
      const contactData = JSON.parse(event.body);
      console.log('Received contact data:', {
        id: contactData.id,
        email: contactData.email,
        hasName: !!contactData.name,
        feedbackLength: contactData.feedback?.length || 0
      });
  
      // Validate required fields
      if (!contactData.email || !contactData.feedback) {
        throw new Error('Missing required contact data');
      }
  
      // Format the created_at timestamp
      const createdAt = new Date(contactData.created_at).toLocaleString('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
  
      // Determine user status
      const userStatus = contactData.user_id ? 'Registered User' : 'Anonymous Visitor';
  
      // Send notification email via Loops
      await sendLoopsEmail({
        transactionalId: 'YOUR_LOOPS_TEMPLATE_ID', // Replace with actual template ID
        to: 'david.phillips@bookerhq.ca',
        variables: {
          name: contactData.name || 'Not provided',
          email: contactData.email,
          feedback: contactData.feedback,
          createdAt: createdAt,
          userStatus: userStatus
        }
      });
  
      console.log('Contact notification email sent successfully');
  
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Contact notification sent successfully'
        })
      };
  
    } catch (error) {
      console.error('Contact notification error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to send contact notification',
          message: error.message
        })
      };
    }
  };