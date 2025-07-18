// netlify/functions/process-test-results.js
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
// console.log('Headers:', JSON.stringify(event.headers, null, 2));
// console.log('Content-Type:', event.headers['content-type']);

const contentType = event.headers['content-type'] || event.headers['Content-Type'];
// console.log('Found content-type:', contentType);

if (!contentType || !contentType.includes('multipart/form-data')) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Invalid content-type. Expected multipart/form-data' })
  };
}

// console.log('Event body type:', typeof event.body);
// console.log('Event body length:', event.body ? event.body.length : 'undefined');
// console.log('Event isBase64Encoded:', event.isBase64Encoded);

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
    sampleNumber
  } = result;

  // Validate required fields
if (!fileBuffer || !kitRegistrationId) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Missing required fields' })
  };
}

  log('info', 'Processing test results upload', {
    kitRegistrationId,
    kitRegistrationType,
    workOrderNumber,
    sampleNumber,
    fileName,
    fileSize: fileBuffer.length
  });

  // Process the file and generate report
  const processResult = await processTestResultsFile({
    supabase,
    user,
    fileBuffer,
    fileName,
    kitRegistrationId,
    kitRegistrationType
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

      // console.log('Busboy parsing - Buffer length:', bodyBuffer.length);
      // console.log('Busboy parsing - Content-Type:', contentType);

      // Initialize busboy
      const busboy = Busboy({ 
        headers: { 'content-type': contentType },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
          files: 1, // Only allow 1 file
          fields: 10 // Allow up to 10 form fields
        }
      });

      const fields = {};
      const files = {};
      let fileCount = 0;

      // Handle form fields
      busboy.on('field', (fieldname, value) => {
        // console.log('Field received:', fieldname, '=', value);
        fields[fieldname] = value;
      });

      // Handle file uploads
// Handle file uploads
busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
  // console.log('File received:', fieldname, 'filename:', filename, 'mimetype:', mimetype);
  // console.log('Filename type:', typeof filename);
  // console.log('Encoding:', encoding);
  
  fileCount++;
  
  if (fileCount > 1) {
    reject(new Error('Only one file upload allowed'));
    return;
  }

  const chunks = [];
  let totalSize = 0;
  
  file.on('data', (data) => {
    chunks.push(data);
    totalSize += data.length;
    // console.log('Received chunk, size:', data.length, 'total so far:', totalSize);
  });
  
  file.on('end', () => {
    const fileBuffer = Buffer.concat(chunks);
    // console.log('File processing complete. Final size:', fileBuffer.length);
    // console.log('Is valid Buffer?', Buffer.isBuffer(fileBuffer));
    
    // Extract filename properly
    let actualFilename;
    if (typeof filename === 'object' && filename !== null) {
      actualFilename = filename.filename || filename.name || 'uploaded-file';
    } else {
      actualFilename = filename || 'uploaded-file';
    }
    
    // console.log('Extracted filename:', actualFilename);
    
    files[fieldname] = {
      data: fileBuffer,
      filename: String(actualFilename),
      mimetype: mimetype,
      size: fileBuffer.length
    };
  });

  file.on('error', (err) => {
    console.error('File processing error:', err);
    reject(err);
  });
});

      // Handle completion
      busboy.on('finish', () => {
        // console.log('Busboy parsing finished');
        // console.log('Fields received:', Object.keys(fields));
        // console.log('Files received:', Object.keys(files));

        // Extract the data
        const fileData = files.file;
        
        if (!fileData) {
          reject(new Error('No file data received'));
          return;
        }

        const result = {
          fileBuffer: fileData.data,
          fileName: String(fileData.filename || 'uploaded-file'),
          kitRegistrationId: String(fields.kitRegistrationId || ''),
          kitRegistrationType: String(fields.kitRegistrationType || '')
        };

        // console.log('Parse result:', {
        //   fileName: result.fileName,
        //   fileSize: result.fileBuffer.length,
        //   kitRegistrationId: result.kitRegistrationId,
        //   kitRegistrationType: result.kitRegistrationType,
        //   workOrderNumber: result.workOrderNumber,
        //   sampleNumber: result.sampleNumber
        // });

        resolve(result);
      });

      // Handle errors
      busboy.on('error', (err) => {
        console.error('Busboy error:', err);
        reject(err);
      });

      // Start parsing
      busboy.write(bodyBuffer);
      busboy.end();

    } catch (error) {
      console.error('Error setting up busboy:', error);
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
  kitRegistrationType
}) {
  const requestId = Math.random().toString(36).substring(2, 8);
  let reportId;
  let kitOrderCode = 'UNKNOWN'; // Default fallback
  let workOrderNumber;
  let sampleNumber;

  try {
    log('info', 'Starting file processing', { requestId, fileName });

    // Get kit order code (display_id) based on registration type
try {
  if (kitRegistrationType === 'regular') {
    const { data: kitReg, error: kitRegError } = await supabase
      .from('kit_registrations')
      .select('display_id')
      .eq('kit_registration_id', kitRegistrationId)
      .single();

    if (!kitRegError && kitReg?.display_id) {
      kitOrderCode = kitReg.display_id;
    }
  } else if (kitRegistrationType === 'legacy') {
    const { data: legacyKitReg, error: legacyKitRegError } = await supabase
      .from('legacy_kit_registrations')
      .select('kit_code')
      .eq('id', kitRegistrationId)
      .single();

    if (!legacyKitRegError && legacyKitReg?.kit_code) {
      kitOrderCode = legacyKitReg.kit_code;
    }
  }
} catch (kitError) {
  log('warn', 'Failed to get kit order code, using default', { error: kitError.message });
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
      
      // Extract work order and sample number from CSV
      const extracted = extractWorkOrderAndSampleFromCSV(csvContent);
      workOrderNumber = extracted.workOrderNumber;
      sampleNumber = extracted.sampleNumber;
      
      if (!workOrderNumber || !sampleNumber) {
        throw new Error('Could not extract work order number or sample number from CSV file');
      }
      
      log('info', 'Extracted from CSV', { workOrderNumber, sampleNumber, requestId });
      
    } catch (csvError) {
      console.error('Error converting file to CSV:', csvError);
      throw new Error(`Failed to process file: ${csvError.message}`);
    }

    // Generate report UUID
    reportId = uuidv4();

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([{
        report_id: reportId,
        sample_number: sampleNumber,
        work_order_number: workOrderNumber,
        kit_registration_id: kitRegistrationType === 'regular' ? kitRegistrationId : null,
        legacy_kit_registration_id: kitRegistrationType === 'legacy' ? kitRegistrationId : null,
        user_id: null, // Will be set later when we find the kit registration
        original_file_name: fileName,
        processing_status: 'processing'
      }])
      .select()
      .single();

    if (reportError) {
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    log('info', 'Report record created', { reportId, requestId });

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

    // Find and update kit registration
    const kitUpdateResult = await updateKitRegistration(supabase, kitRegistrationId, kitRegistrationType, workOrderNumber, sampleNumber, reportId, user.id);
    
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

    // Get kit information for the report
    let kitInfo = {
      displayId: kitOrderCode,
      kitCode: kitOrderCode,
      testKitName: 'Water Test Kit',
      testKitId: null,
      customerFirstName: 'Valued Customer',
      customerName: 'Customer'
    };

    // Get report details to determine kit type
    const { data: reportDetails, error: reportDetailsError } = await supabase
      .from('reports')
      .select('kit_registration_id, legacy_kit_registration_id')
      .eq('report_id', reportId)
      .single();

    if (!reportDetailsError && reportDetails) {
      if (reportDetails.kit_registration_id) {
        // Regular kit registration
        const { data: kitData, error: kitError } = await supabase
          .from('kit_registrations')
          .select(`
            display_id,
            user_id,
            order_items (
              test_kits (
                test_kit_id,
                name
              )
            )
          `)
          .eq('kit_registration_id', reportDetails.kit_registration_id)
          .single();

        if (!kitError && kitData) {
          // Get customer name
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('user_id', kitData.user_id)
            .single();

          kitInfo = {
            displayId: kitData.display_id,
            kitCode: kitData.display_id, // Use display_id for regular kits
            testKitName: kitData.order_items?.test_kits?.name || 'Water Test Kit',
            testKitId: kitData.order_items?.test_kits?.test_kit_id,
            customerFirstName: userData?.first_name || 'Valued Customer',
            customerName: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Customer'
          };
        }
      } else if (reportDetails.legacy_kit_registration_id) {
        // Legacy kit registration
        const { data: legacyKitData, error: legacyKitError } = await supabase
          .from('legacy_kit_registrations')
          .select(`
            kit_code,
            display_id,
            user_id,
            test_kits (
              test_kit_id,
              name
            )
          `)
          .eq('id', reportDetails.legacy_kit_registration_id)
          .single();

        if (!legacyKitError && legacyKitData) {
          // Get customer name
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('user_id', legacyKitData.user_id)
            .single();

          kitInfo = {
            displayId: legacyKitData.display_id || legacyKitData.kit_code,
            kitCode: legacyKitData.kit_code, // Use kit_code for legacy kits
            testKitName: legacyKitData.test_kits?.name || 'Water Test Kit',
            testKitId: legacyKitData.test_kits?.test_kit_id,
            customerFirstName: userData?.first_name || 'Valued Customer',
            customerName: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Customer'
          };
        }
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
      
      // Update kit registration status to 'report_generated'
      if (kitUpdateResult.success) {
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

    log('info', 'Test results processing completed', { reportId, requestId });

    return {
      success: true,
      reportId,
      csvUrl: csvUrl.publicUrl,
      pdfUrl: pdfResult.pdfUrl
    };

  } catch (error) {
    log('error', 'Error processing test results', { 
      error: error.message, 
      requestId 
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
    // console.log('Trying fallback Excel conversion method...');
    
    // Try using node-xlsx as fallback
    const XLSX = require('xlsx');
    
    // Read the workbook from buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file');
    }
    
    // console.log('Found worksheets:', sheetNames);
    const worksheet = workbook.Sheets[sheetNames[0]];
    
    // Convert to CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // console.log('Fallback conversion successful');
    // console.log('CSV content length:', csvContent.length);
    // console.log('First 200 chars:', csvContent.substring(0, 200));
    
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
    // console.log('CSV lines count:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse CSV header
    const headers = parseCSVRow(lines[0]);
    // console.log('Raw CSV headers:', headers);
    
    // Create column mapping for test_results_raw table schema
    const columnMapping = createColumnMapping(headers);
    // console.log('Column mapping result:', columnMapping);
    
    // Filter out empty or invalid mappings
    const validMappings = {};
    Object.keys(columnMapping).forEach(key => {
      if (columnMapping[key] && columnMapping[key].trim() !== '') {
        validMappings[key] = columnMapping[key];
      }
    });
    
    // console.log('Valid mappings:', validMappings);

    let processedCount = 0;
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
      let parameterValue = null;

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
                parameterValue = value;
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

      // Debug the row processing for first few rows
      // if (i <= 3) {
      //   console.log(`Row ${i} clean data:`, {
      //     hasParameter,
      //     parameterValue,
      //     cleanRowDataKeys: Object.keys(cleanRowData),
      //     workOrder: cleanRowData['Work Order #'],
      //     sample: cleanRowData['Sample #'],
      //     parameter: cleanRowData['Parameter']
      //   });
      // }

      // Ensure we have the required Parameter field
      if (!hasParameter || !cleanRowData['Parameter']) {
        // console.log(`Skipping row ${i} without Parameter:`, { 
        //   hasParameter, 
        //   parameterValue, 
        //   availableColumns: Object.keys(cleanRowData)
        // });
        skippedCount++;
        continue;
      }

      try {
        // Validate cleanRowData before insertion
        const requiredFields = ['Work Order #', 'Sample #', 'Parameter'];
        const missingFields = requiredFields.filter(field => !cleanRowData[field]);
        
        if (missingFields.length > 0) {
          // console.log(`Skipping row ${i} - missing required fields:`, missingFields);
          skippedCount++;
          continue;
        }
        
        // Convert keys to quoted format for Supabase operation
        const dbRowData = {};
        Object.keys(cleanRowData).forEach(key => {
          if (key && key.trim() !== '') { // Extra safety check
            dbRowData[key] = cleanRowData[key];
          }
        });

        // Log the exact data being inserted for first few rows
        // if (processedCount < 3) {
        //   console.log(`Inserting row ${i}:`, {
        //     cleanRowData,
        //     dbRowDataKeys: Object.keys(dbRowData)
        //   });
        // }

        // Insert new record (skip checking for existing for now to simplify)
        const { error: insertError } = await supabase
          .from('test_results_raw')
          .insert([dbRowData]);

        if (insertError) {
          console.error(`Row ${i} insert error:`, {
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          });
        } else {
          processedCount++;
          if (processedCount <= 3) {
            log('info', 'Inserted test result', { 
              workOrder: cleanRowData['Work Order #'], 
              sample: cleanRowData['Sample #'], 
              parameter: cleanRowData['Parameter'] 
            });
          }
        }
      } catch (rowError) {
        console.error(`Row ${i} processing error:`, {
          error: rowError.message,
          stack: rowError.stack,
          cleanRowData: cleanRowData
        });
        skippedCount++;
      }
    }

    log('info', 'CSV data processing completed', { 
      sampleNumber,
      workOrderNumber,
      rowsProcessed: processedCount,
      rowsSkipped: skippedCount,
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
  
  // console.log('Processing valid headers for mapping:', validHeaders);
  
  validHeaders.forEach(header => {
    const trimmedHeader = header.trim();
    const lowerHeader = trimmedHeader.toLowerCase();
    
    // console.log(`Mapping header: "${trimmedHeader}" (lowercase: "${lowerHeader}")`);
    
    // Map to exact database column names (without extra quotes)
    if (lowerHeader === 'work order #' || lowerHeader === 'work order' || lowerHeader === 'work_order' || lowerHeader === 'workorder') {
      mapping[trimmedHeader] = 'Work Order #';
      // console.log(`  -> Mapped to Work Order #`);
    } else if (lowerHeader === 'sample #' || lowerHeader === 'sample' || lowerHeader === 'sample_number' || lowerHeader === 'samplenumber') {
      mapping[trimmedHeader] = 'Sample #';
      // console.log(`  -> Mapped to Sample #`);
    } else if (lowerHeader === 'sample date' || lowerHeader === 'sample_date' || lowerHeader === 'sampledate') {
      mapping[trimmedHeader] = 'Sample Date';
      // console.log(`  -> Mapped to Sample Date`);
    } else if (lowerHeader === 'matrix') {
      mapping[trimmedHeader] = 'Matrix';
      // console.log(`  -> Mapped to Matrix`);
    } else if (lowerHeader === 'sample description' || lowerHeader === 'sample_description' || lowerHeader === 'description') {
      mapping[trimmedHeader] = 'Sample Description';
      // console.log(`  -> Mapped to Sample Description`);
    } else if (lowerHeader === 'method' || lowerHeader === 'test_method' || lowerHeader === 'analysis_method') {
      mapping[trimmedHeader] = 'Method';
      // console.log(`  -> Mapped to Method`);
    } else if (lowerHeader === 'parameter' || lowerHeader === 'parameter_name' || lowerHeader === 'analyte') {
      mapping[trimmedHeader] = 'Parameter';
      // console.log(`  -> Mapped to Parameter`);
    } else if (lowerHeader === 'mdl' || lowerHeader === 'method detection limit' || lowerHeader === 'detection_limit') {
      mapping[trimmedHeader] = 'MDL';
      // console.log(`  -> Mapped to MDL`);
    } else if (lowerHeader === 'result' || lowerHeader === 'value' || lowerHeader === 'concentration' || lowerHeader === 'test_result') {
      mapping[trimmedHeader] = 'Result';
      // console.log(`  -> Mapped to Result`);
    } else if (lowerHeader === 'units' || lowerHeader === 'unit' || lowerHeader === 'uom') {
      mapping[trimmedHeader] = 'Units';
      // console.log(`  -> Mapped to Units`);
    } else if (lowerHeader === 'received date' || lowerHeader === 'received_date' || lowerHeader === 'receiveddate' || lowerHeader === 'date_received') {
      mapping[trimmedHeader] = 'Received Date';
      // console.log(`  -> Mapped to Received Date`);
    } else if (lowerHeader === 'analysis date' || lowerHeader === 'analysis_date' || lowerHeader === 'analysisdate' || lowerHeader === 'date_analyzed' || lowerHeader === 'test_date') {
      mapping[trimmedHeader] = 'Analysis Date';
      // console.log(`  -> Mapped to Analysis Date`);
    } else if (lowerHeader === 'notes' || lowerHeader === 'comments' || lowerHeader === 'remarks') {
      mapping[trimmedHeader] = 'Notes';
      // console.log(`  -> Mapped to Notes`);
    } else {
      // console.log(`  -> NO MAPPING FOUND for "${trimmedHeader}"`);
    }
  });
  
  // Filter out any empty mappings
  const validMapping = {};
  Object.keys(mapping).forEach(key => {
    if (mapping[key] && mapping[key].trim() !== '') {
      validMapping[key] = mapping[key];
    }
  });
  
  // console.log('Final valid mapping object:', validMapping);
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