// netlify/functions/handle-admin-email-action.cjs
const { createClient } = require('@supabase/supabase-js');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Method not allowed')
      };
    }

    // Environment validation
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Server configuration error')
      };
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Extract parameters from URL
    const { token, action } = event.queryStringParameters || {};

    if (!token || !action) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Missing required parameters')
      };
    }

    log('info', 'Processing admin email action', { token: token.substring(0, 8) + '...', action });

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_email_tokens')
      .select('*')
      .eq('token', token)
      .eq('action_type', action)
      .single();

    if (tokenError || !tokenData) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Invalid or expired token')
      };
    }

    // Check if token has expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Token has expired')
      };
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: generateSuccessPage('This action has already been completed', tokenData.metadata)
      };
    }

    // Execute the requested action
    let actionResult;
    
    if (action === 'send-to-customer') {
      actionResult = await executeCustomerEmailAction(supabase, tokenData.report_id);
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage('Unknown action requested')
      };
    }

    if (actionResult.success) {
      // Mark token as used
      await supabase
        .from('admin_email_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      log('info', 'Admin email action completed successfully', { 
        action, 
        reportId: tokenData.report_id,
        customerEmail: actionResult.customerEmail?.replace(/(.{2}).*(@.*)/, '$1***$2')
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: generateSuccessPage(actionResult.message, tokenData.metadata, actionResult.customerEmail)
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: generateErrorPage(actionResult.error)
      };
    }

  } catch (error) {
    log('error', 'Error handling admin email action', { error: error.message });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: generateErrorPage('Internal server error')
    };
  }
};

async function executeCustomerEmailAction(supabase, reportId) {
  try {
    // Call the customer report function
    const response = await fetch(`${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/.netlify/functions/send-customer-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_KEY}` // Use service key for internal calls
      },
      body: JSON.stringify({ reportId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send customer email');
    }

    const result = await response.json();
    
    return {
      success: true,
      message: 'Report has been sent to the customer successfully!',
      customerEmail: result.customerEmail
    };

  } catch (error) {
    log('error', 'Error executing customer email action', { error: error.message, reportId });
    return {
      success: false,
      error: `Failed to send report to customer: ${error.message}`
    };
  }
}

function generateSuccessPage(message, metadata = {}, customerEmail = null) {
  const kitCode = metadata.kit_code || 'N/A';
  const customerName = metadata.customer_name || 'Customer';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Action Completed - My Water Quality</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f3f4f6; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
          background: #10b981; 
          color: white; 
          padding: 20px; 
          text-align: center; 
        }
        .content { 
          padding: 30px; 
          text-align: center; 
        }
        .success-icon { 
          font-size: 48px; 
          color: #10b981; 
          margin-bottom: 20px; 
        }
        .message { 
          font-size: 18px; 
          color: #1f2937; 
          margin-bottom: 20px; 
        }
        .details { 
          background: #f9fafb; 
          padding: 15px; 
          border-radius: 6px; 
          margin: 20px 0; 
          text-align: left; 
        }
        .button { 
          display: inline-block; 
          background: #3b82f6; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 10px; 
        }
        .button:hover { 
          background: #2563eb; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>My Water Quality - Admin Action</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          <div class="message">${message}</div>
          
          ${metadata.kit_code ? `
          <div class="details">
            <p><strong>Kit Code:</strong> ${kitCode}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            ${customerEmail ? `<p><strong>Sent to:</strong> ${customerEmail}</p>` : ''}
          </div>
          ` : ''}
          
          <a href="${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/admin-dashboard" class="button">
            Return to Admin Dashboard
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateErrorPage(error) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - My Water Quality</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f3f4f6; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
          background: #dc2626; 
          color: white; 
          padding: 20px; 
          text-align: center; 
        }
        .content { 
          padding: 30px; 
          text-align: center; 
        }
        .error-icon { 
          font-size: 48px; 
          color: #dc2626; 
          margin-bottom: 20px; 
        }
        .message { 
          font-size: 18px; 
          color: #1f2937; 
          margin-bottom: 20px; 
        }
        .button { 
          display: inline-block; 
          background: #3b82f6; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 10px; 
        }
        .button:hover { 
          background: #2563eb; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>My Water Quality - Error</h1>
        </div>
        <div class="content">
          <div class="error-icon">❌</div>
          <div class="message">${error}</div>
          <p style="color: #6b7280;">Please contact support if this error persists.</p>
          
          <a href="${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/admin-dashboard" class="button">
            Return to Admin Dashboard
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}