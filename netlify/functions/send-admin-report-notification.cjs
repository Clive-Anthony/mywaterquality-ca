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
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';
    const sendToCustomerUrl = `${baseUrl}/.netlify/functions/handle-admin-email-action?token=${token}&action=send-to-customer`;

    // Download and prepare attachments with comprehensive validation
    const attachments = [];

    // Download CSV file with validation
    let csvContent = null;
    if (report.csv_file_url) {
      try {
        const csvFileName = report.csv_file_url.split('/').pop();
        log('info', 'Attempting to download CSV file', { filename: csvFileName });
        
        const { data: csvData, error: csvError } = await supabase.storage
          .from('test-results-csv')
          .download(csvFileName);

        if (csvError) {
          log('error', 'CSV download error from Supabase', { error: csvError.message });
        } else if (!csvData) {
          log('error', 'No CSV data received from Supabase');
        } else {
          csvContent = await csvData.text();
          log('info', 'CSV downloaded successfully', { 
            filename: csvFileName,
            contentLength: csvContent?.length || 0 
          });
        }
      } catch (csvDownloadError) {
        log('error', 'CSV download exception', { error: csvDownloadError.message });
      }
    }

    // Download PDF file with validation
    let pdfContent = null;
    if (report.pdf_file_url) {
      try {
        const pdfFileName = report.pdf_file_url.split('/').pop();
        log('info', 'Attempting to download PDF file', { filename: pdfFileName });
        
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('generated-reports')
          .download(pdfFileName);

        if (pdfError) {
          log('error', 'PDF download error from Supabase', { error: pdfError.message });
        } else if (!pdfData) {
          log('error', 'No PDF data received from Supabase');
        } else {
          const pdfArrayBuffer = await pdfData.arrayBuffer();
          pdfContent = Buffer.from(pdfArrayBuffer).toString('base64');
          log('info', 'PDF downloaded successfully', { 
            filename: pdfFileName,
            base64Length: pdfContent?.length || 0,
            sizeKB: Math.round((pdfContent?.length || 0) / 1024)
          });
        }
      } catch (pdfDownloadError) {
        log('error', 'PDF download exception', { error: pdfDownloadError.message });
      }
    }

    // Add CSV attachment if valid
    if (csvContent && csvContent.trim().length > 0) {
      try {
        const csvBase64 = Buffer.from(csvContent, 'utf8').toString('base64');
        if (csvBase64 && csvBase64.length > 0) {
          attachments.push({
            filename: `${kitInfo.kitCode || 'UNKNOWN'}_test_results.csv`,
            data: csvBase64,
            contentType: 'text/csv'
          });
          log('info', 'CSV attachment added', { 
            filename: `${kitInfo.kitCode || 'UNKNOWN'}_test_results.csv`,
            sizeKB: Math.round(csvBase64.length / 1024)
          });
        }
      } catch (csvError) {
        log('error', 'Failed to prepare CSV attachment', { error: csvError.message });
      }
    }

    // Add PDF attachment if valid
    if (pdfContent && pdfContent.length > 0) {
      attachments.push({
        filename: `${kitInfo.kitCode || 'UNKNOWN'}_report.pdf`,
        data: pdfContent,
        contentType: 'application/pdf'
      });
      log('info', 'PDF attachment added', { 
        filename: `${kitInfo.kitCode || 'UNKNOWN'}_report.pdf`,
        sizeKB: Math.round(pdfContent.length / 1024)
      });
    }

    log('info', 'Final attachments prepared', { 
      count: attachments.length,
      attachmentInfo: attachments.map(att => ({
        filename: att.filename,
        hasData: !!att.data,
        dataLength: att.data?.length || 0
      }))
    });

    // Only proceed if we have attachments
    if (attachments.length === 0) {
      log('warn', 'No valid attachments found, skipping admin notification');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'No attachments available - admin notification skipped',
          reportId: reportId
        })
      };
    }

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
        sizeKB: Math.round(att.data.length / 1024)
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
    (r.ao_value !== null && r.ao_value !== undefined && r.ao_value !== '' ||
     r.ao_display !== null && r.ao_display !== undefined && r.ao_display !== '')
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