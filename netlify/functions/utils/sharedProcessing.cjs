// Shared processing utilities extracted from process-test-results.cjs
// This module contains the core logic that can be reused by both manual uploads
// and automated email processing

const XLSX = require('xlsx');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const { Readable } = require('stream');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

// Logging utility
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Parameter standards from CSV document
const PARAMETER_STANDARDS = new Map();
// This would be populated from the CSV data provided
// For now, showing the structure - you'd load this from your database or config

/**
 * Process test results file (Excel or CSV)
 * @param {Object} fileData - File data object with buffer, filename, etc.
 * @param {string} kitCode - Kit code for matching
 * @returns {Object} Processing results
 */
async function processTestResultsFile(fileData) {
  try {
    // log('Starting file processing', { 
    //   filename: fileData.fileName,
    //   size: fileData.fileBuffer?.length 
    // });

    let csvData;
    let workOrderNumber;
    let sampleNumber;
    
    // Handle Excel files
    if (fileData.fileName.toLowerCase().includes('.xls')) {
      log('Processing Excel file');
      const workbook = XLSX.read(fileData.fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to CSV data
      csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      // Extract work order and sample info
      const extractResult = extractWorkOrderAndSampleFromExcel(worksheet);
      workOrderNumber = extractResult.workOrderNumber;
      sampleNumber = extractResult.sampleNumber;
      
    } else {
      // Handle CSV files
      log('Processing CSV file');
      csvData = fileData.fileBuffer.toString('utf-8');
      
      // Extract work order and sample info from CSV
      const extractResult = extractWorkOrderAndSampleFromCSV(csvData);
      workOrderNumber = extractResult.workOrderNumber;
      sampleNumber = extractResult.sampleNumber;
    }

    // Process the CSV data
    const processedResults = await processCSVData(csvData, workOrderNumber, sampleNumber);
    
    return {
      success: true,
      workOrderNumber,
      sampleNumber,
      results: processedResults
    };

  } catch (error) {
    log('Error processing file', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Extract work order and sample information from Excel worksheet
 */
function extractWorkOrderAndSampleFromExcel(worksheet) {
  let workOrderNumber = null;
  let sampleNumber = null;
  
  try {
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Get header row (first row)
    const headerRow = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      headerRow.push(cell ? cell.v : '');
    }
    
    // Find the column indexes for Work Order # and Sample #
    const workOrderIndex = headerRow.indexOf('Work Order #');
    const sampleIndex = headerRow.indexOf('Sample #');
    
    // Get the first data row (row 1, since row 0 is headers)
    if (range.e.r >= 1) { // Make sure there's at least one data row
      
      if (workOrderIndex >= 0) {
        const workOrderCell = XLSX.utils.encode_cell({ r: 1, c: workOrderIndex });
        const workOrderCellData = worksheet[workOrderCell];
        if (workOrderCellData) {
          workOrderNumber = workOrderCellData.v?.toString();
        }
      }
      
      if (sampleIndex >= 0) {
        const sampleCell = XLSX.utils.encode_cell({ r: 1, c: sampleIndex });
        const sampleCellData = worksheet[sampleCell];
        if (sampleCellData) {
          sampleNumber = sampleCellData.v?.toString();
        }
      }
    }
    
  } catch (error) {
    log('Error extracting work order and sample from Excel', { error: error.message });
    // Fall back to the old method if the new one fails
    return extractWorkOrderAndSampleFromExcelFallback(worksheet);
  }
  
  return { workOrderNumber, sampleNumber };
}

// Fallback method (your original logic)
function extractWorkOrderAndSampleFromExcelFallback(worksheet) {
  let workOrderNumber = null;
  let sampleNumber = null;
  
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const cellValue = cell.v.toString();
        
        // Look for work order pattern
        if (cellValue.includes('Work Order') || cellValue.includes('WO#')) {
          const woMatch = cellValue.match(/(?:Work Order|WO#)\s*:?\s*(\d+)/i);
          if (woMatch) {
            workOrderNumber = woMatch[1];
          }
        }
        
        // Look for sample number pattern
        if (cellValue.includes('Sample') && cellValue.includes('#')) {
          const sampleMatch = cellValue.match(/Sample\s*#?\s*:?\s*(\d+)/i);
          if (sampleMatch) {
            sampleNumber = sampleMatch[1];
          }
        }
      }
    }
  }
  
  return { workOrderNumber, sampleNumber };
}

/**
 * Extract work order and sample information from CSV text
 */
function extractWorkOrderAndSampleFromCSV(csvText) {
  let workOrderNumber = null;
  let sampleNumber = null;
  
  const lines = csvText.split('\n');
  
  // Check if first data row has the info we need
  if (lines.length > 1) {
    const headers = lines[0].split(',');
    const firstDataRow = lines[1].split(',');
    
    const workOrderIndex = headers.indexOf('Work Order #');
    const sampleIndex = headers.indexOf('Sample #');
    
    if (workOrderIndex >= 0 && firstDataRow[workOrderIndex]) {
      workOrderNumber = firstDataRow[workOrderIndex].trim();
    }
    
    if (sampleIndex >= 0 && firstDataRow[sampleIndex]) {
      sampleNumber = firstDataRow[sampleIndex].trim();
    }
  }
  
  return { workOrderNumber, sampleNumber };
}

/**
 * Process CSV data and extract parameter results
 */
async function processCSVData(csvText, workOrderNumber, sampleNumber) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from([csvText]);
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        const processedRow = parseCSVRow(row);
        if (processedRow) {
          results.push(processedRow);
        }
      })
      .on('end', () => {
        log(`Processed ${results.length} parameter results`);
        resolve(results);
      })
      .on('error', (error) => {
        log('Error processing CSV data', { error: error.message });
        reject(error);
      });
  });
}

/**
 * Parse individual CSV row into standardized format
 */
function parseCSVRow(row) {
  // Use exact column names from Excel file (they match the database schema)
  const parameterName = row['Parameter'];
  const result = row['Result'];
  const unit = row['Units'];
  const method = row['Method'];
  const detectionLimit = row['MDL'];
  
  if (!parameterName || result === null || result === undefined) {
    return null; // Skip invalid rows
  }
  
  return {
    // Map to database column names (which match Excel exactly)
    work_order_number: row['Work Order #'],
    sample_number: row['Sample #'],
    sample_date: row['Sample Date'],
    matrix: row['Matrix'],
    sample_description: row['Sample Description'],
    method: method,
    parameter: parameterName,
    mdl: detectionLimit,
    result: result,
    units: unit,
    received_date: row['Received Date'],
    analysis_date: row['Analysis Date'],
    notes: row['Notes']
  };
}

/**
 * Create column mapping for flexible CSV parsing
 */
function createColumnMapping(headers) {
  const mapping = {};
  
  // Standard mappings for common column variations
  const parameterColumns = ['Parameter', 'Analyte', 'Test', 'Compound', 'Chemical'];
  const resultColumns = ['Result', 'Value', 'Concentration', 'Level', 'Amount'];
  const unitColumns = ['Unit', 'Units', 'UOM'];
  const methodColumns = ['Method', 'Test Method', 'Analytical Method'];
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toLowerCase();
    
    if (parameterColumns.some(col => normalizedHeader.includes(col.toLowerCase()))) {
      mapping.parameter = index;
    }
    if (resultColumns.some(col => normalizedHeader.includes(col.toLowerCase()))) {
      mapping.result = index;
    }
    if (unitColumns.some(col => normalizedHeader.includes(col.toLowerCase()))) {
      mapping.unit = index;
    }
    if (methodColumns.some(col => normalizedHeader.includes(col.toLowerCase()))) {
      mapping.method = index;
    }
  });
  
  return mapping;
}

/**
 * Find lab chain of custody file with enhanced logging and flexible naming
 */
async function findLabChainOfCustodyFile(supabase, workOrderNumber) {
  try {
    log('Searching for lab chain of custody file', { workOrderNumber });
    
    const folderPath = workOrderNumber + '/';
    const { data: fileList, error: listError } = await supabase.storage
      .from('lab-results')
      .list(folderPath);

    if (listError) {
      log('Error listing files in lab-results bucket', { 
        error: listError.message, 
        folderPath,
        bucket: 'lab-results'
      });
      return null;
    }

    if (!fileList || fileList.length === 0) {
      log('No files found in lab-results folder', { folderPath });
      return null;
    }

    log('Files found in lab-results folder', { 
      folderPath,
      fileCount: fileList.length,
      files: fileList.map(f => ({ 
        name: f.name, 
        size: f.size,
        lastModified: f.updated_at 
      }))
    });

    // Try exact patterns first (based on your specification: CofC{work_order_number})
    const exactPatterns = [
      `CofC${workOrderNumber}`,
      `CofC${workOrderNumber}.pdf`,
      `CofC${workOrderNumber}.PDF`
    ];

    for (const pattern of exactPatterns) {
      const exactMatch = fileList.find(file => 
        file.name === pattern || file.name.toLowerCase() === pattern.toLowerCase()
      );
      if (exactMatch) {
        log('Found exact pattern match', { pattern, fileName: exactMatch.name });
        return exactMatch;
      }
    }

    // Try fuzzy matching
    const fuzzyMatch = fileList.find(file => {
      const lowerName = file.name.toLowerCase();
      const lowerWorkOrder = workOrderNumber.toLowerCase();
      return (
        lowerName.includes('cofc') && lowerName.includes(lowerWorkOrder)
      ) || (
        lowerName.includes('coc') && lowerName.includes(lowerWorkOrder)
      ) || (
        lowerName.includes('chain') && lowerName.includes('custody')
      );
    });

    if (fuzzyMatch) {
      log('Found fuzzy match', { fileName: fuzzyMatch.name });
      return fuzzyMatch;
    }

    log('No CoC file found matching any pattern', { 
      workOrderNumber,
      searchedPatterns: exactPatterns,
      availableFiles: fileList.map(f => f.name)
    });
    return null;

  } catch (error) {
    log('Exception while searching for lab chain of custody file', { 
      workOrderNumber, 
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Update kit registration with work order information and lab chain of custody
 */
async function updateKitRegistration(kitRegistrationId, workOrderNumber, sampleNumber, isLegacyKit = false) {
  try {
    log('Updating kit registration', { kitRegistrationId, workOrderNumber, sampleNumber, isLegacyKit });

    // **USE THE HELPER FUNCTION TO FIND LAB CHAIN OF CUSTODY**
    let labChainOfCustodyUrl = null;
    
    try {
      const cocFile = await findLabChainOfCustodyFile(supabase, workOrderNumber);

      if (cocFile) {
        const actualCocPath = `${workOrderNumber}/${cocFile.name}`;
        
        // Get public URL for the CoC file
        const { data: urlData } = supabase.storage
          .from('lab-results')
          .getPublicUrl(actualCocPath);
        
        labChainOfCustodyUrl = urlData.publicUrl;
        log('Lab chain of custody URL generated', { 
          fileName: cocFile.name,
          filePath: actualCocPath,
          url: labChainOfCustodyUrl,
          fileSize: cocFile.size
        });
      } else {
        log('No lab chain of custody file found for work order', { workOrderNumber });
      }
    } catch (cocError) {
      log('Error checking for lab chain of custody', { 
        error: cocError.message,
        workOrderNumber
      });
      // Don't fail the entire update if CoC check fails
    }

    // Prepare update data
    const updateData = {
      work_order_number: workOrderNumber,
      sample_number: sampleNumber,
      status: 'test_results_received',
      updated_at: new Date().toISOString()
    };

    // Add lab chain of custody URL if found
    if (labChainOfCustodyUrl) {
      updateData.lab_chain_of_custody_url = labChainOfCustodyUrl;
      log('Adding lab chain of custody URL to update', { labChainOfCustodyUrl });
    } else {
      log('No lab chain of custody URL to add to update');
    }

    let data, error;

    if (isLegacyKit) {
      // Update legacy kit registration
      ({ data, error } = await supabase
        .from('legacy_kit_registrations')
        .update(updateData)
        .eq('id', kitRegistrationId)
        .select());
    } else {
      // Update regular kit registration
      ({ data, error } = await supabase
        .from('kit_registrations')
        .update(updateData)
        .eq('kit_registration_id', kitRegistrationId)
        .select());
    }

    if (error) {
      throw error;
    }

    log('Updated kit registration successfully', { 
      kitRegistrationId, 
      workOrderNumber, 
      sampleNumber, 
      isLegacyKit,
      hasLabChainOfCustody: !!labChainOfCustodyUrl,
      labChainOfCustodyUrl,
      updateResult: data[0]
    });
    
    return {
      data: data[0],
      labChainOfCustodyUrl
    };
    
  } catch (error) {
    log('Error updating kit registration', { 
      kitRegistrationId, 
      workOrderNumber, 
      sampleNumber, 
      isLegacyKit,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Save test results to database
 */
async function saveTestResults(kitRegistrationId, results, workOrderNumber, sampleNumber) {
  try {
    // Map results directly to database schema (Excel columns match DB columns)
    const testResultsData = results.map(result => ({
      "Work Order #": parseInt(result.work_order_number || workOrderNumber),
      "Sample #": parseInt(result.sample_number || sampleNumber || "1"),
      "Sample Date": result.sample_date,
      "Matrix": result.matrix,
      "Sample Description": result.sample_description,
      "Method": result.method,
      "Parameter": result.parameter,
      "MDL": result.mdl,
      "Result": result.result,
      "Units": result.units,
      "Received Date": result.received_date,
      "Analysis Date": result.analysis_date,
      "Notes": result.notes
    }));

    // Insert into test_results_raw table
    const { data, error } = await supabase
      .from('test_results_raw')
      .insert(testResultsData)
      .select();

    if (error) {
      throw error;
    }

    // log(`Saved ${data.length} test results to database`);
    return data;
    
  } catch (error) {
    log('Error saving test results', { error: error.message });
    throw error;
  }
}

/**
 * Convert Excel to CSV as fallback
 */
function convertExcelToCSVFallback(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(worksheet);
  } catch (error) {
    log('Error converting Excel to CSV', { error: error.message });
    throw error;
  }
}

/**
 * Find kit registration by work order number - check both regular and legacy tables
 */
async function findKitRegistrationByWorkOrder(workOrderNumber) {
  try {
    // First try regular kit registrations
    const { data: regularKit, error: regularError } = await supabase
      .from('kit_registrations')
      .select('*')
      .eq('work_order_number', workOrderNumber)
      .single();

    if (!regularError && regularKit) {
      // log('Found regular kit registration by work order', { workOrderNumber, kitId: regularKit.kit_registration_id });
      return regularKit;
    }

    // If not found, try legacy kit registrations
    const { data: legacyKit, error: legacyError } = await supabase
      .from('legacy_kit_registrations')
      .select('*')
      .eq('work_order_number', workOrderNumber)
      .single();

    if (!legacyError && legacyKit) {
      // log('Found legacy kit registration by work order', { workOrderNumber, kitId: legacyKit.id });
      return legacyKit;
    }

    log('No kit registration found by work order', { workOrderNumber });
    return null;
    
  } catch (error) {
    log('Error finding kit registration by work order', { 
      workOrderNumber, 
      error: error.message 
    });
    return null;
  }
}

/**
 * Find kit registration by project number (kit code)
 */
async function findKitRegistrationByProjectNumber(projectNumber) {
  try {
    const { data, error } = await supabase
      .from('kit_registrations')
      .select('*')
      .or(`kit_code.eq.${projectNumber},display_id.eq.${projectNumber}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
    
  } catch (error) {
    log('Error finding kit registration by project number', { 
      projectNumber, 
      error: error.message 
    });
    return null;
  }
}

module.exports = {
  processTestResultsFile,
  convertExcelToCSVFallback,
  processCSVData,
  updateKitRegistration,
  saveTestResults,
  extractWorkOrderAndSampleFromCSV,
  extractWorkOrderAndSampleFromExcel,
  createColumnMapping,
  parseCSVRow,
  findKitRegistrationByWorkOrder,
  findKitRegistrationByProjectNumber,
  log
};