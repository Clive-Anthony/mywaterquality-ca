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
    log('Starting file processing', { 
      filename: fileData.fileName,
      size: fileData.fileBuffer?.length 
    });

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
  
  // Search through cells for work order and sample info
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const cellValue = cell.v.toString();
        
        // Look for work order pattern
        if (cellValue.includes('Work Order') || cellValue.includes('WO#')) {
          // Extract number following work order
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
  
  for (const line of lines.slice(0, 20)) { // Check first 20 lines
    // Look for work order pattern
    const woMatch = line.match(/(?:Work Order|WO#)\s*:?\s*(\d+)/i);
    if (woMatch) {
      workOrderNumber = woMatch[1];
    }
    
    // Look for sample number pattern  
    const sampleMatch = line.match(/Sample\s*#?\s*:?\s*(\d+)/i);
    if (sampleMatch) {
      sampleNumber = sampleMatch[1];
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
 * Update kit registration with work order information
 */
async function updateKitRegistration(kitRegistrationId, workOrderNumber, sampleNumber) {
  try {
    const { data, error } = await supabase
      .from('kit_registrations')
      .update({
        work_order_number: workOrderNumber,
        sample_number: sampleNumber,
        status: 'results_received',
        updated_at: new Date().toISOString()
      })
      .eq('display_id', kitRegistrationId)
      .select();

    if (error) {
      throw error;
    }

    log('Updated kit registration', { kitRegistrationId, workOrderNumber, sampleNumber });
    return data[0];
    
  } catch (error) {
    log('Error updating kit registration', { error: error.message });
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

    log(`Saved ${data.length} test results to database`);
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
 * Find kit registration by work order number
 */
async function findKitRegistrationByWorkOrder(workOrderNumber) {
  try {
    const { data, error } = await supabase
      .from('kit_registrations')
      .select('*')
      .eq('work_order_number', workOrderNumber)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
    
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