// netlify/functions/send-admin-report-notification.cjs
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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
    'Access-Control-Allow-Headers': 'Content-Type',
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

    const requestData = JSON.parse(event.body);
    const { reportId, kitInfo } = requestData;
    const adminEmail = 'admin@mywaterquality.ca';   

    if (!reportId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Report ID is required' })
      };
    }

    log('info', 'Processing admin notification', { reportId });

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('report_id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`);
    }

    // Get test results summary for the report
    const { data: testResults, error: resultsError } = await supabase
      .from('vw_test_results_with_parameters')
      .select('*')
      .eq('sample_number', report.sample_number);

    if (resultsError) {
      log('warn', 'Could not fetch test results for summary', { error: resultsError.message });
    }

    // Calculate summary statistics
    const summaryStats = calculateReportSummary(testResults || []);

    // Download CSV file
    let csvContent = null;
    if (report.csv_file_url) {
      try {
        const csvFileName = report.csv_file_url.split('/').pop();
        const { data: csvData, error: csvError } = await supabase.storage
          .from('test-results-csv')
          .download(csvFileName);

        if (!csvError && csvData) {
          csvContent = await csvData.text();
        }
      } catch (csvDownloadError) {
        log('warn', 'Could not download CSV file', { error: csvDownloadError.message });
      }
    }

    // Download PDF file
    let pdfContent = null;
    if (report.pdf_file_url) {
      try {
        const pdfFileName = report.pdf_file_url.split('/').pop();
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('generated-reports')
          .download(pdfFileName);

        if (!pdfError && pdfData) {
          const pdfArrayBuffer = await pdfData.arrayBuffer();
          pdfContent = Buffer.from(pdfArrayBuffer).toString('base64');
        }
      } catch (pdfDownloadError) {
        log('warn', 'Could not download PDF file', { error: pdfDownloadError.message });
      }
    }

    // Generate secure token for email actions
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Get admin user ID (we'll use the first admin we find for now)
    const { data: adminUser, error: adminUserError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin'])
      .limit(1)
      .single();

    if (!adminUserError && adminUser) {
      // Store token in database
      const { error: tokenError } = await supabase
        .from('admin_email_tokens')
        .insert([{
          report_id: reportId,
          token: token,
          action_type: 'send-to-customer',
          expires_at: expiresAt.toISOString(),
          created_by: adminUser.user_id,
          metadata: {
            report_type: report.report_type,
            kit_code: kitInfo.kitCode || 'UNKNOWN',
            customer_name: kitInfo.customerName || 'Customer'
          }
        }]);

      if (tokenError) {
        log('warn', 'Could not store email token', { error: tokenError.message });
      }
    }

    // Generate admin email content
    const reportSummaryHtml = generateAdminReportSummary(report, kitInfo, summaryStats);
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';
    const sendToCustomerUrl = `${baseUrl}/.netlify/functions/handle-admin-email-action?token=${token}&action=send-to-customer`;
    const viewReportUrl = `${baseUrl}/admin-dashboard`;

    // Prepare attachments
    const attachments = [];
    
    if (csvContent) {
      attachments.push({
        filename: `${kitInfo.kitCode || 'UNKNOWN'}_test_results.csv`,
        content: Buffer.from(csvContent).toString('base64'),
        contentType: 'text/csv'
      });
    }

    if (pdfContent) {
      attachments.push({
        filename: `${kitInfo.kitCode || 'UNKNOWN'}_report.pdf`,
        content: pdfContent,
        contentType: 'application/pdf'
      });
    }

    // Enhanced debugging for send-admin-report-notification.cjs
// Replace the Loops API call section with this enhanced version:

log('info', 'Preparing to send admin notification', {
  reportId,
  adminEmail,
  attachmentsCount: attachments.length,
  kitInfo: {
    kitCode: kitInfo.kitCode,
    customerName: kitInfo.customerName,
    customerEmail: kitInfo.customerEmail
  }
});

// Send email via Loops
const requestBody = {
  transactionalId: 'cmdj4w1u62ku8zc0jqy6rfekn',
  email: adminEmail,
  dataVariables: {
    customerName: kitInfo.customerName || 'Customer',
    kitCode: kitInfo.kitCode || 'UNKNOWN',
    sendToCustomerUrl: sendToCustomerUrl
  },
  attachments: attachments
};

log('info', 'Loops API request body', {
  transactionalId: requestBody.transactionalId,
  email: requestBody.email,
  dataVariables: requestBody.dataVariables,
  attachmentsCount: requestBody.attachments.length,
  attachmentSizes: requestBody.attachments.map(att => ({
    filename: att.filename,
    contentType: att.contentType,
    sizeKB: Math.round(att.content.length / 1024)
  }))
});

const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody)
});

log('info', 'Loops API response received', {
  status: loopsResponse.status,
  statusText: loopsResponse.statusText,
  contentType: loopsResponse.headers.get('content-type'),
  contentLength: loopsResponse.headers.get('content-length')
});

let responseText;
try {
  responseText = await loopsResponse.text();
  log('info', 'Loops response body', {
    responseLength: responseText.length,
    responsePreview: responseText.substring(0, 200)
  });
} catch (textError) {
  log('error', 'Failed to read response text', { error: textError.message });
  responseText = '';
}

if (!loopsResponse.ok) {
  log('error', 'Loops API error', {
    status: loopsResponse.status,
    statusText: loopsResponse.statusText,
    response: responseText
  });
  throw new Error(`Loops API error: ${loopsResponse.status} - ${responseText || 'No response body'}`);
}

// Try to parse as JSON for additional info, but don't fail if it's not JSON
try {
  if (responseText) {
    const responseData = JSON.parse(responseText);
    log('info', 'Loops response parsed', responseData);
  }
} catch (parseError) {
  log('info', 'Loops response not JSON (this is normal)', {
    parseError: parseError.message,
    response: responseText
  });
}

log('info', 'Admin notification sent successfully', { reportId, attachmentsCount: attachments.length });

return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    message: 'Admin notification sent successfully',
    token: token
  })
};

  } catch (error) {
    log('error', 'Error sending admin notification', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send admin notification',
        message: error.message
      })
    };
  }
};

function calculateReportSummary(testResults) {
  if (!testResults || testResults.length === 0) {
    return {
      totalParameters: 0,
      healthConcerns: 0,
      aestheticConcerns: 0,
      bacteriologicalResult: 'Not Tested'
    };
  }

  const healthParameters = testResults.filter(r => 
    (r.parameter_type === 'MAC' || r.parameter_type === 'Hybrid') &&
    r.mac_value !== null
  );

  const aoParameters = testResults.filter(r => 
    (r.parameter_type === 'AO' || r.parameter_type === 'Hybrid') &&
    (r.ao_value !== null || r.ao_display !== null)
  );

  const healthConcerns = healthParameters.filter(r => 
    r.mac_compliance_status === 'EXCEEDS_MAC'
  ).length;

  const aestheticConcerns = aoParameters.filter(r => 
    r.ao_compliance_status === 'EXCEEDS_AO' ||
    (r.ao_compliance_status === 'AO_RANGE_VALUE' && r.compliance_status === 'WARNING')
  ).length;

  // Check for bacteriological results
  const bacteriological = testResults.filter(r => 
    r.parameter_name?.toLowerCase().includes('coliform') ||
    r.parameter_name?.toLowerCase().includes('bacteria') ||
    r.parameter_name?.toLowerCase().includes('e. coli')
  );

  let bacteriologicalResult = 'Not Tested';
  if (bacteriological.length > 0) {
    const hasDetection = bacteriological.some(r => 
      r.result_display_value?.includes('Detected') || 
      r.mac_compliance_status === 'EXCEEDS_MAC'
    );
    bacteriologicalResult = hasDetection ? 'Coliforms Detected' : 'No Coliforms Present';
  }

  const uniqueParameters = new Set(testResults.map(r => r.parameter_name)).size;

  return {
    totalParameters: uniqueParameters,
    healthConcerns,
    aestheticConcerns,
    bacteriologicalResult
  };
}

function generateAdminReportSummary(report, kitInfo, summaryStats) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReportTypeDisplay = (reportType) => {
    switch(reportType) {
      case 'registered': return 'Registered Kit Report';
      case 'unregistered': return 'Unregistered Kit Report';  
      case 'one_off': return 'One-off Report';
      default: return 'Standard Report';
    }
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">New Report Generated</h2>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1f2937; margin-bottom: 10px; font-size: 16px;">Kit Information</h3>
          <p style="margin: 5px 0;"><strong>Kit Code:</strong> ${kitInfo.kitCode || 'UNKNOWN'}</p>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${kitInfo.displayId || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Customer:</strong> ${kitInfo.customerName || 'Customer'} (${kitInfo.customerEmail || 'No email'})</p>
          <p style="margin: 5px 0;"><strong>Test Kit:</strong> ${kitInfo.testKitName || 'Water Test Kit'}</p>
          <p style="margin: 5px 0;"><strong>Report Type:</strong> ${getReportTypeDisplay(report.report_type)}</p>
          <p style="margin: 5px 0;"><strong>Customer Location:</strong> ${kitInfo.customerLocation || 'Not specified'}</p>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #10b981;">
          <h3 style="color: #1f2937; margin-bottom: 10px; font-size: 16px;">Test Results Summary</h3>
          <p style="margin: 5px 0;"><strong>Sample #:</strong> ${report.sample_number || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Work Order #:</strong> ${report.work_order_number || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Parameters Tested:</strong> ${summaryStats.totalParameters}</p>
          <p style="margin: 5px 0;"><strong>Health Concerns:</strong> ${summaryStats.healthConcerns} parameters exceed limits</p>
          <p style="margin: 5px 0;"><strong>Aesthetic Concerns:</strong> ${summaryStats.aestheticConcerns} parameters exceed limits</p>
          <p style="margin: 5px 0;"><strong>Bacteriological:</strong> ${summaryStats.bacteriologicalResult}</p>
          <p style="margin: 5px 0;"><strong>Generated:</strong> ${formatDate(report.created_at)}</p>
        </div>

        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #1f2937; margin-bottom: 10px; font-size: 16px;">Files Attached</h3>
          <p style="margin: 5px 0;">✓ Test Results CSV</p>
          <p style="margin: 5px 0;">✓ Generated PDF Report</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 16px;">Admin Actions</h3>
          <a href="{{sendToCustomerUrl}}" 
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px 10px 0;">
            Send Report to Customer
          </a>
          <a href="{{viewReportUrl}}" 
             style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px 10px 0;">
            View Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  `;
}