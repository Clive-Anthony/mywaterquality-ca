// process-email-attachments.cjs
// Netlify function to process email attachments from Supabase storage
// Handles ALL extraction and processing logic - Zapier only uploads files

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { 
  processTestResultsFile,
  updateKitRegistration,
  saveTestResults,
  findKitRegistrationByWorkOrder,
  findKitRegistrationByProjectNumber,
  log
} = require('./utils/sharedProcessing');

// Import existing report generator (preserve exactly as-is)
const { processReportGeneration } = require('./utils/reportGenerator');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  // Verify webhook secret (optional if called by database trigger)
  const webhookSecret = event.headers['x-webhook-secret'];
  const expectedSecret = process.env.EMAIL_PROCESSING_WEBHOOK_SECRET;
  
  // Only require webhook secret if it's configured
  if (expectedSecret && webhookSecret !== expectedSecret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const requestBody = JSON.parse(event.body);
  const { email_id, trigger_source = 'unknown' } = requestBody;

  log('Processing email attachments'
    // , 
  //   { 
  //   email_id, 
  //   trigger_source,
  //   has_webhook_secret: !!webhookSecret 
  // }
);

  try {
    // Update status to processing
    await updateEmailStatus(email_id, 'processing');

    // Get email record and analyze subject
    const emailRecord = await getEmailRecord(email_id);
    
    // Extract information from email subject, using pre-extracted work order if available
    const emailInfo = analyzeEmailSubject(emailRecord.subject, emailRecord.work_order_number);
    
    // Update email record with extracted information (only if not already set)
    const updateData = {};
    if (!emailRecord.email_type && emailInfo.email_type) {
      updateData.email_type = emailInfo.email_type;
    }
    if (!emailRecord.work_order_number && emailInfo.work_order_number) {
      updateData.work_order_number = emailInfo.work_order_number;
    }
    if (!emailRecord.project_number && emailInfo.project_number) {
      updateData.project_number = emailInfo.project_number;
    }
    
    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await updateEmailRecord(email_id, updateData);
    }
    
    // Use the final combined information
    const finalEmailInfo = {
      email_type: emailRecord.email_type || emailInfo.email_type,
      work_order_number: emailRecord.work_order_number || emailInfo.work_order_number,
      project_number: emailRecord.project_number || emailInfo.project_number
    };

    // Download attachments from Supabase Storage (all in same work order folder)
    const attachments = await downloadEmailAttachments(email_id);
    
    let result;
    if (finalEmailInfo.email_type === 'confirmation') {
      result = await processConfirmationEmail(email_id, attachments, finalEmailInfo);
    } else if (finalEmailInfo.email_type === 'results') {
      result = await processResultsEmail(email_id, attachments, finalEmailInfo);
    } else {
      throw new Error(`Unknown email type determined from subject: ${emailRecord.subject}. Email info: ${JSON.stringify(finalEmailInfo)}`);
    }

    // Update status to completed
    await updateEmailStatus(email_id, 'completed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email processed successfully',
        data: result
      })
    };

  } catch (error) {
  log('Error processing email attachments', {
    email_id,
    error: error.message,
    stack: error.stack
  });

  // **IMPROVED ERROR NOTIFICATION EMAIL**
  try {
    // Try to get context information for the error email
    let errorContext = { emailId: email_id };
    
    // Try to get email record and extract info for better error context
    try {
      const emailRecord = await getEmailRecord(email_id);
      const emailInfo = analyzeEmailSubject(emailRecord.subject, emailRecord.work_order_number);
      
      errorContext = {
        emailId: email_id,
        workOrderNumber: emailInfo.work_order_number,
        projectNumber: emailInfo.project_number,
        kitCode: emailInfo.project_number || emailInfo.work_order_number || 'Unknown',
        emailType: emailInfo.email_type,
        stage: 'main_processing'
      };
    } catch (contextError) {
      // If we can't get context, just use what we have
      log('Could not get error context', { error: contextError.message });
      errorContext.kitCode = 'Unknown';
    }

    await sendErrorNotificationEmail(error, errorContext);
  } catch (notificationError) {
    log('Failed to send error notification', { error: notificationError.message });
  }

  // Update status to failed
  await updateEmailStatus(email_id, 'failed', error.message);

  return {
    statusCode: 500,
    body: JSON.stringify({
      success: false,
      error: error.message
    })
  };
}
};

/**
 * Send error notification email to admin when automated processing fails
 */
async function sendErrorNotificationEmail(error, context = {}) {
  try {
    const {
      emailId,
      workOrderNumber,
      projectNumber,
      kitCode,
      emailType,
      stage = 'unknown'
    } = context;

    log('Sending error notification email', { 
      error: error.message, 
      context,
      recipientEmail: 'david.phillips@bookerhq.ca'
    });

    // Prepare email data
    const emailData = {
      transactionalId: 'cmebqfwbm03b1y00ikw8f3rbp', // You'll need to create this template
      email: 'david.phillips@bookerhq.ca',
      dataVariables: {
        errorMessage: error.message || 'An unknown error occurred during automated processing',
        kitCode: kitCode || projectNumber || workOrderNumber || 'Unknown',
        workOrderNumber: workOrderNumber || 'N/A',
        projectNumber: projectNumber || 'N/A',
        emailType: emailType || 'unknown',
        processingStage: stage,
        timestamp: new Date().toISOString(),
        emailId: emailId || 'N/A',
        errorDetails: error.stack ? error.stack.substring(0, 500) : 'No stack trace available'
      }
    };

    const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    if (loopsResponse.ok) {
      log('Error notification email sent successfully', { 
        kitCode: kitCode || 'Unknown',
        errorMessage: error.message
      });
    } else {
      const errorText = await loopsResponse.text();
      log('Failed to send error notification email', { 
        status: loopsResponse.status, 
        error: errorText
      });
    }

  } catch (emailError) {
    log('Exception while sending error notification email', { 
      originalError: error.message,
      emailError: emailError.message
    });
    // Don't throw - we don't want email failures to mask the original error
  }
}

/**
 * Get email record from database
 */
async function getEmailRecord(emailId) {
  try {
    const { data, error } = await supabase
      .from('emails_received')
      .select('*')
      .eq('id', emailId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    log('Error getting email record', { emailId, error: error.message });
    throw error;
  }
}

/**
 * Analyze email subject to extract information and determine type
 * Now enhanced to work with pre-extracted work order numbers
 */
function analyzeEmailSubject(subject, preExtractedWorkOrder = null) {
  // log('Analyzing email subject', { subject, preExtractedWorkOrder });

  // Check if it's a confirmation email
  const confirmationMatch = subject.match(/Work Order Confirmation Report #\s*(\d+).*Project #\s*([A-Z0-9]+)/i);
  if (confirmationMatch) {
    return {
      email_type: 'confirmation',
      work_order_number: preExtractedWorkOrder || confirmationMatch[1],
      project_number: confirmationMatch[2]
    };
  }

  // Check if it's a results email
  const resultsMatch = subject.match(/Work Order Report #\s*(\d+)/i);
  if (resultsMatch) {
    return {
      email_type: 'results',
      work_order_number: preExtractedWorkOrder || resultsMatch[1],
      project_number: null
    };
  }

  // If pre-extracted work order is available, use it even if subject parsing fails
  if (preExtractedWorkOrder) {
    // Determine type based on subject keywords
    if (subject.toLowerCase().includes('confirmation')) {
      return {
        email_type: 'confirmation',
        work_order_number: preExtractedWorkOrder,
        project_number: null // Will need manual extraction if needed
      };
    } else if (subject.toLowerCase().includes('report')) {
      return {
        email_type: 'results',
        work_order_number: preExtractedWorkOrder,
        project_number: null
      };
    }
  }

  // If neither pattern matches, try to extract just work order number
  const workOrderMatch = subject.match(/(?:Work Order|WO#?)\s*:?\s*#?\s*(\d+)/i);
  if (workOrderMatch) {
    return {
      email_type: 'unknown',
      work_order_number: preExtractedWorkOrder || workOrderMatch[1],
      project_number: null
    };
  }

  throw new Error(`Could not determine email type from subject: ${subject}`);
}

/**
 * Update email record with extracted information
 */
async function updateEmailRecord(emailId, updateData) {
  try {
    const { error } = await supabase
      .from('emails_received')
      .update(updateData)
      .eq('id', emailId);

    if (error) {
      throw error;
    }

    log('Updated email record'
      // , { emailId, updateData }
    );
  } catch (error) {
    log('Error updating email record', { emailId, error: error.message });
    throw error;
  }
}

/**
 * Download email attachments from Supabase Storage
 * Now using work order number based paths
 */
async function downloadEmailAttachments(emailId) {
  try {
    // Get email record to find work order and storage path
    const { data: emailRecord, error: emailError } = await supabase
      .from('emails_received')
      .select('work_order_number')
      .eq('id', emailId)
      .single();

    if (emailError) {
      throw emailError;
    }

    const workOrderNumber = emailRecord.work_order_number;
    if (!workOrderNumber) {
      throw new Error('No work order number found for email');
    }

    // List files directly from storage folder
    const { data: fileList, error: listError } = await supabase.storage
      .from('lab-results')
      .list(workOrderNumber + '/');

    if (listError) {
      throw listError;
    }

    // log(`Found ${fileList.length} files in storage folder ${workOrderNumber}/`);

    // Download each file
    const attachments = [];
    for (const file of fileList) {
      try {
        const filePath = `${workOrderNumber}/${file.name}`;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('lab-results')
          .download(filePath);

        if (downloadError) {
          throw downloadError;
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine attachment type from filename
        const attachmentType = determineAttachmentType(file.name);

        attachments.push({
          filename: file.name,
          storage_path: filePath,
          size: buffer.length,
          buffer: buffer,
          attachment_type: attachmentType
        });

        // log(`Downloaded file: ${file.name} (${buffer.length} bytes, type: ${attachmentType})`);

      } catch (error) {
        log(`Error downloading file ${file.name}`, { error: error.message });
        throw error;
      }
    }

    return attachments;

  } catch (error) {
    log('Error downloading email attachments', { error: error.message });
    throw error;
  }
}

/**
 * Determine attachment type from filename
 */
function determineAttachmentType(filename) {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.endsWith('.pdf')) {
    return 'pdf';
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return 'excel';
  } else if (lowerName.endsWith('.csv')) {
    return 'csv';
  } else {
    return 'other';
  }
}

/**
 * Process confirmation email
 * Stage 1: Match project number to kit registration
 */
async function processConfirmationEmail(emailId, attachments, emailInfo) {
  try {
    log('Processing confirmation email'
      // , { emailId, emailInfo }
    );

    const projectNumber = emailInfo.project_number;
    const workOrderNumber = emailInfo.work_order_number;

    if (!projectNumber) {
      throw new Error('No project number found in confirmation email subject');
    }

    // Find kit registration by project number (kit_code or display_id)
    const kitRegistration = await findKitRegistrationByProjectNumber(projectNumber);
    
    if (!kitRegistration) {
      throw new Error(`No kit registration found for project number: ${projectNumber}`);
    }

    // Update kit registration with work order number
    await updateKitRegistration(kitRegistration.id, workOrderNumber, null);

    // Update email record with kit registration link
    const { error: updateError } = await supabase
      .from('emails_received')
      .update({
        kit_registration_id: kitRegistration.id,
        processing_status: 'confirmation_processed'
      })
      .eq('id', emailId);

    if (updateError) {
      throw updateError;
    }

    // Store confirmation PDF URL if available
    const pdfAttachment = attachments.find(att => att.attachment_type === 'pdf');
    if (pdfAttachment) {
      // Create signed URL for the PDF
      const { data: signedUrlData } = await supabase.storage
        .from('lab-results')
        .createSignedUrl(pdfAttachment.storage_path, 3600 * 24 * 30); // 30 days

      // Update kit registration with confirmation PDF URL
      await supabase
        .from('kit_registrations')
        .update({
          confirmation_pdf_url: signedUrlData.signedUrl
        })
        .eq('id', kitRegistration.id);
    }

    log('Confirmation email processed successfully'
    // , {
    //   kitRegistrationId: kitRegistration.id,
    //   projectNumber,
    //   workOrderNumber
    // }
    );

    return {
      stage: 'confirmation',
      kitRegistrationId: kitRegistration.id,
      projectNumber,
      workOrderNumber,
      matched: true
    };

  } catch (error) {
    log('Error processing confirmation email', { error: error.message });

    await sendErrorNotificationEmail(error, {
      emailId,
      workOrderNumber: emailInfo.work_order_number,
      projectNumber: emailInfo.project_number,
      kitCode: emailInfo.project_number,
      emailType: 'confirmation',
      stage: 'confirmation_processing'
    });

    throw error;
  }
}

/**
 * Process results email  
 * Stage 2: Process results using existing logic
 */
async function processResultsEmail(emailId, attachments, emailInfo) {
  let kitInfo = null;
  
  try {
    log('Processing results email'
      // , { emailId, emailInfo }
    );

    const workOrderNumber = emailInfo.work_order_number;

    // Find pre-matched kit registration by work order number
    const kitRegistration = await findKitRegistrationByWorkOrder(workOrderNumber);
    
    if (!kitRegistration) {
      throw new Error(`No kit registration found for work order: ${workOrderNumber}. Make sure confirmation email was processed first.`);
    }

    // Log what we found for debugging
    // log('Found kit registration', {
    //   id: kitRegistration.id,
    //   kit_registration_id: kitRegistration.kit_registration_id,
    //   display_id: kitRegistration.display_id,
    //   kit_code: kitRegistration.kit_code,
    //   tableSource: kitRegistration.kit_registration_id ? 'kit_registrations' : 'legacy_kit_registrations'
    // });

    // Generate a proper UUID for the report
    const { v4: uuidv4 } = require('uuid');
    const reportId = uuidv4();

    // Determine if this is a regular or legacy kit
    const isLegacyKit = !kitRegistration.kit_registration_id;
    
    // Get detailed customer info from admin view
    let kitInfo = {
      displayId: kitRegistration.display_id || kitRegistration.kit_code || 'UNKNOWN',
      kitCode: kitRegistration.kit_code || kitRegistration.display_id || 'UNKNOWN',
      orderNumber: 'N/A',
      testKitName: 'Water Test Kit',
      testKitId: null,
      customerFirstName: 'Valued Customer',
      customerName: 'Customer',
      customerEmail: 'unknown@example.com',
      customerLocation: 'Not specified'
    };

    try {
  // Query the admin view with the correct kit_id based on kit type
  const queryId = isLegacyKit 
    ? kitRegistration.id  // For legacy kits, use the direct id
    : kitRegistration.kit_registration_id; // For regular kits, use kit_registration_id
  
  // log('Querying admin view', { queryId, isLegacyKit, kitRegId: kitRegistration.kit_registration_id });

  // Try production admin view first
  let { data: kitAdminData, error: kitAdminError } = await supabase
    .from('vw_test_kits_admin')
    .select('*')
    .eq('kit_id', queryId);

  let viewUsed = 'production';

  // If not found in production view, try development view
  if ((!kitAdminData || kitAdminData.length === 0) && !kitAdminError) {
    // log('Kit not found in production admin view, trying development view', { queryId });
    
    const { data: devData, error: devError } = await supabase
      .from('vw_test_kits_admin_dev')
      .select('*')
      .eq('kit_id', queryId);
    
    kitAdminData = devData;
    kitAdminError = devError;
    viewUsed = 'development';
    
    if (kitAdminData && kitAdminData.length > 0) {
      // log('Found kit in development admin view', { queryId, rowCount: kitAdminData.length });
    }
  }

  if (!kitAdminError && kitAdminData && kitAdminData.length > 0) {
    const adminData = kitAdminData[0];
    
    const formatLocation = (data) => {
      const parts = [];
      if (data.customer_address) parts.push(data.customer_address);
      if (data.customer_city) parts.push(data.customer_city);
      if (data.customer_province) parts.push(data.customer_province);
      if (data.customer_postal_code) parts.push(data.customer_postal_code);
      
      return parts.length > 0 ? parts.join(', ') : 'Not specified';
    };

    kitInfo = {
      displayId: adminData.kit_code || kitInfo.displayId,
      kitCode: adminData.kit_code || kitInfo.kitCode,
      orderNumber: adminData.order_number || 'N/A',
      testKitName: adminData.test_kit_name || 'Water Test Kit',
      testKitId: adminData.test_kit_id || null,
      customerFirstName: adminData.customer_first_name || 'Valued Customer',
      customerName: `${adminData.customer_first_name || ''} ${adminData.customer_last_name || ''}`.trim() || 'Customer',
      customerEmail: adminData.customer_email || 'unknown@example.com',
      customerLocation: formatLocation(adminData)
    };

    log('Retrieved customer info'
    // , {
    //   customerName: kitInfo.customerName,
    //   customerEmail: kitInfo.customerEmail,
    //   kitCode: kitInfo.kitCode,
    //   orderNumber: kitInfo.orderNumber,
    //   testKitId: kitInfo.testKitId,
    //   testKitName: kitInfo.testKitName,
    //   dataFound: true,
    //   isLegacyKit,
    //   viewUsed
    // }
    );
  } else {
    log('Could not retrieve detailed customer info from admin views, querying direct tables', {
      error: kitAdminError?.message,
      rowsReturned: kitAdminData?.length || 0,
      queryId,
      isLegacyKit
    });
        
        // Fallback: Query the kit tables directly
        if (isLegacyKit) {
          // Query legacy_kit_registrations and related tables
          const { data: legacyData, error: legacyError } = await supabase
            .from('legacy_kit_registrations')
            .select(`
              *,
              test_kits (id, name, description),
              profiles (first_name, last_name, email)
            `)
            .eq('id', kitRegistration.id)
            .single();

          if (!legacyError && legacyData) {
            kitInfo = {
              displayId: legacyData.display_id || legacyData.kit_code || kitInfo.displayId,
              kitCode: legacyData.kit_code || kitInfo.kitCode,
              orderNumber: `LEGACY-${legacyData.kit_code}`,
              testKitName: legacyData.test_kits?.name || 'Water Test Kit',
              testKitId: legacyData.test_kits?.id || null,
              customerFirstName: legacyData.profiles?.first_name || 'Valued Customer',
              customerName: `${legacyData.profiles?.first_name || ''} ${legacyData.profiles?.last_name || ''}`.trim() || 'Customer',
              customerEmail: legacyData.profiles?.email || 'unknown@example.com',
              customerLocation: [legacyData.address, legacyData.city, legacyData.province, legacyData.postal_code].filter(Boolean).join(', ') || 'Not specified'
            };
            // log('Retrieved legacy kit info from direct query', { kitInfo });
          }
        } else {
          // Query regular kit_registrations and related tables
          const { data: regularData, error: regularError } = await supabase
            .from('kit_registrations')
            .select(`
              *,
              order_items (
                test_kit_id,
                test_kits (id, name, description),
                orders (
                  order_number,
                  shipping_address
                )
              ),
              profiles (first_name, last_name, email)
            `)
            .eq('kit_registration_id', kitRegistration.kit_registration_id)
            .single();

          if (!regularError && regularData) {
            const testKit = regularData.order_items?.test_kits;
            const order = regularData.order_items?.orders;
            const profile = regularData.profiles;
            
            kitInfo = {
              displayId: regularData.display_id || kitInfo.displayId,
              kitCode: regularData.kit_code || regularData.display_id || kitInfo.kitCode,
              orderNumber: order?.order_number || 'N/A',
              testKitName: testKit?.name || 'Water Test Kit',
              testKitId: testKit?.id || null,
              customerFirstName: profile?.first_name || 'Valued Customer',
              customerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Customer',
              customerEmail: profile?.email || 'unknown@example.com',
              customerLocation: [regularData.address, regularData.city, regularData.province, regularData.postal_code].filter(Boolean).join(', ') || 'Not specified'
            };
            // log('Retrieved regular kit info from direct query', { kitInfo });
          }
        }
      }
    } catch (adminViewError) {
      log('Error querying for customer details', { 
        error: adminViewError.message,
        stack: adminViewError.stack
      });
    }

    // Find Excel/CSV attachment for processing
    const dataAttachment = attachments.find(att => 
      att.attachment_type === 'excel' || att.attachment_type === 'csv'
    );

    if (!dataAttachment) {
      throw new Error('No Excel or CSV attachment found for results processing');
    }

    // Find COC PDF attachment if available
    const cocAttachment = attachments.find(att => 
      att.attachment_type === 'pdf' && 
      (att.filename.toLowerCase().includes('coc') || 
       att.filename.toLowerCase().includes('chain') ||
       att.filename.toLowerCase().includes('custody'))
    );

    // Convert storage files to format expected by existing processing logic
    const fileData = adaptStorageFilesToBusboyFormat(dataAttachment, cocAttachment);

    // **REUSE existing processTestResultsFile function**
    const processingResult = await processTestResultsFile(fileData);

    if (!processingResult.success) {
      throw new Error('Failed to process test results file');
    }

    // Save test results to database
    await saveTestResults(
      kitRegistration.kit_registration_id || kitRegistration.id, 
      processingResult.results, 
      workOrderNumber
    );

    // Update kit registration status and capture lab chain of custody URL
    const kitUpdateResult = await updateKitRegistration(
      kitRegistration.kit_registration_id || kitRegistration.id,
      workOrderNumber,
      processingResult.sampleNumber,
      isLegacyKit
    );

    // **CAPTURE THE LAB CHAIN OF CUSTODY URL**
    const labChainOfCustodyUrl = kitUpdateResult.labChainOfCustodyUrl;

    log('Kit registration update completed'
    // , {
    //   hasLabChainOfCustody: !!labChainOfCustodyUrl,
    //   labChainOfCustodyUrl: labChainOfCustodyUrl
    // }
    );

    // Create a proper report record in the database
    const reportRecord = {
      report_id: reportId,
      sample_number: processingResult.sampleNumber,
      work_order_number: workOrderNumber,
      processing_status: 'processing',
      report_type: 'registered',
      user_id: kitRegistration.user_id
    };

    if (isLegacyKit) {
      reportRecord.legacy_kit_registration_id = kitRegistration.id;
    } else {
      reportRecord.kit_registration_id = kitRegistration.kit_registration_id;
    }

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([reportRecord])
      .select()
      .single();

    if (reportError) {
      log('Failed to create report record', { error: reportError.message });
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    // **REUSE existing report generation logic with properly formatted kitInfo**
    const requestId = Math.random().toString(36).substring(2, 8);
    
    const reportResult = await processReportGeneration(
      supabase,                           // supabase client
      reportId,                          // reportId (proper UUID)
      processingResult.sampleNumber,      // sampleNumber from processed results
      requestId,                         // requestId (random string for logging)
      kitInfo.kitCode,                   // kitOrderCode
      kitInfo                           // kitInfo (properly formatted object)
    );

    // Update report status based on generation result
    if (reportResult.success) {
      await supabase
        .from('reports')
        .update({ 
          pdf_file_url: reportResult.pdfUrl,
          processing_status: 'completed'
        })
        .eq('report_id', reportId);

      // Update kit registration with report ID
      if (isLegacyKit) {
        await supabase
          .from('legacy_kit_registrations')
          .update({ 
            report_id: reportId,
            status: 'report_generated'
          })
          .eq('id', kitRegistration.id);
      } else {
        await supabase
          .from('kit_registrations')
          .update({ 
            report_id: reportId,
            status: 'report_generated'
          })
          .eq('kit_registration_id', kitRegistration.kit_registration_id);
      }

      // **ADD ADMIN NOTIFICATION EMAIL - START**
  try {
    log('Sending admin notification email'
      // , { reportId, workOrderNumber }
    );
    
    // Get report details for file downloads
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('csv_file_url, pdf_file_url')
      .eq('report_id', reportId)
      .single();
    
    if (reportError) {
      log('Could not get report for admin notification', { error: reportError.message });
    } else {
      // Download and prepare attachments
      const attachments = [];
      
      // Download CSV (from lab-results bucket, not test-results-csv)
      try {
        // Find the Excel/CSV file in the lab-results bucket under the work order folder
        const { data: fileList, error: listError } = await supabase.storage
          .from('lab-results')
          .list(workOrderNumber + '/');

        if (!listError && fileList) {
          // Look for Excel or CSV files
          const dataFile = fileList.find(file => 
            file.name.toLowerCase().endsWith('.xlsx') || 
            file.name.toLowerCase().endsWith('.xls') || 
            file.name.toLowerCase().endsWith('.csv')
          );

          if (dataFile) {
            const csvFilePath = `${workOrderNumber}/${dataFile.name}`;
            // log('Downloading data file for admin email', { filename: dataFile.name, path: csvFilePath });
            
            const { data: csvData, error: csvError } = await supabase.storage
              .from('lab-results')
              .download(csvFilePath);
              
            if (!csvError && csvData) {
              // Convert to base64 based on file type
              let csvBase64;
              let contentType;
              
              if (dataFile.name.toLowerCase().endsWith('.csv')) {
                const csvContent = await csvData.text();
                csvBase64 = Buffer.from(csvContent, 'utf8').toString('base64');
                contentType = 'text/csv';
              } else {
                // Excel file
                const csvArrayBuffer = await csvData.arrayBuffer();
                csvBase64 = Buffer.from(csvArrayBuffer).toString('base64');
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              }
              
              attachments.push({
                filename: dataFile.name,
                data: csvBase64,
                contentType: contentType
              });
              
              // log('Data file attachment prepared', { 
              //   filename: dataFile.name,
              //   sizeKB: Math.round(csvBase64.length / 1024),
              //   contentType: contentType
              // });
            } else {
              log('Data file download failed', { error: csvError?.message, filename: dataFile.name });
            }
          } else {
            log('No data file found in lab-results folder', { 
              workOrderNumber, 
              filesInFolder: fileList.map(f => f.name) 
            });
          }
        } else {
          log('Error listing files in lab-results folder', { 
            error: listError?.message, 
            workOrderNumber 
          });
        }
      } catch (csvErr) {
        log('Data file processing error', { error: csvErr.message });
      }
      
      // Download PDF Report
      if (report.pdf_file_url) {
        try {
          const pdfFileName = report.pdf_file_url.split('/').pop();
          // log('Downloading PDF report for admin email', { filename: pdfFileName });
          
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from('generated-reports')
            .download(pdfFileName);
            
          if (!pdfError && pdfData) {
            const pdfArrayBuffer = await pdfData.arrayBuffer();
            const pdfBase64 = Buffer.from(pdfArrayBuffer).toString('base64');
            
            attachments.push({
              filename: pdfFileName,
              data: pdfBase64,
              contentType: 'application/pdf'
            });
            
            // log('PDF report attachment prepared', { 
            //   filename: pdfFileName,
            //   sizeKB: Math.round(pdfBase64.length / 1024) 
            // });
          } else {
            log('PDF report download failed', { error: pdfError?.message });
          }
        } catch (pdfErr) {
          log('PDF report processing error', { error: pdfErr.message });
        }
      }
      
      // Download Lab Chain of Custody if available (from the lab-results bucket)
      if (labChainOfCustodyUrl) {
        try {
          // Extract the file path from the URL for lab-results bucket
          let cocFilePath;
          if (labChainOfCustodyUrl.includes('/lab-results/')) {
            // Extract path after '/lab-results/'
            const urlParts = labChainOfCustodyUrl.split('/lab-results/');
            cocFilePath = urlParts[1];
            
            // Remove any query parameters
            if (cocFilePath.includes('?')) {
              cocFilePath = cocFilePath.split('?')[0];
            }
          } else {
            // Fallback: construct the path
            cocFilePath = `${workOrderNumber}/CofC${workOrderNumber}`;
          }
          
          const cocFileName = `LAB_COC_${kitInfo.kitCode}.pdf`;
          
          // log('Downloading Lab Chain of Custody for admin email', { 
          //   filename: cocFileName,
          //   filePath: cocFilePath,
          //   originalUrl: labChainOfCustodyUrl
          // });
          
          const { data: cocData, error: cocError } = await supabase.storage
            .from('lab-results')
            .download(cocFilePath);
            
          if (!cocError && cocData) {
            const cocArrayBuffer = await cocData.arrayBuffer();
            const cocBase64 = Buffer.from(cocArrayBuffer).toString('base64');
            
            attachments.push({
              filename: cocFileName,
              data: cocBase64,
              contentType: 'application/pdf'
            });
            
            // log('Lab Chain of Custody attachment prepared', { 
            //   filename: cocFileName,
            //   sizeKB: Math.round(cocBase64.length / 1024) 
            // });
          } else {
            log('Lab Chain of Custody download failed', { error: cocError?.message });
          }
        } catch (cocErr) {
          log('Lab Chain of Custody processing error', { error: cocErr.message });
        }
      } else {
        log('No Lab Chain of Custody URL available for this report', { workOrderNumber });
      }
      
      // log('All attachments prepared for admin email', { 
      //   count: attachments.length,
      //   filenames: attachments.map(att => att.filename)
      // });
      
      // Send email via Loops directly
      const requestBody = {
        transactionalId: 'cmdj4w1u62ku8zc0jqy6rfekn',
        email: 'david.phillips@bookerhq.ca',
        dataVariables: {
          customerName: kitInfo.customerName || 'Customer',
          kitCode: kitInfo.kitCode || kitInfo.displayId || 'UNKNOWN',
          orderNumber: kitInfo.orderNumber || 'N/A',
          customerEmail: kitInfo.customerEmail || 'No email available',
          workOrderNumber: workOrderNumber,
          sampleNumber: processingResult.sampleNumber,
          manageReportsUrl: `${process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app'}/admin-dashboard#reports`
        },
        attachments: attachments
      };

      if (attachments.length > 0) {
        const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VITE_LOOPS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (loopsResponse.ok) {
          log('Admin notification sent successfully'
          // , { 
          //   reportId, 
          //   workOrderNumber,
          //   attachmentsCount: attachments.length,
          //   kitCode: kitInfo.kitCode || kitInfo.displayId,
          //   orderNumber: kitInfo.orderNumber
          // }
          );
        } else {
          const errorText = await loopsResponse.text();
          log('Failed to send admin notification', { 
            status: loopsResponse.status, 
            error: errorText,
            workOrderNumber
          });
        }
      } else {
        log('No attachments available, skipping admin notification', { workOrderNumber });
      }
    }
  } catch (adminNotificationError) {
    log('Exception in admin notification', { 
      error: adminNotificationError.message,
      stack: adminNotificationError.stack,
      workOrderNumber
    });
    // Don't fail the entire process if admin notification fails
  }
  // **ADD ADMIN NOTIFICATION EMAIL - END**

    } else {
      await supabase
        .from('reports')
        .update({ 
          processing_status: 'failed',
          error_message: reportResult.error
        })
        .eq('report_id', reportId);
    }

    // Update email record
    const { error: updateError } = await supabase
      .from('emails_received')
      .update({
        kit_registration_id: kitRegistration.kit_registration_id || kitRegistration.id,
        processing_status: 'results_processed'
      })
      .eq('id', emailId);

    if (updateError) {
      throw updateError;
    }

    log('Results email processed successfully', 
      // {
    //   reportId,
    //   kitRegistrationId: kitRegistration.kit_registration_id || kitRegistration.id,
    //   workOrderNumber,
    //   resultsCount: processingResult.results.length,
    //   reportGenerated: reportResult.success,
    //   customerInfo: {
    //     name: kitInfo.customerName,
    //     email: kitInfo.customerEmail,
    //     location: kitInfo.customerLocation,
    //     testKitId: kitInfo.testKitId,
    //     testKitName: kitInfo.testKitName
    //   }
    // }
    );

    return {
      stage: 'results',
      reportId,
      kitRegistrationId: kitRegistration.kit_registration_id || kitRegistration.id,
      workOrderNumber,
      sampleNumber: processingResult.sampleNumber,
      resultsCount: processingResult.results.length,
      reportGenerated: reportResult.success
    };

  } catch (error) {
    log('Error processing results email', { error: error.message, stack: error.stack });

    await sendErrorNotificationEmail(error, {
      emailId,
      workOrderNumber: emailInfo.work_order_number,
      projectNumber: emailInfo.project_number,
      kitCode: kitInfo?.kitCode || emailInfo.project_number || emailInfo.work_order_number || 'Unknown',
      emailType: 'results',
      stage: 'results_processing'
    });

    throw error;
  }
}

/**
 * Convert Supabase Storage files to Busboy format for existing logic
 */
function adaptStorageFilesToBusboyFormat(dataAttachment, cocAttachment = null) {
  const fileData = {
    fileBuffer: dataAttachment.buffer,
    fileName: dataAttachment.filename,
    mimetype: dataAttachment.mime_type || 'application/octet-stream',
    cocFileBuffer: null,
    cocFileName: null,
    cocMimetype: null
  };

  // Add COC file if available
  if (cocAttachment) {
    fileData.cocFileBuffer = cocAttachment.buffer;
    fileData.cocFileName = cocAttachment.filename;
    fileData.cocMimetype = cocAttachment.mime_type || 'application/pdf';
  }

  return fileData;
}

/**
 * Update email processing status
 */
async function updateEmailStatus(emailId, status, errorMessage = null) {
  try {
    const updateData = {
      processing_status: status,
      processed_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('emails_received')
      .update(updateData)
      .eq('id', emailId);

    if (error) {
      throw error;
    }

    log(`Updated email status to ${status}`
      // , { emailId }
    );

  } catch (error) {
    log('Error updating email status', { 
      emailId, 
      status, 
      error: error.message 
    });
    // Don't throw here to avoid recursive errors
  }
}