// src/lib/reportDataService.js
// Shared data service for both test and production report generation

import { supabase } from './supabaseClient';

/**
 * Shared data service for report generation
 * Used by both test-report-generation and production reportGenerator
 */

/**
 * Fetch report data by sample number from Supabase
 */
export const fetchReportDataBySampleNumber = async (sampleNumber) => {
  try {
    const { data: testResults, error: dataError } = await supabase
      .from('vw_test_results_with_parameters')
      .select('*')
      .eq('sample_number', sampleNumber)
      .order('parameter_name');

    if (dataError) {
      throw new Error(`Database error: ${dataError.message}`);
    }

    if (!testResults || testResults.length === 0) {
      throw new Error(`No test results found for sample number: ${sampleNumber}`);
    }

    return testResults;
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
};

/**
 * Get available sample numbers for testing
 */
export const getAvailableSampleNumbers = async () => {
  try {
    const { data, error } = await supabase
      .from('vw_test_results_with_parameters')
      .select('sample_number, sample_date, work_order_number')
      .not('sample_number', 'is', null)
      .order('sample_date', { ascending: false });

    if (error) throw error;

    // Get unique sample numbers with metadata
    const uniqueSamples = data.reduce((acc, row) => {
      if (!acc.find(s => s.sample_number === row.sample_number)) {
        acc.push({
          sample_number: row.sample_number,
          sample_date: row.sample_date,
          work_order_number: row.work_order_number
        });
      }
      return acc;
    }, []);

    return uniqueSamples;
  } catch (error) {
    console.error('Error loading available samples:', error);
    throw error;
  }
};

/**
 * Process raw test results into standardized report format
 * Extracted from reportGenerator.cjs for shared use
 */
export const processReportData = (rawData) => {
  if (!rawData || rawData.length === 0) return null;

  // Group parameters by whether they have MAC values (health) or AO values (aesthetic/operational)
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

  // Calculate parameters of concern
  const healthConcerns = healthParameters.filter(row => 
    row.compliance_status === 'EXCEEDS_MAC'
  );
  
  const aoConcerns = aoParameters.filter(row => 
    row.compliance_status === 'EXCEEDS_AO' ||
    (row.compliance_status === 'AO_RANGE_VALUE' && rawData.find(r => 
      r.parameter_name === row.parameter_name && 
      r.sample_number === row.sample_number
    )?.compliance_status === 'WARNING')
  );

  // Calculate CWQI scores using enhanced calculations
  const healthCWQI = calculateCCMEWQI(healthParameters);
  const aoCWQI = calculateCCMEWQI(aoParameters);

  // Get sample info from first row
  const sampleInfo = rawData[0] ? {
    sampleNumber: rawData[0].sample_number,
    collectionDate: rawData[0].sample_date,
    receivedDate: rawData[0].received_date,
    reportDate: new Date().toISOString().split('T')[0],
    location: rawData[0].sample_location || rawData[0].location,
    sample_description: rawData[0].sample_description || rawData[0].description
  } : null;

  return {
    sampleInfo,
    healthParameters,
    aoParameters,
    generalParameters,
    bacteriological,
    healthConcerns,
    aoConcerns,
    healthCWQI,
    aoCWQI,
    rawData
  };
};

/**
 * Create anonymized mock data from real sample data
 * This is the "Real Data Derivatives" approach
 */
export const createMockDataFromReal = async (sampleNumber, customCustomerInfo = null, customKitInfo = null) => {
  try {
    const realData = await fetchReportDataBySampleNumber(sampleNumber);
    
    // Create anonymized version
    const anonymizedData = realData.map(row => ({
      ...row,
      // Keep all the parameter data exactly as-is for realistic testing
      sample_number: `MOCK-${Date.now()}`,
      work_order_number: `TEST-${Math.random().toString(36).substring(2, 8)}`,
      // Don't modify the actual test results - they're what we want to test with
    }));

    // Add custom customer info if provided
    const mockCustomerInfo = customCustomerInfo || {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      location: 'Test Location, ON'
    };

    const mockKitInfo = customKitInfo || {
      kitCode: `TEST-${Date.now()}`,
      testKitName: 'Test Water Kit',
      testKitId: null
    };

    return {
      rawData: anonymizedData,
      customerInfo: mockCustomerInfo,
      kitInfo: mockKitInfo
    };
  } catch (error) {
    console.error('Error creating mock data from real sample:', error);
    throw error;
  }
};

/**
 * CWQI Calculation (simplified version for shared use)
 * Using the same logic as in reportGenerator
 */
const calculateCCMEWQI = (parameters) => {
  if (!parameters || parameters.length === 0) return null;

  // Check for coliform detection first
  const coliformDetected = parameters.some(param => 
    (param.parameter_name?.toLowerCase().includes('coliform') || 
     param.parameter_name?.toLowerCase().includes('e. coli') ||
     param.parameter_name?.toLowerCase().includes('e.coli')) &&
    (param.result_display_value?.includes('Detected') || 
     param.compliance_status === 'EXCEEDS_MAC')
  );

  // Group parameters by name to count unique parameters
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
      
      // Calculate excursion for this failed test
      const excursion = calculateExcursion(param);
      if (excursion !== null) {
        allExcursions.push(excursion);
      }
    }
  });

  // Calculate the three CWQI factors
  const F1 = (failedParameterNames.size / totalParameters) * 100;
  const F2 = (failedTests.length / totalTests) * 100;
  
  let F3 = 0;
  if (allExcursions.length > 0) {
    const sumExcursions = allExcursions.reduce((sum, exc) => sum + exc, 0);
    const nse = sumExcursions / 1;
    F3 = nse / (0.01 * nse + 1);
  }

  // Use standard three-factor formula
  const cwqiScore = 100 - Math.sqrt((F1 * F1 + F2 * F2 + F3 * F3) / 1.732);
  let finalScore = Math.max(0, Math.min(100, Math.round(cwqiScore * 10) / 10));

  // Calculate potential score (without coliforms)
  let potentialScore = null;
  if (coliformDetected) {
    const nonColiformParameters = parameters.filter(param => 
      !(param.parameter_name?.toLowerCase().includes('coliform') || 
        param.parameter_name?.toLowerCase().includes('e. coli') ||
        param.parameter_name?.toLowerCase().includes('e.coli'))
    );
    
    if (nonColiformParameters.length > 0) {
      const potentialCWQI = calculateCCMEWQI(nonColiformParameters);
      if (potentialCWQI) {
        potentialScore = potentialCWQI.score;
      }
    }
  }

  // Override score to 0 if coliforms detected (for health parameters only)
  const isHealthCategory = parameters.some(param => param.parameter_category === 'health');
  if (coliformDetected && isHealthCategory) {
    finalScore = 0;
  }
  
  const rating = getCWQIRating(finalScore);

  return {
    score: finalScore,
    rating: rating.name,
    color: rating.color,
    totalTests,
    failedTests: failedTests.length,
    totalParameters,
    failedParameters: failedParameterNames.size,
    coliformDetected,
    potentialScore,
    components: {
      F1: Math.round(F1 * 10) / 10,
      F2: Math.round(F2 * 10) / 10,
      F3: Math.round(F3 * 1000) / 1000
    }
  };
};

const calculateExcursion = (param) => {
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
};

const getCWQIRating = (score) => {
  if (score >= 95) {
    return { name: 'Excellent', color: 'text-green-600' };
  } else if (score >= 89) {
    return { name: 'Very Good', color: 'text-teal-600' };  
  } else if (score >= 80) {
    return { name: 'Good', color: 'text-blue-600' };
  } else if (score >= 65) {
    return { name: 'Fair', color: 'text-yellow-600' };
  } else if (score >= 45) {
    return { name: 'Marginal', color: 'text-orange-600' };
  } else {
    return { name: 'Poor', color: 'text-red-600' };
  }
};