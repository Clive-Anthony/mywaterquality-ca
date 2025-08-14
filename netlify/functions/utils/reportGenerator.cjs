// netlify/functions/utils/reportGenerator.js - Integrated with test-report design
const { createClient } = require('@supabase/supabase-js');

// Fix for Node.js fetch duplex issue - ADD THIS AT THE TOP
const originalFetch = global.fetch;
if (originalFetch) {
  global.fetch = function(url, options = {}) {
    if (options.body && !options.duplex) {
      options.duplex = 'half';
    }
    return originalFetch(url, options);
  };
}

// React-PDF imports
const ReactPDF = require('@react-pdf/renderer');
const React = require('react');

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

// PDF generation using React-PDF with integrated test-report design
async function generateHTMLToPDF(reportData, sampleNumber, kitInfo = {}) {
  try {
    console.log('Starting PDF generation with React-PDF...');
    
    // Create the full comprehensive document
    const MyDocument = createReactPDFDocument(reportData, sampleNumber, kitInfo);
    
    console.log('Document created, generating buffer...');
    
    // Use renderToBuffer for production
    const pdfBuffer = await ReactPDF.renderToBuffer(MyDocument);
    
    console.log('PDF generated successfully with React-PDF, size:', pdfBuffer.length);
    
    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Failed to generate valid buffer');
    }
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating PDF with React-PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

// Comprehensive React-PDF Document Creator (integrated from test-report-generation)
function createReactPDFDocument(reportData, sampleNumber, kitInfo = {}) {
  try {
    console.log('Creating comprehensive React PDF document...');
    
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

    // Document data - using production sample information
    const customer_first = kitInfo.customerFirstName || "Valued Customer";
    const customer_name = kitInfo.customerName || "Customer";
    const order_number = kitInfo.orderNumber && kitInfo.orderNumber !== 'N/A' 
  ? kitInfo.orderNumber 
  : (kitInfo.displayId || kitInfo.kitCode || 'N/A');
    const test_kit_display = kitInfo.testKitName || "Water Test Kit";
    const sample_description = sampleInfo?.sample_description || "Water Sample";
    
    // Check for coliform contamination - UPDATED LOGIC
const hasColiformContamination = bacteriological.some(param => {
  const isColiformParam = param.parameter_name?.toLowerCase().includes('coliform') || 
                         param.parameter_name?.toLowerCase().includes('e. coli') ||
                         param.parameter_name?.toLowerCase().includes('e.coli');
  
  if (!isColiformParam) return false;
  
  // Check multiple conditions for contamination
  const hasDetectedInDisplay = param.result_display_value?.includes('Detected');
  const exceedsMAC = param.compliance_status === 'EXCEEDS_MAC';
  
  // NEW: For coliform parameters, any numeric value > 0 indicates contamination
  const numericValue = parseFloat(param.result_numeric);
  const hasNumericContamination = !isNaN(numericValue) && numericValue > 0;
  
  return hasDetectedInDisplay || exceedsMAC || hasNumericContamination;
});

    const perfectWater = healthCWQI?.score === 100 && aoCWQI?.score === 100;
    
    // Determine if bacteriological results should be shown
    const ADVANCED_WATER_TEST_KIT_ID = 'a69fd2ca-232f-458e-a240-7e36f50ffa2b';
    const showBacteriologicalResults = kitInfo.testKitId === ADVANCED_WATER_TEST_KIT_ID;

    console.log('Bacteriological Display Debug:', {
      testKitId: kitInfo.testKitId,
      testKitName: kitInfo.testKitName,
      advancedKitId: ADVANCED_WATER_TEST_KIT_ID,
      showBacteriologicalResults,
      hasColiformContamination,
      bacteriologicalCount: bacteriological.length
    });

    return React.createElement(ReactPDF.Document, null,
      // Page 1 - Summary
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        
        // Header
        React.createElement(ReactPDF.View, { style: styles.header },
          React.createElement(ReactPDF.View, null,
            React.createElement(ReactPDF.Text, { style: styles.headerTitle }, 
              `${customer_first}'s Drinking Water Quality Report Card`
            ),
            React.createElement(ReactPDF.Text, { style: styles.headerSubtitle }, 
              `Order No ${order_number}`
            )
          ),
          // Add logo image
          React.createElement(ReactPDF.Image, {
            src: 'https://mywaterqualityca.netlify.app/MWQ-logo-final.png',
            style: styles.logoImage
          })
        ),

        // Gray separator line
        React.createElement(ReactPDF.View, { style: styles.headerSeparator }),

        // Sample Information - using production values
        React.createElement(ReactPDF.View, { style: styles.sampleInfoContainer },
          React.createElement(ReactPDF.View, { style: styles.sampleInfoLeft },
            createSampleInfoRow('Name', customer_name),
            createSampleInfoRow('Collection Date', formatDate(sampleInfo?.collectionDate)),
            createSampleInfoRow('Received Date', formatDate(sampleInfo?.receivedDate))
          ),
          React.createElement(ReactPDF.View, { style: styles.sampleInfoRight },
            createSampleInfoRow('Test Kit', test_kit_display),
            createSampleInfoRow('Location', kitInfo.customerLocation || 'Not specified'),
            createSampleInfoRow('Description', sample_description)
          )
        ),

        // Section Title
        createSectionTitle('SNAPSHOTS OF RESULTS'),

        // Summary Cards - with bacteriological support
        createSummaryCards(healthConcerns, aoConcerns, hasColiformContamination, showBacteriologicalResults),

        // Perfect Water Message or Coliform Warning
        perfectWater ? createPerfectWaterMessage() : null,
        hasColiformContamination ? createColiformWarning() : null,
        
        // Results Explanation Box - Show when there are concerns but no coliform contamination
        ((healthConcerns.length > 0 || aoConcerns.length > 0) && !hasColiformContamination) ? 
          createResultsExplanationBox(healthConcerns, aoConcerns) : null
      ),

      // Page 2 - Health Score
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('YOUR DRINKING WATER QUALITY HEALTH SCORE'),
        healthCWQI ? createCWQISection(healthCWQI, healthConcerns, 'health') : null,
        healthCWQI ? createPotentialScoreSection(healthCWQI) : null
      ),

      // Page 3 - Aesthetic Score and Road Salt
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('YOUR DRINKING WATER AESTHETIC & OPERATIONAL SCORE'),
        aoCWQI ? createCWQISection(aoCWQI, aoConcerns, 'ao') : null,
        
        // Road Salt Assessment
        createSectionTitle('ROAD SALT IMPACT ASSESSMENT'),
        createRoadSaltAssessment(reportData)
      ),

      // Page 4 - Health Concerns (only if there are health concerns)
      healthConcerns.length > 0 ? createHealthConcernsPage(healthConcerns) : null,

      // Page 5 - Aesthetic Concerns (only if there are aesthetic concerns)  
      aoConcerns.length > 0 ? createAestheticConcernsPage(aoConcerns) : null,

      // Page 6 - Health Results Table
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('DRINKING WATER QUALITY: HEALTH-RELATED RESULTS'),
        healthParameters.length > 0 ? createParametersTable(healthParameters, 'health') : null
      ),

      // Page 7 - Aesthetic Results Table
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('DRINKING WATER QUALITY: AESTHETIC/OPERATIONAL-RELATED RESULTS'),
        aoParameters.length > 0 ? createParametersTable(aoParameters, 'ao') : null
      ),

      // Page 8 - General Results Table
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('DRINKING WATER QUALITY: GENERAL RESULTS'),
        generalParameters.length > 0 ? createGeneralParametersTable(generalParameters) : null
      ),

      // Page 9 - Next Steps
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('NEXT STEPS'),
        createNextStepsSection(),
        
        // Footer
        React.createElement(ReactPDF.View, { style: styles.footer },
          React.createElement(ReactPDF.Text, { style: styles.footerText },
            'This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.'
          ),
          React.createElement(ReactPDF.Text, { style: styles.footerText },
            `Report generated on ${new Date().toLocaleDateString()} | My Water Quality`
          )
        )
      )
    );
    
  } catch (error) {
    console.error('Error creating comprehensive React PDF document:', error);
    throw error;
  }
}

// Helper functions for creating components
function createSampleInfoRow(label, value) {
  return React.createElement(ReactPDF.View, { style: styles.sampleRow },
    React.createElement(ReactPDF.Text, { style: styles.sampleLabel }, label),
    React.createElement(ReactPDF.Text, { style: styles.sampleValue }, value)
  );
}

function createSectionTitle(title) {
  return React.createElement(ReactPDF.View, { style: styles.sectionTitleContainer },
    React.createElement(ReactPDF.View, { style: styles.sectionTitleBorder }),
    React.createElement(ReactPDF.Text, { style: styles.sectionTitleText }, title),
    React.createElement(ReactPDF.View, { style: styles.sectionTitleBorder })
  );
}

// Updated createSummaryCards function with bacteriological support
function createSummaryCards(healthConcerns, aoConcerns, hasColiformContamination, showBacteriological = false) {
  const bacteriologicalExceeded = hasColiformContamination;
  
  if (showBacteriological) {
    // Three cards for bacteria-detecting kits
    return React.createElement(ReactPDF.View, { style: styles.summaryCardsContainerThree },
      // Bacteriological card
      React.createElement(ReactPDF.View, { 
        style: [styles.summaryCardSmall, bacteriologicalExceeded ? styles.cardRed : styles.cardGreen] 
      },
        React.createElement(ReactPDF.Text, { style: styles.cardTitleSmall }, 'Bacteriological Results'),
        React.createElement(ReactPDF.View, { style: styles.cardContentCenter },
          React.createElement(ReactPDF.Text, { 
            style: [styles.cardStatusSmall, bacteriologicalExceeded ? styles.statusTextRed : styles.statusTextGreen] 
          }, bacteriologicalExceeded ? 'Bacteria Detected' : '0 concerns')
        ),
        React.createElement(ReactPDF.Text, { style: styles.cardTextSmall }, '')
      ),
      
      // Health card
      React.createElement(ReactPDF.View, { 
        style: [styles.summaryCardSmall, healthConcerns.length > 0 ? styles.cardRed : styles.cardGreen] 
      },
        React.createElement(ReactPDF.Text, { style: styles.cardTitleSmall }, 'Health-Related Results'),
        React.createElement(ReactPDF.View, { style: styles.cardContentCenter },
          React.createElement(ReactPDF.Text, { 
            style: [styles.cardNumber, healthConcerns.length > 0 ? styles.numberRed : styles.numberGreen] 
          }, healthConcerns.length.toString())
        ),
        React.createElement(ReactPDF.Text, { style: styles.cardTextSmall }, 'concerns present')
      ),
      
      // AO card  
      React.createElement(ReactPDF.View, { 
        style: [styles.summaryCardSmall, aoConcerns.length > 0 ? styles.cardRed : styles.cardGreen] 
      },
        React.createElement(ReactPDF.Text, { style: styles.cardTitleSmall }, 'Aesthetic & Operational'),
        React.createElement(ReactPDF.View, { style: styles.cardContentCenter },
          React.createElement(ReactPDF.Text, { 
            style: [styles.cardNumber, aoConcerns.length > 0 ? styles.numberRed : styles.numberGreen] 
          }, aoConcerns.length.toString())
        ),
        React.createElement(ReactPDF.Text, { style: styles.cardTextSmall }, 'concerns present')
      )
    );
  } else {
    // Two cards for non-bacteria-detecting kits
    return React.createElement(ReactPDF.View, { style: styles.summaryCardsContainer },
      // Health card
      React.createElement(ReactPDF.View, { 
        style: [styles.summaryCard, healthConcerns.length > 0 ? styles.cardRed : styles.cardGreen] 
      },
        React.createElement(ReactPDF.Text, { style: styles.cardTitle }, 'Health-Related Results'),
        React.createElement(ReactPDF.View, { style: styles.cardContentCenter },
          React.createElement(ReactPDF.Text, { 
            style: [styles.cardNumber, healthConcerns.length > 0 ? styles.numberRed : styles.numberGreen] 
          }, healthConcerns.length.toString())
        ),
        React.createElement(ReactPDF.Text, { style: styles.cardText }, 'concerns present')
      ),
      
      // AO card  
      React.createElement(ReactPDF.View, { 
        style: [styles.summaryCard, aoConcerns.length > 0 ? styles.cardRed : styles.cardGreen] 
      },
        React.createElement(ReactPDF.Text, { style: styles.cardTitle }, 'Aesthetic & Operational'),
        React.createElement(ReactPDF.View, { style: styles.cardContentCenter },
          React.createElement(ReactPDF.Text, { 
            style: [styles.cardNumber, aoConcerns.length > 0 ? styles.numberRed : styles.numberGreen] 
          }, aoConcerns.length.toString())
        ),
        React.createElement(ReactPDF.Text, { style: styles.cardText }, 'concerns present')
      )
    );
  }
}

function createPerfectWaterMessage() {
  return React.createElement(ReactPDF.View, { style: styles.perfectWaterBox },
    React.createElement(ReactPDF.Text, { style: styles.perfectWaterTitle }, 'Your water shows no concerns!'),
    React.createElement(ReactPDF.Text, { style: styles.perfectWaterText },
      'Congratulations! Your water quality results are excellent across all tested parameters. This indicates that your water source is well-maintained and meets all health and aesthetic standards.'
    )
  );
}

function createColiformWarning() {
  return React.createElement(ReactPDF.View, { style: styles.alertBox },
    React.createElement(ReactPDF.Text, { style: styles.alertTitle }, 
      'Bacteriological Results - Important Notice: Coliform Bacteria Detected '
    ),
    React.createElement(ReactPDF.Text, { style: styles.alertTitleHighlight }, 
      'Do Not Drink Water'
    ),
    React.createElement(ReactPDF.Text, { style: styles.alertText }, 
      'Coliform bacteria have been detected in your drinking water sample. Immediate action is recommended.'
    ),
    React.createElement(ReactPDF.Text, { style: styles.alertSubTitle }, 
      'Disinfect Your Well System:'
    ),
    React.createElement(ReactPDF.Text, { style: styles.alertText }, 
      'Contact a licensed water well contractor to inspect and disinfect your well, or follow Health Canada guidelines.'
    )
  );
}

function createResultsExplanationBox(healthConcerns, aoConcerns) {
  return React.createElement(ReactPDF.View, { style: styles.resultsExplanationBox },
    React.createElement(ReactPDF.Text, { style: styles.resultsExplanationTitle }, 'Results Explanation'),
    React.createElement(ReactPDF.Text, { style: styles.resultsExplanationTextBold },
      `There are ${healthConcerns.length > 0 && aoConcerns.length > 0 ? 'health-related and aesthetic' : 
                healthConcerns.length > 0 ? 'health-related' : 'aesthetic'} concerns.`
    ),
    healthConcerns.length > 0 ? React.createElement(ReactPDF.Text, { style: styles.resultsExplanationText },
      'We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.'
    ) : null,
    aoConcerns.length > 0 ? React.createElement(ReactPDF.Text, { style: styles.resultsExplanationText },
      'While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.'
    ) : null,
    React.createElement(ReactPDF.Text, { style: styles.resultsExplanationText },
      'Please refer to the Next Steps section in the report for actions you can take to improve water quality.'
    )
  );
}

function createCWQISection(cwqi, concerns, type) {
  const isHealthType = type === 'health';
  const hasConcerns = concerns.length > 0;
  const hasColiform = cwqi.coliformDetected || false;
  
  return React.createElement(ReactPDF.View, { style: styles.cwqiContainer },
    React.createElement(ReactPDF.View, { style: styles.cwqiBox },
      React.createElement(ReactPDF.View, { style: styles.cwqiLeft },
        React.createElement(ReactPDF.Text, { style: styles.cwqiScoreTitle }, 
          isHealthType ? 'Health Related' : 'Aesthetic & Operational'
        ),
        React.createElement(ReactPDF.Text, { style: [styles.cwqiScore, { color: getCWQIColor(cwqi.score) }] }, 
          `${cwqi.score}/100`
        ),
        React.createElement(ReactPDF.Text, { style: [styles.cwqiRating, { color: getCWQIColor(cwqi.score) }] }, 
          cwqi.rating
        ),
        React.createElement(ReactPDF.Text, { style: styles.cwqiSummary }, 
          `${cwqi.totalTests - cwqi.failedTests} of ${cwqi.totalTests} parameters passed`
        )
      ),
      React.createElement(ReactPDF.View, { style: styles.cwqiRight },
        // First sentence - bold
        React.createElement(ReactPDF.Text, { style: styles.cwqiDescriptionBold },
          `${isHealthType ? 'With health-related parameters, your water quality is' : 'For aesthetic and operational parameters, your water quality is'} ${cwqi.rating}.`
        ),
        
        // Second sentence - regular
        React.createElement(ReactPDF.Text, { style: styles.cwqiDescriptionRegular },
          `This means that ${getQualityDescription(cwqi.rating)}`
        ),
        
        // Additional bacteria message for health parameters
        hasColiform && isHealthType ? React.createElement(ReactPDF.Text, { style: styles.cwqiBacteriaText },
          'Your health-related score is 0 because bacteria were detected in the water.'
        ) : null,
        
        // No concerns message
        !hasConcerns ? React.createElement(ReactPDF.Text, { style: styles.cwqiGreenText },
          `All ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.`
        ) : null
      )
    ),
    
    // Recommendations - Updated logic for aesthetic concerns
    React.createElement(ReactPDF.View, { 
      style: !hasConcerns ? styles.recommendationsGreen : 
             isHealthType ? styles.recommendationsRed : styles.recommendationsYellow 
    },
      React.createElement(ReactPDF.Text, { 
        style: !hasConcerns ? styles.recommendationsTitleGreen :
               isHealthType ? styles.recommendationsTitleRed : styles.recommendationsTitleYellow
      },
        !hasConcerns ? 'Recommendations: Continue Monitoring' :
        isHealthType ? 'Recommendations: Actions Needed' : 'Recommendations: Consider Treatment'
      )
    ),
    React.createElement(ReactPDF.Text, { style: styles.recommendationsText },
      !hasConcerns 
        ? `Your ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits. Continue regular testing to maintain water quality.`
        : isHealthType 
        ? 'Some health-related parameters exceed safe limits. We strongly recommend consulting with a water treatment professional. Please see the Next Steps section at the bottom of the report.'
        : 'Some parameters exceed recommended limits. These may affect taste, odor, or water system performance. Please see the Next Steps section at the bottom of the report.'
    )
  );
}

function createPotentialScoreSection(cwqi) {
  if (!cwqi || !cwqi.coliformDetected || !cwqi.potentialScore) return null;
  
  return React.createElement(ReactPDF.View, { style: styles.potentialScoreContainerCWQI },
    React.createElement(ReactPDF.View, { style: styles.potentialScoreBox },
      // Left section - CWQI card style
      React.createElement(ReactPDF.View, { style: styles.potentialScoreLeftCWQI },
        React.createElement(ReactPDF.Text, { style: styles.potentialScoreTitleCWQI }, 'Potential Score'),
        React.createElement(ReactPDF.Text, { style: styles.potentialScoreNumberCWQI }, `+${cwqi.potentialScore}`)
      ),
      
      // Right section - description
      React.createElement(ReactPDF.View, { style: styles.potentialScoreRightCWQI },
        React.createElement(ReactPDF.Text, { style: styles.potentialScoreTextCWQI },
          `Your score could potentially increase to ${cwqi.potentialScore} points after removing the coliforms from your drinking water.`
        )
      )
    )
  );
}

function createRoadSaltAssessment(reportData) {
  // Find chloride parameter
  const allParameters = [...reportData.healthParameters, ...reportData.aoParameters, ...reportData.generalParameters];
  const chlorideParam = allParameters.find(param => 
    param.parameter_name?.toLowerCase().includes('chloride') && 
    !param.parameter_name?.toLowerCase().includes('bromide')
  );

  const chlorideLevel = chlorideParam ? parseFloat(chlorideParam.result_numeric) : 0;
  const hasContamination = chlorideLevel > 100;
  const displayScore = hasContamination ? Math.round(chlorideLevel).toString() : '<100';
  const status = hasContamination ? 'Contamination Detected' : 'No Contamination';

  return React.createElement(ReactPDF.View, { style: styles.cwqiContainer },
    React.createElement(ReactPDF.View, { style: styles.cwqiBox },
      React.createElement(ReactPDF.View, { style: styles.cwqiLeft },
        React.createElement(ReactPDF.Text, { style: styles.cwqiScoreTitle }, 'Road Salt Score'),
        React.createElement(ReactPDF.Text, { style: [styles.cwqiScore, { color: hasContamination ? '#DC2626' : '#059669' }] }, 
          displayScore
        ),
        React.createElement(ReactPDF.Text, { style: [styles.cwqiRating, { color: hasContamination ? '#DC2626' : '#059669' }] }, 
          status
        ),
        React.createElement(ReactPDF.Text, { style: styles.cwqiSummary }, 
          `Chloride: ${chlorideLevel} mg/L`
        )
      ),
      React.createElement(ReactPDF.View, { style: styles.cwqiRight },
        React.createElement(ReactPDF.Text, { style: styles.cwqiDescription },
          'To determine if groundwater is impacted by road salt, two conditions must be met:'
        ),
        React.createElement(ReactPDF.Text, { style: styles.cwqiDescription },
          '1. Chloride Concentration: The chloride level in the water must be greater than 100 mg/L.'
        ),
        React.createElement(ReactPDF.Text, { style: styles.cwqiDescription },
          '2. Chloride-to-Bromide Ratio (Cl:Br): If the chloride level exceeds 100 mg/L, the Cl:Br ratio is calculated. A result greater than 1,000 indicates likely contamination from road salt.'
        )
      )
    ),
    
    // Assessment Result
    React.createElement(ReactPDF.View, { style: hasContamination ? styles.recommendationsRed : styles.recommendationsGreen },
      React.createElement(ReactPDF.Text, { style: styles.recommendationsTitle },
        `Assessment Result: ${hasContamination ? 'Road Salt Impact Detected' : 'No Road Salt Impact'}`
      )
    ),
    React.createElement(ReactPDF.Text, { style: styles.recommendationsText },
      hasContamination 
        ? 'Your water shows signs of road salt contamination. Consider consulting with a water treatment professional about filtration options.'
        : 'Your water does not show signs of road salt contamination. The chloride level is below the threshold that would indicate potential road salt impact.'
    )
  );
}

function createHealthConcernsPage(healthConcerns) {
  if (healthConcerns.length === 0) return null;
  
  return React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
    createSectionTitle('DRINKING WATER QUALITY CONCERNS'),
    
    React.createElement(ReactPDF.Text, { style: styles.concernsTableTitle }, 
      'Health-Related Parameter Concerns'
    ),
    
    // Table Header
    React.createElement(ReactPDF.View, { style: styles.concernsTableHeader },
      React.createElement(ReactPDF.Text, { style: styles.concernsHeaderLeft }, 'Parameter'),
      React.createElement(ReactPDF.Text, { style: styles.concernsHeaderRight }, 'Parameter Details and Health Considerations')
    ),
    
    // Table Rows
    ...healthConcerns.map(param => 
      React.createElement(ReactPDF.View, { style: styles.concernsTableRow },
        React.createElement(ReactPDF.View, { style: styles.concernsLeftColumn },
          React.createElement(ReactPDF.Text, { style: styles.concernsParameterName }, param.parameter_name),
          React.createElement(ReactPDF.Text, { style: styles.concernsObjective }, 
            `Objective: ${param.mac_display_value || 'No Standard'}`
          ),
          React.createElement(ReactPDF.Text, { style: styles.concernsResult }, 
            `Your Result: ${formatLabResult(param)}`
          )
        ),
        React.createElement(ReactPDF.View, { style: styles.concernsRightColumn },
          React.createElement(ReactPDF.Text, { style: styles.concernsDetails },
            param.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.'
          )
        )
      )
    )
  );
}

function createAestheticConcernsPage(aoConcerns) {
  if (aoConcerns.length === 0) return null;
  
  return React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
    createSectionTitle('DRINKING WATER QUALITY CONCERNS'),
    
    React.createElement(ReactPDF.Text, { style: styles.concernsTableTitle }, 
      'Aesthetic & Operational Parameter Concerns'
    ),
    
    // Table Header
    React.createElement(ReactPDF.View, { style: styles.concernsTableHeader },
      React.createElement(ReactPDF.Text, { style: styles.concernsHeaderLeft }, 'Parameter'),
      React.createElement(ReactPDF.Text, { style: styles.concernsHeaderRight }, 'Parameter Details and Health Considerations')
    ),
    
    // Table Rows
    ...aoConcerns.map(param => 
      React.createElement(ReactPDF.View, { style: styles.concernsTableRow },
        React.createElement(ReactPDF.View, { style: styles.concernsLeftColumn },
          React.createElement(ReactPDF.Text, { style: styles.concernsParameterName }, param.parameter_name),
          React.createElement(ReactPDF.Text, { style: styles.concernsObjective }, 
            `Objective: ${param.ao_display_value || 'No Standard'}`
          ),
          React.createElement(ReactPDF.Text, { style: styles.concernsResult }, 
            `Your Result: ${formatLabResult(param)}`
          )
        ),
        React.createElement(ReactPDF.View, { style: styles.concernsRightColumn },
          React.createElement(ReactPDF.Text, { style: styles.concernsDetails },
            param.aesthetic_considerations || param.description || param.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.'
          )
        )
      )
    )
  );
}

function createParametersTable(parameters, type) {
  const isHealth = type === 'health';
  
  return React.createElement(ReactPDF.View, { style: styles.table },
    // Table header
    React.createElement(ReactPDF.View, { style: styles.tableHeader },
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '35%' }] }, 'Parameter'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '13%' }] }, 'Unit'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '18%' }] }, 'Objective'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '16%' }] }, 'Result'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '18%' }] }, 'Status')
    ),
    
    // Table rows
    ...parameters.map((param, index) => {
      const isExceeded = isHealth 
        ? param.compliance_status === 'EXCEEDS_MAC'
        : param.compliance_status === 'EXCEEDS_AO' || 
          (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
      
      return React.createElement(ReactPDF.View, { 
        style: [styles.tableRow, isExceeded ? styles.exceededRow : null, index % 2 === 1 ? styles.tableRowEven : null] 
      },
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '35%' }] }, param.parameter_name),
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '13%' }] }, param.result_units || 'N/A'),
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '18%' }] }, 
          isHealth ? (param.mac_display_value || 'No Standard') : (param.ao_display_value || 'No Standard')
        ),
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '16%' }] }, formatLabResult(param)),
        React.createElement(ReactPDF.Text, { 
          style: [styles.tableCell, { width: '18%' }, isExceeded ? styles.statusFail : styles.statusPass] 
        }, isExceeded ? 'Exceeds Limit' : 'Within Limit')
      );
    })
  );
}

function createGeneralParametersTable(parameters) {
  return React.createElement(ReactPDF.View, { style: [styles.table, { width: '70%', alignSelf: 'center' }] },
    // Table header
    React.createElement(ReactPDF.View, { style: styles.tableHeader },
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '50%' }] }, 'Parameter'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '30%' }] }, 'Result'),
      React.createElement(ReactPDF.Text, { style: [styles.tableHeaderCell, { width: '20%' }] }, 'Unit')
    ),
    
    // Table rows
    ...parameters.map((param, index) => 
      React.createElement(ReactPDF.View, { 
        style: [styles.tableRow, index % 2 === 1 ? styles.tableRowEven : null] 
      },
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '50%' }] }, param.parameter_name),
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '30%' }] }, formatLabResult(param)),
        React.createElement(ReactPDF.Text, { style: [styles.tableCell, { width: '20%' }] }, param.result_units || '')
      )
    )
  );
}

function createNextStepsSection() {
  return React.createElement(ReactPDF.View, { style: styles.nextStepsContainer },
    // Step 1 - more compact
    React.createElement(ReactPDF.View, { style: styles.nextStepItemCompact },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepTextCompact }, 
        'The laboratory results presented in this Drinking Water Quality Report Card should be carefully reviewed by a water treatment expert if treatment is necessary to improve the potability of the drinking water supply. A qualified professional can assess the results, recommend appropriate treatment solutions, and ensure that the water meets established drinking water objectives for safety and quality.'
      )
    ),
    
    // Step 2 with bullet points
    React.createElement(ReactPDF.View, { style: styles.nextStepItemCompact },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.View, { style: { flex: 1 } },
        // Intro text in its own container
        React.createElement(ReactPDF.View, { style: { marginBottom: 25 } },
          React.createElement(ReactPDF.Text, { style: styles.nextStepTextCompact },
            'It is recommended that you test your drinking water quality on an annual basis. Annual testing is important because:'
          )
        ),
        // Bullets in their own container
        React.createElement(ReactPDF.View, { style: { marginTop: 2,marginBottom: 8 } },
          React.createElement(ReactPDF.Text, { style: styles.bulletPointCompact },
            '• Water quality can change over time due to weather, nearby construction, agricultural activity, or road salt use.'
          ),
          React.createElement(ReactPDF.Text, { style: styles.bulletPointCompact },
            '• Private wells are not monitored by government agencies, so owners are responsible for ensuring safety.'
          ),
          React.createElement(ReactPDF.Text, { style: styles.bulletPointCompact },
            '• Health risks may be invisible, including bacteria, nitrates, lead, and other contaminants that don\'t affect taste or clarity.'
          ),
          React.createElement(ReactPDF.Text, { style: styles.bulletPointCompact },
            '• Testing annually provides peace of mind and ensures that any problems are detected early—before they become serious health risks.'
          )
        )
      )
    ),
    
    // Step 3 with button
    React.createElement(ReactPDF.View, { style: styles.nextStepWithButtonCompact },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepTextWithButtonCompact }, 
        'If your water test results indicate the presence of Total Coliform or E. coli bacteria, your water may be unsafe to drink. Immediate action is strongly recommended. For your convenience, the steps for addressing bacterial contamination are accessible by clicking the button.'
      ),
      React.createElement(ReactPDF.Link, {
        src: 'https://www.publichealthontario.ca/en/Laboratory-Services/Well-Water-Testing/Well-Disinfection-Tool',
        style: styles.nextStepButtonCompact
      },
        React.createElement(ReactPDF.Text, { style: styles.buttonText }, 
          'CLICK HERE\nTO ACCESS THE WATER\nWELL DISINFECTION\nPROCESS'
        )
      )
    ),
    
    // Step 4 with button
    React.createElement(ReactPDF.View, { style: styles.nextStepWithButtonCompact },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepTextWithButtonCompact }, 
        'If your water test results suggest contamination from road salt, there are important steps you should follow to assess and address the issue. For your convenience, the steps for addressing road salt contamination are accessible by clicking the button.'
      ),
      React.createElement(ReactPDF.Link, {
        src: 'https://www.canadianwatercompliance.ca/blogs/toronto-legionella-disinfecting-bacteria-water-testing-blog/ontario-road-salt-drinking-water-impact',
        style: styles.nextStepButtonCompact
      },
        React.createElement(ReactPDF.Text, { style: styles.buttonText }, 
          'CLICK HERE\nTO ACCESS THE ROAD\nSALT IMPACT PROCESS'
        )
      )
    ),
    
    // Step 5 with button
    React.createElement(ReactPDF.View, { style: styles.nextStepWithButtonCompact },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepTextWithButtonCompact }, 
        'If you have any questions on your drinking water results, please reach out by clicking the button. We will respond to your inquiry within 24-hours.'
      ),
      React.createElement(ReactPDF.Link, {
        src: 'https://www.mywaterquality.ca/contact',
        style: styles.nextStepButtonCompact
      },
        React.createElement(ReactPDF.Text, { style: styles.buttonText }, 
          'CLICK HERE\nTO CONTACT MY WATER\nQUALITY'
        )
      )
    )
  );
}

function getQualityDescription(rating) {
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
}

// Comprehensive React-PDF Styles (integrated from test-report-generation)
const styles = {
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.4
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 15
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#000000'
  },
  logo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1E3A8A'
  },
  logoImage: {
    height: 45,
    width: 'auto'
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 0,
    marginBottom: 35
  },

  // Sample info styles
  sampleInfoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 10
  },
  sampleInfoLeft: {
    width: '50%',
    paddingRight: 20
  },
  sampleInfoRight: {
    width: '50%',
    paddingLeft: 20
  },
  sampleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start'
  },
  sampleLabel: {
    width: '45%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151'
  },
  sampleValue: {
    width: '55%',
    fontSize: 10,
    color: '#1F2937'
  },

  // Section title styles
  sectionTitleContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  sectionTitleBorder: {
    height: 1,
    backgroundColor: '#F97316',
    width: '100%',
    marginVertical: 6
  },
  sectionTitleText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#F97316',
    textAlign: 'center',
    paddingVertical: 6
  },
  subsectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 8
  },

  // Summary cards
  cardContentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10
  },

  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 30
  },
  summaryCard: {
    width: 180,
    height: 120,
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardGreen: {
    borderColor: '#059669'
  },
  cardRed: {
    borderColor: '#DC2626'
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 5
  },
  cardNumber: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginVertical: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex'
  },
  numberGreen: {
    color: '#059669'
  },
  numberRed: {
    color: '#DC2626'
  },
  cardText: {
    fontSize: 9,
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 5
  },

  // Three-card layout styles
  summaryCardsContainerThree: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 15
  },
  summaryCardSmall: {
    width: 150,
    height: 120,
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardTitleSmall: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 5
  },
  cardTextSmall: {
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280'
  },
  cardStatusSmall: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center'
  },
  statusTextGreen: {
    color: '#059669'
  },
  statusTextRed: {
    color: '#DC2626'
  },

  // Perfect water and alert boxes
  perfectWaterBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center'
  },
  perfectWaterTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center'
  },
  perfectWaterText: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 1.4
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 15,
    marginVertical: 20
  },
  alertTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    marginBottom: 8
  },
  alertText: {
    fontSize: 10,
    color: '#1F2937',
    lineHeight: 1.4
  },
  alertTitleHighlight: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    backgroundColor: '#FFFF00',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 8
  },
  alertSubTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4
  },

  // Results explanation box
  resultsExplanationBox: {
    backgroundColor: '#EBF8FF',
    borderWidth: 3,
    borderColor: '#3182CE',
    borderRadius: 10,
    padding: 20,
    marginBottom: 25,
    marginTop: 15
  },
  resultsExplanationTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1A365D',
    marginBottom: 12
  },
  resultsExplanationTextBold: {
    fontSize: 12,
    color: '#2D3748',
    lineHeight: 1.4,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold'
  },
  resultsExplanationText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 1.4,
    marginBottom: 8
  },

  // CWQI section styles
  cwqiContainer: {
    marginVertical: 15
  },
  cwqiBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    minHeight: 140
  },
  cwqiLeft: {
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 15
  },
  cwqiRight: {
    width: '65%',
    paddingLeft: 15,
    justifyContent: 'center'
  },
  cwqiScoreTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8
  },
  cwqiScore: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 12
  },
  cwqiRating: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 10
  },
  cwqiSummary: {
    fontSize: 9,
    textAlign: 'center',
    color: '#6B7280'
  },
  cwqiDescription: {
    fontSize: 10,
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 1.4
  },
  cwqiGreenText: {
    fontSize: 10,
    color: '#059669',
    marginTop: 5,
    lineHeight: 1.4
  },
  cwqiDescriptionBold: {
    fontSize: 10,
    color: '#1F2937',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.4,
    marginBottom: 6
  },
  cwqiDescriptionRegular: {
    fontSize: 10,
    color: '#1F2937',
    lineHeight: 1.4,
    marginBottom: 8
  },
  cwqiBacteriaText: {
    fontSize: 10,
    color: '#DC2626',
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 1.4
  },

  // Recommendations
  recommendationsGreen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    marginTop: 8
  },
  recommendationsRed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    marginTop: 8
  },
  recommendationsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#059669'
  },
  recommendationsTitleGreen: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#059669'
  },
  recommendationsTitleRed: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#DC2626'
  },
  recommendationsText: {
    fontSize: 10,
    color: '#374151',
    marginTop: 8,
    lineHeight: 1.4
  },
  recommendationsYellow: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    marginTop: 8
  },
  recommendationsTitleYellow: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#F59E0B'
  },

  // Table styles
  table: {
    marginTop: 8,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8
  },
  tableHeaderCell: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 4
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    minHeight: 25,
    backgroundColor: '#FFFFFF'
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF'
  },
  exceededRow: {
    backgroundColor: '#FEF2F2'
  },
  tableCell: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 4,
    alignSelf: 'center'
  },
  statusPass: {
    color: '#059669',
    fontFamily: 'Helvetica-Bold'
  },
  statusFail: {
    color: '#DC2626',
    fontFamily: 'Helvetica-Bold'
  },

  // Potential score styles
  potentialScoreContainerCWQI: {
    marginTop: 10,
    marginBottom: 20
  },
  potentialScoreBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    minHeight: 90,
    alignItems: 'center'
  },
  potentialScoreLeftCWQI: {
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 15,
    height: '100%'
  },
  potentialScoreRightCWQI: {
    width: '65%',
    paddingLeft: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: '100%'
  },
  potentialScoreTitleCWQI: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4
  },
  potentialScoreNumberCWQI: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    textAlign: 'center',
    paddingBottom: 12,
  },
  potentialScoreTextCWQI: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
    textAlign: 'left'
  },

  // Concerns table styles
  concernsTableTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    marginTop: 10,
    marginBottom: 15
  },
  concernsTableHeader: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#1F2937',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15
  },
  concernsHeaderLeft: {
    width: '35%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    textAlign: 'center'
  },
  concernsHeaderRight: {
    width: '65%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    textAlign: 'center'
  },
  concernsTableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100
  },
  concernsLeftColumn: {
    width: '35%',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'flex-start'
  },
  concernsRightColumn: {
    width: '65%',
    padding: 15,
    justifyContent: 'flex-start'
  },
  concernsParameterName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 1.3
  },
  concernsObjective: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold'
  },
  concernsResult: {
    fontSize: 10,
    color: '#DC2626',
    fontFamily: 'Helvetica-Bold'
  },
  concernsDetails: {
    fontSize: 10,
    color: '#1F2937',
    lineHeight: 1.5,
    textAlign: 'justify'
  },

  // Next steps styles
  nextStepItemCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingRight: 15
  },
  nextStepWithButtonCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingRight: 10
  },
  nextStepTextCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    paddingRight: 15,
    flex: 1
  },
  nextStepTextWithButtonCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    flex: 1,
    marginRight: 15,
    maxWidth: '65%'
  },
  bulletPointCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginTop: 5,
    paddingRight: 15,
    paddingLeft: 10
  },
  nextStepButtonCompact: {
    backgroundColor: '#1E3A8A',
    borderRadius: 6,
    padding: 10,
    minWidth: 120,
    maxWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    textDecoration: 'none'
  },
  nextStepsContainer: {
    marginTop: 20
  },
  checkmark: {
    color: '#059669',
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginRight: 12,
    marginTop: 2,
    width: 15,
    flexShrink: 0
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1.3,
    textDecoration: 'none'
  },

  // Footer styles
  footer: {
    marginTop: 25,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 5,
    lineHeight: 1.4
  }
};

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

  // Calculate CWQI scores using enhanced calculations
  const healthCWQI = calculateCCMEWQI(healthParameters);
  const aoCWQI = calculateCCMEWQI(aoParameters);

  // Get sample info from first row - using production values
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

  // Check for coliform detection first - UPDATED LOGIC
const coliformDetected = parameters.some(param => {
  const isColiformParam = (param.parameter_name?.toLowerCase().includes('coliform') || 
                          param.parameter_name?.toLowerCase().includes('e. coli') ||
                          param.parameter_name?.toLowerCase().includes('e.coli'));
  
  if (!isColiformParam) return false;
  
  const hasDetectedInDisplay = param.result_display_value?.includes('Detected');
  const exceedsMAC = param.compliance_status === 'EXCEEDS_MAC';
  
  // NEW: For coliform parameters, any numeric value > 0 indicates contamination
  const numericValue = parseFloat(param.result_numeric);
  const hasNumericContamination = !isNaN(numericValue) && numericValue > 0;
  
  return hasDetectedInDisplay || exceedsMAC || hasNumericContamination;
});

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

// Export functions (these are referenced by test-report-generation)
module.exports = {
  processReportGeneration,
  continueProcessing,
  generateHTMLToPDF,
  processReportData,
  calculateCCMEWQI,
  createReactPDFDocument,
  formatLabResult,
  getCWQIColor,
  getCWQIRating,
  formatDate
};