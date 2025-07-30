// netlify/functions/test-report-generation.cjs
const { createClient } = require('@supabase/supabase-js');
const ReactPDF = require('@react-pdf/renderer');
const React = require('react');

// // Debug imports immediately
// console.log('=== IMPORT CHECK (at file load) ===');
// console.log('ReactPDF type:', typeof ReactPDF);
// console.log('React type:', typeof React);

// if (ReactPDF) {
//   console.log('ReactPDF keys:', Object.keys(ReactPDF));
// } else {
//   console.error('❌ ReactPDF import failed');
// }

// if (React) {
//   console.log('React keys:', Object.keys(React));  
// } else {
//   console.error('❌ React import failed');
// }


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

    // Check if user is admin
    const { data: userRole, error: adminError } = await supabase.rpc('get_user_role', {
      user_uuid: userData.user.id
    });

    if (adminError || !userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { dataMode = 'mock', sampleNumber, customerInfo, testKitInfo } = requestBody;

    if (!sampleNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Sample number is required' })
      };
    }

    log('info', 'Testing report generation', { dataMode, sampleNumber });

    // Generate the test report
    const result = await generateTestReport(supabase, dataMode, sampleNumber, customerInfo, testKitInfo);

    if (!result.success) {
      console.error('Report generation failed:', result.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: result.error 
        })
      };
    }

    // Validate that we have valid PDF data
    if (!result.pdfBase64) {
      console.error('No PDF data generated');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'PDF generation failed - no data produced' 
        })
      };
    }

    // Return PDF as base64
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        pdfBase64: result.pdfBase64,
        filename: result.filename
      })
    };

  } catch (error) {
    log('error', 'Test report generation error', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
};

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

  // Update the generateTestReport function to remove HTML generation and focus on React-PDF:
  async function generateTestReport(supabase, dataMode, sampleNumber, customerInfo, testKitInfo) {
    const requestId = Math.random().toString(36).substring(2, 8);
  
    try {
      log('info', 'Starting test report generation', { requestId, dataMode, sampleNumber });
  
      let testResults;
      let kitInfo;
  
      if (dataMode === 'real') {
        // Use shared data service to fetch real data
        const { fetchReportDataBySampleNumber, createMockDataFromReal } = await import('./utils/reportDataService.mjs');
        
        const realData = await fetchReportDataBySampleNumber(supabase, sampleNumber);
        
        // Create mock version with anonymized customer data
        const mockData = await createMockDataFromReal(supabase, sampleNumber);
        testResults = mockData.rawData;
        kitInfo = mockData.kitInfo;
        
        log('info', 'Using real data (anonymized)', { count: testResults.length, requestId });
      } else {
        // Use existing mock data logic
        const { data: mockResults, error: dataError } = await supabase
          .from('vw_test_results_with_parameters')
          .select('*')
          .eq('sample_number', sampleNumber)
          .order('parameter_name');
  
        if (dataError) {
          throw new Error(`Database error: ${dataError.message}`);
        }
  
        if (!mockResults || mockResults.length === 0) {
          throw new Error(`No test results found for sample number: ${sampleNumber}`);
        }
  
        testResults = mockResults;
        
        // Prepare kit info with defaults for mock data
        kitInfo = {
          customerFirstName: customerInfo?.firstName || 'Valued Customer',
          customerName: `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || 'Customer',
          displayId: customerInfo?.kitCode || 'TEST-001',
          kitCode: customerInfo?.kitCode || 'TEST-001',
          testKitName: testKitInfo?.name || 'Water Test Kit',
          testKitId: testKitInfo?.id || null
        };
        
        log('info', 'Using mock data', { count: testResults.length, requestId });
      }
  
      // Process the data into report format
      const reportData = processReportData(testResults);
      
      if (!reportData) {
        throw new Error('Failed to process test results data');
      }
  
      console.log('About to generate PDF...');
      console.log('ReportData processed successfully');
      
      // Generate PDF buffer using React-PDF
      const pdfBuffer = await generateHTMLToPDF(reportData, sampleNumber, kitInfo);
      
      console.log('PDF generation completed');
      // console.log('Buffer type:', typeof pdfBuffer);
      // console.log('Is buffer:', Buffer.isBuffer(pdfBuffer));
      // console.log('Buffer length:', pdfBuffer?.length);
      
      if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
        throw new Error('Failed to generate PDF buffer - invalid buffer returned');
      }
  
      // Convert buffer to base64 for return
      const pdfBase64 = pdfBuffer.toString('base64');
      // console.log('Base64 conversion completed, length:', pdfBase64.length);
      // console.log('First 50 chars of base64:', pdfBase64.substring(0, 50));
      
      const filename = `Test-Water-Quality-Report-${kitInfo.displayId || kitInfo.kitCode}.pdf`;
  
      log('info', 'Test report generated successfully', { 
        filename, 
        sizeKB: Math.round(pdfBuffer.length / 1024),
        base64Length: pdfBase64.length,
        requestId 
      });
  
      return {
        success: true,
        pdfBase64: pdfBase64,
        filename: filename
      };
  
    } catch (error) {
      log('error', 'Error in generateTestReport', { error: error.message, stack: error.stack, requestId });
      return {
        success: false,
        error: error.message
      };
    }
  }
  

// Copy the HTML generation and PDF processing functions from the main reportGenerator
// function generateHTMLReport(reportData, sampleNumber, kitInfo = {}) {
//     const { 
//       sampleInfo, 
//       healthParameters, 
//       aoParameters,
//       generalParameters, 
//       bacteriological, 
//       healthConcerns, 
//       aoConcerns, 
//       healthCWQI, 
//       aoCWQI 
//     } = reportData;
  
//     // Dynamic kit information based on registration type
//     const customer_first = kitInfo.customerFirstName || "Valued Customer";
//     const customer_name = kitInfo.customerName || "Customer";
//     const order_number = kitInfo.displayId || kitInfo.kitCode || 'N/A'; // Use display_id for regular, kit_code for legacy
//     const sample_description = sampleInfo?.sample_description || "Water Sample";
//     const TEST_KIT = kitInfo.testKitName || "Water Test Kit";
//     const test_kit_display = kitInfo.testKitName || "Water Test Kit";
  
//     // Bacteriological results should be shown for these specific test kit IDs
//     const CITY_WATER_TEST_KIT_ID = 'bf8834dc-b953-41a2-a396-b684c0833c85';
//     const ADVANCED_WATER_TEST_KIT_ID = 'a69fd2ca-232f-458e-a240-7e36f50ffa2b';
//     const showBacteriologicalResults = kitInfo.testKitId === CITY_WATER_TEST_KIT_ID || 
//                                      kitInfo.testKitId === ADVANCED_WATER_TEST_KIT_ID;
  
//     // Check for coliform contamination
//     const hasColiformContamination = bacteriological.some(param => 
//       (param.parameter_name?.toLowerCase().includes('coliform') || 
//        param.parameter_name?.toLowerCase().includes('e. coli')) &&
//       (param.result_display_value?.includes('Detected') || 
//        param.compliance_status === 'EXCEEDS_MAC')
//     );
  
//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Water Quality Report - Sample ${sampleNumber}</title>
//         <meta charset="UTF-8">
//         ${getReportCSS()}
//       </head>
//       <body>
//         <div class="container">
//           <!-- Header -->
//           <div class="header">
//             <div>
//                 <div class="header-title">${customer_first}'s Drinking Water Quality Report Card</div>
//                 <div class="header-subtitle">Order No ${order_number} - ${test_kit_display}</div>
//             </div>
//             <img src="/MWQ-logo-final.png" alt="My Water Quality" style="height: 50px; width: auto;" />
//             </div>
          
//           <!-- Sample Information -->
//         <div class="sample-info-container">
//         <div class="sample-info-table-left">
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label-wide">Name</div>
//             <div class="table-cell-sample-value-narrow">${customer_name}</div>
//         </div>
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label-wide">Collection Date</div>
//             <div class="table-cell-sample-value-narrow">${formatDate(sampleInfo?.collectionDate)}</div>
//         </div>
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label-wide">Received Date</div>
//             <div class="table-cell-sample-value-narrow">${formatDate(sampleInfo?.receivedDate)}</div>
//         </div>
//         </div>
//         <div class="sample-info-table-right">
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label">Test Kit</div>
//             <div class="table-cell-sample-value">${test_kit_display}</div>
//         </div>
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label">Location</div>
//             <div class="table-cell-sample-value">${sampleInfo?.location || 'Not specified'}</div>
//         </div>
//         <div class="table-row-sample">
//             <div class="table-cell-sample-label">Description</div>
//             <div class="table-cell-sample-value">${sample_description}</div>
//         </div>
//         </div>
//     </div>
          
//           <!-- Summary of Results -->
//           <div class="section-title">SNAPSHOTS OF RESULTS</div>
          
//           ${generateSummaryCards(bacteriological, healthConcerns, aoConcerns, showBacteriologicalResults)}

//           <!-- Results Explanation Box - Show when there are concerns but no coliform contamination -->
//             ${(healthConcerns.length > 0 || aoConcerns.length > 0) && !hasColiformContamination ? `
//             <div class="results-explanation-box">
//             <div class="results-explanation-title">
//                 Results Explanation
//             </div>
//             <div class="results-explanation-text-bold">
//                 There are ${healthConcerns.length > 0 && aoConcerns.length > 0 ? 'health-related and aesthetic' : 
//                         healthConcerns.length > 0 ? 'health-related' : 'aesthetic'} concerns.
//             </div>
//             ${healthConcerns.length > 0 ? `
//                 <div class="results-explanation-text">
//                 We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.
//                 </div>
//             ` : ''}
//             ${aoConcerns.length > 0 ? `
//                 <div class="results-explanation-text">
//                 While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.
//                 </div>
//             ` : ''}
//             <div class="results-explanation-text">
//                 Please refer to the Recommendations tables in the report for actions you can take to improve water quality.
//             </div>
//             </div>
//             ` : ''}
          
//           <!-- Perfect Water Message -->
//           ${healthCWQI?.score === 100 && aoCWQI?.score === 100 ? `
//           <div class="perfect-water-box">
//             <div class="perfect-water-title">Your water shows no concerns!</div>
//             <div class="perfect-water-text">
//               Congratulations! Your water quality results are excellent across all tested parameters. 
//               This indicates that your water source is well-maintained and meets all health and aesthetic standards.
//             </div>
//           </div>
//           ` : ''}
          
//           <!-- Coliform Warning -->
//           ${hasColiformContamination ? `
//           <div class="alert-box-contamination">
//             <div class="alert-icon-container">
//               <div class="alert-icon">⚠</div>
//             </div>
//             <div class="alert-content-container">
//               <div class="alert-text-bold">
//                 Bacteriological Results - Important Notice: Coliform Bacteria Detected
//               </div>
//               <div class="alert-text-contamination" style="margin-top: 6px;">
//                 Coliform bacteria have been detected in your drinking water sample. Immediate action is recommended.
//               </div>
//               <div class="alert-text-bold" style="margin-top: 8px;">
//                 Disinfect Your Well System:
//               </div>
//               <div class="alert-text-contamination" style="margin-top: 4px;">
//                 Contact a licensed water well contractor to inspect and disinfect your well, or follow Health Canada guidelines.
//               </div>
//             </div>
//           </div>
//           ` : ''}
          
//         <!-- PAGE BREAK before Health Parameters -->
//         <div class="page-break"></div>


//           <!-- Health Parameters -->

//         <div class="section-title">YOUR DRINKING WATER QUALITY HEALTH SCORE</div>

//           ${healthCWQI ? `
//           <div class="subsection-title">Health Related Parameters</div>
//           ${generateParametersSection(healthCWQI, healthConcerns, 'health', 'Health Related Parameters')}
//           ` : ''}

//           <!-- Dynamic spacing based on coliform presence -->
//             ${hasColiformContamination ? `
//             <div class="cwqi-spacing-with-coliform"></div>
//             ` : `
//             <div class="cwqi-spacing-normal"></div>
//             `}

          
//           <!-- AO Parameters -->


//           ${aoCWQI ? `
//           <div class="subsection-title">Aesthetic and Operational Parameters</div>
//           ${generateParametersSection(aoCWQI, aoConcerns, 'ao', 'Aesthetic and Operational Parameters')}
//           ` : ''}

//         <!-- DRINKING WATER QUALITY CONCERNS - Only show if there are concerns -->
//             ${(healthConcerns.length > 0 || aoConcerns.length > 0) ? `
//             <!-- PAGE BREAK before Concerns -->
//             <div class="page-break"></div>

//             <!-- Drinking Water Quality Concerns Section -->
//             <div class="section-title">DRINKING WATER QUALITY CONCERNS</div>

//             ${healthConcerns.length > 0 ? `
//             <div class="concerns-table-title">Health-Related Parameter Concerns</div>

//             <!-- Add column headers -->
//                 <div class="concerns-table-header">
//                 <div class="concerns-header-left">Parameter</div>
//                 <div class="concerns-header-right">Parameter Details and Health Considerations</div>
//                 </div>

//             <div class="concerns-table-container">
//             ${healthConcerns.map(param => `
//                 <div class="concerns-table-row">
//                 <div class="concerns-left-column">
//                     <div class="concerns-parameter-name">${param.parameter_name}</div>
//                     <div class="concerns-objective">Objective: ${param.mac_display_value || param.mac_display || 'No Standard'}</div>
//                     <div class="concerns-result">Your Result: ${formatLabResult(param)}</div>
//                 </div>
//                 <div class="concerns-right-column">
//                     <div class="concerns-details">
//                     ${param.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.'}
//                     </div>
//                 </div>
//                 </div>
//             `).join('')}
//             </div>
//             ` : ''}

//             ${aoConcerns.length > 0 ? `
//             <div class="concerns-table-title">Aesthetic and Operational Parameter Concerns</div>

//             <!-- Add column headers -->
//             <div class="concerns-table-header">
//             <div class="concerns-header-left">Parameter</div>
//             <div class="concerns-header-right">Parameter Details and Health Considerations</div>
//             </div>

//             <div class="concerns-table-container">
//             ${aoConcerns.map(param => `
//                 <div class="concerns-table-row">
//                 <div class="concerns-left-column">
//                     <div class="concerns-parameter-name">${param.parameter_name}</div>
//                     <div class="concerns-objective">Objective: ${param.ao_display_value || param.ao_display || 'No Standard'}</div>
//                     <div class="concerns-result">Your Result: ${formatLabResult(param)}</div>
//                 </div>
//                 <div class="concerns-right-column">
//                     <div class="concerns-details">
//                     ${param.aesthetic_considerations || param.description || param.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.'}
//                     </div>
//                 </div>
//                 </div>
//             `).join('')}
//             </div>
//             ` : ''}

//             ` : ''}

//          <!-- PAGE BREAK before Full Results -->
//             <div class="page-break"></div>
          
//           <!-- Health-Related Results Tables -->

//           <div class="section-title">DRINKING WATER QUALITY: HEALTH-RELATED RESULTS</div>

          
//           ${healthParameters.length > 0 ? `
//           <table>
//             <thead>
//               <tr>
//                 <th style="width: 35%;">Parameter</th>
//                 <th style="width: 10%;">Unit</th>
//                 <th style="width: 25%;">Objective</th>
//                 <th style="width: 15%;">Result</th>
//                 <th style="width: 15%;">Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${healthParameters.map(param => {
//                 const isExceeded = param.compliance_status === 'EXCEEDS_MAC';
//                 return `
//                   <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
//                     <td class="parameter-name">${param.parameter_name}</td>
//                     <td style="text-align: center;">${param.result_units || param.parameter_unit || 'N/A'}</td>
//                     <td style="text-align: center;">${param.mac_display_value || param.mac_display || 'No Standard'}</td>
//                     <td style="text-align: center;">${formatLabResult(param)}</td>
//                     <td class="${isExceeded ? 'status-fail' : 'status-pass'}" style="text-align: center;">
//                       ${isExceeded ? 'Exceeds Limit' : 'Within Limit'}
//                     </td>
//                   </tr>
//                 `;
//               }).join('')}
//             </tbody>
//           </table>
//           ` : ''}

//           <!-- PAGE BREAK between health and AO parameters -->
//             <div class="page-break"></div>

//             <div class="section-title">DRINKING WATER QUALITY: AESTHETIC/OPERATIONAL-RELATED RESULTS</div>
          
//           ${aoParameters.length > 0 ? `
//           <table>
//             <thead>
//               <tr>
//                 <th style="width: 35%;">Parameter</th>
//                 <th style="width: 10%;">Unit</th>
//                 <th style="width: 25%;">Objective</th>
//                 <th style="width: 15%;">Result</th>
//                 <th style="width: 15%;">Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${aoParameters.map(param => {
//                 const isExceeded = param.compliance_status === 'EXCEEDS_AO' || 
//                   (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
//                 return `
//                   <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
//                     <td class="parameter-name">${param.parameter_name}</td>
//                     <td style="text-align: center;">${param.result_units || param.parameter_unit || 'N/A'}</td>
//                     <td style="text-align: center;">${param.ao_display_value || param.ao_display || 'No Standard'}</td>
//                     <td style="text-align: center;">${formatLabResult(param)}</td>
//                     <td class="${isExceeded ? 'status-fail' : 'status-pass'}" style="text-align: center;">
//                       ${isExceeded ? 'Exceeds Limit' : 'Within Limit'}
//                     </td>
//                   </tr>
//                 `;
//               }).join('')}
//             </tbody>
//           </table>
//           ` : ''}

//           <!-- PAGE BREAK between AO and general parameters -->
//             <div class="page-break"></div>

//             <div class="section-title">DRINKING WATER QUALITY: GENERAL RESULTS</div>
          
//           ${generalParameters.length > 0 ? `
//           <table style="max-width: 600px; margin: 0 auto;">
//             <thead>
//               <tr>
//                 <th style="width: 50%;">Parameter</th>
//                 <th style="width: 30%;">Result</th>
//                 <th style="width: 20%;">Unit</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${generalParameters.map(param => `
//                 <tr>
//                   <td class="parameter-name">${param.parameter_name}</td>
//                   <td style="text-align: center;">${formatLabResult(param)}</td>
//                   <td style="text-align: center;">${param.result_units || param.parameter_unit || ''}</td>
//                 </tr>
//               `).join('')}
//             </tbody>
//           </table>
//           ` : ''}

//           <!-- PAGE BREAK before Next Steps -->
//         <div class="page-break"></div>

//         <!-- Next Steps Section -->
//         <div class="section-title">NEXT STEPS</div>

//         <div class="next-steps-content">
//         <div class="next-steps-item">
//             <span class="checkmark">✓</span>
//             <span class="next-steps-text">The laboratory results presented in this Drinking Water Quality Report Card should be carefully reviewed by a water treatment expert if treatment is necessary to improve the potability of the drinking water supply. A qualified professional can assess the results, recommend appropriate treatment solutions, and ensure that the water meets established drinking water objectives for safety and quality.</span>
//         </div>

//         <div class="next-steps-item">
//             <span class="checkmark">✓</span>
//             <div class="next-steps-text">
//             <div>It is recommended that you test your drinking water quality on an annual basis. Annual testing is important because:</div>
//             <ul class="next-steps-list">
//                 <li>Water quality can change over time due to weather, nearby construction, agricultural activity, or road salt use.</li>
//                 <li>Private wells are not monitored by government agencies, so owners are responsible for ensuring safety.</li>
//                 <li>Health risks may be invisible, including bacteria, nitrates, lead, and other contaminants that don't affect taste or clarity.</li>
//                 <li>Testing annually provides peace of mind and ensures that any problems are detected early—before they become serious health risks.</li>
//             </ul>
//             </div>
//         </div>

//         <div class="next-steps-item">
//             <span class="checkmark">✓</span>
//             <span class="next-steps-text">If your water test results indicate the presence of Total Coliform or E. coli bacteria, your water may be unsafe to drink. Immediate action is strongly recommended. For your convenience, the steps for addressing bacterial contamination are accessible by clicking the <strong>Water Well Disinfection Process</strong> Button.</span>
//         </div>

//         <div class="next-steps-item">
//             <span class="checkmark">✓</span>
//             <span class="next-steps-text">If your water test results suggest contamination from road salt, there are important steps you should follow to assess and address the issue. For your convenience, the steps for addressing road salt contamination are accessible by clicking the <strong>Addressing Road Salt Impacts</strong> Button.</span>
//         </div>

//         <div class="next-steps-item">
//             <span class="checkmark">✓</span>
//             <span class="next-steps-text">If you have any questions on your drinking water results, please reach out by clicking <strong>Contact My Water Quality</strong>. We will respond to your inquiry within 24-hours.</span>
//         </div>
//         </div>
          
//           <!-- Footer -->
//           <div class="footer">
//             <p>This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.</p>
//             <p style="margin-top: 10px;">Report generated on ${new Date().toLocaleDateString()} | My Water Quality</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;
//   }

// Add the CSS function (copy from your existing reportGenerator)
// const getReportCSS = () => {
//     return `
//       <style>
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         body { 
//           font-family: 'Helvetica', Arial, sans-serif; 
//           line-height: 1.6; 
//           color: #1f2937;
//           background: white;
//           font-size: 12px;
//         }
//         .container { max-width: 800px; margin: 0 auto; padding: 30px; }
        
//         /* Header */
//         .header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 15px;
//           padding: 15px;
//           border-bottom: 2px solid #e5e7eb;
//         }
//         .header-title { font-size: 18px; font-weight: bold; color: #000000; }
//         .header-subtitle { font-size: 12px; margin-top: 5px; color: #000000; }
//         .logo { font-size: 14px; font-weight: bold; color: #2563eb; }
        
//         /* Sample Info */
//         .sample-info-container { display: flex; margin-bottom: 15px; gap: 15px; margin-top: 20px; }

//         .sample-info-table-left {
//         width: 50%;
//         }

//         .sample-info-table-right {
//         width: 50%;
//         }
//         .table-row-sample { display: flex; padding: 8px 0; }
//         .table-row-sample:last-child { border-bottom: none; }
//         .table-cell-sample-label-wide {
//             width: 55%; /* Increased width for left side labels */
//             font-size: 11px;
//             font-weight: bold;
//             color: #374151;
//             padding-right: 8px;
//             text-align: left;
//             vertical-align: top;
//             }

//             .table-cell-sample-value-narrow {
//             width: 45%; /* Decreased width for left side values */
//             font-size: 12px;
//             color: #1F2937;
//             text-align: left;
//             vertical-align: top;
//             }

//             .table-cell-sample-label {
//             width: 45%; /* Keep original width for right side */
//             font-size: 11px;
//             font-weight: bold;
//             color: #374151;
//             padding-right: 8px;
//             text-align: left;
//             vertical-align: top;
//             }

//             .table-cell-sample-value {
//             width: 55%; /* Keep original width for right side */
//             font-size: 12px;
//             color: #1F2937;
//             text-align: left;
//             vertical-align: top;
//             }
        
//         /* Sections */
//         .section-title {
//         font-size: 18px; 
//         font-weight: bold; 
//         margin-top: 15px; 
//         margin-bottom: 8px;
//         background-color: #FFFFFF; /* Changed from #2563EB to white */
//         color: #F97316; /* Changed from white to orange */
//         padding: 10px; 
//         margin-left: -10px; 
//         margin-right: -10px;
//         text-align: center; /* Added for centered text */
//         border-top: 1px solid #F97316; /* Added orange top border */
//         border-bottom: 1px solid #F97316; /* Added orange bottom border */
//         }
//         .subsection-title { font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 15px; color: #374151; }
        
//         /* Summary Cards */
//         .summary-cards-container { display: flex; gap: 20px; margin: 20px 0; }
//         .summary-cards-container-two-cards { display: flex; margin-bottom: 20px; gap: 20px; justify-content: center; }
//         .summary-card {
//           flex: 1; background: white; border-radius: 8px; padding: 20px; text-align: center;
//           min-height: 120px; display: flex; flex-direction: column; justify-content: space-between;
//         }
//         .summary-card-green { border: 2px solid #059669; }
//         .summary-card-red { border: 2px solid #DC2626; }
//         .summary-card-title { font-size: 14px; font-weight: bold; color: #374151; line-height: 1.3; }
//         .summary-card-content { flex: 1; display: flex; justify-content: center; align-items: center; padding: 10px 0; }
//         .summary-card-number { font-size: 32px; font-weight: bold; text-align: center; }
//         .summary-card-number-green { color: #059669; }
//         .summary-card-number-red { color: #DC2626; }
//         .summary-card-status-green { color: #059669; font-size: 14px; font-weight: bold; }
//         .summary-card-status-red { color: #DC2626; font-size: 14px; font-weight: bold; }
//         .summary-card-text { font-size: 12px; text-align: center; color: #6B7280; }
        
//         /* CWQI */
//         .parameters-unified-container {
//           background-color: #FFFFFF; border: 2px solid #9CA3AF; border-radius: 8px;
//           padding: 15px; margin-bottom: 20px;
//         }
//         .parameters-container { display: flex; gap: 15px; min-height: 180px; }
//         .parameter-cwqi-section { width: 38%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
//         .parameter-text-section { width: 57%; padding: 12px; }
//         .cwqi-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; text-align: center; color: #1F2937; }
//         .cwqi-title-current { font-size: 12px; font-weight: bold; color: #1F2937; text-align: center; margin-bottom: 12px; }
//         .cwqi-score { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 5px; }
//         .cwqi-rating { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 10px; }
//         .cwqi-bar { height: 12px; background-color: #E5E7EB; border-radius: 6px; margin-bottom: 8px; overflow: hidden; }
//         .cwqi-bar-fill { height: 12px; border-radius: 6px; transition: width 0.3s ease; }
//         .cwqi-summary { font-size: 12px; text-align: center; color: #6B7280; }
//         .quality-statement { font-size: 12px; color: #1F2937; margin-bottom: 12px; line-height: 1.4; }
//         .quality-level { font-weight: bold; }
        
//         /* Parameters List */
//         .parameters-list { margin-top: 12px; }
//         .parameters-list-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 6px; }
//         .parameters-list-item { font-size: 12px; margin-bottom: 3px; }
        
//         /* Recommendations */
//         .recommendations-section { margin-top: 10px; margin-bottom: 8px; }
//         .recommendations-header-health {
//           font-size: 12px; font-weight: bold; color: #DC2626; margin-bottom: 8px;
//           background-color: #FEF2F2; padding: 8px; border-radius: 4px; border: 1px solid #FECACA;
//         }
//         .recommendations-header-ao {
//           font-size: 12px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;
//           background-color: #FFFBEB; padding: 8px; border-radius: 4px; border: 1px solid #FED7AA;
//         }
//         .recommendations-header-green {
//           font-size: 12px; font-weight: bold; color: #059669; margin-bottom: 8px;
//           background-color: #F0FDF4; padding: 8px; border-radius: 4px; border: 1px solid #BBF7D0;
//         }
//         .recommendations-text { font-size: 12px; color: #374151; line-height: 1.4; margin-bottom: 12px; }
        
//         /* Potential Score */
//         .potential-score-container {
//           display: flex; align-items: center; background-color: #FFFFFF; border: 1px solid #D1D5DB;
//           border-radius: 8px; padding: 12px; margin-top: 8px; margin-bottom: 20px;
//         }
//         .potential-score-left { display: flex; flex-direction: column; align-items: center; margin-right: 16px; min-width: 100px; }
//         .potential-score-number { font-size: 24px; font-weight: bold; color: #059669; text-align: center; }
//         .cwqi-title-potential { font-size: 12px; font-weight: bold; color: #6B7280; text-align: center; margin-bottom: 4px; }
//         .potential-score-text { font-size: 12px; color: #374151; line-height: 1.4; flex: 1; }
        
//         /* Alerts */
//         .alert-box-contamination {
//           display: flex; padding: 12px; margin-bottom: 15px; border-radius: 5px;
//           background-color: #FEF2F2; border: 2px solid #DC2626; align-items: flex-start;
//         }
//         .alert-icon-container { margin-right: 10px; margin-top: 2px; }
//         .alert-icon { font-size: 16px; color: #DC2626; font-weight: bold; }
//         .alert-content-container { flex: 1; }
//         .alert-text-contamination { font-size: 12px; color: #1F2937; line-height: 1.4; }
//         .alert-text-bold { font-size: 14px; color: #1F2937; line-height: 1.4; font-weight: bold; }
        
//         /* Perfect Water */
//         .perfect-water-box {
//           background-color: #FFFFFF; border: 2px solid #059669; border-radius: 8px;
//           padding: 15px; margin-bottom: 20px; margin-top: 10px;
//         }
//         .perfect-water-title { font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px; text-align: center; }
//         .perfect-water-text { font-size: 12px; color: #374151; line-height: 1.4; text-align: center; }
        
//        /* Full Results Tables */
//         table { 
//         width: 100%; 
//         border-collapse: collapse; 
//         margin: 15px 0; 
//         font-size: 12px; /* Increased from 9px */
//         }

//         th, td { 
//         border-top: 1px solid #e5e7eb;
//         border-bottom: 1px solid #e5e7eb;
//         /* Removed border-left and border-right for no vertical lines */
//         padding: 8px 6px; 
//         text-align: center; /* Changed from left to center */
//         vertical-align: middle; /* Changed from top to middle */
//         }

//         th { 
//         background-color: #FFFFFF; /* Changed from #f9fafb to white */
//         font-weight: bold; 
//         color: #000000; /* Changed from #374151 to black */
//         font-size: 12px; /* Increased from 8px and removed text-transform: uppercase */
//         }
//         .exceeded-row { background-color: #fef2f2; }
//         .parameter-name { font-size: 12px; }
//         .status-pass { color: #059669; font-weight: bold; }
//         .status-fail { color: #dc2626; font-weight: bold; }
        
//         /* General */
//         .recommendations { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin: 15px 0; }
//         .recommendations-title { font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
//         .recommendations-content { font-size: 12px; color: #374151; line-height: 1.5; }
//         .page-break { page-break-before: always; }
//         .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9px; }
        
//         // Page Break
//         .page-break { 
//             page-break-before: always; 
//             }
        
//         // Results Explanations
//         .results-explanation-box {
//             background-color: #FFFFFF;
//             border: 1px solid #D1D5DB;
//             border-radius: 8px;
//             padding: 15px;
//             margin-bottom: 20px;
//             margin-top: 10px;
//             }

//             .results-explanation-title {
//             font-size: 14px;
//             font-weight: bold;
//             color: #1F2937;
//             margin-bottom: 12px;
//             }

//             .results-explanation-text-bold {
//             font-size: 12px;
//             color: #1F2937;
//             line-height: 1.4;
//             margin-bottom: 8px;
//             font-weight: bold;
//             }

//             .results-explanation-text {
//             font-size: 12px;
//             color: #374151;
//             line-height: 1.4;
//             margin-bottom: 8px;
//             }
        
//         // Next Steps Section

//         .next-steps-content {
//             margin-top: 20px;
//             }

//             .next-steps-item {
//             display: flex;
//             align-items: flex-start;
//             margin-bottom: 20px;
//             padding: 0;
//             }

//             .checkmark {
//             color: #059669;
//             font-weight: bold;
//             font-size: 14px;
//             margin-right: 12px;
//             margin-top: 2px;
//             flex-shrink: 0;
//             }

//             .next-steps-text {
//             font-size: 12px;
//             color: #374151;
//             line-height: 1.5;
//             text-align: justify;
//             }

//             .next-steps-list {
//             margin-top: 8px;
//             margin-left: 20px;
//             margin-bottom: 0;
//             }

//             .next-steps-list li {
//             margin-bottom: 6px;
//             font-size: 12px;
//             color: #374151;
//             line-height: 1.5;
//             }
        
//         /* Drinking Water Quality Concerns Styling */

//             .concerns-table-header {
//             display: flex;
//             border-top: 2px solid #1F2937;
//             border-bottom: 2px solid #1F2937;
//             background-color: #FFFFFF;
//             font-weight: bold;
//             }

//             .concerns-header-left {
//             width: 35%;
//             padding: 12px 15px;
//             border-right: 1px solid #E5E7EB;
//             font-size: 12px;
//             color: #1F2937;
//             text-align: center;
//             }

//             .concerns-header-right {
//             width: 65%;
//             padding: 12px 15px;
//             font-size: 12px;
//             color: #1F2937;
//             text-align: center;
//             }
//             .concerns-table-title {
//             font-size: 16px;
//             font-weight: bold;
//             color: #1F2937;
//             margin-top: 20px;
//             margin-bottom: 15px;
//             text-align: left;
//             }

//             .concerns-table-container {
//             margin-bottom: 30px;
//             }

//             .concerns-table-row {
//             display: flex;
//             border-top: 1px solid #E5E7EB;
//             border-bottom: 1px solid #E5E7EB;
//             min-height: 120px;
//             page-break-inside: avoid;
//             }

//             .concerns-left-column {
//             width: 35%;
//             padding: 15px;
//             border-right: 1px solid #E5E7EB;
//             display: flex;
//             flex-direction: column;
//             justify-content: flex-start;
//             background-color: #FFFFFF;
//             }

//             .concerns-right-column {
//             width: 65%;
//             padding: 15px;
//             display: flex;
//             align-items: flex-start;
//             }

//             .concerns-parameter-name {
//             font-size: 14px;
//             font-weight: bold;
//             color: #1F2937;
//             margin-bottom: 8px;
//             line-height: 1.3;
//             }

//             .concerns-objective {
//             font-size: 12px;
//             color: #374151;
//             margin-bottom: 6px;
//             font-weight: bold;
//             }

//             .concerns-result {
//             font-size: 12px;
//             color: #DC2626;
//             font-weight: bold;
//             }

//             .concerns-details {
//             font-size: 12px;
//             color: #1F2937;
//             line-height: 1.5;
//             text-align: justify;
//             }
        
//         /* Potential Score Styling */
//             .potential-score-container {
//             display: flex;
//             align-items: center;
//             background-color: #FFFFFF;
//             border: 1px solid #D1D5DB;
//             border-radius: 8px;
//             padding: 15px;
//             margin-top: 10px;
//             margin-bottom: 20px;
//             }

//             .potential-score-left {
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             margin-right: 20px;
//             min-width: 120px;
//             }

//             .potential-score-title {
//             font-size: 12px;
//             font-weight: bold;
//             color: #6B7280;
//             text-align: center;
//             margin-bottom: 6px;
//             }

//             .potential-score-number {
//             font-size: 28px;
//             font-weight: bold;
//             color: #059669;
//             text-align: center;
//             }

//             .potential-score-text {
//             font-size: 12px;
//             color: #374151;
//             line-height: 1.4;
//             flex: 1;
//             text-align: left;
//             }
        
//         .cwqi-current-title {
//             font-size: 12px;
//             font-weight: bold;
//             color: #1F2937;
//             text-align: center;
//             margin-bottom: 12px;
//             }
        
//         /* Dynamic spacing between CWQI sections */
//             .cwqi-spacing-normal {
//             height: 200px; /* Large spacing when no coliform/potential score */
//             }

//             .cwqi-spacing-with-coliform {
//             height: 80px; /* Smaller spacing when coliform message and potential score are present */
//             }

//         @media print {
//           .container { padding: 15px; }
//           .section-title { margin: 0 0 15px 0; }
//         }
//       </style>
//     `;
//   };

// Add the summary cards and other component functions
// const generateSummaryCards = (bacteriological, healthConcerns, aoConcerns, showBacteriologicalCard) => {
//     const bacteriologicalExceeded = bacteriological.some(param => {
//       if (param.result_display_value?.includes('Detected')) {
//         return true;
//       }
//       if (param.parameter_category === 'health') {
//         return param.compliance_status === 'EXCEEDS_MAC';
//       } else if (param.parameter_category === 'ao') {
//         return param.compliance_status === 'EXCEEDS_AO' || 
//                (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
//       } else {
//         return param.compliance_status === 'FAIL';
//       }
//     });
    
//     const healthConcernsCount = healthConcerns.length;
//     const aoConcernsCount = aoConcerns.length;
  
//     return `
//       <div class="${showBacteriologicalCard ? 'summary-cards-container' : 'summary-cards-container-two-cards'}">
//         ${showBacteriologicalCard ? `
//         <div class="summary-card ${bacteriologicalExceeded ? 'summary-card-red' : 'summary-card-green'}">
//           <div class="summary-card-title">Bacteriological Results</div>
//           <div class="summary-card-content">
//             <div class="${bacteriologicalExceeded ? 'summary-card-status-red' : 'summary-card-status-green'}">
//               ${bacteriologicalExceeded ? 'Coliforms Present' : 'No Coliforms Present'}
//             </div>
//           </div>
//           <div class="summary-card-footer">
//             <div class="summary-card-text">&nbsp;</div>
//           </div>
//         </div>
//         ` : ''}
        
//         <div class="summary-card ${healthConcernsCount > 0 ? 'summary-card-red' : 'summary-card-green'}">
//           <div class="summary-card-title">Health-Related Results</div>
//           <div class="summary-card-content">
//             <div class="summary-card-number ${healthConcernsCount > 0 ? 'summary-card-number-red' : 'summary-card-number-green'}">
//               ${healthConcernsCount}
//             </div>
//           </div>
//           <div class="summary-card-footer">
//             <div class="summary-card-text">concerns present</div>
//           </div>
//         </div>
  
//         <div class="summary-card ${aoConcernsCount > 0 ? 'summary-card-red' : 'summary-card-green'}">
//           <div class="summary-card-title">Aesthetic and Operational</div>
//           <div class="summary-card-content">
//             <div class="summary-card-number ${aoConcernsCount > 0 ? 'summary-card-number-red' : 'summary-card-number-green'}">
//               ${aoConcernsCount}
//             </div>
//           </div>
//           <div class="summary-card-footer">
//             <div class="summary-card-text">concerns present</div>
//           </div>
//         </div>
//       </div>
//     `;
//   };

async function generateHTMLToPDF(reportData, sampleNumber, kitInfo = {}) {
  try {
    console.log('Starting PDF generation with React-PDF...');
    
    // Create the full comprehensive document
    const MyDocument = createReactPDFDocument(reportData, sampleNumber, kitInfo);
    
    console.log('Document created, generating buffer...');
    
    // Use the working Method 1: renderToBuffer
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

// Also, let's update the document creation to use the actual report data once we get buffer working:

function createSimpleReportDocument(reportData, sampleNumber, kitInfo = {}) {
  try {
    console.log('Creating simple report document...');
    
    const customer_name = kitInfo.customerName || "Customer";
    const test_kit_display = kitInfo.testKitName || "Water Test Kit";
    
    const document = React.createElement(ReactPDF.Document, {},
      React.createElement(ReactPDF.Page, { 
        size: 'A4',
        style: {
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          padding: 40,
          fontSize: 12,
          fontFamily: 'Helvetica'
        }
      },
        // Header
        React.createElement(ReactPDF.View, { 
          style: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB'
          } 
        },
          React.createElement(ReactPDF.View, {},
            React.createElement(ReactPDF.Text, { 
              style: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 } 
            }, `${customer_name}'s Water Quality Report`),
            React.createElement(ReactPDF.Text, { 
              style: { fontSize: 11 } 
            }, `Sample: ${sampleNumber}`)
          ),
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 14, fontWeight: 'bold', color: '#1E3A8A' } 
          }, 'MY WATER QUALITY')
        ),
        
        // Sample info
        React.createElement(ReactPDF.View, { 
          style: { marginBottom: 20 } 
        },
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 12, marginBottom: 5 } 
          }, `Customer: ${customer_name}`),
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 12, marginBottom: 5 } 
          }, `Test Kit: ${test_kit_display}`),
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 12 } 
          }, `Generated: ${new Date().toLocaleDateString()}`)
        ),
        
        // Results summary
        React.createElement(ReactPDF.View, { 
          style: { 
            backgroundColor: '#F0FDF4',
            borderWidth: 2,
            borderColor: '#059669',
            borderRadius: 8,
            padding: 20,
            alignItems: 'center'
          } 
        },
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } 
          }, 'Report Generated Successfully'),
          React.createElement(ReactPDF.Text, { 
            style: { fontSize: 12, textAlign: 'center' } 
          }, 'This is a test report to verify React-PDF functionality.')
        )
      )
    );
    
    console.log('Simple report document created successfully');
    return document;
    
  } catch (error) {
    console.error('Error creating simple report document:', error);
    throw error;
  }
}

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

    // Document data
    const customer_first = kitInfo.customerFirstName || "Valued Customer";
    const customer_name = kitInfo.customerName || "Customer";
    const order_number = kitInfo.orderNumber || kitInfo.displayId || kitInfo.kitCode || 'N/A';
    const test_kit_display = kitInfo.testKitName || "Water Test Kit";
    const sample_description = sampleInfo?.sample_description || "Water Sample";
    
    // Check for coliform contamination
    const hasColiformContamination = bacteriological.some(param => 
      (param.parameter_name?.toLowerCase().includes('coliform') || 
       param.parameter_name?.toLowerCase().includes('e. coli')) &&
      (param.result_display_value?.includes('Detected') || 
       param.compliance_status === 'EXCEEDS_MAC')
    );

    const perfectWater = healthCWQI?.score === 100 && aoCWQI?.score === 100;

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

        // Gray separator line - moved immediately after header
        React.createElement(ReactPDF.View, { style: styles.headerSeparator }),

        // Sample Information - spacing adjusted to maintain position
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

        // Summary Cards
        createSummaryCards(healthConcerns, aoConcerns, hasColiformContamination,kitInfo.testKitId === 'a69fd2ca-232f-458e-a240-7e36f50ffa2b'),

        // Perfect Water Message or Coliform Warning
        perfectWater ? createPerfectWaterMessage() : null,
        hasColiformContamination ? createColiformWarning() : null
      ),

      // Page 2 - Health Score
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('YOUR DRINKING WATER QUALITY HEALTH SCORE'),
        // React.createElement(ReactPDF.Text, { style: styles.subsectionTitle }, 'Health Related Parameters'),
        healthCWQI ? createCWQISection(healthCWQI, healthConcerns, 'health') : null,
        healthCWQI ? createPotentialScoreSection(healthCWQI) : null
      ),

      // Page 3 - Aesthetic Score and Road Salt
      React.createElement(ReactPDF.Page, { size: 'A4', style: styles.page },
        createSectionTitle('YOUR DRINKING WATER AESTHETIC & OPERATIONAL SCORE'),
        // React.createElement(ReactPDF.Text, { style: styles.subsectionTitle }, 'Aesthetic and Operational Parameters'),
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
  
  // Update the createSummaryCards function:
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
      
      // Step 2 with bullet points - FINE-TUNED spacing
      React.createElement(ReactPDF.View, { style: styles.nextStepItemCompact },
        React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
        React.createElement(ReactPDF.View, { style: { flex: 1 } },
          // Intro text in its own container with slightly more bottom spacing
          React.createElement(ReactPDF.View, { style: { marginBottom: 25 } }, // Increased from 12 to 15
            React.createElement(ReactPDF.Text, { style: styles.nextStepTextCompact },
              'It is recommended that you test your drinking water quality on an annual basis. Annual testing is important because:'
            )
          ),
          // Bullets in their own container
          React.createElement(ReactPDF.View, { style: { marginTop: 2,marginBottom: 8 } }, // Reduced from 4 to 2
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
      
      // Step 3 with button - more compact
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
      
      // Step 4 with button - more compact
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
      
      // Step 5 with button - more compact
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
  
  function createNextStepItem(text) {
    return React.createElement(ReactPDF.View, { style: styles.nextStepItem },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepText }, text)
    );
  }
  
  function createNextStepWithButton(text, buttonText) {
    return React.createElement(ReactPDF.View, { style: styles.nextStepWithButton },
      React.createElement(ReactPDF.Text, { style: styles.checkmark }, '✓'),
      React.createElement(ReactPDF.Text, { style: styles.nextStepTextWithButton }, text),
      React.createElement(ReactPDF.View, { style: styles.nextStepButton },
        React.createElement(ReactPDF.Text, { style: styles.buttonText }, buttonText)
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

  // Updated React-PDF Styles to match Puppeteer design
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
    marginVertical: 0, // Remove vertical margin for perfect centering
    flex: 1, // Take up available space for vertical centering
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

  // Add these new styles for bacteriological cards and alerts
alertTitleHighlight: {
  fontSize: 11,
  fontFamily: 'Helvetica-Bold',
  color: '#000000',
  backgroundColor: '#FFFF00', // Yellow highlight
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

// Three-card layout styles
summaryCardsContainerThree: {
  flexDirection: 'row',
  justifyContent: 'center',
  marginVertical: 20,
  gap: 15 // Smaller gap for three cards
},
summaryCardSmall: {
  width: 150, // Smaller width for three cards
  height: 120,
  borderRadius: 8,
  padding: 12, // Slightly smaller padding
  borderWidth: 2,
  alignItems: 'center',
  justifyContent: 'space-between'
},
cardTitleSmall: {
  fontSize: 10, // Smaller font for three cards
  fontFamily: 'Helvetica-Bold',
  color: '#374151',
  textAlign: 'center',
  marginBottom: 5
},
cardTextSmall: {
  fontSize: 10, // Smaller text for three cards
  textAlign: 'center',
  color: '#6B7280'
},
cardStatusSmall: {
  fontSize: 12, // Medium size for status text
  fontFamily: 'Helvetica-Bold',
  textAlign: 'center'
},
statusTextGreen: {
  color: '#059669'
},
statusTextRed: {
  color: '#DC2626'
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
  // tableRowEven: {
  //   backgroundColor: '#F9FAFB'
  // },
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

  // Replace all potential score styles with these:
  potentialScoreContainerCWQI: {
    marginTop: 10,
    marginBottom: 20
  },
  // Updated CWQI-style potential score styles for better centering
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
  potentialScoreLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#6B7280'
  },

  // Add to styles object:
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
    marginBottom: 15, // Reduced from previous values
    paddingRight: 15
  },
  nextStepWithButtonCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15, // Reduced spacing
    paddingRight: 10
  },
  nextStepTextCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6, // Tighter line height,
    paddingRight: 15,
    flex: 1
  },
  nextStepTextWithButtonCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    flex: 1,
    marginRight: 15,
    maxWidth: '65%' // Ensure text doesn't overlap button
  },
  bulletPointCompact: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginTop: 5, // Consistent spacing between bullets
    paddingRight: 15,
    paddingLeft: 10
  },
  nextStepButtonCompact: {
    backgroundColor: '#1E3A8A',
    borderRadius: 6,
    padding: 10, // Reduced padding
    minWidth: 120, // Slightly smaller button
    maxWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    textDecoration: 'none'
  },
  nextStepsContainer: {
    marginTop: 20
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 25,
    paddingRight: 15
  },
  nextStepWithButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingRight: 10,
    minHeight: 60
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
  nextStepContent: {
    flex: 1,
    paddingRight: 15
  },
  nextStepText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
    flex: 1
  },
  nextStepTextWithButton: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    flex: 1,
    marginRight: 25,
    paddingRight: 15,
    maxWidth: '70%'
  },
  bulletPointFirst: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginTop: 0, 
    paddingLeft: 10
  },
  bulletPoint: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
    marginTop: 8,
    paddingLeft: 10
  },
  nextStepButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 6,
    padding: 12,
    minWidth: 130,
    maxWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    textDecoration: 'none'
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

  // Calculate CWQI scores (simplified version)
  const healthCWQI = calculateCCMEWQI(healthParameters);
  const aoCWQI = calculateCCMEWQI(aoParameters);

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

// CWQI Component - converted from PDF
// const generateCWQIComponent = (cwqi, title) => {
//     if (!cwqi) return '';
  
//     const displayRating = cwqi.coliformDetected ? 'Poor' : cwqi.rating;
//     const displayScore = cwqi.coliformDetected ? 0 : cwqi.score;
//     const scoreColor = getCWQIColor(cwqi.score);
  
//     return `
//       <div class="cwqi-container">
//         <div class="cwqi-title">${title}</div>
//         ${cwqi.coliformDetected ? `
//           <div class="cwqi-current-title">Current Score</div>
//         ` : ''}
//         <div class="cwqi-score" style="color: ${scoreColor}">${displayScore}/100</div>
//         <div class="cwqi-rating" style="color: ${scoreColor}">${displayRating}</div>
//         <div class="cwqi-summary">
//           ${cwqi.coliformDetected 
//             ? 'Coliform bacteria detected'
//             : `${cwqi.totalTests - cwqi.failedTests} of ${cwqi.totalTests} parameters passed`
//           }
//         </div>
//       </div>
//     `;
//   };
  
  // Recommendations Content - converted from PDF
  // const generateRecommendationsContent = (concerns, type) => {
  //   const hasConcerns = concerns.length > 0;
  //   const isHealthType = type === 'health';
  
  //   const getRecommendationsConfig = () => {
  //     if (!hasConcerns) {
  //       return {
  //         headerClass: 'recommendations-header-green',
  //         headerText: 'Recommendations: Continue Monitoring',
  //         bodyText: `Your ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits. Continue regular testing to maintain water quality.`
  //       };
  //     }
  
  //     if (isHealthType) {
  //       return {
  //         headerClass: 'recommendations-header-health',
  //         headerText: 'Recommendations: Actions Needed',
  //         bodyText: 'The following health-related parameters exceed safe limits. We strongly recommend consulting with a water treatment professional.'
  //       };
  //     } else {
  //       return {
  //         headerClass: 'recommendations-header-ao',
  //         headerText: 'Recommendations: Consider Treatment',
  //         bodyText: 'Some parameters exceed recommended limits. These may affect taste, odor, or water system performance.'
  //       };
  //     }
  //   };
  
  //   const config = getRecommendationsConfig();
  
  //   return `
  //     <div class="${config.headerClass}">
  //       ${config.headerText}
  //     </div>
  //     <div class="recommendations-text">
  //       ${config.bodyText}
  //     </div>
  //   `;
  // };
  
  // Parameters Section - converted from PDF
  // const generateParametersSection = (cwqi, concerns, type, title) => {
  //   if (!cwqi) return '';
  
  //   const getQualityDescription = (rating, hasColiform = false) => {
  //     if (hasColiform || rating === 'Poor - Coliform Present') {
  //       return 'With health-related parameters, your water quality score is Poor because coliform bacteria have been detected in your water sample.';
  //     }
      
  //     switch (rating) {
  //       case 'Excellent':
  //         return 'almost all parameters meet the guidelines, and any exceedances are very small. Water quality is considered extremely high.';
  //       case 'Very Good':
  //         return 'one or more parameters slightly exceed guidelines, but overall water quality remains very safe and clean.';
  //       case 'Good':
  //         return 'some parameters exceed guidelines, usually by small to moderate amounts. Water is generally acceptable.';
  //       case 'Fair':
  //         return 'several parameters exceed guidelines, and some by larger amounts. Water quality may require treatment.';
  //       case 'Marginal':
  //         return 'many parameters exceed guidelines. Water quality is likely to pose issues without treatment.';
  //       case 'Poor':
  //         return 'most parameters exceed guidelines by large amounts. Water quality is poor and likely unsafe.';
  //       default:
  //         return 'the water quality assessment is based on Canadian Water Quality Index standards.';
  //     }
  //   };
  
  //   const hasConcerns = concerns.length > 0;
  //   const isHealthType = type === 'health';
  //   const hasColiform = cwqi.coliformDetected || false;
  
  //   return `
  //     <div class="parameters-unified-container">
  //       <div class="parameters-container">
  //         ${generateCWQIComponent(cwqi, title)}
          
  //         <div class="parameter-text-section">
  //           ${hasColiform && isHealthType ? `
  //             <div class="quality-statement">
  //               ${getQualityDescription(cwqi.rating, hasColiform)}
  //             </div>
  //           ` : `
  //             <div class="quality-statement">
  //               <span class="quality-level">
  //                 ${isHealthType 
  //                   ? `With health-related parameters, your water quality is ${cwqi.rating}` 
  //                   : `For aesthetic and operational parameters, your water quality is ${cwqi.rating}`
  //                 }
  //               </span>, this means that ${getQualityDescription(cwqi.rating, hasColiform)}
  //             </div>
  //           `}
  
  //           ${hasConcerns && !hasColiform && concerns.length <= 6 ? `
  //             <div class="parameters-list">
  //               <div class="parameters-list-title">
  //                 Parameters over the limit (${concerns.length}):
  //               </div>
  //               ${concerns.map(param => `
  //                 <div class="parameters-list-item">• ${param.parameter_name}</div>
  //               `).join('')}
  //             </div>
  //           ` : ''}
  
  //           ${hasConcerns && !hasColiform && concerns.length > 6 ? `
  //             <div class="parameters-list">
  //               <div class="parameters-list-title">
  //                 ${concerns.length} parameters exceed recommended limits. See detailed table below for complete information.
  //               </div>
  //             </div>
  //           ` : ''}
  
  //           ${!hasConcerns && !hasColiform ? `
  //             <div class="quality-statement" style="color: #059669; margin-top: 8px;">
  //               All ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.
  //             </div>
  //           ` : ''}
  //         </div>
  //       </div>
  //     </div>
  
  //     ${hasColiform && isHealthType && cwqi.potentialScore !== null ? `
  //       <div class="potential-score-container">
  //         <div class="potential-score-left">
  //           <div class="cwqi-title-potential">Potential Score</div>
  //           <div class="potential-score-number">+${cwqi.potentialScore}</div>
  //         </div>
  //         <div class="potential-score-text">
  //           Your score could potentially increase by ${cwqi.potentialScore} points after removing the coliforms from your drinking water.
  //         </div>
  //       </div>
  //     ` : ''}
  
  //     <div class="recommendations-section">
  //       ${generateRecommendationsContent(concerns, type)}
  //     </div>
  //   `;
  // };

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
  
  