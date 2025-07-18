// netlify/functions/utils/reportGenerator.js - Complete implementation
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

// Helper functions - copied directly from PDF component
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

const getCWQIRating = (score) => {
  if (score >= 95) return 'Excellent';
  if (score >= 89) return 'Very Good';
  if (score >= 80) return 'Good';
  if (score >= 65) return 'Fair';
  if (score >= 45) return 'Marginal';
  return 'Poor';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Summary Cards Component - converted from PDF
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

// CWQI Component - converted from PDF
const generateCWQIComponent = (cwqi, title) => {
  if (!cwqi) return '';

  const displayRating = cwqi.coliformDetected ? 'Poor' : getCWQIRating(cwqi.score);
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

// Recommendations Content - converted from PDF
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

// Parameters Section - converted from PDF
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

// Complete CSS matching the PDF design
const getReportCSS = () => {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: 'Helvetica', Arial, sans-serif; 
        line-height: 1.6; 
        color: #1f2937;
        background: white;
        font-size: 10px;
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
      .sample-info-container { display: flex; margin-bottom: 15px; gap: 15px; }
      .sample-info-table-left { width: 65%; border: 1px solid #E5E7EB; border-radius: 5px; }
      .sample-info-table-right { width: 30%; border: 1px solid #E5E7EB; border-radius: 5px; }
      .table-row-sample { display: flex; border-bottom: 1px solid #E5E7EB; padding: 8px; }
      .table-row-sample:last-child { border-bottom: none; }
      .table-cell-sample-label { width: 45%; font-size: 9px; font-weight: bold; color: #374151; padding-right: 8px; }
      .table-cell-sample-value { width: 55%; font-size: 10px; color: #1F2937; }
      
      /* Sections */
      .section-title {
        font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 8px;
        background-color: #2563EB; color: white; padding: 10px; margin-left: -10px; margin-right: -10px;
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
      .summary-card-title { font-size: 10px; font-weight: bold; color: #374151; line-height: 1.3; }
      .summary-card-content { flex: 1; display: flex; justify-content: center; align-items: center; padding: 10px 0; }
      .summary-card-number { font-size: 32px; font-weight: bold; text-align: center; }
      .summary-card-number-green { color: #059669; }
      .summary-card-number-red { color: #DC2626; }
      .summary-card-status-green { color: #059669; font-size: 12px; font-weight: bold; }
      .summary-card-status-red { color: #DC2626; font-size: 12px; font-weight: bold; }
      .summary-card-text { font-size: 10px; text-align: center; color: #6B7280; }
      
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
      .cwqi-summary { font-size: 9px; text-align: center; color: #6B7280; }
      .quality-statement { font-size: 11px; color: #1F2937; margin-bottom: 12px; line-height: 1.4; }
      .quality-level { font-weight: bold; }
      
      /* Parameters List */
      .parameters-list { margin-top: 8px; }
      .parameters-list-title { font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 6px; }
      .parameters-list-item { font-size: 10px; margin-bottom: 3px; }
      
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
      .recommendations-text { font-size: 10px; color: #374151; line-height: 1.4; margin-bottom: 12px; }
      
      /* Potential Score */
      .potential-score-container {
        display: flex; align-items: center; background-color: #FFFFFF; border: 1px solid #D1D5DB;
        border-radius: 8px; padding: 12px; margin-top: 8px; margin-bottom: 20px;
      }
      .potential-score-left { display: flex; flex-direction: column; align-items: center; margin-right: 16px; min-width: 100px; }
      .potential-score-number { font-size: 24px; font-weight: bold; color: #059669; text-align: center; }
      .cwqi-title-potential { font-size: 12px; font-weight: bold; color: #6B7280; text-align: center; margin-bottom: 4px; }
      .potential-score-text { font-size: 11px; color: #374151; line-height: 1.4; flex: 1; }
      
      /* Alerts */
      .alert-box-contamination {
        display: flex; padding: 12px; margin-bottom: 15px; border-radius: 5px;
        background-color: #FEF2F2; border: 2px solid #DC2626; align-items: flex-start;
      }
      .alert-icon-container { margin-right: 10px; margin-top: 2px; }
      .alert-icon { font-size: 16px; color: #DC2626; font-weight: bold; }
      .alert-content-container { flex: 1; }
      .alert-text-contamination { font-size: 11px; color: #1F2937; line-height: 1.4; }
      .alert-text-bold { font-size: 11px; color: #1F2937; line-height: 1.4; font-weight: bold; }
      
      /* Perfect Water */
      .perfect-water-box {
        background-color: #FFFFFF; border: 2px solid #059669; border-radius: 8px;
        padding: 15px; margin-bottom: 20px; margin-top: 10px;
      }
      .perfect-water-title { font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px; text-align: center; }
      .perfect-water-text { font-size: 11px; color: #374151; line-height: 1.4; text-align: center; }
      
      /* Tables */
      table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; vertical-align: top; }
      th { background-color: #f9fafb; font-weight: bold; color: #374151; font-size: 8px; text-transform: uppercase; }
      .exceeded-row { background-color: #fef2f2; }
      .parameter-name { font-weight: bold; font-size: 9px; }
      .status-pass { color: #059669; font-weight: bold; }
      .status-fail { color: #dc2626; font-weight: bold; }
      
      /* General */
      .recommendations { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 15px 0; }
      .recommendations-title { font-size: 12px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
      .recommendations-content { font-size: 10px; color: #374151; line-height: 1.5; }
      .page-break { page-break-before: always; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9px; }
      
      @media print {
        .container { padding: 15px; }
        .section-title { margin: 0 0 15px 0; }
      }
    </style>
  `;
};

// Main HTML generator function
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
  const order_number = kitInfo.displayId || kitInfo.kitCode || 'N/A'; // Use display_id for regular, kit_code for legacy
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
            <div class="header-title">${customer_first}'s Water Quality Report</div>
            <div class="header-subtitle">Order No ${order_number} - ${test_kit_display}</div>
          </div>
          <div class="logo">My Water Quality</div>
        </div>
        
        <!-- Sample Information -->
        <div class="sample-info-container">
          <div class="sample-info-table-left">
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Customer Name</div>
              <div class="table-cell-sample-value">${customer_name}</div>
            </div>
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Sample Description</div>
              <div class="table-cell-sample-value">${sample_description}</div>
            </div>
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Test Kit</div>
              <div class="table-cell-sample-value">${test_kit_display}</div>
            </div>
          </div>
          <div class="sample-info-table-right">
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Collection Date</div>
              <div class="table-cell-sample-value">${formatDate(sampleInfo?.collectionDate)}</div>
            </div>
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Received Date</div>
              <div class="table-cell-sample-value">${formatDate(sampleInfo?.receivedDate)}</div>
            </div>
            <div class="table-row-sample">
              <div class="table-cell-sample-label">Report Date</div>
              <div class="table-cell-sample-value">${formatDate(sampleInfo?.reportDate)}</div>
            </div>
          </div>
        </div>
        
        <!-- Summary of Results -->
        <div class="section-title">Summary of Results</div>
        
        ${generateSummaryCards(bacteriological, healthConcerns, aoConcerns, showBacteriologicalResults)}
        
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
        
        <!-- Health Parameters -->
        ${healthCWQI ? `
        <div class="subsection-title">Health Related Parameters</div>
        ${generateParametersSection(healthCWQI, healthConcerns, 'health', 'Health Related Parameters')}
        ` : ''}
        
        <!-- AO Parameters -->
        ${aoCWQI ? `
        <div class="subsection-title">Aesthetic and Operational Parameters</div>
        ${generateParametersSection(aoCWQI, aoConcerns, 'ao', 'Aesthetic and Operational Parameters')}
        ` : ''}
        
        <!-- General Recommendations -->
        <div class="section-title">General Recommendations</div>
        <div class="recommendations">
          <div class="recommendations-title">General Recommendations</div>
          <div class="recommendations-content">
            <ol style="margin-left: 15px;">
              <li>The water quality results should be carefully reviewed by a water treatment expert if treatment is necessary.</li>
              <li>Test your water annually or when you notice changes in taste, odor, or appearance.</li>
              <li>Maintain your well and water system according to manufacturer guidelines.</li>
              <li>If you have questions on your drinking water quality results, consult with a professional hydrogeologist.</li>
            </ol>
          </div>
        </div>
        
        <!-- Full Results Tables -->
        <div class="page-break"></div>
        <div class="section-title">Full Results</div>
        
        ${healthParameters.length > 0 ? `
        <div class="subsection-title">Health-Related Parameter Results</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Parameter</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 25%;">Recommended Maximum</th>
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
        
        ${aoParameters.length > 0 ? `
        <div class="subsection-title">Aesthetic & Operational Parameter Results</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Parameter</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 25%;">Recommended Maximum</th>
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
        
        ${generalParameters.length > 0 ? `
        <div class="subsection-title">General Parameter Results</div>
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

// HTML to PDF function using Puppeteer
async function generateHTMLToPDF(reportData, sampleNumber, kitInfo = {}) {
  const puppeteer = require('puppeteer');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML content using kit info
    const htmlContent = generateHTMLReport(reportData, sampleNumber, kitInfo);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
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
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
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

async function continueProcessing(supabase, reportId, sampleNumber, requestId, testResults, kitOrderCode = 'UNKNOWN', kitInfo = {}) {
  try {
    console.log(`[${requestId}] Processing ${testResults.length} test results for report generation`);
    
    // Process the data into the format needed for the report
    const reportData = processReportData(testResults);
    
    if (!reportData) {
      throw new Error('Failed to process test results data');
    }
    
    // Generate PDF using the processed data and kit info
    const pdfBuffer = await generateHTMLToPDF(reportData, sampleNumber, kitInfo);
    
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

  // Calculate CWQI scores (simplified version for server-side)
  const healthCWQI = calculateSimpleCWQI(healthParameters);
  const aoCWQI = calculateSimpleCWQI(aoParameters);

  // Get sample info from first row
  const sampleInfo = rawData[0] ? {
    sampleNumber: rawData[0].sample_number,
    collectionDate: rawData[0].sample_date,
    receivedDate: rawData[0].received_date,
    reportDate: new Date().toISOString().split('T')[0]
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

function calculateSimpleCWQI(parameters) {
  if (!parameters || parameters.length === 0) return null;

  const totalTests = parameters.length;
  const failedTests = parameters.filter(param => {
    if (param.parameter_category === 'health') {
      return param.compliance_status === 'EXCEEDS_MAC';
    } else if (param.parameter_category === 'ao') {
      return param.compliance_status === 'EXCEEDS_AO' ||
             (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
    }
    return false;
  }).length;

  const passedTests = totalTests - failedTests;
  const score = Math.round((passedTests / totalTests) * 100);

  let rating;
  if (score >= 95) rating = 'Excellent';
  else if (score >= 89) rating = 'Very Good';
  else if (score >= 80) rating = 'Good';
  else if (score >= 65) rating = 'Fair';
  else if (score >= 45) rating = 'Marginal';
  else rating = 'Poor';

  return {
    score,
    rating,
    totalTests,
    failedTests,
    components: {
      F1: (failedTests / totalTests) * 100,
      F2: (failedTests / totalTests) * 100,
      F3: 0 // Simplified
    }
  };
}

// Export functions
module.exports = {
  processReportGeneration,
  continueProcessing
};