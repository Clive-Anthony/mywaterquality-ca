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
console.log('Headers:', JSON.stringify(event.headers, null, 2));
console.log('Content-Type:', event.headers['content-type']);

const contentType = event.headers['content-type'] || event.headers['Content-Type'];
console.log('Found content-type:', contentType);

if (!contentType || !contentType.includes('multipart/form-data')) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Invalid content-type. Expected multipart/form-data' })
  };
}

console.log('Event body type:', typeof event.body);
console.log('Event body length:', event.body ? event.body.length : 'undefined');
console.log('Event isBase64Encoded:', event.isBase64Encoded);

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
  if (!fileBuffer || !kitRegistrationId || !workOrderNumber || !sampleNumber) {
    console.log('Missing required fields:', {
      hasFile: !!fileBuffer,
      hasKitRegistrationId: !!kitRegistrationId,
      hasWorkOrderNumber: !!workOrderNumber,
      hasSampleNumber: !!sampleNumber
    });
    
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
    kitRegistrationType,
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

      console.log('Busboy parsing - Buffer length:', bodyBuffer.length);
      console.log('Busboy parsing - Content-Type:', contentType);

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
        console.log('Field received:', fieldname, '=', value);
        fields[fieldname] = value;
      });

      // Handle file uploads
// Handle file uploads
busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
  console.log('File received:', fieldname, 'filename:', filename, 'mimetype:', mimetype);
  console.log('Filename type:', typeof filename);
  console.log('Encoding:', encoding);
  
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
    console.log('Received chunk, size:', data.length, 'total so far:', totalSize);
  });
  
  file.on('end', () => {
    const fileBuffer = Buffer.concat(chunks);
    console.log('File processing complete. Final size:', fileBuffer.length);
    console.log('Is valid Buffer?', Buffer.isBuffer(fileBuffer));
    
    // Extract filename properly
    let actualFilename;
    if (typeof filename === 'object' && filename !== null) {
      actualFilename = filename.filename || filename.name || 'uploaded-file';
    } else {
      actualFilename = filename || 'uploaded-file';
    }
    
    console.log('Extracted filename:', actualFilename);
    
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
        console.log('Busboy parsing finished');
        console.log('Fields received:', Object.keys(fields));
        console.log('Files received:', Object.keys(files));

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
          kitRegistrationType: String(fields.kitRegistrationType || ''),
          workOrderNumber: String(fields.workOrderNumber || ''),
          sampleNumber: String(fields.sampleNumber || '')
        };

        console.log('Parse result:', {
          fileName: result.fileName,
          fileSize: result.fileBuffer.length,
          kitRegistrationId: result.kitRegistrationId,
          kitRegistrationType: result.kitRegistrationType,
          workOrderNumber: result.workOrderNumber,
          sampleNumber: result.sampleNumber
        });

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

async function processTestResultsFile({
  supabase,
  user,
  fileBuffer,
  fileName,
  kitRegistrationId,
  kitRegistrationType,
  workOrderNumber,
  sampleNumber
}) {
  const requestId = Math.random().toString(36).substring(2, 8);
  let reportId;

  try {
    log('info', 'Starting file processing', { requestId, fileName });

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

    // Convert file to CSV
// Convert file to CSV
let csvContent;
try {
  const safeFileName = String(fileName || 'uploaded-file');
  console.log('Processing file:', safeFileName);
  console.log('File buffer size:', fileBuffer.length);
  
  if (safeFileName.toLowerCase().endsWith('.csv')) {
    console.log('Processing as CSV file');
    csvContent = fileBuffer.toString('utf-8');
  } else {
    console.log('Processing as Excel file');
    try {
      csvContent = await convertExcelToCSV(fileBuffer);
    } catch (excelError) {
      console.error('Excel conversion failed:', excelError.message);
      
      // Try to process as CSV anyway (maybe it's mislabeled)
      console.log('Attempting to process as CSV instead...');
      try {
        csvContent = fileBuffer.toString('utf-8');
        console.log('Successfully processed as CSV');
      } catch (csvFallbackError) {
        throw new Error(`File processing failed: ${excelError.message}. CSV fallback also failed: ${csvFallbackError.message}`);
      }
    }
  }
  
  console.log('CSV content length:', csvContent ? csvContent.length : 'undefined');
  console.log('CSV content first 200 chars:', csvContent ? csvContent.substring(0, 200) : 'undefined');
  
  if (!csvContent) {
    throw new Error('CSV content is empty or undefined');
  }
} catch (csvError) {
  console.error('Error converting file to CSV:', csvError);
  throw new Error(`Failed to process file: ${csvError.message}`);
}

    // Store CSV in Supabase storage
    const csvFileName = `${reportId}-${sampleNumber}.csv`;
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
    await processCSVData(supabase, csvContent, sampleNumber, workOrderNumber, requestId);

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

    // Generate PDF report
    const pdfResult = await processReportGeneration(supabase, reportId, sampleNumber, requestId);
    
    if (pdfResult.success) {
      // Update report with PDF URL and completion status
      await supabase
        .from('reports')
        .update({ 
          pdf_file_url: pdfResult.pdfUrl,
          processing_status: 'completed'
        })
        .eq('report_id', reportId);
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
    if (reportId) { // Add this check
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

async function convertExcelToCSV(fileBuffer) {
  try {
    console.log('Converting Excel to CSV, buffer size:', fileBuffer.length);
    console.log('Buffer type:', typeof fileBuffer);
    console.log('Is Buffer?', Buffer.isBuffer(fileBuffer));
    
    // Check if buffer looks like Excel file
    const bufferStart = fileBuffer.slice(0, 50);
    console.log('Buffer start (hex):', bufferStart.toString('hex'));
    console.log('Buffer start (string):', bufferStart.toString('ascii'));
    
    // Validate buffer size
    if (fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }
    
    if (fileBuffer.length < 100) {
      throw new Error('File buffer is too small to be a valid Excel file');
    }
    
    // Check for Excel file signatures
    const xlsxSignature = fileBuffer.slice(0, 4);
    const isZipFile = xlsxSignature[0] === 0x50 && xlsxSignature[1] === 0x4B; // PK (ZIP header)
    
    console.log('Excel signature check:', {
      firstBytes: Array.from(xlsxSignature),
      isZipFile: isZipFile
    });
    
    if (!isZipFile) {
      throw new Error('File does not appear to be a valid Excel file (missing ZIP signature)');
    }
    
    // Try to load with ExcelJS
    const workbook = new ExcelJS.Workbook();
    
    console.log('Attempting to load workbook...');
    await workbook.xlsx.load(fileBuffer);
    
    console.log('Workbook loaded successfully');
    console.log('Workbook worksheets count:', workbook.worksheets.length);
    
    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    console.log('Worksheet name:', worksheet.name);
    console.log('Worksheet row count:', worksheet.rowCount);

    const csvRows = [];
    
    // Iterate through actual rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const csvRow = [];
      
      // Get all cell values from this row
      const cellValues = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cellValues[colNumber] = cell.value;
      });
      
      // Convert to CSV format
      for (let i = 1; i <= row.cellCount; i++) {
        let value = '';
        const cellValue = cellValues[i];
        
        if (cellValue !== null && cellValue !== undefined) {
          // Handle different cell types
          if (typeof cellValue === 'object') {
            if (cellValue.result !== undefined) {
              // Formula cell
              value = cellValue.result;
            } else if (cellValue.text !== undefined) {
              // Rich text cell
              value = cellValue.text;
            } else {
              // Other object types
              value = String(cellValue);
            }
          } else {
            value = String(cellValue);
          }
        }
        
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          csvRow.push(`"${value.replace(/"/g, '""')}"`);
        } else {
          csvRow.push(value);
        }
      }
      
      csvRows.push(csvRow.join(','));
    });

    const csvContent = csvRows.join('\n');
    console.log('CSV conversion complete. Lines:', csvRows.length);
    
    return csvContent;
  } catch (error) {
    console.error('ExcelJS conversion error:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to convert Excel to CSV: ${error.message}`);
  }
}

async function processCSVData(supabase, csvContent, sampleNumber, workOrderNumber, requestId) {
  try {
    log('info', 'Processing CSV data', { sampleNumber, workOrderNumber, requestId });

    if (!csvContent) {
      throw new Error('CSV content is undefined or empty');
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log('CSV lines count:', lines.length);
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse CSV header
    const headers = parseCSVRow(lines[0]);
    log('info', 'CSV headers found', { headers, requestId });

    // Create column mapping for test_results_raw table schema
    const columnMapping = createColumnMapping(headers);
    log('info', 'Column mapping created', { columnMapping, requestId });

    // Convert work order and sample numbers to integers
    const workOrderInt = parseInt(workOrderNumber);
    const sampleNumberInt = parseInt(sampleNumber);

    if (isNaN(workOrderInt) || isNaN(sampleNumberInt)) {
      throw new Error('Work Order Number and Sample Number must be valid integers');
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      if (values.length === 0) continue; // Skip empty rows

      // Map CSV data to database columns using the schema
      const rowData = {
        "Work Order #": workOrderInt,
        "Sample #": sampleNumberInt
      };

      // Map each CSV column to the appropriate database column
      headers.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== '') {
          const dbColumn = columnMapping[header];
          if (dbColumn) {
            let value = values[index].trim();
            
            // Handle date fields
            if (dbColumn === "Received Date" || dbColumn === "Analysis Date") {
              // Try to parse date, if invalid, store as null
              const parsedDate = new Date(value);
              if (!isNaN(parsedDate.getTime())) {
                rowData[dbColumn] = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              } else {
                rowData[dbColumn] = null;
              }
            } else {
              rowData[dbColumn] = value;
            }
          }
        }
      });

      // Ensure we have the required fields
      if (!rowData["Parameter"]) {
        log('warn', 'Skipping row without Parameter', { rowIndex: i, rowData });
        continue;
      }

      try {
        // Check if record exists using composite primary key
        const { data: existing, error: selectError } = await supabase
          .from('test_results_raw')
          .select('"Work Order #", "Sample #", "Parameter"')
          .eq('"Work Order #"', workOrderInt)
          .eq('"Sample #"', sampleNumberInt)
          .eq('"Parameter"', rowData["Parameter"])
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          log('warn', 'Error checking existing record', { error: selectError.message });
        }

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('test_results_raw')
            .update(rowData)
            .eq('"Work Order #"', workOrderInt)
            .eq('"Sample #"', sampleNumberInt)
            .eq('"Parameter"', rowData["Parameter"]);

          if (updateError) {
            log('warn', 'Failed to update test result', { 
              error: updateError.message, 
              rowData: rowData 
            });
          } else {
            log('info', 'Updated test result', { 
              workOrder: workOrderInt, 
              sample: sampleNumberInt, 
              parameter: rowData["Parameter"] 
            });
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('test_results_raw')
            .insert([rowData]);

          if (insertError) {
            log('warn', 'Failed to insert test result', { 
              error: insertError.message, 
              rowData: rowData 
            });
          } else {
            log('info', 'Inserted test result', { 
              workOrder: workOrderInt, 
              sample: sampleNumberInt, 
              parameter: rowData["Parameter"] 
            });
          }
        }
      } catch (rowError) {
        log('warn', 'Error processing row', { 
          error: rowError.message, 
          rowIndex: i, 
          rowData 
        });
      }
    }

    log('info', 'CSV data processing completed', { 
      sampleNumber, 
      workOrderNumber,
      rowsProcessed: lines.length - 1, 
      requestId 
    });

  } catch (error) {
    console.error('Error in processCSVData:', error);
    throw new Error(`Failed to process CSV data: ${error.message}`);
  }
}

function createColumnMapping(csvHeaders) {
  // Map common CSV header variations to the exact database column names
  const mapping = {};
  
  csvHeaders.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    
    // Map to exact database column names (case-sensitive with quotes)
    switch (lowerHeader) {
      case 'work order #':
      case 'work order':
      case 'work_order':
      case 'workorder':
        mapping[header] = "Work Order #";
        break;
      case 'sample #':
      case 'sample':
      case 'sample_number':
      case 'samplenumber':
        mapping[header] = "Sample #";
        break;
      case 'sample date':
      case 'sample_date':
      case 'sampledate':
        mapping[header] = "Sample Date";
        break;
      case 'matrix':
        mapping[header] = "Matrix";
        break;
      case 'sample description':
      case 'sample_description':
      case 'description':
        mapping[header] = "Sample Description";
        break;
      case 'method':
      case 'test_method':
      case 'analysis_method':
        mapping[header] = "Method";
        break;
      case 'parameter':
      case 'parameter_name':
      case 'analyte':
        mapping[header] = "Parameter";
        break;
      case 'mdl':
      case 'method detection limit':
      case 'detection_limit':
        mapping[header] = "MDL";
        break;
      case 'result':
      case 'value':
      case 'concentration':
      case 'test_result':
        mapping[header] = "Result";
        break;
      case 'units':
      case 'unit':
      case 'uom':
        mapping[header] = "Units";
        break;
      case 'received date':
      case 'received_date':
      case 'receiveddate':
      case 'date_received':
        mapping[header] = "Received Date";
        break;
      case 'analysis date':
      case 'analysis_date':
      case 'analysisdate':
      case 'date_analyzed':
      case 'test_date':
        mapping[header] = "Analysis Date";
        break;
      case 'notes':
      case 'comments':
      case 'remarks':
        mapping[header] = "Notes";
        break;
      default:
        // If no mapping found, check if it exactly matches a database column
        const dbColumns = [
          "Work Order #", "Sample #", "Sample Date", "Matrix", "Sample Description", 
          "Method", "Parameter", "MDL", "Result", "Units", "Received Date", 
          "Analysis Date", "Notes"
        ];
        if (dbColumns.includes(header)) {
          mapping[header] = header;
        }
        break;
    }
  });
  
  return mapping;
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