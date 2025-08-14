// process-email-attachments.cjs
// Netlify function to process email attachments from Supabase storage
// Handles ALL extraction and processing logic - Zapier only uploads files

const { createClient } = require('@supabase/supabase-js');
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

  log('Processing email attachments', { 
    email_id, 
    trigger_source,
    has_webhook_secret: !!webhookSecret 
  });

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
  log('Analyzing email subject', { subject, preExtractedWorkOrder });

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

    log('Updated email record', { emailId, updateData });
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

    log(`Found ${fileList.length} files in storage folder ${workOrderNumber}/`);

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

        log(`Downloaded file: ${file.name} (${buffer.length} bytes, type: ${attachmentType})`);

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
    log('Processing confirmation email', { emailId, emailInfo });

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

    log('Confirmation email processed successfully', {
      kitRegistrationId: kitRegistration.id,
      projectNumber,
      workOrderNumber
    });

    return {
      stage: 'confirmation',
      kitRegistrationId: kitRegistration.id,
      projectNumber,
      workOrderNumber,
      matched: true
    };

  } catch (error) {
    log('Error processing confirmation email', { error: error.message });
    throw error;
  }
}

/**
 * Process results email  
 * Stage 2: Process results using existing logic
 */
async function processResultsEmail(emailId, attachments, emailInfo) {
  try {
    log('Processing results email', { emailId, emailInfo });

    const workOrderNumber = emailInfo.work_order_number;

    // Find pre-matched kit registration by work order number
    const kitRegistration = await findKitRegistrationByWorkOrder(workOrderNumber);
    
    if (!kitRegistration) {
      throw new Error(`No kit registration found for work order: ${workOrderNumber}. Make sure confirmation email was processed first.`);
    }

    // Get detailed customer info from admin view using the kit registration ID
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
      // Query the admin view to get full customer details
      const { data: kitAdminData, error: kitAdminError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .eq('kit_id', kitRegistration.kit_registration_id || kitRegistration.id)
        .single();

      if (!kitAdminError && kitAdminData) {
        const formatLocation = (data) => {
          const parts = [];
          if (data.customer_address) parts.push(data.customer_address);
          if (data.customer_city) parts.push(data.customer_city);
          if (data.customer_province) parts.push(data.customer_province);
          if (data.customer_postal_code) parts.push(data.customer_postal_code);
          
          return parts.length > 0 ? parts.join(', ') : 'Not specified';
        };

        kitInfo = {
          displayId: kitAdminData.kit_code || kitInfo.displayId,
          kitCode: kitAdminData.kit_code || kitInfo.kitCode,
          orderNumber: kitAdminData.order_number || 'N/A',
          testKitName: kitAdminData.test_kit_name || 'Water Test Kit',
          testKitId: kitAdminData.test_kit_id || null,
          customerFirstName: kitAdminData.customer_first_name || 'Valued Customer',
          customerName: `${kitAdminData.customer_first_name || ''} ${kitAdminData.customer_last_name || ''}`.trim() || 'Customer',
          customerEmail: kitAdminData.customer_email || 'unknown@example.com',
          customerLocation: formatLocation(kitAdminData)
        };

        log('Retrieved customer info from admin view', {
          customerName: kitInfo.customerName,
          customerEmail: kitInfo.customerEmail,
          kitCode: kitInfo.kitCode,
          orderNumber: kitInfo.orderNumber
        });
      } else {
        log('Could not retrieve detailed customer info, using basic kit registration data', {
          error: kitAdminError?.message,
          kitRegistrationId: kitRegistration.kit_registration_id || kitRegistration.id
        });
        
        // Fallback to basic kit registration data if available
        if (kitRegistration.user_id) {
          // Try to get user details from profiles table
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', kitRegistration.user_id)
            .single();

          if (!profileError && userProfile) {
            kitInfo.customerFirstName = userProfile.first_name || 'Valued Customer';
            kitInfo.customerName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Customer';
            kitInfo.customerEmail = userProfile.email || 'unknown@example.com';
          }
        }
      }
    } catch (adminViewError) {
      log('Error querying admin view for customer details', { 
        error: adminViewError.message,
        kitRegistrationId: kitRegistration.kit_registration_id || kitRegistration.id
      });
      // Continue with default values
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
      kitRegistration.id, 
      processingResult.results, 
      workOrderNumber
    );

    // Update kit registration status
    await updateKitRegistration(
      kitRegistration.id,
      workOrderNumber,
      processingResult.sampleNumber
    );

    // **REUSE existing report generation logic with properly formatted kitInfo**
    await processReportGeneration(
      supabase,                           // supabase client
      kitRegistration.id,                 // reportId (using kit registration ID)
      processingResult.sampleNumber,      // sampleNumber from processed results
      kitRegistration.id,                 // requestId (using kit registration ID again)
      kitInfo.kitCode,                    // kitOrderCode
      kitInfo                            // kitInfo (properly formatted object)
    );

    // Update email record
    const { error: updateError } = await supabase
      .from('emails_received')
      .update({
        kit_registration_id: kitRegistration.id,
        processing_status: 'results_processed'
      })
      .eq('id', emailId);

    if (updateError) {
      throw updateError;
    }

    log('Results email processed successfully', {
      kitRegistrationId: kitRegistration.id,
      workOrderNumber,
      resultsCount: processingResult.results.length,
      customerInfo: {
        name: kitInfo.customerName,
        email: kitInfo.customerEmail,
        location: kitInfo.customerLocation
      }
    });

    return {
      stage: 'results',
      kitRegistrationId: kitRegistration.id,
      workOrderNumber,
      sampleNumber: processingResult.sampleNumber,
      resultsCount: processingResult.results.length,
      reportGenerated: true
    };

  } catch (error) {
    log('Error processing results email', { error: error.message });
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
    mimetype: dataAttachment.mime_type || 'application/octet-stream'
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

    log(`Updated email status to ${status}`, { emailId });

  } catch (error) {
    log('Error updating email status', { 
      emailId, 
      status, 
      error: error.message 
    });
    // Don't throw here to avoid recursive errors
  }
}