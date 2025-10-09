// netlify/functions/utils/chainOfCustodyProcessor.js
const ExcelJS = require('exceljs');

/**
 * Mapping of test kit types to their Chain of Custody template filenames
 * Based on actual test kit names from the database
 */
const TEST_KIT_TEMPLATE_MAPPING = {
  // Well Testing Kits
  'Advanced Homeowner / Real Estate Well Testing Kit': 'advanced-well-test-CoC.xlsx',
  'General Homeowner Well Testing Kit': 'general-well-test-CoC.xlsx',
  'Industrial Contamination Well Testing Kit': 'industrial-contamination-well-test-CoC.xlsx',
  
  // City Water Testing
  'City Water Testing Kit': 'city-water-test-CoC.xlsx',
  
  // Contamination-Specific Testing
  'Pesticide and Herbicide Contamination Well Testing Kit': 'pesticide-herbicide-test-CoC.xlsx',
  'PFAS (Forever Chemicals) Testing Kit': 'pfas-test-CoC.xlsx',
  
  // Treatment System Testing
  'Homeowner Treatment System Testing Kit': 'treatment-system-test-CoC.xlsx',
  'Treatment Screening Kit': 'treatment-screening-CoC.xlsx',
  
  // Bacteria Testing - Different templates for each
  'Iron-Reducing Bacteria Screening Test': 'iron-reducing-bacteria-screening-CoC.xlsx',
  'Sulphate-Reducing Bacteria Screening Test': 'sulphate-reducing-bacteria-screening-CoC.xlsx',

  
  // Legacy fallback
  'Legacy Kit': 'general-well-test-CoC.xlsx',
  
  // Default fallback
  'default': 'general-well-test-CoC.xlsx'
};

/**
 * Get the appropriate Chain of Custody template filename for a test kit
 * @param {string} testKitName - Name of the test kit
 * @returns {string} Template filename
 */
function getTemplateFilename(testKitName) {
  // Normalize the test kit name
  const normalizedName = testKitName?.trim();
  
  // Check for exact match first
  if (TEST_KIT_TEMPLATE_MAPPING[normalizedName]) {
    return TEST_KIT_TEMPLATE_MAPPING[normalizedName];
  }
  
  // Check for partial matches (case-insensitive)
  const lowerName = normalizedName?.toLowerCase() || '';
  for (const [kitType, template] of Object.entries(TEST_KIT_TEMPLATE_MAPPING)) {
    if (kitType !== 'default' && lowerName.includes(kitType.toLowerCase())) {
      return template;
    }
  }
  
  // Return default template
  return TEST_KIT_TEMPLATE_MAPPING.default;
}

/**
 * Generate a unique filename for the completed Chain of Custody form
 * @param {string} displayId - Kit display ID
 * @param {string} orderNumber - Order number
 * @returns {string} Generated filename
 */
function generateCocFilename(displayId, orderNumber) {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedDisplayId = displayId.replace(/[^a-zA-Z0-9-]/g, '');
  const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-]/g, '');
  
  return `MWQ_COC_${sanitizedDisplayId}_${timestamp}.xlsx`;
}

/**
 * Download Chain of Custody template from Supabase Storage
 * @param {Object} supabase - Supabase client
 * @param {string} templateFilename - Template filename to download
 * @returns {Buffer} Template file buffer
 */
async function downloadTemplate(supabase, templateFilename) {
  try {
    const { data, error } = await supabase.storage
      .from('chain-of-custody-templates')
      .download(templateFilename);
    
    if (error) {
      throw new Error(`Failed to download template ${templateFilename}: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Template ${templateFilename} not found`);
    }
    
    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading template:', error);
    throw error;
  }
}

/**
 * Populate Chain of Custody form with registration data
 * @param {Buffer} templateBuffer - Excel template buffer
 * @param {Object} registrationData - Kit registration data
 * @returns {Buffer} Populated Excel file buffer
 */
async function populateChainOfCustody(templateBuffer, registrationData) {
  try {
    // Load the workbook from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);
    
    // Get worksheet - try multiple approaches
    let worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      worksheet = workbook.getWorksheet(0);
    }
    
    if (!worksheet) {
      if (workbook.worksheets.length > 0) {
        worksheet = workbook.worksheets[0];
      }
    }
    
    if (!worksheet) {
      throw new Error(`No worksheets found in template. Workbook has ${workbook.worksheets.length} worksheets`);
    }
    
    console.log(`Using worksheet: "${worksheet.name}" (${worksheet.worksheets ? worksheet.worksheets.length : 'unknown'} total sheets)`);
    
    // FIXED: Format date without timezone conversion
    // Parse the date string directly without creating a Date object that might apply timezone
    const dateString = registrationData.sample_date; // Should be in YYYY-MM-DD format
    let formattedDate = dateString;
    
    // If we need to reformat the date, do it as string manipulation to avoid timezone issues
    if (dateString && dateString.includes('-')) {
      const dateParts = dateString.split('-');
      if (dateParts.length === 3) {
        // Convert YYYY-MM-DD to local display format if needed, or keep as-is
        formattedDate = dateString; // Keep as YYYY-MM-DD
        
        // Or if you want MM-DD-YYYY format:
        // formattedDate = `${dateParts[1]}-${dateParts[2]}-${dateParts[0]}`;
      }
    }
    
    // FIXED: Format time and handle AM/PM conversion to 24-hour format
    let formattedTime = registrationData.sample_time;
    if (formattedTime) {
      // Handle different time formats
      if (formattedTime.includes(':')) {
        const timeParts = formattedTime.split(':');
        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1] ? timeParts[1].replace(/[^\d]/g, '') : '00';
        
        // Check for AM/PM in the original time string
        const timeString = formattedTime.toLowerCase();
        const isAM = timeString.includes('am');
        const isPM = timeString.includes('pm');
        
        // Convert to 24-hour format
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (isAM && hours === 12) {
          hours = 0;
        }
        
        // Format as HH:MM in 24-hour format
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }
    
    console.log('Formatted date and time:', { 
      originalDate: registrationData.sample_date, 
      formattedDate,
      originalTime: registrationData.sample_time,
      formattedTime 
    });
    
    // Populate the Chain of Custody form
    // Time sample was collected (cells D21:E21)
    if (formattedTime) {
      const timeCell = worksheet.getCell('D21');
      timeCell.value = formattedTime;
      try {
        if (!timeCell.isMerged) {
          worksheet.mergeCells('D21:E21');
        }
      } catch (mergeError) {
        console.log('Warning: Could not merge cells D21:E21:', mergeError.message);
      }
    }
    
    // Date sample was collected (cells A21:C21) 
    if (formattedDate) {
      const dateCell = worksheet.getCell('A21');
      dateCell.value = formattedDate;
      try {
        if (!dateCell.isMerged) {
          worksheet.mergeCells('A21:C21');
        }
      } catch (mergeError) {
        console.log('Warning: Could not merge cells A21:C21:', mergeError.message);
      }
    }
    
    // Sample description (cells G21:K21)
    if (registrationData.sample_description) {
      const descCell = worksheet.getCell('G21');
      descCell.value = registrationData.sample_description;
      try {
        if (!descCell.isMerged) {
          worksheet.mergeCells('G21:K21');
        }
      } catch (mergeError) {
        console.log('Warning: Could not merge cells G21:K21:', mergeError.message);
      }
    }
    
    // Sampled by (cells A44:J44)
    if (registrationData.person_taking_sample) {
      const samplerCell = worksheet.getCell('A44');
      samplerCell.value = registrationData.person_taking_sample;
      try {
        if (!samplerCell.isMerged) {
          worksheet.mergeCells('A44:J44');
        }
      } catch (mergeError) {
        console.log('Warning: Could not merge cells A44:J44:', mergeError.message);
      }
    }
    
    // Date (cell K44)
    if (formattedDate) {
      const dateCell44 = worksheet.getCell('K44');
      dateCell44.value = formattedDate;
    }
    
    // Time (cells L44:N44)
    if (formattedTime) {
      const timeCell44 = worksheet.getCell('L44');
      timeCell44.value = formattedTime;
      try {
        if (!timeCell44.isMerged) {
          worksheet.mergeCells('L44:N44');
        }
      } catch (mergeError) {
        console.log('Warning: Could not merge cells L44:N44:', mergeError.message);
      }
    }
    
    // Client Project Number - displayID (cells AC8:AH8)
    if (registrationData.display_id) {
  const projectCell = worksheet.getCell('AC8');
  
  // Read existing content from the cell (should be "Package #{package_number}_Order #")
  const existingContent = projectCell.value || '';
  
  // Append the display_id to the existing content
  const updatedContent = existingContent.toString() + registrationData.display_id;
  
  projectCell.value = updatedContent;
  
  console.log('Client Project Number updated:', { 
    existingContent, 
    displayId: registrationData.display_id, 
    updatedContent 
  });
  
  try {
    if (!projectCell.isMerged) {
      worksheet.mergeCells('AC8:AH8');
    }
  } catch (mergeError) {
    console.log('Warning: Could not merge cells AC8:AH8:', mergeError.message);
  }
}
    
    console.log('Chain of Custody populated successfully');
    
    // Generate buffer from populated workbook
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
    
  } catch (error) {
    console.error('Error populating Chain of Custody:', error);
    throw new Error(`Failed to populate Chain of Custody: ${error.message}`);
  }
}

/**
 * Upload completed Chain of Custody to Supabase Storage
 * @param {Object} supabase - Supabase client
 * @param {Buffer} fileBuffer - Completed Excel file buffer
 * @param {string} filename - Filename for storage
 * @returns {string} Public URL of uploaded file
 */
async function uploadCompletedCoc(supabase, fileBuffer, filename) {
  try {
    const { data, error } = await supabase.storage
      .from('generated-chain-of-custody')
      .upload(filename, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true // Allow overwriting if file exists
      });
    
    if (error) {
      throw new Error(`Failed to upload Chain of Custody: ${error.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('generated-chain-of-custody')
      .getPublicUrl(filename);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading Chain of Custody:', error);
    throw error;
  }
}

// Waybill reference will be added in a future process

/**
 * Main function to process Chain of Custody for a kit registration
 * @param {Object} supabase - Supabase client
 * @param {Object} kitData - Kit registration data
 * @param {Object} orderInfo - Order information
 * @param {string} requestId - Request ID for logging
 * @returns {Object} Processing result with file URL and waybill reference
 */
async function processChainOfCustody(supabase, kitData, orderInfo, requestId) {
  try {
    console.log(`[${requestId}] Processing Chain of Custody for kit ${kitData.display_id}`);
    
    // 1. Determine the correct template
    const templateFilename = getTemplateFilename(orderInfo.product_name);
    console.log(`[${requestId}] Using template: ${templateFilename}`);
    
    // 2. Download template
    const templateBuffer = await downloadTemplate(supabase, templateFilename);
    console.log(`[${requestId}] Template downloaded successfully`);
    
    // 3. Populate template with registration data
    const populatedBuffer = await populateChainOfCustody(templateBuffer, {
      ...kitData,
      display_id: kitData.display_id || kitData.kit_code
    });
    console.log(`[${requestId}] Template populated successfully`);
    
    // 4. Generate filename for completed form
    const cocFilename = generateCocFilename(
      kitData.display_id || kitData.kit_code, 
      orderInfo.order_number
    );
    
    // 5. Upload completed form
    const fileUrl = await uploadCompletedCoc(supabase, populatedBuffer, cocFilename);
    console.log(`[${requestId}] Chain of Custody uploaded: ${fileUrl}`);
    
    return {
      success: true,
      fileUrl,
      filename: cocFilename,
      templateUsed: templateFilename
    };
    
  } catch (error) {
    console.error(`[${requestId}] Error processing Chain of Custody:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processChainOfCustody,
  getTemplateFilename,
  TEST_KIT_TEMPLATE_MAPPING
};