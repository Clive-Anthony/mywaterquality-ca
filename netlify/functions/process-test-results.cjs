// netlify/functions/process-test-results.cjs - Updated to handle all report types
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { processReportGeneration } = require('./utils/reportGenerator');
const Busboy = require('busboy');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Set function timeout to 30 seconds
exports.config = {
  timeout: 30
};

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
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }

    const user = userData.user;

    // Check if user is admin using the existing get_user_role function
    const { data: userRole, error: adminError } = await supabase.rpc('get_user_role', {
      user_uuid: user.id
    });

    if (adminError || !userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    // Parse multipart form data using busboy
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid content-type. Expected multipart/form-data' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No request body received' })
      };
    }

    // Parse multipart data with busboy
    try {
      const result = await parseMultipartWithBusboy(event.body, contentType, event.isBase64Encoded);
      
      const {
        fileBuffer,
        fileName,
        kitRegistrationId,
        kitRegistrationType,
        workOrderNumber,
        sampleNumber,
        reportType, // NEW: report type
        customCustomerInfo, // NEW: custom customer info
        customKitInfo // NEW: custom kit info
      } = result;

      // Validate required fields
      if (!fileBuffer) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing file' })
        };
      }

      // Validate based on report type
      if (reportType === 'registered' && !kitRegistrationId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Kit registration ID required for registered reports' })
        };
      }

      if (reportType === 'one_off' && (!customCustomerInfo || !customKitInfo)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Customer and kit info required for one-off reports' })
        };
      }

      log('info', 'Processing test results upload', {
        reportType,
        kitRegistrationId,
        kitRegistrationType,
        workOrderNumber,
        sampleNumber,
        fileName,
        fileSize: fileBuffer.length,
        hasCustomCustomerInfo: !!customCustomerInfo,
        hasCustomKitInfo: !!customKitInfo
      });

      // Process the file and generate report
      const processResult = await processTestResultsFile({
        supabase,
        user,
        fileBuffer,
        fileName,
        cocFileBuffer: result.cocFileBuffer, 
        cocFileName: result.cocFileName,   
        kitRegistrationId,
        kitRegistrationType,
        reportType: reportType || 'registered', // Default to registered for backward compatibility
        customCustomerInfo,
        customKitInfo,
        workOrderNumber,
        sampleNumber
      });

      if (!processResult.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: processResult.error })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reportId: processResult.reportId,
          message: 'Test results processed successfully'
        })
      };

    } catch (parseError) {
      console.error('Error parsing multipart data:', parseError);
      console.error('Parse error stack:', parseError.stack);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to parse multipart data: ' + parseError.message,
          details: parseError.stack
        })
      };
    }

  } catch (error) {
    log('error', 'Unexpected function error', { error: error.message });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

function parseMultipartWithBusboy(body, contentType, isBase64Encoded) {
  return new Promise((resolve, reject) => {
    try {
      // Convert body to buffer
      let bodyBuffer;
      if (isBase64Encoded) {
        bodyBuffer = Buffer.from(body, 'base64');
      } else if (typeof body === 'string') {
        bodyBuffer = Buffer.from(body, 'utf8');
      } else {
        bodyBuffer = body;
      }

      // Initialize busboy
      const busboy = Busboy({ 
        headers: { 'content-type': contentType },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
          files: 2, // Allow 2 files (main file + CoC)
          fields: 20 // Allow more fields for custom data
        }
      });

      const fields = {};
      const files = {};

      // Handle form fields
      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value;
        console.log(`[BUSBOY] Field received: ${fieldname} = ${typeof value === 'string' ? value.substring(0, 50) : value}`);
      });

      // Handle file uploads
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(`[BUSBOY] File upload started: fieldname=${fieldname}, filename=${filename}, mimetype=${mimetype}`);
        
        const chunks = [];
        let totalSize = 0;
        
        file.on('data', (data) => {
          chunks.push(data);
          totalSize += data.length;
        });
        
        file.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          
          // Extract filename properly
          let actualFilename;
          if (typeof filename === 'object' && filename !== null) {
            actualFilename = filename.filename || filename.name || 'uploaded-file';
          } else {
            actualFilename = filename || 'uploaded-file';
          }
          
          files[fieldname] = {
            data: fileBuffer,
            filename: String(actualFilename),
            mimetype: mimetype,
            size: fileBuffer.length
          };
          
          console.log(`[BUSBOY] File upload completed: fieldname=${fieldname}, filename=${actualFilename}, size=${fileBuffer.length} bytes`);
        });

        file.on('error', (err) => {
          console.error(`[BUSBOY] File processing error for ${fieldname}:`, err);
          reject(err);
        });
      });

      // Handle completion
      busboy.on('finish', () => {
        console.log(`[BUSBOY] Parsing completed. Files received:`, Object.keys(files));
        console.log(`[BUSBOY] Fields received:`, Object.keys(fields));
        
        // Extract the main test results file
        const fileData = files.file;
        
        if (!fileData) {
          reject(new Error('No main test results file received'));
          return;
        }

        // Parse custom info if provided
        let customCustomerInfo = null;
        let customKitInfo = null;
        
        try {
          if (fields.customCustomerInfo) {
            customCustomerInfo = JSON.parse(fields.customCustomerInfo);
          }
          if (fields.customKitInfo) {
            customKitInfo = JSON.parse(fields.customKitInfo);
          }
        } catch (jsonError) {
          console.error('Error parsing custom info JSON:', jsonError);
          // Don't reject, just log the error
        }

        const result = {
          fileBuffer: fileData.data,
          fileName: String(fileData.filename || 'uploaded-file'),
          kitRegistrationId: String(fields.kitRegistrationId || ''),
          kitRegistrationType: String(fields.kitRegistrationType || ''),
          workOrderNumber: String(fields.workOrderNumber || ''),
          sampleNumber: String(fields.sampleNumber || ''),
          reportType: String(fields.reportType || 'registered'),
          customCustomerInfo,
          customKitInfo,
          cocFileBuffer: files.cocFile?.data || null,
          cocFileName: files.cocFile?.filename || null
        };

        console.log(`[BUSBOY] Final result prepared:`, {
          hasMainFile: !!result.fileBuffer,
          mainFileSize: result.fileBuffer?.length || 0,
          hasCoCFile: !!result.cocFileBuffer,
          cocFileSize: result.cocFileBuffer?.length || 0,
          cocFileName: result.cocFileName
        });

        resolve(result);
      });

      // Handle errors
      busboy.on('error', (err) => {
        console.error('[BUSBOY] Parser error:', err);
        reject(err);
      });

      // Start parsing
      busboy.write(bodyBuffer);
      busboy.end();

    } catch (error) {
      console.error('[BUSBOY] Setup error:', error);
      reject(error);
    }
  });
}

function extractWorkOrderAndSampleFromCSV(csvContent) {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = parseCSVRow(lines[0]);
    const firstDataRow = parseCSVRow(lines[1]);
    
    const columnMapping = createColumnMapping(headers);
    
    let workOrderNumber = null;
    let sampleNumber = null;
    
    headers.forEach((header, index) => {
      const dbColumn = columnMapping[header];
      if (dbColumn === 'Work Order #' && firstDataRow[index]) {
        workOrderNumber = firstDataRow[index].trim();
      } else if (dbColumn === 'Sample #' && firstDataRow[index]) {
        sampleNumber = firstDataRow[index].trim();
      }
    });
    
    return { workOrderNumber, sampleNumber };
  } catch (error) {
    throw new Error(`Failed to extract work order and sample number: ${error.message}`);
  }
}

async function processTestResultsFile({
  supabase,
  user,
  fileBuffer,
  fileName,
  kitRegistrationId,
  kitRegistrationType,
  cocFileBuffer = null,
  cocFileName = null,
  reportType = 'registered',
  customCustomerInfo = null,
  customKitInfo = null,
  workOrderNumber: providedWorkOrder = null,
  sampleNumber: providedSample = null
}) {
  const requestId = Math.random().toString(36).substring(2, 8);
  let reportId;
  let kitOrderCode = 'UNKNOWN';
  let workOrderNumber;
  let sampleNumber;

  try {
    log('info', 'Starting file processing', { requestId, fileName, reportType });

    // For one-off reports, generate unique identifiers if not provided
    if (reportType === 'one_off') {
      if (!providedWorkOrder) {
        workOrderNumber = `WO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      } else {
        workOrderNumber = providedWorkOrder;
      }
      
      if (!providedSample) {
        sampleNumber = `S-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      } else {
        sampleNumber = providedSample;
      }
      
      kitOrderCode = customKitInfo?.kitCode || `ONEOFF-${Date.now()}`;
    } else {
      // Get kit order code based on registration type and report type
      try {
        if (reportType === 'registered' && kitRegistrationType === 'regular') {
          const { data: kitReg, error: kitRegError } = await supabase
            .from('kit_registrations')
            .select('display_id')
            .eq('kit_registration_id', kitRegistrationId)
            .single();

          if (!kitRegError && kitReg?.display_id) {
            kitOrderCode = kitReg.display_id;
          }
        } else if ((reportType === 'registered' && kitRegistrationType === 'legacy') || 
                   (reportType === 'unregistered' && kitRegistrationType === 'legacy')) {
          const { data: legacyKitReg, error: legacyKitRegError } = await supabase
            .from('legacy_kit_registrations')
            .select('kit_code')
            .eq('id', kitRegistrationId)
            .single();

          if (!legacyKitRegError && legacyKitReg?.kit_code) {
            kitOrderCode = legacyKitReg.kit_code;
          }
        } else if (reportType === 'unregistered' && customKitInfo?.kitCode) {
          kitOrderCode = customKitInfo.kitCode;
        }
      } catch (kitError) {
        log('warn', 'Failed to get kit order code, using default', { error: kitError.message });
      }
    }

    log('info', 'Kit order code determined', { kitOrderCode, requestId });

    // Convert file to CSV
    let csvContent;
    try {
      const safeFileName = String(fileName || 'uploaded-file');
      
      if (safeFileName.toLowerCase().endsWith('.csv')) {
        csvContent = fileBuffer.toString('utf-8');
      } else if (safeFileName.toLowerCase().endsWith('.xlsx') || safeFileName.toLowerCase().endsWith('.xls')) {
        csvContent = await convertExcelToCSVFallback(fileBuffer);
      } else {
        // Check buffer signature to determine file type
        const bufferStart = fileBuffer.slice(0, 4);
        const isZipFile = bufferStart[0] === 0x50 && bufferStart[1] === 0x4B; // PK (ZIP header)
        
        if (isZipFile) {
          csvContent = await convertExcelToCSVFallback(fileBuffer);
        } else {
          csvContent = fileBuffer.toString('utf-8');
        }
      }
      
      if (!csvContent) {
        throw new Error('CSV content is empty or undefined');
      }
      
      // Extract work order and sample number from CSV (if not already set for one-off reports)
      if (reportType !== 'one_off' || (!workOrderNumber || !sampleNumber)) {
        const extracted = extractWorkOrderAndSampleFromCSV(csvContent);
        
        // For one-off reports, only use CSV data if not provided by admin
        if (reportType === 'one_off') {
          workOrderNumber = workOrderNumber || extracted.workOrderNumber;
          sampleNumber = sampleNumber || extracted.sampleNumber;
        } else {
          workOrderNumber = extracted.workOrderNumber;
          sampleNumber = extracted.sampleNumber;
        }
      }
      
      if (!workOrderNumber || !sampleNumber) {
        throw new Error('Could not extract or generate work order number or sample number');
      }
      
      log('info', 'Work order and sample number determined', { workOrderNumber, sampleNumber, requestId });
      
    } catch (csvError) {
      console.error('Error converting file to CSV:', csvError);
      throw new Error(`Failed to process file: ${csvError.message}`);
    }

    // Generate report UUID
    reportId = uuidv4();

    // Create report record with new fields
    const reportRecord = {
      report_id: reportId,
      sample_number: sampleNumber,
      work_order_number: workOrderNumber,
      original_file_name: fileName,
      processing_status: 'processing',
      report_type: reportType, // NEW field
      user_id: null // Will be set later when we find the kit registration or use admin user for one-off
    };

    // Set kit registration fields based on report type
    if (reportType === 'registered') {
      if (kitRegistrationType === 'regular') {
        reportRecord.kit_registration_id = kitRegistrationId;
      } else if (kitRegistrationType === 'legacy') {
        reportRecord.legacy_kit_registration_id = kitRegistrationId;
      }
    } else if (reportType === 'unregistered') {
      if (kitRegistrationType === 'regular') {
        reportRecord.kit_registration_id = kitRegistrationId;
      } else if (kitRegistrationType === 'legacy') {
        reportRecord.legacy_kit_registration_id = kitRegistrationId;
      }
      // Add custom info for unregistered reports
      if (customCustomerInfo) {
        // For unregistered kits, customCustomerInfo may only contain location
        // Don't override with empty values if they exist in the kit registration
        const customerInfoToStore = {};
        
        // Always store location if provided (this is the main use case for unregistered kits)
        if (customCustomerInfo.location) {
          customerInfoToStore.location = customCustomerInfo.location;
        }
        
        // Only store other fields if they have values (for backward compatibility)
        if (customCustomerInfo.firstName) {
          customerInfoToStore.firstName = customCustomerInfo.firstName;
        }
        if (customCustomerInfo.lastName) {
          customerInfoToStore.lastName = customCustomerInfo.lastName;
        }
        if (customCustomerInfo.email) {
          customerInfoToStore.email = customCustomerInfo.email;
        }
        if (customCustomerInfo.address) {
          customerInfoToStore.address = customCustomerInfo.address;
        }
        if (customCustomerInfo.city) {
          customerInfoToStore.city = customCustomerInfo.city;
        }
        if (customCustomerInfo.province) {
          customerInfoToStore.province = customCustomerInfo.province;
        }
        if (customCustomerInfo.postalCode) {
          customerInfoToStore.postalCode = customCustomerInfo.postalCode;
        }
        
        // Only store if we have meaningful data
        if (Object.keys(customerInfoToStore).length > 0) {
          reportRecord.custom_customer_info = customerInfoToStore;
        }
      }
      
      if (customKitInfo) {
        reportRecord.custom_kit_info = customKitInfo;
      }
    }

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([reportRecord])
      .select()
      .single();

    if (reportError) {
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    log('info', 'Report record created', { reportId, reportType, requestId });

    // Store CSV in Supabase storage with new naming format
    const csvFileName = `${kitOrderCode}_WO${workOrderNumber}_${sampleNumber}.csv`;
    const { data: csvUpload, error: csvUploadError } = await supabase.storage
      .from('test-results-csv')
      .upload(csvFileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (csvUploadError) {
      throw new Error(`Failed to upload CSV: ${csvUploadError.message}`);
    }

    // Get CSV file URL
    const { data: csvUrl } = supabase.storage
      .from('test-results-csv')
      .getPublicUrl(csvFileName);

    log('info', 'CSV file uploaded', { csvFileName, requestId });

    // Upload Chain of Custody if provided and update database
let cocFileUrl = null;
if (cocFileBuffer && workOrderNumber) {
  try {
    const cocFileName = `LAB_COC_${kitOrderCode}.pdf`; // Use consistent naming
    log('info', 'Uploading Chain of Custody', { 
      filename: cocFileName, 
      fileSize: cocFileBuffer.length,
      kitOrderCode: kitOrderCode,
      requestId 
    });
    
    const { data: cocUpload, error: cocUploadError } = await supabase.storage
      .from('lab-chain-of-custody')
      .upload(cocFileName, cocFileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (cocUploadError) {
      log('error', 'Chain of Custody upload failed', { 
        error: cocUploadError.message, 
        filename: cocFileName,
        requestId 
      });
    } else {
      const { data: cocUrl } = supabase.storage
        .from('lab-chain-of-custody')
        .getPublicUrl(cocFileName);
      
      cocFileUrl = cocUrl.publicUrl;
      log('info', 'Chain of Custody uploaded successfully', { 
        filename: cocFileName, 
        url: cocFileUrl,
        requestId 
      });
    }
  } catch (cocError) {
    log('error', 'Chain of Custody upload exception', { 
      error: cocError.message, 
      stack: cocError.stack,
      requestId 
    });
  }
} else {
  log('info', 'Chain of Custody upload skipped', { 
    hasCocFile: !!cocFileBuffer,
    hasWorkOrder: !!workOrderNumber,
    requestId 
  });
}

    // Parse and insert/update test results
    const processingResult = await processCSVData(supabase, csvContent, sampleNumber, workOrderNumber, requestId);

    // Add a small delay to ensure data is committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use the actual sample number from CSV processing
    const actualSampleNumber = processingResult.actualSampleNumber;

    // Verify data was inserted by checking if we can find the test results
    const { data: verifyResults, error: verifyError } = await supabase
      .from('test_results_raw')
      .select('*')
      .eq('"Sample #"', actualSampleNumber)
      .limit(1);

    if (verifyError) {
      log('warn', 'Failed to verify test results insertion', { error: verifyError.message });
    } else {
      log('info', 'Test results verification', { 
        actualSampleNumber, 
        resultCount: verifyResults?.length || 0,
        requestId 
      });
    }

    // Find and update kit registration (only for registered/unregistered reports)
    let kitUpdateResult = { success: false };
    if (reportType !== 'one_off') {
      kitUpdateResult = await updateKitRegistration(supabase, kitRegistrationId, kitRegistrationType, workOrderNumber, sampleNumber, reportId, user.id);
      
      if (kitUpdateResult.success) {
        log('info', 'Kit registration updated successfully', {
          type: kitUpdateResult.type,
          kitRegistrationId: kitUpdateResult.kitRegistrationId,
          requestId
        });

        // Update the report record with the kit registration details
        const reportUpdateData = {
          csv_file_url: csvUrl.publicUrl,
          processing_status: 'processing'
        };

        if (kitUpdateResult.type === 'regular') {
          reportUpdateData.kit_registration_id = kitUpdateResult.kitRegistrationId;
          
          // Get the customer's user_id from the kit registration
          const { data: kitDetails } = await supabase
            .from('kit_registrations')
            .select('user_id')
            .eq('kit_registration_id', kitUpdateResult.kitRegistrationId)
            .single();
            
          if (kitDetails) {
            reportUpdateData.user_id = kitDetails.user_id;
          }
        } else if (kitUpdateResult.type === 'legacy') {
          reportUpdateData.legacy_kit_registration_id = kitUpdateResult.kitRegistrationId;
          
          // Get the customer's user_id from the legacy kit registration
          const { data: legacyKitDetails } = await supabase
            .from('legacy_kit_registrations')
            .select('user_id')
            .eq('id', kitUpdateResult.kitRegistrationId)
            .single();
            
          if (legacyKitDetails) {
            reportUpdateData.user_id = legacyKitDetails.user_id;
          }
        }

        // Update the report with the kit registration and customer info
        await supabase
          .from('reports')
          .update(reportUpdateData)
          .eq('report_id', reportId);

      } else {
        log('warn', 'Failed to update kit registration', {
          error: kitUpdateResult.error,
          requestId
        });

        // Still update the report with CSV URL even if kit registration update failed
        await supabase
          .from('reports')
          .update({
            csv_file_url: csvUrl.publicUrl,
            processing_status: 'processing'
          })
          .eq('report_id', reportId);
      }
    } else {
      // For one-off reports, just update with CSV URL
      await supabase
        .from('reports')
        .update({
          csv_file_url: csvUrl.publicUrl,
          processing_status: 'processing'
        })
        .eq('report_id', reportId);
    }

    // Update kit registration with Chain of Custody URL if available
if (cocFileUrl && kitUpdateResult.success) {
  try {
    log('info', 'Updating kit registration with Chain of Custody URL', { 
      kitId: kitUpdateResult.kitRegistrationId,
      kitType: kitUpdateResult.type,
      cocUrl: cocFileUrl,
      requestId 
    });

    if (kitUpdateResult.type === 'regular') {
      const { error: cocUpdateError } = await supabase
        .from('kit_registrations')
        .update({ 
          lab_chain_of_custody_url: cocFileUrl,
          updated_at: new Date().toISOString()
        })
        .eq('kit_registration_id', kitUpdateResult.kitRegistrationId);

      if (cocUpdateError) {
        log('error', 'Failed to update regular kit registration with CoC URL', { 
          error: cocUpdateError.message,
          kitId: kitUpdateResult.kitRegistrationId,
          requestId 
        });
      } else {
        log('info', 'Regular kit registration updated with CoC URL', { 
          kitId: kitUpdateResult.kitRegistrationId,
          requestId 
        });
      }
    } else if (kitUpdateResult.type === 'legacy') {
      const { error: cocUpdateError } = await supabase
        .from('legacy_kit_registrations')
        .update({ 
          lab_chain_of_custody_url: cocFileUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', kitUpdateResult.kitRegistrationId);

      if (cocUpdateError) {
        log('error', 'Failed to update legacy kit registration with CoC URL', { 
          error: cocUpdateError.message,
          kitId: kitUpdateResult.kitRegistrationId,
          requestId 
        });
      } else {
        log('info', 'Legacy kit registration updated with CoC URL', { 
          kitId: kitUpdateResult.kitRegistrationId,
          requestId 
        });
      }
    }
  } catch (updateError) {
    log('error', 'Exception updating kit registration with CoC URL', { 
      error: updateError.message,
      stack: updateError.stack,
      requestId 
    });
  }
} else if (cocFileUrl && !kitUpdateResult.success) {
  log('warn', 'Chain of Custody uploaded but kit registration update failed', { 
    cocUrl: cocFileUrl,
    kitUpdateError: kitUpdateResult.error,
    requestId 
  });
} else if (!cocFileUrl) {
  log('info', 'No Chain of Custody file provided for this report', { requestId });
}

    // Prepare kit information for the report generation
// Prepare kit information for the report generation
let kitInfo = {
  displayId: kitOrderCode,
  kitCode: kitOrderCode,
  testKitName: 'Water Test Kit',
  testKitId: null,
  customerFirstName: 'Valued Customer',
  customerName: 'Customer',
  customerLocation: 'Not specified',
  orderNumber: 'N/A' // Add separate order number field
};

// Get kit information based on report type
if (reportType === 'one_off') {
  // Use custom info for one-off reports
  if (customCustomerInfo) {
    kitInfo.customerFirstName = customCustomerInfo.firstName || 'Valued Customer';
    kitInfo.customerName = `${customCustomerInfo.firstName || ''} ${customCustomerInfo.lastName || ''}`.trim() || 'Customer';
    kitInfo.customerEmail = customCustomerInfo.email || 'unknown@example.com';
    
    // Build location from address fields
    const locationParts = [];
    if (customCustomerInfo.address) locationParts.push(customCustomerInfo.address);
    if (customCustomerInfo.city) locationParts.push(customCustomerInfo.city);
    if (customCustomerInfo.province) locationParts.push(customCustomerInfo.province);
    if (customCustomerInfo.postalCode) locationParts.push(customCustomerInfo.postalCode);
    
    kitInfo.customerLocation = locationParts.length > 0 ? locationParts.join(', ') : (customCustomerInfo.location || 'Not specified');
  }
  
  if (customKitInfo) {
    kitInfo.testKitName = customKitInfo.testKitName || 'Custom Water Test';
    kitInfo.testKitId = customKitInfo.testKitId || null;
    kitInfo.displayId = customKitInfo.kitCode || kitOrderCode;
    kitInfo.kitCode = customKitInfo.kitCode || kitOrderCode;
  }
  
  // For one-off reports, use the kit code as order number
  kitInfo.orderNumber = `ONEOFF-${kitInfo.kitCode}`;
  
} else if (reportType === 'unregistered') {
  // For unregistered reports, first get kit info from the registration using the ID
  let kitRegistrationData = null;
  
  if (kitRegistrationType === 'regular') {
    const { data: kitReg, error: kitRegError } = await supabase
      .from('vw_test_kits_admin_dev')
      .select('*')
      .eq('kit_id', kitRegistrationId)
      .single();
    
    if (!kitRegError && kitReg) {
      kitRegistrationData = kitReg;
    }
  } else if (kitRegistrationType === 'legacy') {
    const { data: legacyKitReg, error: legacyKitRegError } = await supabase
      .from('vw_test_kits_admin')
      .select('*')
      .eq('kit_id', kitRegistrationId)
      .single();
    
    if (!legacyKitRegError && legacyKitReg) {
      kitRegistrationData = legacyKitReg;
    }
  }
  
  // Use registration data if available
  if (kitRegistrationData) {
    kitInfo.customerFirstName = kitRegistrationData.customer_first_name || 'Valued Customer';
    kitInfo.customerName = `${kitRegistrationData.customer_first_name || ''} ${kitRegistrationData.customer_last_name || ''}`.trim() || 'Customer';
    kitInfo.customerEmail = kitRegistrationData.customer_email || 'unknown@example.com';
    kitInfo.testKitName = kitRegistrationData.test_kit_name || 'Water Test Kit';
    kitInfo.testKitId = kitRegistrationData.test_kit_id || null;
    kitInfo.displayId = kitRegistrationData.kit_code || kitOrderCode; // Kit identifier
    kitInfo.kitCode = kitRegistrationData.kit_code || kitOrderCode;
    kitInfo.orderNumber = kitRegistrationData.order_number || 'N/A'; // Actual order number
    
    // Build location from registration address fields, override with custom location if provided
    const locationParts = [];
    if (kitRegistrationData.customer_address) locationParts.push(kitRegistrationData.customer_address);
    if (kitRegistrationData.customer_city) locationParts.push(kitRegistrationData.customer_city);
    if (kitRegistrationData.customer_province) locationParts.push(kitRegistrationData.customer_province);
    if (kitRegistrationData.customer_postal_code) locationParts.push(kitRegistrationData.customer_postal_code);
    
    kitInfo.customerLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';
    
    // Override with admin-provided location if available
    if (customCustomerInfo?.location) {
      kitInfo.customerLocation = customCustomerInfo.location;
    }
    
    log('info', 'Using kit registration data for unregistered report', { 
      kitId: kitRegistrationId,
      customerName: kitInfo.customerName,
      kitCode: kitInfo.kitCode,
      displayId: kitInfo.displayId,
      orderNumber: kitInfo.orderNumber,
      requestId 
    });
  } else {
    log('warn', 'Could not retrieve kit registration data for unregistered report', { 
      kitRegistrationId, 
      kitRegistrationType,
      requestId 
    });
  }
} else {
  // For registered reports, get info from admin view as before
  const { data: kitAdminData, error: kitAdminError } = await supabase
    .from('vw_test_kits_admin')
    .select('*')
    .or(`work_order_number.eq.${workOrderNumber},sample_number.eq.${sampleNumber}`)
    .limit(1)
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
      displayId: kitAdminData.kit_code || kitOrderCode, // Kit identifier
      kitCode: kitAdminData.kit_code || kitOrderCode,
      orderNumber: kitAdminData.order_number || 'N/A', // Actual order number
      testKitName: kitAdminData.test_kit_name || 'Water Test Kit',
      testKitId: kitAdminData.test_kit_id,
      customerFirstName: kitAdminData.customer_first_name || 'Valued Customer',
      customerName: `${kitAdminData.customer_first_name || ''} ${kitAdminData.customer_last_name || ''}`.trim() || 'Customer',
      customerEmail: kitAdminData.customer_email,
      customerLocation: formatLocation(kitAdminData)
    };
    
    log('info', 'Kit info retrieved from admin view', { 
      kitInfo: {
        displayId: kitInfo.displayId,
        orderNumber: kitInfo.orderNumber,
        customerName: kitInfo.customerName
      }, 
      requestId 
    });
  } else {
    log('warn', 'Could not retrieve kit info from admin view', { 
      error: kitAdminError?.message, 
      workOrderNumber, 
      sampleNumber, 
      requestId 
    });
  }
}

    // Generate PDF report with kit information
    const pdfResult = await processReportGeneration(supabase, reportId, sampleNumber, requestId, kitOrderCode, kitInfo);
    
    if (pdfResult.success) {
      // Update report with PDF URL and completion status
      await supabase
        .from('reports')
        .update({ 
          pdf_file_url: pdfResult.pdfUrl,
          processing_status: 'completed'
        })
        .eq('report_id', reportId);
      
      // Update kit registration status to 'report_generated' (only for registered/unregistered)
      if (reportType !== 'one_off' && kitUpdateResult.success) {
        if (kitUpdateResult.type === 'regular') {
          await supabase
            .from('kit_registrations')
            .update({ status: 'report_generated' })
            .eq('kit_registration_id', kitUpdateResult.kitRegistrationId);
        } else if (kitUpdateResult.type === 'legacy') {
          await supabase
            .from('legacy_kit_registrations')
            .update({ status: 'report_generated' })
            .eq('id', kitUpdateResult.kitRegistrationId);
        }
      }

// Direct admin notification implementation (simplified)
try {
  log('info', 'Sending admin notification', { reportId, requestId });
  
  // Get report details for file downloads
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('csv_file_url, pdf_file_url')
    .eq('report_id', reportId)
    .single();
  
  if (reportError) {
    log('error', 'Could not get report for admin notification', { error: reportError.message });
  } else {
    // Download and prepare attachments
    const attachments = [];
    
    // Download CSV
    if (report.csv_file_url) {
      try {
        const csvFileName = report.csv_file_url.split('/').pop();
        log('info', 'Downloading CSV for admin email', { filename: csvFileName });
        
        const { data: csvData, error: csvError } = await supabase.storage
          .from('test-results-csv')
          .download(csvFileName);
          
        if (!csvError && csvData) {
          const csvContent = await csvData.text();
          const csvBase64 = Buffer.from(csvContent, 'utf8').toString('base64');
          
          attachments.push({
            filename: csvFileName,
            data: csvBase64,
            contentType: 'text/csv'
          });
          
          log('info', 'CSV attachment prepared', { 
            filename: csvFileName,
            sizeKB: Math.round(csvBase64.length / 1024) 
          });
        } else {
          log('warn', 'CSV download failed', { error: csvError?.message });
        }
      } catch (csvErr) {
        log('warn', 'CSV processing error', { error: csvErr.message });
      }
    }
    
    // Download PDF Report
    if (report.pdf_file_url) {
      try {
        const pdfFileName = report.pdf_file_url.split('/').pop();
        log('info', 'Downloading PDF report for admin email', { filename: pdfFileName });
        
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
          
          log('info', 'PDF report attachment prepared', { 
            filename: pdfFileName,
            sizeKB: Math.round(pdfBase64.length / 1024) 
          });
        } else {
          log('warn', 'PDF report download failed', { error: pdfError?.message });
        }
      } catch (pdfErr) {
        log('warn', 'PDF report processing error', { error: pdfErr.message });
      }
    }
    
    // Download Chain of Custody if available
    if (cocFileUrl) {
      try {
        const cocFileName = `LAB_COC_${kitInfo.kitCode || kitInfo.displayId || 'UNKNOWN'}.pdf`;
        
        log('info', 'Downloading Chain of Custody for admin email', { 
          filename: cocFileName 
        });
        
        const { data: cocData, error: cocError } = await supabase.storage
          .from('lab-chain-of-custody')
          .download(cocFileName);
          
        if (!cocError && cocData) {
          const cocArrayBuffer = await cocData.arrayBuffer();
          const cocBase64 = Buffer.from(cocArrayBuffer).toString('base64');
          
          attachments.push({
            filename: cocFileName,
            data: cocBase64,
            contentType: 'application/pdf'
          });
          
          log('info', 'Chain of Custody attachment prepared', { 
            filename: cocFileName,
            sizeKB: Math.round(cocBase64.length / 1024) 
          });
        } else {
          log('warn', 'Chain of Custody download failed', { error: cocError?.message });
        }
      } catch (cocErr) {
        log('warn', 'Chain of Custody processing error', { error: cocErr.message });
      }
    } else {
      log('info', 'No Chain of Custody file available for this report', { requestId });
    }
    
    log('info', 'All attachments prepared for admin email', { 
      count: attachments.length,
      filenames: attachments.map(att => att.filename)
    });
    
    // Send email via Loops directly
    const requestBody = {
      transactionalId: 'cmdj4w1u62ku8zc0jqy6rfekn',
      email: 'info@mywaterquality.ca',
      dataVariables: {
        customerName: kitInfo.customerName || 'Customer',
        kitCode: kitInfo.kitCode || kitInfo.displayId || 'UNKNOWN',
        orderNumber: kitInfo.orderNumber || 'N/A',
        customerEmail: kitInfo.customerEmail || 'No email available',
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
        log('info', 'Admin notification sent successfully', { 
          reportId, 
          attachmentsCount: attachments.length,
          kitCode: kitInfo.kitCode || kitInfo.displayId,
          orderNumber: kitInfo.orderNumber,
          requestId 
        });
      } else {
        const errorText = await loopsResponse.text();
        log('error', 'Failed to send admin notification', { 
          status: loopsResponse.status, 
          error: errorText,
          requestId 
        });
      }
    } else {
      log('warn', 'No attachments available, skipping admin notification', { requestId });
    }
  }
} catch (adminNotificationError) {
  log('error', 'Exception in admin notification', { 
    error: adminNotificationError.message,
    stack: adminNotificationError.stack,
    requestId 
  });
  // Don't fail the entire process if admin notification fails
}
} else {
      // Update with error status
      await supabase
        .from('reports')
        .update({ 
          processing_status: 'failed',
          error_message: pdfResult.error
        })
        .eq('report_id', reportId);
    }

    log('info', 'Test results processing completed', { reportId, reportType, requestId });

    return {
      success: true,
      reportId,
      csvUrl: csvUrl.publicUrl,
      pdfUrl: pdfResult.pdfUrl
    };

  } catch (error) {
    log('error', 'Error processing test results', { 
      error: error.message, 
      requestId,
      reportType 
    });

    // Update report status to failed if report was created
    if (reportId) {
      try {
        await supabase
          .from('reports')
          .update({ 
            processing_status: 'failed',
            error_message: error.message
          })
          .eq('report_id', reportId);
      } catch (updateError) {
        log('error', 'Failed to update report status', { updateError: updateError.message });
      }
    }

    return {
      success: false,
      error: error.message
    };
  }
}

async function convertExcelToCSVFallback(fileBuffer) {
  try {
    const XLSX = require('xlsx');
    
    // Read the workbook from buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file');
    }
    
    const worksheet = workbook.Sheets[sheetNames[0]];
    
    // Convert to CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    return csvContent;
  } catch (error) {
    console.error('Fallback conversion also failed:', error);
    throw error;
  }
}

async function processCSVData(supabase, csvContent, sampleNumber, workOrderNumber, requestId) {
  try {
    log('info', 'Processing CSV data', { sampleNumber, workOrderNumber, requestId });

    if (!csvContent) {
      throw new Error('CSV content is undefined or empty');
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse CSV header
    const headers = parseCSVRow(lines[0]);
    
    // Create column mapping for test_results_raw table schema
    const columnMapping = createColumnMapping(headers);
    
    // Filter out empty or invalid mappings
    const validMappings = {};
    Object.keys(columnMapping).forEach(key => {
      if (columnMapping[key] && columnMapping[key].trim() !== '') {
        validMappings[key] = columnMapping[key];
      }
    });

    // Prepare batch data
    const batchData = [];
    let skippedCount = 0;

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      if (values.length === 0) {
        skippedCount++;
        continue; // Skip empty rows
      }

      // Map CSV data to database columns using the schema
      const rowData = {
        'Work Order #': workOrderNumber,
        'Sample #': sampleNumber
      };

      let hasParameter = false;

      // Map each CSV column to the appropriate database column
      headers.forEach((header, index) => {
        // Skip empty headers
        if (!header || header.trim() === '') {
          return;
        }
        
        if (values[index] !== undefined && values[index] !== '') {
          const dbColumn = validMappings[header];
          if (dbColumn && dbColumn.trim() !== '') {
            let value = values[index].trim();
            
            // Handle date fields
            if (dbColumn === 'Received Date' || dbColumn === 'Analysis Date') {
              const parsedDate = new Date(value);
              if (!isNaN(parsedDate.getTime())) {
                rowData[dbColumn] = parsedDate.toISOString().split('T')[0];
              } else {
                rowData[dbColumn] = null;
              }
            } else {
              rowData[dbColumn] = value;
              
              // Check if this is the Parameter column
              if (dbColumn === 'Parameter') {
                hasParameter = true;
              }
            }
          }
        }
      });

      // Clean up rowData - remove any empty keys or undefined values
      const cleanRowData = {};
      Object.keys(rowData).forEach(key => {
        if (key && key.trim() !== '' && rowData[key] !== undefined) {
          cleanRowData[key] = rowData[key];
        }
      });

      // Ensure we have the required Parameter field
      if (!hasParameter || !cleanRowData['Parameter']) {
        skippedCount++;
        continue;
      }

      // Validate required fields
      const requiredFields = ['Work Order #', 'Sample #', 'Parameter'];
      const missingFields = requiredFields.filter(field => !cleanRowData[field]);
      
      if (missingFields.length === 0) {
        batchData.push(cleanRowData);
      } else {
        skippedCount++;
      }
    }

    // Insert data in batches to avoid timeout
    const batchSize = 100;
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batchData.length; i += batchSize) {
      const batch = batchData.slice(i, i + batchSize);
      
      try {
        const { error: batchError } = await supabase
          .from('test_results_raw')
          .insert(batch);

        if (batchError) {
          errorCount += batch.length;
          // Only log first few batch errors to avoid spam
          if (errorCount <= 300) { // Only log first 3 batches of errors
            log('warn', 'Batch insert error (likely duplicates)', { 
              batchStart: i,
              batchSize: batch.length,
              requestId
            });
          }
        } else {
          processedCount += batch.length;
        }
      } catch (batchInsertError) {
        errorCount += batch.length;
        // Minimal error logging
        if (errorCount <= 300) {
          log('warn', 'Batch insert exception (likely duplicates)', { 
            batchStart: i,
            requestId
          });
        }
      }
    }

    log('info', 'CSV data processing completed', { 
      sampleNumber,
      workOrderNumber,
      rowsProcessed: processedCount,
      rowsSkipped: skippedCount,
      rowsWithErrors: errorCount,
      totalRows: lines.length - 1, 
      requestId 
    });

    // Return the processing results
    return {
      actualSampleNumber: sampleNumber,
      actualWorkOrderNumber: workOrderNumber,
      rowsProcessed: processedCount,
      rowsSkipped: skippedCount
    };

  } catch (error) {
    console.error('Error in processCSVData:', error);
    throw new Error(`Failed to process CSV data: ${error.message}`);
  }
}

function createColumnMapping(csvHeaders) {
  // Map common CSV header variations to the exact database column names
  const mapping = {};
  
  // Filter valid headers first
  const validHeaders = csvHeaders.filter(header => 
    header && typeof header === 'string' && header.trim() !== ''
  );
  
  validHeaders.forEach(header => {
    const trimmedHeader = header.trim();
    const lowerHeader = trimmedHeader.toLowerCase();
    
    // Map to exact database column names (without extra quotes)
    if (lowerHeader === 'work order #' || lowerHeader === 'work order' || lowerHeader === 'work_order' || lowerHeader === 'workorder') {
      mapping[trimmedHeader] = 'Work Order #';
    } else if (lowerHeader === 'sample #' || lowerHeader === 'sample' || lowerHeader === 'sample_number' || lowerHeader === 'samplenumber') {
      mapping[trimmedHeader] = 'Sample #';
    } else if (lowerHeader === 'sample date' || lowerHeader === 'sample_date' || lowerHeader === 'sampledate') {
      mapping[trimmedHeader] = 'Sample Date';
    } else if (lowerHeader === 'matrix') {
      mapping[trimmedHeader] = 'Matrix';
    } else if (lowerHeader === 'sample description' || lowerHeader === 'sample_description' || lowerHeader === 'description') {
      mapping[trimmedHeader] = 'Sample Description';
    } else if (lowerHeader === 'method' || lowerHeader === 'test_method' || lowerHeader === 'analysis_method') {
      mapping[trimmedHeader] = 'Method';
    } else if (lowerHeader === 'parameter' || lowerHeader === 'parameter_name' || lowerHeader === 'analyte') {
      mapping[trimmedHeader] = 'Parameter';
    } else if (lowerHeader === 'mdl' || lowerHeader === 'method detection limit' || lowerHeader === 'detection_limit') {
      mapping[trimmedHeader] = 'MDL';
    } else if (lowerHeader === 'result' || lowerHeader === 'value' || lowerHeader === 'concentration' || lowerHeader === 'test_result') {
      mapping[trimmedHeader] = 'Result';
    } else if (lowerHeader === 'units' || lowerHeader === 'unit' || lowerHeader === 'uom') {
      mapping[trimmedHeader] = 'Units';
    } else if (lowerHeader === 'received date' || lowerHeader === 'received_date' || lowerHeader === 'receiveddate' || lowerHeader === 'date_received') {
      mapping[trimmedHeader] = 'Received Date';
    } else if (lowerHeader === 'analysis date' || lowerHeader === 'analysis_date' || lowerHeader === 'analysisdate' || lowerHeader === 'date_analyzed' || lowerHeader === 'test_date') {
      mapping[trimmedHeader] = 'Analysis Date';
    } else if (lowerHeader === 'notes' || lowerHeader === 'comments' || lowerHeader === 'remarks') {
      mapping[trimmedHeader] = 'Notes';
    }
  });
  
  // Filter out any empty mappings
  const validMapping = {};
  Object.keys(mapping).forEach(key => {
    if (mapping[key] && mapping[key].trim() !== '') {
      validMapping[key] = mapping[key];
    }
  });
  
  return validMapping;
}

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function updateKitRegistration(supabase, kitRegistrationId, kitRegistrationType, workOrderNumber, sampleNumber, reportId, adminUserId) {
  try {
    log('info', 'Updating kit registration', { kitRegistrationId, kitRegistrationType, workOrderNumber, sampleNumber, reportId });

    if (kitRegistrationType === 'regular') {
      // Update regular kit registration
      const { error: updateError } = await supabase
        .from('kit_registrations')
        .update({
          work_order_number: workOrderNumber,
          sample_number: sampleNumber,
          report_id: reportId,
          updated_at: new Date().toISOString()
        })
        .eq('kit_registration_id', kitRegistrationId);

      if (updateError) {
        log('warn', 'Failed to update regular kit registration', { error: updateError.message });
        return { success: false, error: updateError.message };
      } else {
        log('info', 'Regular kit registration updated', { kitRegistrationId });
        return { success: true, type: 'regular', kitRegistrationId };
      }
    } else if (kitRegistrationType === 'legacy') {
      // Update legacy kit registration
      const { error: updateError } = await supabase
        .from('legacy_kit_registrations')
        .update({
          work_order_number: workOrderNumber,
          sample_number: sampleNumber,
          report_id: reportId,
          updated_at: new Date().toISOString()
        })
        .eq('id', kitRegistrationId);

      if (updateError) {
        log('warn', 'Failed to update legacy kit registration', { error: updateError.message });
        return { success: false, error: updateError.message };
      } else {
        log('info', 'Legacy kit registration updated', { kitRegistrationId });
        return { success: true, type: 'legacy', kitRegistrationId };
      }
    } else {
      log('warn', 'Invalid kit registration type', { kitRegistrationType });
      return { success: false, error: 'Invalid kit registration type' };
    }

  } catch (error) {
    log('error', 'Error updating kit registration', { error: error.message });
    return { success: false, error: error.message };
  }
}