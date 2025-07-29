// netlify/functions/send-customer-report.cjs
const { createClient } = require('@supabase/supabase-js');

// Cache for static assets to avoid repeated downloads
let cachedReadingGuide = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Environment validation
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY || !process.env.VITE_LOOPS_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Authenticate admin user or service key
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    const token = authHeader.substring(7);
    let userData = null;
    let isServiceKeyCall = false;

    // Check if this is a service key call (from admin email action)
    if (token === process.env.VITE_SUPABASE_SERVICE_KEY) {
      isServiceKeyCall = true;
      log('info', 'Service key authentication detected for admin email action');
    } else {
      // Regular user authentication
      const { data: authData, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !authData?.user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication failed' })
        };
      }

      userData = authData;

      // Check if user is admin
      const { data: userRole, error: adminError } = await supabase.rpc('get_user_role', {
        user_uuid: userData.user.id
      });

      if (adminError || !userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' })
        };
      }
    }

    const requestData = JSON.parse(event.body);
    const { reportId, customEmail = null } = requestData;

    if (!reportId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Report ID is required' })
      };
    }

    log('info', 'Processing customer report email', { reportId, customEmail });

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('report_id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }

    async function getCustomerInfoFromReport(supabase, report) {
        let customerEmail = null;
        let customerInfo = {
          firstName: 'Valued Customer',
          fullName: 'Customer',
          kitCode: 'UNKNOWN',
          orderNumber: 'N/A'
        };
      
        try {
          if (report.report_type === 'one_off') {
            // For one-off reports, use custom customer info
            if (report.custom_customer_info) {
              customerEmail = report.custom_customer_info.email;
              customerInfo.firstName = report.custom_customer_info.firstName || 'Valued Customer';
              customerInfo.fullName = `${report.custom_customer_info.firstName || ''} ${report.custom_customer_info.lastName || ''}`.trim() || 'Customer';
            }
            if (report.custom_kit_info) {
              customerInfo.kitCode = report.custom_kit_info.kitCode || 'UNKNOWN';
              customerInfo.orderNumber = report.custom_kit_info.kitCode || 'N/A';
            }
          } else if (report.kit_registration_id) {
            // Regular kit registration - get data from admin view
            const { data: kitReg, error: kitRegError } = await supabase
              .from('vw_test_kits_admin_dev')
              .select('*')
              .eq('kit_id', report.kit_registration_id)
              .single();
      
            if (!kitRegError && kitReg) {
              customerEmail = kitReg.customer_email;
              customerInfo.firstName = kitReg.customer_first_name || 'Valued Customer';
              customerInfo.fullName = `${kitReg.customer_first_name || ''} ${kitReg.customer_last_name || ''}`.trim() || 'Customer';
              customerInfo.kitCode = kitReg.kit_code || 'UNKNOWN';
              customerInfo.orderNumber = kitReg.order_number || 'N/A';
              
              // For unregistered kits, use admin-provided location if available, otherwise use registration location
              if (report.report_type === 'unregistered' && report.custom_customer_info?.location) {
                // Admin provided location override for unregistered kit
                customerInfo.location = report.custom_customer_info.location;
              } else {
                // Use original registration location
                const locationParts = [];
                if (kitReg.customer_address) locationParts.push(kitReg.customer_address);
                if (kitReg.customer_city) locationParts.push(kitReg.customer_city);
                if (kitReg.customer_province) locationParts.push(kitReg.customer_province);
                if (kitReg.customer_postal_code) locationParts.push(kitReg.customer_postal_code);
                customerInfo.location = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';
              }
            }
          } else if (report.legacy_kit_registration_id) {
            // Legacy kit registration
            const { data: legacyKitReg, error: legacyKitRegError } = await supabase
              .from('vw_test_kits_admin')
              .select('*')
              .eq('kit_id', report.legacy_kit_registration_id)
              .single();
      
            if (!legacyKitRegError && legacyKitReg) {
              customerEmail = legacyKitReg.customer_email;
              customerInfo.firstName = legacyKitReg.customer_first_name || 'Valued Customer';
              customerInfo.fullName = `${legacyKitReg.customer_first_name || ''} ${legacyKitReg.customer_last_name || ''}`.trim() || 'Customer';
              customerInfo.kitCode = legacyKitReg.kit_code || 'UNKNOWN';
              customerInfo.orderNumber = legacyKitReg.order_number || 'N/A';
              
              // For unregistered legacy kits, use admin-provided location if available
              if (report.report_type === 'unregistered' && report.custom_customer_info?.location) {
                customerInfo.location = report.custom_customer_info.location;
              } else {
                const locationParts = [];
                if (legacyKitReg.customer_address) locationParts.push(legacyKitReg.customer_address);
                if (legacyKitReg.customer_city) locationParts.push(legacyKitReg.customer_city);
                if (legacyKitReg.customer_province) locationParts.push(legacyKitReg.customer_province);
                if (legacyKitReg.customer_postal_code) locationParts.push(legacyKitReg.customer_postal_code);
                customerInfo.location = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';
              }
            }
          }
      
          // Fallback: If no email found and there's custom customer info, try to use it
          if (!customerEmail && report.custom_customer_info?.email) {
            customerEmail = report.custom_customer_info.email;
            
            // Only override customer name if we don't already have it from kit registration
            if (customerInfo.firstName === 'Valued Customer' && report.custom_customer_info.firstName) {
              customerInfo.firstName = report.custom_customer_info.firstName;
              customerInfo.fullName = `${report.custom_customer_info.firstName || ''} ${report.custom_customer_info.lastName || ''}`.trim() || 'Customer';
            }
          }
      
          return { customerEmail, customerInfo };
        } catch (error) {
          log('error', 'Error determining customer info', { error: error.message, reportId: report.report_id });
          return { customerEmail: null, customerInfo };
        }
      }
      
      // Enhanced email validation function
      function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
      }
      
      // Replace the customer email determination section in the main handler with:
          // Determine customer email and info based on report type
          let customerEmail = customEmail;
          let customerInfo = {
            firstName: 'Valued Customer',
            fullName: 'Customer', 
            kitCode: 'UNKNOWN',
            orderNumber: 'N/A'
          };
      
          if (!customerEmail) {
            const customerData = await getCustomerInfoFromReport(supabase, report);
            customerEmail = customerData.customerEmail;
            customerInfo = customerData.customerInfo;
          } else {
            // If custom email provided, still get other customer info
            const customerData = await getCustomerInfoFromReport(supabase, report);
            customerInfo = customerData.customerInfo;
          }
      
          // Validate email address
          if (!isValidEmail(customerEmail)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Invalid or missing customer email address. Please provide a valid email address.',
                details: 'Customer email not found in report data and no valid custom email provided.'
              })
            };
          }
      
          log('info', 'Customer email determined', { 
            reportId, 
            hasCustomEmail: !!customEmail,
            customerEmail: customerEmail.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask for logging
          });

    if (!customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Customer email not found. Please provide a custom email address.' })
      };
    }

    // Download PDF file with validation
let pdfContent = null;
if (report.pdf_file_url) {
  try {
    const pdfFileName = report.pdf_file_url.split('/').pop();
    log('info', 'Downloading PDF for customer email', { filename: pdfFileName });
    
    const { data: pdfData, error: pdfError } = await supabase.storage
      .from('generated-reports')
      .download(pdfFileName);

    if (pdfError) {
      throw new Error(`PDF download error: ${pdfError.message}`);
    }

    if (!pdfData) {
      throw new Error('No PDF data received from Supabase');
    }

    const pdfArrayBuffer = await pdfData.arrayBuffer();
    pdfContent = Buffer.from(pdfArrayBuffer).toString('base64');
    
    log('info', 'PDF downloaded and converted successfully', { 
      filename: pdfFileName,
      base64Length: pdfContent.length,
      sizeKB: Math.round(pdfContent.length / 1024)
    });
    
  } catch (pdfDownloadError) {
    log('error', 'Could not download PDF file', { error: pdfDownloadError.message });
  }
}

if (!pdfContent || pdfContent.length === 0) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Report PDF not available or empty' })
  };
}

// Prepare attachments with validation
const attachments = [{
  filename: `My-Water-Quality-Report-${customerInfo.kitCode}.pdf`,
  data: pdfContent,
  contentType: 'application/pdf'
}];

// Add the "How to Read Your Report" guide
try {
  log('info', 'Downloading reading guide for customer email');
  
  const { data: guideData, error: guideError } = await supabase.storage
    .from('static-assets')
    .download('Understanding-My-Water-Quality-Report-Card.pdf');

  if (!guideError && guideData) {
    const guideArrayBuffer = await guideData.arrayBuffer();
    const guideBase64 = Buffer.from(guideArrayBuffer).toString('base64');
    
    attachments.push({
      filename: 'Understanding-My-Water-Quality-Report-Card.pdf',
      data: guideBase64,
      contentType: 'application/pdf'
    });
    
    log('info', 'Reading guide attachment prepared', {
      sizeKB: Math.round(guideBase64.length / 1024)
    });
  } else {
    log('warn', 'Could not download reading guide', { error: guideError?.message });
  }
} catch (guideDownloadError) {
  log('warn', 'Exception downloading reading guide', { error: guideDownloadError.message });
  // Don't fail the email if guide download fails
}

log('info', 'All attachments prepared for customer email', {
  filename: attachments[0].filename,
  hasMainReport: !!attachments[0].data,
  totalAttachments: attachments.length,
  attachmentNames: attachments.map(att => att.filename)
});

log('info', 'Attachment prepared for customer email', {
  filename: attachments[0].filename,
  hasData: !!attachments[0].data,
  dataLength: attachments[0].data.length
});

    // Send email via Loops
    const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionalId: 'cmdj5bz1u00oez30i94tt2rc4',
        email: customerEmail,
        dataVariables: {
          firstName: customerInfo.firstName,
          kitCode: customerInfo.kitCode,
          orderNumber: customerInfo.orderNumber
        },
        attachments: attachments
      })
    });

    if (!loopsResponse.ok) {
      const errorData = await loopsResponse.text();
      throw new Error(`Loops API error: ${loopsResponse.status} - ${errorData}`);
    }

    // Log the email delivery
    const { error: logError } = await supabase
      .from('email_delivery_log')
      .insert([{
        report_id: reportId,
        recipient_email: customerEmail,
        email_type: 'customer_report',
        sent_by: userData.user.id,
        sent_at: new Date().toISOString(),
        metadata: {
          customer_name: customerInfo.fullName,
          kit_code: customerInfo.kitCode,
          sent_via: isServiceKeyCall ? 'admin_email_action' : 'admin_dashboard'
        }
      }]);

    if (logError) {
      log('warn', 'Could not log email delivery', { error: logError.message });
    }

    // NEW: Update kit status to "report_delivered" after successful email
    try {
      if (report.kit_registration_id) {
        // Regular kit registration
        const { error: statusError } = await supabase
          .from('kit_registrations')
          .update({ status: 'report_delivered' })
          .eq('kit_registration_id', report.kit_registration_id);
        
        if (statusError) {
          log('warn', 'Could not update kit registration status', { error: statusError.message, kitId: report.kit_registration_id });
        } else {
          log('info', 'Updated kit registration status to report_delivered', { kitId: report.kit_registration_id });
        }
      } else if (report.legacy_kit_registration_id) {
        // Legacy kit registration
        const { error: statusError } = await supabase
          .from('legacy_kit_registrations')
          .update({ status: 'report_delivered' })
          .eq('id', report.legacy_kit_registration_id);
        
        if (statusError) {
          log('warn', 'Could not update legacy kit registration status', { error: statusError.message, kitId: report.legacy_kit_registration_id });
        } else {
          log('info', 'Updated legacy kit registration status to report_delivered', { kitId: report.legacy_kit_registration_id });
        }
      }
      // Note: No status update needed for one_off reports as they don't have associated kit registrations
    } catch (statusUpdateError) {
      log('warn', 'Error updating kit status', { error: statusUpdateError.message, reportId });
    }

    log('info', 'Customer report email sent successfully', { 
      reportId, 
      customerEmail: customerEmail.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask email for logging
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Report sent to customer successfully',
        customerEmail: customerEmail
      })
    };

  } catch (error) {
    log('error', 'Error sending customer report', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send customer report',
        message: error.message
      })
    };
  }
};