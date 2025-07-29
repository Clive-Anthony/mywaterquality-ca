// netlify/functions/utils/reportGenerator.js - Enhanced with all improvements from test-report-generation
const { createClient } = require('@supabase/supabase-js');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logLine, JSON.stringify(data, null, 2));
  } else {
    console.log(logLine);
  }
}

// Helper functions - Enhanced from test version
const formatLabResult = (param) => {
  if (param.result_display_value && param.result_display_value.trim() !== '') {
    return param.result_display_value.trim();
  }
  if (param.result_value && param.result_value.trim() !== '') {
    return param.result_value.trim();
  }
  const value = param.result_numeric;
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return parseFloat(value).toString();
};

const getCWQIColor = (score) => {
  if (score >= 95) return '#059669';
  if (score >= 89) return '#0D9488';
  if (score >= 80) return '#2563EB';
  if (score >= 65) return '#F59E0B';
  if (score >= 45) return '#F59E0B';
  return '#DC2626';
};

/**
 * Get CWQI rating category based on score
 */
const getCWQIRating = (score) => {
  if (score >= 95) {
    return { 
      name: 'Excellent', 
      color: 'text-green-600'
    };
  } else if (score >= 89) {
    return { 
      name: 'Very Good', 
      color: 'text-teal-600'
    };  
  } else if (score >= 80) {
    return { 
      name: 'Good', 
      color: 'text-blue-600'
    };
  } else if (score >= 65) {
    return { 
      name: 'Fair', 
      color: 'text-yellow-600'
    };
  } else if (score >= 45) {
    return { 
      name: 'Marginal', 
      color: 'text-orange-600'
    };
  } else {
    return { 
      name: 'Poor', 
      color: 'text-red-600'
    };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Road Salt Assessment Component
const generateRoadSaltAssessment = (reportData) => {
  // Find chloride and bromide parameters
  const allParameters = [...reportData.healthParameters, ...reportData.aoParameters, ...reportData.generalParameters];
  
  const chlorideParam = allParameters.find(param => 
    param.parameter_name?.toLowerCase().includes('chloride') && 
    !param.parameter_name?.toLowerCase().includes('bromide')
  );
  
  const bromideParam = allParameters.find(param => 
    param.parameter_name?.toLowerCase().includes('bromide')
  );

  // Calculate road salt assessment
  let assessmentResult = {
    hasChloride: false,
    hasBromide: false,
    chlorideLevel: 0,
    bromideLevel: 0,
    ratio: 0,
    isContamination: false,
    chlorideExceeds100: false,
    canCalculateRatio: false,
    showNoContamination: false
  };

  if (chlorideParam && chlorideParam.result_numeric) {
    assessmentResult.hasChloride = true;
    assessmentResult.chlorideLevel = parseFloat(chlorideParam.result_numeric);
    assessmentResult.chlorideExceeds100 = assessmentResult.chlorideLevel > 100;
    
    // If chloride is less than 100, show "No Contamination"
    if (!assessmentResult.chlorideExceeds100) {
      assessmentResult.showNoContamination = true;
    }
  }

  if (bromideParam && bromideParam.result_numeric) {
    assessmentResult.hasBromide = true;
    assessmentResult.bromideLevel = parseFloat(bromideParam.result_numeric);
  }

  // Calculate ratio if conditions are met
  if (assessmentResult.chlorideExceeds100 && assessmentResult.hasBromide && assessmentResult.bromideLevel > 0) {
    assessmentResult.canCalculateRatio = true;
    assessmentResult.ratio = assessmentResult.chlorideLevel / assessmentResult.bromideLevel;
    assessmentResult.isContamination = assessmentResult.ratio > 1000;
  }

  return `
    <div class="road-salt-spacing"></div>
    
    <div class="section-title">ROAD SALT IMPACT ASSESSMENT</div>
    
    <div class="parameters-unified-container">
      <div class="parameters-container">
        <div class="parameter-cwqi-section">
          <div class="cwqi-title">Road Salt Score</div>
          <div class="cwqi-score" style="color: ${assessmentResult.isContamination ? '#DC2626' : '#059669'}">
            ${assessmentResult.canCalculateRatio 
              ? Math.round(assessmentResult.ratio) 
              : assessmentResult.showNoContamination 
              ? '<100' 
              : 'N/A'
            }
          </div>
          <div class="cwqi-rating" style="color: ${assessmentResult.isContamination ? '#DC2626' : '#059669'}; font-size: 12px; font-weight: bold;">
            ${assessmentResult.canCalculateRatio 
              ? (assessmentResult.isContamination ? 'Road Salt Contamination' : 'No Contamination')
              : assessmentResult.showNoContamination
              ? 'No Contamination'
              : 'Insufficient Data'
            }
          </div>
          <div class="cwqi-summary">
            ${assessmentResult.hasChloride ? `Chloride: ${assessmentResult.chlorideLevel} mg/L` : 'No chloride data'}
          </div>
          ${assessmentResult.hasBromide ? `
            <div class="cwqi-summary">
              Bromide: ${assessmentResult.bromideLevel} mg/L
            </div>
          ` : ''}
        </div>
        
        <div class="parameter-text-section">
          <div class="quality-statement">
            To determine if groundwater is impacted by road salt, two conditions must be met:
          </div>
          <div class="quality-statement">
            <strong>1. Chloride Concentration:</strong> The chloride level in the water must be greater than 100 mg/L.
          </div>
          <div class="quality-statement">
            <strong>2. Chloride-to-Bromide Ratio (Cl:Br):</strong> If the chloride level exceeds 100 mg/L, the Cl:Br ratio is calculated. A result greater than 1,000 indicates likely contamination from road salt.
          </div>
          
          ${(assessmentResult.canCalculateRatio || assessmentResult.showNoContamination) ? `
            <div class="recommendations-section">
              <div class="${assessmentResult.isContamination ? 'recommendations-header-health' : 'recommendations-header-green'}">
                Assessment Result: ${assessmentResult.isContamination ? 'Road Salt Impact Detected' : 'No Road Salt Impact'}
              </div>
              <div class="recommendations-text">
                ${assessmentResult.isContamination 
                  ? 'Your water shows signs of road salt contamination. Consider consulting with a water treatment professional about filtration options.'
                  : assessmentResult.showNoContamination
                  ? 'Your water does not show signs of road salt contamination. The chloride level is below the threshold that would indicate potential road salt impact.'
                  : 'Your water does not show signs of road salt contamination based on the chloride-to-bromide ratio analysis.'
                }
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

// Summary Cards Component - Enhanced version
const generateSummaryCards = (bacteriological, healthConcerns, aoConcerns, showBacteriologicalCard) => {
  const bacteriologicalExceeded = bacteriological.some(param => {
    if (param.result_display_value?.includes('Detected')) {
      return true;
    }
    if (param.parameter_category === 'health') {
      return param.compliance_status === 'EXCEEDS_MAC';
    } else if (param.parameter_category === 'ao') {
      return param.compliance_status === 'EXCEEDS_AO' || 
             (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
    } else {
      return param.compliance_status === 'FAIL';
    }
  });
  
  const healthConcernsCount = healthConcerns.length;
  const aoConcernsCount = aoConcerns.length;

  return `
    <div class="${showBacteriologicalCard ? 'summary-cards-container' : 'summary-cards-container-two-cards'}">
      ${showBacteriologicalCard ? `
      <div class="summary-card ${bacteriologicalExceeded ? 'summary-card-red' : 'summary-card-green'}">
        <div class="summary-card-title">Bacteriological Results</div>
        <div class="summary-card-content">
          <div class="${bacteriologicalExceeded ? 'summary-card-status-red' : 'summary-card-status-green'}">
            ${bacteriologicalExceeded ? 'Coliforms Present' : 'No Coliforms Present'}
          </div>
        </div>
        <div class="summary-card-footer">
          <div class="summary-card-text">&nbsp;</div>
        </div>
      </div>
      ` : ''}
      
      <div class="summary-card ${healthConcernsCount > 0 ? 'summary-card-red' : 'summary-card-green'}">
        <div class="summary-card-title">Health-Related Results</div>
        <div class="summary-card-content">
          <div class="summary-card-number ${healthConcernsCount > 0 ? 'summary-card-number-red' : 'summary-card-number-green'}">
            ${healthConcernsCount}
          </div>
        </div>
        <div class="summary-card-footer">
          <div class="summary-card-text">concerns present</div>
        </div>
      </div>

      <div class="summary-card ${aoConcernsCount > 0 ? 'summary-card-red' : 'summary-card-green'}">
        <div class="summary-card-title">Aesthetic and Operational</div>
        <div class="summary-card-content">
          <div class="summary-card-number ${aoConcernsCount > 0 ? 'summary-card-number-red' : 'summary-card-number-green'}">
            ${aoConcernsCount}
          </div>
        </div>
        <div class="summary-card-footer">
          <div class="summary-card-text">concerns present</div>
        </div>
      </div>
    </div>
  `;
};

// CWQI Component - Enhanced version
const generateCWQIComponent = (cwqi, title) => {
  if (!cwqi) return '';

  const displayRating = cwqi.coliformDetected ? 'Poor' : getCWQIRating(cwqi.score).name;
  const displayScore = cwqi.coliformDetected ? 0 : cwqi.score;
  const scoreColor = getCWQIColor(cwqi.score);
  const barWidth = Math.max(5, Math.min(100, displayScore));

  return `
    <div class="parameter-cwqi-section">
      <div class="cwqi-title">${title}</div>
      ${cwqi.coliformDetected ? `
        <div class="cwqi-title-current">Current Score</div>
      ` : ''}
      <div class="cwqi-score" style="color: ${scoreColor}">${displayScore}/100</div>
      <div class="cwqi-rating" style="color: ${scoreColor}">${displayRating}</div>
      <div class="cwqi-bar">
        <div class="cwqi-bar-fill" style="background-color: ${scoreColor}; width: ${barWidth}%"></div>
      </div>
      <div class="cwqi-summary">
        ${cwqi.coliformDetected 
          ? 'Coliform bacteria detected'
          : `${cwqi.totalTests - cwqi.failedTests} of ${cwqi.totalTests} parameters passed`
        }
      </div>
    </div>
  `;
};

// Recommendations Content - Enhanced version
const generateRecommendationsContent = (concerns, type) => {
  const hasConcerns = concerns.length > 0;
  const isHealthType = type === 'health';

  const getRecommendationsConfig = () => {
    if (!hasConcerns) {
      return {
        headerClass: 'recommendations-header-green',
        headerText: 'Recommendations: Continue Monitoring',
        bodyText: `Your ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits. Continue regular testing to maintain water quality.`
      };
    }

    if (isHealthType) {
      return {
        headerClass: 'recommendations-header-health',
        headerText: 'Recommendations: Actions Needed',
        bodyText: 'The following health-related parameters exceed safe limits. We strongly recommend consulting with a water treatment professional.'
      };
    } else {
      return {
        headerClass: 'recommendations-header-ao',
        headerText: 'Recommendations: Consider Treatment',
        bodyText: 'Some parameters exceed recommended limits. These may affect taste, odor, or water system performance.'
      };
    }
  };

  const config = getRecommendationsConfig();

  return `
    <div class="${config.headerClass}">
      ${config.headerText}
    </div>
    <div class="recommendations-text">
      ${config.bodyText}
    </div>
  `;
};

// Parameters Section - Enhanced version
const generateParametersSection = (cwqi, concerns, type, title) => {
  if (!cwqi) return '';

  const getQualityDescription = (rating, hasColiform = false) => {
    if (hasColiform || rating === 'Poor - Coliform Present') {
      return 'With health-related parameters, your water quality score is Poor because coliform bacteria have been detected in your water sample.';
    }
    
    switch (rating) {
      case 'Excellent':
        return 'almost all parameters meet the guidelines, and any exceedances are very small. Water quality is considered extremely high.';
      case 'Very Good':
        return 'one or more parameters slightly exceed guidelines, but overall water quality remains very safe and clean.';
      case 'Good':
        return 'some parameters exceed guidelines, usually by small to moderate amounts. Water is generally acceptable.';
      case 'Fair':
        return 'several parameters exceed guidelines, and some by larger amounts. Water quality may require treatment.';
      case 'Marginal':
        return 'many parameters exceed guidelines. Water quality is likely to pose issues without treatment.';
      case 'Poor':
        return 'most parameters exceed guidelines by large amounts. Water quality is poor and likely unsafe.';
      default:
        return 'the water quality assessment is based on Canadian Water Quality Index standards.';
    }
  };

  const hasConcerns = concerns.length > 0;
  const isHealthType = type === 'health';
  const hasColiform = cwqi.coliformDetected || false;

  return `
    <div class="parameters-unified-container">
      <div class="parameters-container">
        ${generateCWQIComponent(cwqi, title)}
        
        <div class="parameter-text-section">
          ${hasColiform && isHealthType ? `
            <div class="quality-statement">
              ${getQualityDescription(cwqi.rating, hasColiform)}
            </div>
          ` : `
            <div class="quality-statement">
              <span class="quality-level">
                ${isHealthType 
                  ? `With health-related parameters, your water quality is ${cwqi.rating}` 
                  : `For aesthetic and operational parameters, your water quality is ${cwqi.rating}`
                }
              </span>, this means that ${getQualityDescription(cwqi.rating, hasColiform)}
            </div>
          `}

          ${hasConcerns && !hasColiform && concerns.length <= 6 ? `
            <div class="parameters-list">
              <div class="parameters-list-title">
                Parameters over the limit (${concerns.length}):
              </div>
              ${concerns.map(param => `
                <div class="parameters-list-item">• ${param.parameter_name}</div>
              `).join('')}
            </div>
          ` : ''}

          ${hasConcerns && !hasColiform && concerns.length > 6 ? `
            <div class="parameters-list">
              <div class="parameters-list-title">
                ${concerns.length} parameters exceed recommended limits. See detailed table below for complete information.
              </div>
            </div>
          ` : ''}

          ${!hasConcerns && !hasColiform ? `
            <div class="quality-statement" style="color: #059669; margin-top: 8px;">
              All ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    ${hasColiform && isHealthType && cwqi.potentialScore !== null ? `
      <div class="potential-score-container">
        <div class="potential-score-left">
          <div class="cwqi-title-potential">Potential Score</div>
          <div class="potential-score-number">+${cwqi.potentialScore}</div>
        </div>
        <div class="potential-score-text">
          Your score could potentially increase by ${cwqi.potentialScore} points after removing the coliforms from your drinking water.
        </div>
      </div>
    ` : ''}

    <div class="recommendations-section">
      ${generateRecommendationsContent(concerns, type)}
    </div>
  `;
};

// Enhanced CSS - Updated with all improvements from test version
const getReportCSS = () => {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: 'Helvetica', Arial, sans-serif; 
        line-height: 1.6; 
        color: #1f2937;
        background: white;
        font-size: 12px;
      }
      .container { max-width: 800px; margin: 0 auto; padding: 30px; }
      
      /* Header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 15px;
        border-bottom: 2px solid #e5e7eb;
      }
      .header-title { font-size: 18px; font-weight: bold; color: #000000; }
      .header-subtitle { font-size: 12px; margin-top: 5px; color: #000000; }
      .logo { font-size: 14px; font-weight: bold; color: #2563eb; }
      
      /* Sample Info */
      .sample-info-container { display: flex; margin-bottom: 15px; gap: 15px; margin-top: 20px; }

      .sample-info-table-left {
      width: 50%;
      }

      .sample-info-table-right {
      width: 50%;
      }
      .table-row-sample { display: flex; padding: 8px 0; }
      .table-row-sample:last-child { border-bottom: none; }
      .table-cell-sample-label-wide {
          width: 55%; /* Increased width for left side labels */
          font-size: 12px;
          font-weight: bold;
          color: #374151;
          padding-right: 8px;
          text-align: left;
          vertical-align: top;
          }

          .table-cell-sample-value-narrow {
          width: 45%; /* Decreased width for left side values */
          font-size: 12px;
          color: #1F2937;
          text-align: left;
          vertical-align: top;
          }

          .table-cell-sample-label {
          width: 45%; /* Keep original width for right side */
          font-size: 12px;
          font-weight: bold;
          color: #374151;
          padding-right: 8px;
          text-align: left;
          vertical-align: top;
          }

          .table-cell-sample-value {
          width: 55%; /* Keep original width for right side */
          font-size: 12px;
          color: #1F2937;
          text-align: left;
          vertical-align: top;
          }
      
      /* Sections */
      .section-title {
      font-size: 18px; 
      font-weight: bold; 
      margin-top: 15px; 
      margin-bottom: 8px;
      background-color: #FFFFFF; /* Changed from #2563EB to white */
      color: #F97316; /* Changed from white to orange */
      padding: 10px; 
      margin-left: -10px; 
      margin-right: -10px;
      text-align: center; /* Added for centered text */
      border-top: 1px solid #F97316; /* Added orange top border */
      border-bottom: 1px solid #F97316; /* Added orange bottom border */
      }
      .subsection-title { font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 15px; color: #374151; }
      
      /* Summary Cards */
      .summary-cards-container { display: flex; gap: 20px; margin: 20px 0; }
      .summary-cards-container-two-cards { display: flex; margin-bottom: 20px; gap: 20px; justify-content: center; }
      .summary-card {
        flex: 1; background: white; border-radius: 8px; padding: 20px; text-align: center;
        min-height: 120px; display: flex; flex-direction: column; justify-content: space-between;
      }
      .summary-card-green { border: 2px solid #059669; }
      .summary-card-red { border: 2px solid #DC2626; }
      .summary-card-title { font-size: 14px; font-weight: bold; color: #374151; line-height: 1.3; }
      .summary-card-content { flex: 1; display: flex; justify-content: center; align-items: center; padding: 10px 0; }
      .summary-card-number { font-size: 32px; font-weight: bold; text-align: center; }
      .summary-card-number-green { color: #059669; }
      .summary-card-number-red { color: #DC2626; }
      .summary-card-status-green { color: #059669; font-size: 14px; font-weight: bold; }
      .summary-card-status-red { color: #DC2626; font-size: 14px; font-weight: bold; }
      .summary-card-text { font-size: 12px; text-align: center; color: #6B7280; }
      
      /* CWQI */
      .parameters-unified-container {
        background-color: #FFFFFF; border: 2px solid #9CA3AF; border-radius: 8px;
        padding: 15px; margin-bottom: 20px;
      }
      .parameters-container { display: flex; gap: 15px; min-height: 180px; }
      .parameter-cwqi-section { width: 38%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
      .parameter-text-section { width: 57%; padding: 12px; }
      .cwqi-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; text-align: center; color: #1F2937; }
      .cwqi-title-current { font-size: 12px; font-weight: bold; color: #1F2937; text-align: center; margin-bottom: 12px; }
      .cwqi-score { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 5px; }
      .cwqi-rating { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 10px; }
      .cwqi-bar { height: 12px; background-color: #E5E7EB; border-radius: 6px; margin-bottom: 8px; overflow: hidden; }
      .cwqi-bar-fill { height: 12px; border-radius: 6px; transition: width 0.3s ease; }
      .cwqi-summary { font-size: 12px; text-align: center; color: #6B7280; }
      .quality-statement { font-size: 12px; color: #1F2937; margin-bottom: 12px; line-height: 1.4; }
      .quality-level { font-weight: bold; }
      
      /* Parameters List */
      .parameters-list { margin-top: 12px; }
      .parameters-list-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 6px; }
      .parameters-list-item { font-size: 12px; margin-bottom: 3px; }
      
      /* Recommendations */
      .recommendations-section { margin-top: 10px; margin-bottom: 8px; }
      .recommendations-header-health {
        font-size: 12px; font-weight: bold; color: #DC2626; margin-bottom: 8px;
        background-color: #FEF2F2; padding: 8px; border-radius: 4px; border: 1px solid #FECACA;
      }
      .recommendations-header-ao {
        font-size: 12px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;
        background-color: #FFFBEB; padding: 8px; border-radius: 4px; border: 1px solid #FED7AA;
      }
      .recommendations-header-green {
        font-size: 12px; font-weight: bold; color: #059669; margin-bottom: 8px;
        background-color: #F0FDF4; padding: 8px; border-radius: 4px; border: 1px solid #BBF7D0;
      }
      .recommendations-text { font-size: 12px; color: #374151; line-height: 1.4; margin-bottom: 12px; }
      
      /* Potential Score */
      .potential-score-container {
        display: flex; align-items: center; background-color: #FFFFFF; border: 1px solid #D1D5DB;
        border-radius: 8px; padding: 12px; margin-top: 8px; margin-bottom: 20px;
      }
      .potential-score-left { display: flex; flex-direction: column; align-items: center; margin-right: 16px; min-width: 100px; }
      .potential-score-number { font-size: 24px; font-weight: bold; color: #059669; text-align: center; }
      .cwqi-title-potential { font-size: 12px; font-weight: bold; color: #6B7280; text-align: center; margin-bottom: 4px; }
      .potential-score-text { font-size: 12px; color: #374151; line-height: 1.4; flex: 1; }
      
      /* Alerts */
      .alert-box-contamination {
        display: flex; padding: 12px; margin-bottom: 15px; border-radius: 5px;
        background-color: #FEF2F2; border: 2px solid #DC2626; align-items: flex-start;
      }
      .alert-icon-container { margin-right: 10px; margin-top: 2px; }
      .alert-icon { font-size: 16px; color: #DC2626; font-weight: bold; }
      .alert-content-container { flex: 1; }
      .alert-text-contamination { font-size: 12px; color: #1F2937; line-height: 1.4; }
      .alert-text-bold { font-size: 14px; color: #1F2937; line-height: 1.4; font-weight: bold; }
      
      /* Perfect Water */
      .perfect-water-box {
        background-color: #FFFFFF; border: 2px solid #059669; border-radius: 8px;
        padding: 15px; margin-bottom: 20px; margin-top: 10px;
      }
      .perfect-water-title { font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px; text-align: center; }
      .perfect-water-text { font-size: 12px; color: #374151; line-height: 1.4; text-align: center; }
      
     /* Full Results Tables */
      table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 15px 0; 
      font-size: 12px; /* Increased from 9px */
      }

      th, td { 
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      /* Removed border-left and border-right for no vertical lines */
      padding: 8px 6px; 
      text-align: center; /* Changed from left to center */
      vertical-align: middle; /* Changed from top to middle */
      }

      th { 
      background-color: #FFFFFF; /* Changed from #f9fafb to white */
      font-weight: bold; 
      color: #000000; /* Changed from #374151 to black */
      font-size: 12px; /* Increased from 8px and removed text-transform: uppercase */
      }
      .exceeded-row { background-color: #fef2f2; }
      .parameter-name { font-size: 12px; }
      .status-pass { color: #059669; font-weight: bold; }
      .status-fail { color: #dc2626; font-weight: bold; }
      
      /* General */
      .recommendations { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 15px 0; }
      .recommendations-title { font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
      .recommendations-content { font-size: 12px; color: #374151; line-height: 1.5; }
      .page-break { page-break-before: always; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9px; }
      
      // Page Break
      .page-break { 
          page-break-before: always; 
          }
      
      // Results Explanations
      .results-explanation-box {
          background-color: #EBF8FF;
          border: 3px solid #3182CE;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 25px;
          margin-top: 15px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .results-explanation-title {
          font-size: 14px;
          font-weight: bold;
          color: #1A365D;
          margin-bottom: 12px;
          }

          .results-explanation-text-bold {
          font-size: 12px;
          color: #2D3748;
          line-height: 1.4;
          margin-bottom: 8px;
          font-weight: bold;
          }

          .results-explanation-text {
          font-size: 12px;
          color: #4A5568;
          line-height: 1.4;
          margin-bottom: 8px;
          }
      
      // Next Steps Section

      .next-steps-content {
          margin-top: 20px;
          }

          .next-steps-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 0;
          }

          .checkmark {
          color: #059669;
          font-weight: bold;
          font-size: 14px;
          margin-right: 12px;
          margin-top: 2px;
          flex-shrink: 0;
          }

          .next-steps-text {
          font-size: 12px;
          color: #374151;
          line-height: 1.5;
          text-align: justify;
          }

          .next-steps-list {
          margin-top: 8px;
          margin-left: 20px;
          margin-bottom: 0;
          }

          .next-steps-list li {
          margin-bottom: 6px;
          font-size: 12px;
          color: #374151;
          line-height: 1.5;
          }

          /* Next Steps Buttons */
      .next-steps-button-container {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 0;
          }

          .next-steps-text-with-button {
          font-size: 12px;
          color: #374151;
          line-height: 1.5;
          text-align: justify;
          flex: 1;
          margin-right: 15px;
          }

          .next-steps-button {
          background-color: #1E3A8A;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          min-width: 140px;
          max-width: 140px;
          flex-shrink: 0;
          display: inline-block;
          line-height: 1.3;
          border: 2px solid #1E3A8A;
          }

          .next-steps-button:hover {
          background-color: #1E40AF;
          border-color: #1E40AF;
          }

          .button-top-text {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 4px;
          }

          .button-bottom-text {
          font-size: 8px;
          font-weight: normal;
          line-height: 1.2;
          }
      
      /* Drinking Water Quality Concerns Styling */

          .concerns-table-header {
          display: flex;
          border-top: 2px solid #1F2937;
          border-bottom: 2px solid #1F2937;
          background-color: #FFFFFF;
          font-weight: bold;
          }

          .concerns-header-left {
          width: 35%;
          padding: 12px 15px;
          border-right: 1px solid #E5E7EB;
          font-size: 12px;
          color: #1F2937;
          text-align: center;
          }

          .concerns-header-right {
          width: 65%;
          padding: 12px 15px;
          font-size: 12px;
          color: #1F2937;
          text-align: center;
          }
          .concerns-table-title {
          font-size: 16px;
          font-weight: bold;
          color: #1F2937;
          margin-top: 20px;
          margin-bottom: 15px;
          text-align: left;
          }

          .concerns-table-container {
          margin-bottom: 30px;
          }

          .concerns-table-row {
          display: flex;
          border-top: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
          min-height: 120px;
          page-break-inside: avoid;
          }

          .concerns-left-column {
          width: 35%;
          padding: 15px;
          border-right: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          background-color: #FFFFFF;
          }

          .concerns-right-column {
          width: 65%;
          padding: 15px;
          display: flex;
          align-items: flex-start;
          }

          .concerns-parameter-name {
          font-size: 14px;
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 8px;
          line-height: 1.3;
          }

          .concerns-objective {
          font-size: 12px;
          color: #374151;
          margin-bottom: 6px;
          font-weight: bold;
          }

          .concerns-result {
          font-size: 12px;
          color: #DC2626;
          font-weight: bold;
          }

          .concerns-details {
          font-size: 12px;
          color: #1F2937;
          line-height: 1.5;
          text-align: justify;
          }
      
      /* Potential Score Styling */
          .potential-score-container {
          display: flex;
          align-items: center;
          background-color: #FFFFFF;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          padding: 15px;
          margin-top: 10px;
          margin-bottom: 20px;
          }

          .potential-score-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 20px;
          min-width: 120px;
          }

          .potential-score-title {
          font-size: 12px;
          font-weight: bold;
          color: #6B7280;
          text-align: center;
          margin-bottom: 6px;
          }

          .potential-score-number {
          font-size: 28px;
          font-weight: bold;
          color: #059669;
          text-align: center;
          }

          .potential-score-text {
          font-size: 12px;
          color: #374151;
          line-height: 1.4;
          flex: 1;
          text-align: left;
          }
      
      .cwqi-current-title {
          font-size: 12px;
          font-weight: bold;
          color: #1F2937;
          text-align: center;
          margin-bottom: 12px;
          }
      
      /* Road Salt Section Spacing */
      .road-salt-spacing {
        height: 40px; /* Spacing between AO CWQI and Road Salt section */
      }

      /* Sample Info Spacing */
      .sample-info-spacing {
        height: 30px; /* Spacing after sample information */
      }

      @media print {
        .container { padding: 15px; }
        .section-title { margin: 0 0 15px 0; }
      }
    </style>
  `;
};

// Enhanced HTML Report Generation Function
function generateHTMLReport(reportData, sampleNumber, kitInfo = {}) {
  const { 
    sampleInfo, 
    healthParameters, 
    aoParameters,
    generalParameters, 
    bacteriological, 
    healthConcerns, 
    aoConcerns, 
    healthCWQI, 
    aoCWQI 
  } = reportData;

  // Dynamic kit information based on registration type
  const customer_first = kitInfo.customerFirstName || "Valued Customer";
  const customer_name = kitInfo.customerName || "Customer";
  const order_number = kitInfo.orderNumber || 'N/A'; // Use actual order number
  const kit_display_id = kitInfo.displayId || kitInfo.kitCode || 'N/A'; // Kit identifier
  const sample_description = sampleInfo?.sample_description || "Water Sample";
  const TEST_KIT = kitInfo.testKitName || "Water Test Kit";
  const test_kit_display = kitInfo.testKitName || "Water Test Kit";

  // Bacteriological results should be shown for these specific test kit IDs
  const CITY_WATER_TEST_KIT_ID = 'bf8834dc-b953-41a2-a396-b684c0833c85';
  const ADVANCED_WATER_TEST_KIT_ID = 'a69fd2ca-232f-458e-a240-7e36f50ffa2b';
  const showBacteriologicalResults = kitInfo.testKitId === CITY_WATER_TEST_KIT_ID || 
                                   kitInfo.testKitId === ADVANCED_WATER_TEST_KIT_ID;

  // Check for coliform contamination
  const hasColiformContamination = bacteriological.some(param => 
    (param.parameter_name?.toLowerCase().includes('coliform') || 
     param.parameter_name?.toLowerCase().includes('e. coli')) &&
    (param.result_display_value?.includes('Detected') || 
     param.compliance_status === 'EXCEEDS_MAC')
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Water Quality Report - Sample ${sampleNumber}</title>
      <meta charset="UTF-8">
      ${getReportCSS()}
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div>
              <div class="header-title">${customer_first}'s Drinking Water Quality Report Card</div>
              <div class="header-subtitle">Order No ${order_number}</div>
          </div>
          <img src="https://mywaterqualityca.netlify.app/MWQ-logo-final.png" alt="My Water Quality" style="height: 50px; width: auto;" />
          </div>
        
        <!-- Sample Information -->
      <div class="sample-info-container">
      <div class="sample-info-table-left">
      <div class="table-row-sample">
          <div class="table-cell-sample-label-wide">Name</div>
          <div class="table-cell-sample-value-narrow">${customer_name}</div>
      </div>
      <div class="table-row-sample">
          <div class="table-cell-sample-label-wide">Collection Date</div>
          <div class="table-cell-sample-value-narrow">${formatDate(sampleInfo?.collectionDate)}</div>
      </div>
      <div class="table-row-sample">
          <div class="table-cell-sample-label-wide">Received Date</div>
          <div class="table-cell-sample-value-narrow">${formatDate(sampleInfo?.receivedDate)}</div>
      </div>
      </div>
      <div class="sample-info-table-right">
      <div class="table-row-sample">
          <div class="table-cell-sample-label">Test Kit</div>
          <div class="table-cell-sample-value">${test_kit_display}</div>
      </div>
      <div class="table-row-sample">
          <div class="table-cell-sample-label">Location</div>
          <div class="table-cell-sample-value">${kitInfo.customerLocation || 'Not specified'}</div>
      </div>
      <div class="table-row-sample">
          <div class="table-cell-sample-label">Description</div>
          <div class="table-cell-sample-value">${sample_description}</div>
      </div>
      </div>
  </div>

        <!-- Add spacing after sample information -->
        <div class="sample-info-spacing"></div>
        
        <!-- Summary of Results -->
        <div class="section-title">SNAPSHOTS OF RESULTS</div>
        
        ${generateSummaryCards(bacteriological, healthConcerns, aoConcerns, showBacteriologicalResults)}

        <!-- Results Explanation Box - Show when there are concerns but no coliform contamination -->
          ${(healthConcerns.length > 0 || aoConcerns.length > 0) && !hasColiformContamination ? `
          <div class="results-explanation-box">
          <div class="results-explanation-title">
              Results Explanation
          </div>
          <div class="results-explanation-text-bold">
              There are ${healthConcerns.length > 0 && aoConcerns.length > 0 ? 'health-related and aesthetic' : 
                      healthConcerns.length > 0 ? 'health-related' : 'aesthetic'} concerns.
          </div>
          ${healthConcerns.length > 0 ? `
              <div class="results-explanation-text">
              We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.
              </div>
          ` : ''}
          ${aoConcerns.length > 0 ? `
              <div class="results-explanation-text">
              While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.
              </div>
          ` : ''}
          <div class="results-explanation-text">
              Please refer to the Next Steps section in the report for actions you can take to improve water quality.
          </div>
          </div>
          ` : ''}
        
        <!-- Perfect Water Message -->
        ${healthCWQI?.score === 100 && aoCWQI?.score === 100 ? `
        <div class="perfect-water-box">
          <div class="perfect-water-title">Your water shows no concerns!</div>
          <div class="perfect-water-text">
            Congratulations! Your water quality results are excellent across all tested parameters. 
            This indicates that your water source is well-maintained and meets all health and aesthetic standards.
          </div>
        </div>
        ` : ''}
        
        <!-- Coliform Warning -->
        ${hasColiformContamination ? `
        <div class="alert-box-contamination">
          <div class="alert-icon-container">
            <div class="alert-icon">⚠</div>
          </div>
          <div class="alert-content-container">
            <div class="alert-text-bold">
              Bacteriological Results - Important Notice: Coliform Bacteria Detected
            </div>
            <div class="alert-text-contamination" style="margin-top: 6px;">
              Coliform bacteria have been detected in your drinking water sample. Immediate action is recommended.
            </div>
            <div class="alert-text-bold" style="margin-top: 8px;">
              Disinfect Your Well System:
            </div>
            <div class="alert-text-contamination" style="margin-top: 4px;">
              Contact a licensed water well contractor to inspect and disinfect your well, or follow Health Canada guidelines.
            </div>
          </div>
        </div>
        ` : ''}
        
      <!-- PAGE BREAK before Health Parameters -->
      <div class="page-break"></div>

        <!-- Health Parameters -->

      <div class="section-title">YOUR DRINKING WATER QUALITY HEALTH SCORE</div>

        ${healthCWQI ? `
        <div class="subsection-title">Health Related Parameters</div>
        ${generateParametersSection(healthCWQI, healthConcerns, 'health', 'Health Related Parameters')}
        ` : ''}

        <!-- PAGE BREAK after Health CWQI -->
        <div class="page-break"></div>

        <div class="section-title">YOUR DRINKING WATER AESTHETIC AND OPERATIONAL SCORE</div>

        <!-- AO Parameters -->

        ${aoCWQI ? `
        <div class="subsection-title">Aesthetic and Operational Parameters</div>
        ${generateParametersSection(aoCWQI, aoConcerns, 'ao', 'Aesthetic and Operational Parameters')}
        ` : ''}

        <!-- Road Salt Impact Assessment -->
        ${generateRoadSaltAssessment(reportData)}

      <!-- DRINKING WATER QUALITY CONCERNS - Only show if there are concerns -->
          ${(healthConcerns.length > 0 || aoConcerns.length > 0) ? `
          <!-- PAGE BREAK before Concerns -->
          <div class="page-break"></div>

          <!-- Drinking Water Quality Concerns Section -->
          <div class="section-title">DRINKING WATER QUALITY CONCERNS</div>

          ${healthConcerns.length > 0 ? `
          <div class="concerns-table-title">Health-Related Parameter Concerns</div>

          <!-- Add column headers -->
              <div class="concerns-table-header">
              <div class="concerns-header-left">Parameter</div>
              <div class="concerns-header-right">Parameter Details and Health Considerations</div>
              </div>

          <div class="concerns-table-container">
          ${healthConcerns.map(param => `
              <div class="concerns-table-row">
              <div class="concerns-left-column">
                  <div class="concerns-parameter-name">${param.parameter_name}</div>
                  <div class="concerns-objective">Objective: ${param.mac_display_value || param.mac_display || 'No Standard'}</div>
                  <div class="concerns-result">Your Result: ${formatLabResult(param)}</div>
              </div>
              <div class="concerns-right-column">
                  <div class="concerns-details">
                  ${param.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.'}
                  </div>
              </div>
              </div>
          `).join('')}
          </div>
          ` : ''}

          ${aoConcerns.length > 0 ? `
          <div class="concerns-table-title">Aesthetic and Operational Parameter Concerns</div>

          <!-- Add column headers -->
          <div class="concerns-table-header">
          <div class="concerns-header-left">Parameter</div>
          <div class="concerns-header-right">Parameter Details and Health Considerations</div>
          </div>

          <div class="concerns-table-container">
          ${aoConcerns.map(param => `
              <div class="concerns-table-row">
              <div class="concerns-left-column">
                  <div class="concerns-parameter-name">${param.parameter_name}</div>
                  <div class="concerns-objective">Objective: ${param.ao_display_value || param.ao_display || 'No Standard'}</div>
                  <div class="concerns-result">Your Result: ${formatLabResult(param)}</div>
              </div>
              <div class="concerns-right-column">
                  <div class="concerns-details">
                  ${param.aesthetic_considerations || param.description || param.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.'}
                  </div>
              </div>
              </div>
          `).join('')}
          </div>
          ` : ''}

          ` : ''}

       <!-- PAGE BREAK before Full Results -->
          <div class="page-break"></div>
        
        <!-- Health-Related Results Tables -->

        <div class="section-title">DRINKING WATER QUALITY: HEALTH-RELATED RESULTS</div>

        
        ${healthParameters.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Parameter</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 25%;">Objective</th>
              <th style="width: 15%;">Result</th>
              <th style="width: 15%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${healthParameters.map(param => {
              const isExceeded = param.compliance_status === 'EXCEEDS_MAC';
              return `
                <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
                  <td class="parameter-name">${param.parameter_name}</td>
                  <td style="text-align: center;">${param.result_units || param.parameter_unit || 'N/A'}</td>
                  <td style="text-align: center;">${param.mac_display_value || param.mac_display || 'No Standard'}</td>
                  <td style="text-align: center;">${formatLabResult(param)}</td>
                  <td class="${isExceeded ? 'status-fail' : 'status-pass'}" style="text-align: center;">
                    ${isExceeded ? 'Exceeds Limit' : 'Within Limit'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- PAGE BREAK between health and AO parameters -->
          <div class="page-break"></div>

          <div class="section-title">DRINKING WATER QUALITY: AESTHETIC/OPERATIONAL-RELATED RESULTS</div>
        
        ${aoParameters.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Parameter</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 25%;">Objective</th>
              <th style="width: 15%;">Result</th>
              <th style="width: 15%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${aoParameters.map(param => {
              const isExceeded = param.compliance_status === 'EXCEEDS_AO' || 
                (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
              return `
                <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
                  <td class="parameter-name">${param.parameter_name}</td>
                  <td style="text-align: center;">${param.result_units || param.parameter_unit || 'N/A'}</td>
                  <td style="text-align: center;">${param.ao_display_value || param.ao_display || 'No Standard'}</td>
                  <td style="text-align: center;">${formatLabResult(param)}</td>
                  <td class="${isExceeded ? 'status-fail' : 'status-pass'}" style="text-align: center;">
                    ${isExceeded ? 'Exceeds Limit' : 'Within Limit'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- PAGE BREAK between AO and general parameters -->
          <div class="page-break"></div>

          <div class="section-title">DRINKING WATER QUALITY: GENERAL RESULTS</div>
        
        ${generalParameters.length > 0 ? `
        <table style="max-width: 600px; margin: 0 auto;">
          <thead>
            <tr>
              <th style="width: 50%;">Parameter</th>
              <th style="width: 30%;">Result</th>
              <th style="width: 20%;">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${generalParameters.map(param => `
              <tr>
                <td class="parameter-name">${param.parameter_name}</td>
                <td style="text-align: center;">${formatLabResult(param)}</td>
                <td style="text-align: center;">${param.result_units || param.parameter_unit || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- PAGE BREAK before Next Steps -->
      <div class="page-break"></div>

      <!-- Next Steps Section -->
      <div class="section-title">NEXT STEPS</div>

      <div class="next-steps-content">
      <div class="next-steps-item">
          <span class="checkmark">✓</span>
          <span class="next-steps-text">The laboratory results presented in this Drinking Water Quality Report Card should be carefully reviewed by a water treatment expert if treatment is necessary to improve the potability of the drinking water supply. A qualified professional can assess the results, recommend appropriate treatment solutions, and ensure that the water meets established drinking water objectives for safety and quality.</span>
      </div>

      <div class="next-steps-item">
          <span class="checkmark">✓</span>
          <div class="next-steps-text">
          <div>It is recommended that you test your drinking water quality on an annual basis. Annual testing is important because:</div>
          <ul class="next-steps-list">
              <li>Water quality can change over time due to weather, nearby construction, agricultural activity, or road salt use.</li>
              <li>Private wells are not monitored by government agencies, so owners are responsible for ensuring safety.</li>
              <li>Health risks may be invisible, including bacteria, nitrates, lead, and other contaminants that don't affect taste or clarity.</li>
              <li>Testing annually provides peace of mind and ensures that any problems are detected early—before they become serious health risks.</li>
          </ul>
          </div>
      </div>

      <div class="next-steps-button-container">
          <span class="checkmark">✓</span>
          <div class="next-steps-text-with-button">If your water test results indicate the presence of Total Coliform or E. coli bacteria, your water may be unsafe to drink. Immediate action is strongly recommended. For your convenience, the steps for addressing bacterial contamination are accessible by clicking the button.</div>
          <a href="https://www.publichealthontario.ca/en/Laboratory-Services/Well-Water-Testing/Well-Disinfection-Tool" target="_blank" class="next-steps-button">
            <div class="button-top-text">CLICK HERE</div>
            <div class="button-bottom-text">TO ACCESS THE WATER WELL DISINFECTION PROCESS</div>
          </a>
      </div>

      <div class="next-steps-button-container">
          <span class="checkmark">✓</span>
          <div class="next-steps-text-with-button">If your water test results suggest contamination from road salt, there are important steps you should follow to assess and address the issue. For your convenience, the steps for addressing road salt contamination are accessible by clicking the button.</div>
          <a href="https://www.canadianwatercompliance.ca/blogs/toronto-legionella-disinfecting-bacteria-water-testing-blog/ontario-road-salt-drinking-water-impact" target="_blank" class="next-steps-button">
            <div class="button-top-text">CLICK HERE</div>
            <div class="button-bottom-text">TO ACCESS THE ROAD SALT IMPACT PROCESS</div>
          </a>
      </div>

      <div class="next-steps-button-container">
          <span class="checkmark">✓</span>
          <div class="next-steps-text-with-button">If you have any questions on your drinking water results, please reach out by clicking the button. We will respond to your inquiry within 24-hours.</div>
          <a href="https://www.mywaterquality.ca/contact" target="_blank" class="next-steps-button">
            <div class="button-top-text">CLICK HERE</div>
            <div class="button-bottom-text">TO CONTACT MY WATER QUALITY</div>
          </a>
      </div>
      </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.</p>
          <p style="margin-top: 10px;">Report generated on ${new Date().toLocaleDateString()} | My Water Quality</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


// Enhanced HTML to PDF function using Puppeteer with serverless Chrome
async function generateHTMLToPDF(reportData, sampleNumber, kitInfo = {}) {
  let browser;
  try {
    console.log('Starting PDF generation...');
    
    // Configure for different environments
    let browserConfig;
    let puppeteer;
    
    if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('Using serverless environment configuration');
      // Serverless environment (Netlify/AWS Lambda)
      try {
        puppeteer = require('puppeteer-core');
        const chromium = require('@sparticuz/chromium');
        console.log('Chromium and puppeteer-core loaded successfully');
        
        browserConfig = {
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };
        console.log('Browser config created for serverless environment');
      } catch (importError) {
        console.error('Error importing serverless dependencies:', importError);
        throw new Error(`Failed to import serverless dependencies: ${importError.message}`);
      }
    } else {
      console.log('Using local development configuration');
      // Local development environment
      puppeteer = require('puppeteer');
      
      browserConfig = {
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      };
      console.log('Browser config created for local environment');
    }
    
    console.log('Launching browser...');
    browser = await puppeteer.launch(browserConfig);
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    // Generate HTML content using kit info
    console.log('Generating HTML content...');
    const htmlContent = generateHTMLReport(reportData, sampleNumber, kitInfo);
    console.log('HTML content generated, length:', htmlContent.length);
    
    console.log('Setting page content...');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('Page content set successfully');
    
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });
    console.log('PDF generated successfully, size:', pdfBuffer.length);
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  }
}

async function processReportGeneration(supabase, reportId, sampleNumber, requestId, kitOrderCode = 'UNKNOWN', kitInfo = {}) {
  try {
    console.log(`[${requestId}] Starting PDF report generation for sample ${sampleNumber}`);

    // First, let's check what sample numbers are actually in the database for this report
    const { data: reportInfo, error: reportError } = await supabase
      .from('reports')
      .select('sample_number, work_order_number')
      .eq('report_id', reportId)
      .single();

    if (reportError) {
      console.log(`[${requestId}] Could not get report info:`, reportError.message);
    } else {
      console.log(`[${requestId}] Report info:`, reportInfo);
    }

    // Try to find what sample numbers exist in the raw table
    const { data: availableSamples, error: samplesError } = await supabase
      .from('test_results_raw')
      .select('*')
      .limit(5);

    if (!samplesError && availableSamples) {
      console.log(`[${requestId}] Available samples in DB:`, availableSamples.map(s => ({ 
        sample: s['Sample #'],
        workOrder: s['Work Order #'],
        parameter: s['Parameter']
      })));
    } else {
      console.log(`[${requestId}] Error fetching available samples:`, samplesError?.message);
    }

    // Try the view query with the sample number
    const { data: testResults, error: dataError } = await supabase
      .from('vw_test_results_with_parameters')
      .select('*')
      .eq('sample_number', sampleNumber)
      .order('parameter_name');

    if (dataError) {
      console.log(`[${requestId}] View query error:`, dataError.message);
    }

    console.log(`[${requestId}] View query returned ${testResults?.length || 0} results for sample ${sampleNumber}`);

    if (!testResults || testResults.length === 0) {
      // Try with work order number
      if (reportInfo?.work_order_number) {
        const { data: results2, error: error2 } = await supabase
          .from('vw_test_results_with_parameters')
          .select('*')
          .eq('sample_number', reportInfo.work_order_number)
          .order('parameter_name');

        if (results2 && results2.length > 0) {
          console.log(`[${requestId}] Found ${results2.length} results using work order ${reportInfo.work_order_number}`);
          return await continueProcessing(supabase, reportId, reportInfo.work_order_number, requestId, results2, kitOrderCode, kitInfo);
        }
      }

      throw new Error(`No test results found. Tried sample: ${sampleNumber}, work order: ${reportInfo?.work_order_number}. Available samples: ${availableSamples?.map(s => s['Sample #']).join(', ') || 'none'}`);
    }

    return await continueProcessing(supabase, reportId, sampleNumber, requestId, testResults, kitOrderCode, kitInfo);

  } catch (error) {
    console.error(`[${requestId}] Error generating PDF report:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendAdminNotification(supabase, reportId, kitInfo, requestId) {
  try {
    console.log(`[${requestId}] Sending admin notification for report ${reportId}`);
    
    // Get the base URL from environment
    const baseUrl = process.env.VITE_APP_URL || 'https://mywaterqualityca.netlify.app';
    const adminEmail = 'admin@mywaterquality.ca';
    
    const adminNotificationResponse = await fetch(`${baseUrl}/.netlify/functions/send-admin-report-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId: reportId,
        kitInfo: {
          kitCode: kitInfo.kitCode || kitInfo.displayId || 'UNKNOWN',
          displayId: kitInfo.displayId || kitInfo.kitCode || 'UNKNOWN', 
          testKitName: kitInfo.testKitName || 'Water Test Kit',
          testKitId: kitInfo.testKitId || null,
          customerName: kitInfo.customerName || 'Customer',
          customerEmail: kitInfo.customerEmail || 'unknown@example.com',
          customerLocation: kitInfo.customerLocation || 'Not specified'
        },
        adminEmail: adminEmail
      })
    });

    // Enhanced response handling
    const responseText = await adminNotificationResponse.text();
    
    console.log(`[${requestId}] Admin notification response:`, {
      status: adminNotificationResponse.status,
      contentType: adminNotificationResponse.headers.get('content-type'),
      responseLength: responseText.length
    });

    if (adminNotificationResponse.ok) {
      // Try to parse as JSON, but don't fail if it's not JSON
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : { success: true };
      } catch (parseError) {
        console.log(`[${requestId}] Response not JSON, but request succeeded:`, responseText.substring(0, 200));
        result = { success: true };
      }
      
      console.log(`[${requestId}] Admin notification sent successfully`, { 
        reportId, 
        token: result.token?.substring(0, 8) + '...' || 'no-token'
      });
    } else {
      // For error responses, log the full response for debugging
      console.error(`[${requestId}] Admin notification failed:`, {
        status: adminNotificationResponse.status,
        response: responseText
      });
      throw new Error(`Admin notification failed: ${adminNotificationResponse.status} - ${responseText}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error in sendAdminNotification:`, error.message);
    throw error;
  }
}

async function continueProcessing(supabase, reportId, sampleNumber, requestId, testResults, kitOrderCode = 'UNKNOWN', kitInfo = {}) {
  try {
    console.log(`[${requestId}] Processing ${testResults.length} test results for report generation`);
    
    // Process the data into the format needed for the report
    const reportData = processReportData(testResults);
    
    if (!reportData) {
      throw new Error('Failed to process test results data');
    }
    
    // TEMPORARY: Skip PDF generation to test the rest of the pipeline
console.log(`[${requestId}] TEMPORARILY SKIPPING PDF generation for testing`);
console.log(`[${requestId}] Report data processed successfully with ${testResults.length} results`);

// Create a dummy "success" response without actual PDF
return {
  success: true,
  pdfUrl: 'https://example.com/temp-placeholder.pdf', // Temporary placeholder
  fileName: `temp-report-${sampleNumber}.pdf`
};

// COMMENTED OUT - PDF generation section
/*
let pdfBuffer;
try {
  console.log(`[${requestId}] Attempting primary PDF generation`);
  pdfBuffer = await generateHTMLToPDF(reportData, sampleNumber, kitInfo);
} catch (pdfError) {
  console.warn(`[${requestId}] Primary PDF generation failed, trying fallback:`, pdfError.message);
  try {
    pdfBuffer = await generateFallbackPDF(reportData, sampleNumber, kitInfo);
    console.log(`[${requestId}] Fallback PDF generation succeeded`);
  } catch (fallbackError) {
    console.error(`[${requestId}] Both PDF generation methods failed:`, fallbackError.message);
    throw new Error(`PDF generation failed: ${pdfError.message}. Fallback also failed: ${fallbackError.message}`);
  }
}

if (!pdfBuffer) {
  throw new Error('Failed to generate PDF buffer');
}

// Upload PDF to Supabase storage - use the correct kit identifier
const orderNumber = kitInfo.displayId || kitInfo.kitCode || kitOrderCode;
const pdfFileName = `My-Water-Quality-Report-${orderNumber}.pdf`;
const { data: pdfUpload, error: pdfUploadError } = await supabase.storage
  .from('generated-reports')
  .upload(pdfFileName, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true
  });

if (pdfUploadError) {
  throw new Error(`Failed to upload PDF: ${pdfUploadError.message}`);
}

// Get public URL for the PDF
const { data: pdfUrl } = supabase.storage
  .from('generated-reports')
  .getPublicUrl(pdfFileName);

console.log(`[${requestId}] PDF report generated successfully: ${pdfFileName}`);

return {
  success: true,
  pdfUrl: pdfUrl.publicUrl,
  fileName: pdfFileName
};
*/
    
  } catch (error) {
    console.error(`[${requestId}] Error in continueProcessing:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

function processReportData(rawData) {
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
}

/**
 * Group parameters by name to count unique parameters
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
 */
const calculateExcursion = (param) => {
  const testValue = parseFloat(param.result_numeric);
  const objective = parseFloat(param.objective_value);
  
  if (isNaN(testValue) || isNaN(objective) || objective === 0) {
    return null;
  }

  const isMinimumGuideline = isMinimumParameter(param.parameter_name);
  
  let excursion;
  if (isMinimumGuideline) {
    excursion = (objective / testValue) - 1;
  } else {
    excursion = (testValue / objective) - 1;
  }

  return Math.max(0, excursion);
};

/**
 * Determine if a parameter has a minimum guideline (like dissolved oxygen)
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
 * Calculate the CCME Water Quality Index (CWQI) using the standard three-factor formula
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

  // Calculate the three CWQI factors using standard formula
  const F1 = (failedParameterNames.size / totalParameters) * 100;
  const F2 = (failedTests.length / totalTests) * 100;
  
  let F3 = 0;
  if (allExcursions.length > 0) {
    const sumExcursions = allExcursions.reduce((sum, exc) => sum + exc, 0);
    const nse = sumExcursions / 1; // One because only one test sample is being used
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
    },
    details: {
      failedParameterNames: Array.from(failedParameterNames),
      excursions: allExcursions,
      nse: allExcursions.length > 0 ? allExcursions.reduce((sum, exc) => sum + exc, 0) / failedTests.length : 0
    }
  };
};

// Export functions
module.exports = {
  processReportGeneration,
  continueProcessing,
  generateHTMLReport,
  generateHTMLToPDF,
  processReportData,
  calculateCCMEWQI,
  sendAdminNotification
};