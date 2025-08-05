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
const { generateAndSendReport } = require('./reportGenerator.cjs');

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
    // Get attachment records from database
    const { data: attachmentRecords, error: recordsError } = await supabase
      .from('email_attachments')
      .select('*')
      .eq('email_id', emailId);

    if (recordsError) {
      throw recordsError;
    }

    log(`Found ${attachmentRecords.length} attachments to download`);

    // Download each attachment
    const attachments = [];
    for (const record of attachmentRecords) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('lab-results')
          .download(record.storage_path);

        if (downloadError) {
          throw downloadError;
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine attachment type from filename
        const attachmentType = determineAttachmentType(record.filename);

        attachments.push({
          ...record,
          buffer: buffer,
          filename: record.filename,
          size: buffer.length,
          attachment_type: attachmentType
        });

        // Update attachment record with determined type
        await supabase
          .from('email_attachments')
          .update({ attachment_type: attachmentType })
          .eq('id', record.id);

        log(`Downloaded attachment: ${record.filename} (${buffer.length} bytes, type: ${attachmentType})`);

      } catch (error) {
        log(`Error downloading attachment ${record.filename}`, { error: error.message });
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

    // **REUSE existing report generation logic**
    await generateAndSendReport(kitRegistration);

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
      resultsCount: processingResult.results.length
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