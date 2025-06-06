// Correct CCME Water Quality Index Calculation
// Based on official CCME documentation: https://ccme.ca/en/res/wqimanualen.pdf

/**
 * Calculate the proper CCME Water Quality Index (CWQI)
 */
const calculateCCMEWQI = (parameters) => {
    if (!parameters || parameters.length === 0) return null;
  
    // Step 1: Organize the data
    const parameterGroups = groupParametersByName(parameters);
    const totalParameters = Object.keys(parameterGroups).length;
    const totalTests = parameters.length;
    
    // Identify failed parameters and tests
    const failedParameterNames = new Set();
    const failedTests = [];
    const allExcursions = [];
  
    parameters.forEach(param => {
      // Updated compliance status checking based on parameter category
      let isFailed = false;
      
      if (param.parameter_category === 'health') {
        isFailed = param.compliance_status === 'EXCEEDS_MAC';
      } else if (param.parameter_category === 'ao') {
        if (param.compliance_status === 'EXCEEDS_AO') {
          isFailed = true;
        } else if (param.compliance_status === 'AO_RANGE_VALUE') {
          // For range values, check if the overall compliance is WARNING
          // We need to access the original raw data to check overall compliance
          // This assumes the original data is available in the parameter object
          isFailed = param.overall_compliance_status === 'WARNING';
        }
      } else {
        // For non-hybrid parameters
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
  
    // Rest of the function remains the same...
  
    const F1 = (failedParameterNames.size / totalParameters) * 100;
    const F2 = (failedTests.length / totalTests) * 100;
    
    let F3 = 0;
    if (allExcursions.length > 0) {
      const sumExcursions = allExcursions.reduce((sum, exc) => sum + exc, 0);
      const nse = sumExcursions / totalTests;
      F3 = (nse / (0.01 + nse)) * 100;
    }
  
    const vectorSum = Math.sqrt(F1 * F1 + F3 * F3);
    const cwqiScore = 100 - (vectorSum / Math.sqrt(2));
    const finalScore = Math.max(0, Math.min(100, Math.round(cwqiScore)));
    
    const rating = getCWQIRating(finalScore);
  
    return {
      score: finalScore,
      rating: rating.name,
      color: rating.color,
      components: {
        F1: Math.round(F1 * 10) / 10,
        F2: Math.round(F2 * 10) / 10,
        F3: Math.round(F3 * 10) / 10
      },
      totalTests,
      failedTests: failedTests.length,
      totalParameters,
      Methodology:'Modified two-component formula for single samples (F1 + F3 only)',
      failedParameters: failedParameterNames.size,
      details: {
        failedParameterNames: Array.from(failedParameterNames),
        excursions: allExcursions
      }
    };
  };
  
  /**
   * Group parameters by name to count unique parameters
   * @param {Array} parameters - Array of test results
   * @returns {Object} Grouped parameters
   */
  const groupParametersByName = (parameters) => {
    return parameters.reduce((groups, param) => {
      const name = param.parameter_name;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(param);
      return groups;
    }, {});
  };
  
  /**
   * Calculate excursion for a failed test
   * @param {Object} param - Parameter test result
   * @returns {number|null} Excursion value
   */
  const calculateExcursion = (param) => {
    const testValue = parseFloat(param.result_numeric);
    const objective = parseFloat(param.objective_value);
    
    if (isNaN(testValue) || isNaN(objective) || objective === 0) {
      return null;
    }
  
    // Determine if this is a "not exceed" or "not fall below" guideline
    // For most water quality parameters, guidelines are "not exceed" (maximum values)
    // Some parameters like dissolved oxygen have "not fall below" (minimum values)
    
    const isMinimumGuideline = isMinimumParameter(param.parameter_name);
    
    let excursion;
    if (isMinimumGuideline) {
      // When test value must not fall below the guideline
      excursion = (objective / testValue) - 1;
    } else {
      // When test value must not exceed the guideline (most common)
      excursion = (testValue / objective) - 1;
    }
  
    return Math.max(0, excursion); // Excursions should be positive
  };
  
  /**
   * Determine if a parameter has a minimum guideline (like dissolved oxygen)
   * @param {string} parameterName - Name of the parameter
   * @returns {boolean} True if it's a minimum guideline
   */
  const isMinimumParameter = (parameterName) => {
    const minimumParameters = [
      'dissolved oxygen',
      'oxygen',
      'do'
    ];
    
    return minimumParameters.some(param => 
      parameterName.toLowerCase().includes(param)
    );
  };
  
  /**
   * Get CWQI rating category based on score
   * @param {number} score - CWQI score (0-100)
   * @returns {Object} Rating information
   */
  const getCWQIRating = (score) => {
    if (score >= 95) {
      return { 
        name: 'Excellent', 
        color: 'text-green-600',
        description: 'Water quality is protected with a virtual absence of threat or impairment; conditions very close to natural or pristine levels.'
      };
    } else if (score >= 80) {
      return { 
        name: 'Good', 
        color: 'text-blue-600',
        description: 'Water quality is protected with only a minor degree of threat or impairment; conditions rarely depart from natural or desirable levels.'
      };
    } else if (score >= 65) {
      return { 
        name: 'Fair', 
        color: 'text-yellow-600',
        description: 'Water quality is usually protected but occasionally threatened or impaired; conditions sometimes depart from natural or desirable levels.'
      };
    } else if (score >= 45) {
      return { 
        name: 'Marginal', 
        color: 'text-orange-600',
        description: 'Water quality is frequently threatened or impaired; conditions often depart from natural or desirable levels.'
      };
    } else {
      return { 
        name: 'Poor', 
        color: 'text-red-600',
        description: 'Water quality is almost always threatened or impaired; conditions usually depart from natural or desirable levels.'
      };
    }
  };
  
  /**
   * Enhanced CWQI calculation with validation and debugging
   * @param {Array} parameters - Array of water quality test results
   * @param {Object} options - Calculation options
   * @returns {Object} CWQI result with validation info
   */
  const calculateCCMEWQIWithValidation = (parameters, options = {}) => {
    const { debug = false, minParameters = 4, minSamples = 4 } = options;
    
    if (!parameters || parameters.length === 0) {
      return {
        error: 'No parameters provided',
        isValid: false
      };
    }
  
    // Validation checks based on CCME recommendations
    const parameterGroups = groupParametersByName(parameters);
    const uniqueParameterCount = Object.keys(parameterGroups).length;
    
    const warnings = [];
    
    if (uniqueParameterCount < minParameters) {
      warnings.push(`Only ${uniqueParameterCount} unique parameters found. CCME recommends minimum ${minParameters} parameters.`);
    }
    
    if (uniqueParameterCount > 20) {
      warnings.push(`${uniqueParameterCount} parameters found. CCME recommends maximum 20 parameters to avoid diluting results.`);
    }
    
    if (parameters.length < minSamples) {
      warnings.push(`Only ${parameters.length} samples found. CCME recommends minimum ${minSamples} samples.`);
    }
  
    const result = calculateCCMEWQI(parameters);
    
    if (!result) {
      return {
        error: 'Failed to calculate CWQI',
        isValid: false,
        warnings
      };
    }
  
    if (debug) {
      console.log('CCME WQI Calculation Debug (Modified for Single Sample):', {
        totalParameters: result.totalParameters,
        totalTests: result.totalTests,
        F1: result.components.F1,
        F2: result.components.F2,
        F3: result.components.F3,
        finalScore: result.score,
        failedParameters: result.details.failedParameterNames
      });
    }
  
    return {
      ...result,
      isValid: true,
      warnings: warnings.length > 0 ? warnings : null,
      recommendations: generateRecommendations(result, warnings)
    };
  };
  
  /**
   * Generate recommendations based on CWQI results
   * @param {Object} cwqiResult - CWQI calculation result
   * @param {Array} warnings - Validation warnings
   * @returns {Array} Array of recommendations
   */
  const generateRecommendations = (cwqiResult, warnings) => {
    const recommendations = [];
    
    if (warnings && warnings.length > 0) {
      recommendations.push({
        type: 'methodology',
        message: 'Consider addressing data collection limitations for more reliable CWQI scores.',
        details: warnings
      });
    }
    
    if (cwqiResult.score < 65) {
      recommendations.push({
        type: 'action',
        message: 'Water quality issues detected. Consider immediate assessment and remediation.',
        priority: 'high'
      });
    } else if (cwqiResult.score < 80) {
      recommendations.push({
        type: 'monitoring',
        message: 'Consider increased monitoring frequency and targeted parameter analysis.',
        priority: 'medium'
      });
    }
    
    if (cwqiResult.failedParameters > 0) {
      recommendations.push({
        type: 'investigation',
        message: `Focus investigation on: ${cwqiResult.details.failedParameterNames.join(', ')}`,
        priority: 'high'
      });
    }
    
    return recommendations;
  };
  
  // Export the functions
  export {
    calculateCCMEWQI,
    calculateCCMEWQIWithValidation,
    getCWQIRating,
    groupParametersByName,
    calculateExcursion,
    isMinimumParameter
  };