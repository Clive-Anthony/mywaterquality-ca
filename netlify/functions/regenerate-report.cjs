// netlify/functions/regenerate-report.cjs
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { processReportGeneration } = require('./utils/reportGenerator');

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

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

    // Check if user is admin
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

    const { kitId, kitType } = JSON.parse(event.body);

    if (!kitId || !kitType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Kit ID and type are required' })
      };
    }

    log('Starting report regeneration', { kitId, kitType });

    // Get kit information from admin view
    const { data: kitData, error: kitError } = await supabase
      .from('vw_test_kits_admin')
      .select('*')
      .eq('kit_id', kitId)
      .single();

    if (kitError || !kitData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Kit not found' })
      };
    }

    // Check if kit has test results
    if (!kitData.work_order_number || !kitData.sample_number) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Kit does not have test results to regenerate' })
      };
    }

    // Get test results from the view
    const { data: testResults, error: resultsError } = await supabase
      .from('vw_test_results_with_parameters')
      .select('*')
      .eq('sample_number', kitData.sample_number)
      .order('parameter_name');

    if (resultsError || !testResults || testResults.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No test results found for this kit' })
      };
    }

    // Process the test results data
    const reportData = processReportData(testResults);
    
    if (!reportData) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process test results data' })
      };
    }

    // Generate new report ID
    const newReportId = uuidv4();

    // Prepare kit information for report generation
    const kitInfo = {
      displayId: kitData.kit_code || 'UNKNOWN',
      kitCode: kitData.kit_code || 'UNKNOWN',
      orderNumber: kitData.order_number || 'N/A',
      testKitName: kitData.test_kit_name || 'Water Test Kit',
      testKitId: kitData.test_kit_id || null,
      customerFirstName: kitData.customer_first_name || 'Valued Customer',
      customerName: `${kitData.customer_first_name || ''} ${kitData.customer_last_name || ''}`.trim() || 'Customer',
      customerEmail: kitData.customer_email || 'unknown@example.com',
      customerLocation: [kitData.customer_address, kitData.customer_city, kitData.customer_province, kitData.customer_postal_code].filter(Boolean).join(', ') || 'Not specified'
    };

    // Create new report record with CWQI scores
    const reportRecord = {
      report_id: newReportId,
      sample_number: kitData.sample_number,
      work_order_number: kitData.work_order_number,
      processing_status: 'processing',
      report_type: 'registered',
      user_id: kitData.user_id || user.id,
      health_cwqi: reportData.healthCWQI?.score || null,
      ao_cwqi: reportData.aoCWQI?.score || null
    };

    // Set kit registration fields based on kit type
    if (kitType === 'regular') {
      reportRecord.kit_registration_id = kitId;
    } else if (kitType === 'legacy') {
      reportRecord.legacy_kit_registration_id = kitId;
    }

    // Check for bacteriological contamination for advanced kits
    const ADVANCED_WATER_TEST_KIT_ID = 'a69fd2ca-232f-458e-a240-7e36f50ffa2b';
    const isAdvancedKit = kitData.test_kit_id === ADVANCED_WATER_TEST_KIT_ID;
    
    if (isAdvancedKit && reportData.bacteriological) {
      const hasColiformContamination = reportData.bacteriological.some(param => {
        const isColiformParam = param.parameter_name?.toLowerCase().includes('coliform') || 
                               param.parameter_name?.toLowerCase().includes('e. coli') ||
                               param.parameter_name?.toLowerCase().includes('e.coli');
        
        if (!isColiformParam) return false;
        
        const hasDetectedInDisplay = param.result_display_value?.includes('Detected');
        const exceedsMAC = param.compliance_status === 'EXCEEDS_MAC';
        const numericValue = parseFloat(param.result_numeric);
        const hasNumericContamination = !isNaN(numericValue) && numericValue > 0;
        
        return hasDetectedInDisplay || exceedsMAC || hasNumericContamination;
      });

      // Override health CWQI to 0 if bacteriological contamination is detected
      if (hasColiformContamination) {
        reportRecord.health_cwqi = 0.00;
      }
    }

    // Insert new report record
    const { data: newReport, error: reportError } = await supabase
      .from('reports')
      .insert([reportRecord])
      .select()
      .single();

    if (reportError) {
      throw new Error(`Failed to create new report record: ${reportError.message}`);
    }

    log('New report record created', { reportId: newReportId });

    // Generate PDF report
    const requestId = Math.random().toString(36).substring(2, 8);
    const pdfResult = await processReportGeneration(
      supabase, 
      newReportId, 
      kitData.sample_number, 
      requestId, 
      kitData.kit_code, 
      kitInfo
    );

    if (!pdfResult.success) {
      // Update report status to failed
      await supabase
        .from('reports')
        .update({ 
          processing_status: 'failed',
          error_message: pdfResult.error
        })
        .eq('report_id', newReportId);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Report generation failed: ${pdfResult.error}` })
      };
    }

    // Update report with PDF URL and completion status
    await supabase
      .from('reports')
      .update({ 
        pdf_file_url: pdfResult.pdfUrl,
        processing_status: 'completed'
      })
      .eq('report_id', newReportId);

    // Update kit registration with new report ID
    if (kitType === 'regular') {
      await supabase
        .from('kit_registrations')
        .update({ 
          report_id: newReportId,
          status: 'report_generated',
          updated_at: new Date().toISOString()
        })
        .eq('kit_registration_id', kitId);
    } else if (kitType === 'legacy') {
      await supabase
        .from('legacy_kit_registrations')
        .update({ 
          report_id: newReportId,
          status: 'report_generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', kitId);
    }

    log('Report regeneration completed successfully', { 
      reportId: newReportId,
      kitId,
      kitType,
      healthCWQI: reportRecord.health_cwqi,
      aoCWQI: reportRecord.ao_cwqi
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reportId: newReportId,
        message: 'Report regenerated successfully',
        pdfUrl: pdfResult.pdfUrl,
        healthCWQI: reportRecord.health_cwqi,
        aoCWQI: reportRecord.ao_cwqi
      })
    };

  } catch (error) {
    log('Error regenerating report', { 
      error: error.message, 
      stack: error.stack 
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

/**
 * Process test results data into report format
 * (Simplified version of the function from reportGenerator.cjs)
 */
function processReportData(rawData) {
  if (!rawData || rawData.length === 0) return null;

  // Group parameters by type
  const healthParameters = rawData.filter(row => 
    (row.parameter_type === 'MAC' || row.parameter_type === 'Hybrid') &&
    row.mac_value !== null && row.mac_value !== undefined && row.mac_value !== ''
  ).map(row => ({
    ...row,
    objective_value: row.mac_value,
    objective_display: row.mac_display,
    compliance_status: row.mac_compliance_status,
    parameter_category: 'health'
  }));

  const aoParameters = rawData.filter(row => 
    (row.parameter_type === 'AO' || row.parameter_type === 'Hybrid') &&
    (row.ao_value !== null && row.ao_value !== undefined && row.ao_value !== '' ||
     row.ao_display !== null && row.ao_display !== undefined && row.ao_display !== '')
  ).map(row => ({
    ...row,
    objective_value: row.ao_value,
    objective_display: row.ao_display,
    compliance_status: row.ao_compliance_status,
    overall_compliance_status: row.compliance_status,
    parameter_category: 'ao'
  }));

  const generalParameters = rawData.filter(row => 
    row.parameter_type === 'GENERAL'
  );

  const bacteriological = rawData.filter(row => 
    row.parameter_name?.toLowerCase().includes('coliform') ||
    row.parameter_name?.toLowerCase().includes('bacteria') ||
    row.parameter_name?.toLowerCase().includes('e. coli') ||
    row.parameter_name?.toLowerCase().includes('e.coli')
  );

  // Calculate CWQI scores using the existing function from reportGenerator
  const healthCWQI = calculateCCMEWQI(healthParameters);
  const aoCWQI = calculateCCMEWQI(aoParameters);

  return {
    healthParameters,
    aoParameters,
    generalParameters,
    bacteriological,
    healthCWQI,
    aoCWQI,
    rawData
  };
}

/**
 * Simplified CWQI calculation (from reportGenerator.cjs)
 */
function calculateCCMEWQI(parameters) {
  if (!parameters || parameters.length === 0) return null;

  // Check for coliform detection
  const coliformDetected = parameters.some(param => {
    const isColiformParam = (param.parameter_name?.toLowerCase().includes('coliform') || 
                            param.parameter_name?.toLowerCase().includes('e. coli') ||
                            param.parameter_name?.toLowerCase().includes('e.coli'));
    
    if (!isColiformParam) return false;
    
    const hasDetectedInDisplay = param.result_display_value?.includes('Detected');
    const exceedsMAC = param.compliance_status === 'EXCEEDS_MAC';
    const numericValue = parseFloat(param.result_numeric);
    const hasNumericContamination = !isNaN(numericValue) && numericValue > 0;
    
    return hasDetectedInDisplay || exceedsMAC || hasNumericContamination;
  });

  // Group parameters by name
  const parameterGroups = parameters.reduce((groups, param) => {
    const name = param.parameter_name;
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(param);
    return groups;
  }, {});

  const totalParameters = Object.keys(parameterGroups).length;
  const totalTests = parameters.length;
  
  // Identify failed parameters and tests
  const failedParameterNames = new Set();
  const failedTests = [];
  const allExcursions = [];

  parameters.forEach(param => {
    let isFailed = false;
    
    if (param.parameter_category === 'health') {
      isFailed = param.compliance_status === 'EXCEEDS_MAC';
    } else if (param.parameter_category === 'ao') {
      if (param.compliance_status === 'EXCEEDS_AO') {
        isFailed = true;
      } else if (param.compliance_status === 'AO_RANGE_VALUE') {
        isFailed = param.overall_compliance_status === 'WARNING';
      }
    } else {
      isFailed = param.compliance_status === 'FAIL';
    }
    
    if (isFailed) {
      failedParameterNames.add(param.parameter_name);
      failedTests.push(param);
      
      const excursion = calculateExcursion(param);
      if (excursion !== null) {
        allExcursions.push(excursion);
      }
    }
  });

  // Calculate CWQI factors
  const F1 = (failedParameterNames.size / totalParameters) * 100;
  const F2 = (failedTests.length / totalTests) * 100;
  
  let F3 = 0;
  if (allExcursions.length > 0) {
    const sumExcursions = allExcursions.reduce((sum, exc) => sum + exc, 0);
    const nse = sumExcursions / 1;
    F3 = nse / (0.01 * nse + 1);
  }

  // Calculate final score
  const cwqiScore = 100 - Math.sqrt((F1 * F1 + F2 * F2 + F3 * F3) / 1.732);
  let finalScore = Math.max(0, Math.min(100, Math.round(cwqiScore * 10) / 10));

  // Override score to 0 if coliforms detected (for health parameters only)
  const isHealthCategory = parameters.some(param => param.parameter_category === 'health');
  if (coliformDetected && isHealthCategory) {
    finalScore = 0;
  }
  
  const rating = getCWQIRating(finalScore);

  return {
    score: finalScore,
    rating: rating.name,
    totalTests,
    failedTests: failedTests.length,
    totalParameters,
    failedParameters: failedParameterNames.size,
    coliformDetected
  };
}

function calculateExcursion(param) {
  const testValue = parseFloat(param.result_numeric);
  const objective = parseFloat(param.objective_value);
  
  if (isNaN(testValue) || isNaN(objective) || objective === 0) {
    return null;
  }

  const isMinimumGuideline = param.parameter_name?.toLowerCase().includes('dissolved oxygen');
  
  let excursion;
  if (isMinimumGuideline) {
    excursion = (objective / testValue) - 1;
  } else {
    excursion = (testValue / objective) - 1;
  }

  return Math.max(0, excursion);
}

function getCWQIRating(score) {
  if (score >= 95) {
    return { name: 'Excellent' };
  } else if (score >= 89) {
    return { name: 'Very Good' };  
  } else if (score >= 80) {
    return { name: 'Good' };
  } else if (score >= 65) {
    return { name: 'Fair' };
  } else if (score >= 45) {
    return { name: 'Marginal' };
  } else {
    return { name: 'Poor' };
  }
}