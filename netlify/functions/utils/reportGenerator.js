// netlify/functions/utils/reportGenerator.js
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { pdf } = require('@react-pdf/renderer');

// Note: This approach requires server-side rendering setup for React PDF
// For a simpler approach, you might want to use a different PDF generation library

async function processReportGeneration(supabase, reportId, sampleNumber, requestId) {
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
          sample: s['Sample #'],      // Access without quotes
          workOrder: s['Work Order #'], // Access without quotes
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
            return await continueProcessing(supabase, reportId, reportInfo.work_order_number, requestId, results2);
          }
        }
  
        throw new Error(`No test results found. Tried sample: ${sampleNumber}, work order: ${reportInfo?.work_order_number}. Available samples: ${availableSamples?.map(s => s['Sample #']).join(', ') || 'none'}`);
      }
  
      return await continueProcessing(supabase, reportId, sampleNumber, requestId, testResults);
  
    } catch (error) {
      console.error(`[${requestId}] Error generating PDF report:`, error);
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

async function generateSimplePDF(reportData, sampleNumber) {
  const puppeteer = require('puppeteer');
  
  let browser;
  try {
    // Launch puppeteer in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = generateHTMLReport(reportData, sampleNumber);
    
    // Set the HTML content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Generate PDF
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
    console.error('Error generating PDF with Puppeteer:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateHTMLReport(reportData, sampleNumber) {
  const { sampleInfo, healthParameters, aoParameters, generalParameters, healthConcerns, aoConcerns, healthCWQI, aoCWQI, bacteriological } = reportData;
  
  // Check for coliform contamination
  const hasColiformContamination = bacteriological.some(param => 
    (param.parameter_name?.toLowerCase().includes('coliform') || 
     param.parameter_name?.toLowerCase().includes('e. coli')) &&
    (param.result_display_value?.includes('Detected') || 
     param.compliance_status === 'EXCEEDS_MAC')
  );
  
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Water Quality Report - Sample ${sampleNumber}</title>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Helvetica', Arial, sans-serif; 
          line-height: 1.6; 
          color: #1f2937;
          background: white;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 30px; }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .header-left h1 { font-size: 24px; color: #1f2937; margin-bottom: 5px; }
        .header-left p { color: #6b7280; }
        .logo { font-size: 18px; font-weight: bold; color: #2563eb; }
        
        .sample-info {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; color: #374151; font-size: 12px; }
        .info-value { color: #1f2937; font-size: 14px; }
        
        .section {
          margin: 30px 0;
          page-break-inside: avoid;
        }
        .section-title {
          background: #2563eb;
          color: white;
          padding: 12px 20px;
          margin: 0 -15px 20px -15px;
          font-size: 16px;
          font-weight: bold;
        }
        .subsection-title {
          font-size: 18px;
          font-weight: bold;
          color: #374151;
          margin: 20px 0 15px 0;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .summary-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          background: white;
        }
        .summary-card.concern { border-color: #dc2626; }
        .summary-card.good { border-color: #059669; }
        .card-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 15px; }
        .card-number { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .card-number.red { color: #dc2626; }
        .card-number.green { color: #059669; }
        .card-text { font-size: 10px; color: #6b7280; }
        
        .cwqi-container {
          background: white;
          border: 2px solid #9ca3af;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .cwqi-content { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: center; }
        .cwqi-score-section { text-align: center; }
        .cwqi-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; }
        .cwqi-score { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
        .cwqi-rating { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .cwqi-description { font-size: 11px; color: #374151; line-height: 1.4; }
        
        .alert {
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          border-left: 4px solid;
        }
        .alert.warning { background: #fffbeb; border-color: #f59e0b; }
        .alert.danger { background: #fef2f2; border-color: #dc2626; }
        .alert.success { background: #f0fdf4; border-color: #22c55e; }
        .alert-title { font-weight: bold; margin-bottom: 8px; }
        .alert-content { font-size: 14px; line-height: 1.5; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f9fafb;
          font-weight: bold;
          color: #374151;
          font-size: 10px;
          text-transform: uppercase;
        }
        .exceeded-row { background-color: #fef2f2; }
        
        .parameter-name { font-weight: bold; }
        .status-pass { color: #059669; }
        .status-fail { color: #dc2626; }
        
        .recommendations {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .recommendations-title {
          font-size: 14px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 15px;
        }
        .recommendations-content {
          font-size: 12px;
          color: #374151;
          line-height: 1.5;
        }
        
        .page-break { page-break-before: always; }
        
        @media print {
          .container { padding: 15px; }
          .section-title { margin: 0 0 15px 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <h1>Water Quality Report</h1>
            <p>Comprehensive Analysis Results</p>
          </div>
          <div class="logo">My Water Quality</div>
        </div>
        
        <!-- Sample Information -->
        <div class="sample-info">
          <div class="info-grid">
            <div>
              <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">John Smith</div>
              </div>
              <div class="info-item">
                <div class="info-label">Sample Description</div>
                <div class="info-value">Water from Tap</div>
              </div>
              <div class="info-item">
                <div class="info-label">Test Kit</div>
                <div class="info-value">Advanced Water Test Kit</div>
              </div>
            </div>
            <div>
              <div class="info-item">
                <div class="info-label">Collection Date</div>
                <div class="info-value">${sampleInfo?.collectionDate ? new Date(sampleInfo.collectionDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Received Date</div>
                <div class="info-value">${sampleInfo?.receivedDate ? new Date(sampleInfo.receivedDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Report Date</div>
                <div class="info-value">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Summary of Results -->
        <div class="section">
          <div class="section-title">Summary of Results</div>
          
          <div class="summary-cards">
            <div class="summary-card ${healthConcerns.length > 0 ? 'concern' : 'good'}">
              <div class="card-title">Health-Related Results</div>
              <div class="card-number ${healthConcerns.length > 0 ? 'red' : 'green'}">${healthConcerns.length}</div>
              <div class="card-text">concerns present</div>
            </div>
            <div class="summary-card ${aoConcerns.length > 0 ? 'concern' : 'good'}">
              <div class="card-title">Aesthetic and Operational</div>
              <div class="card-number ${aoConcerns.length > 0 ? 'red' : 'green'}">${aoConcerns.length}</div>
              <div class="card-text">concerns present</div>
            </div>
          </div>
        </div>
        
        <!-- Health Parameters -->
        ${healthCWQI ? `
        <div class="section">
          <div class="subsection-title">Health Related Parameters</div>
          <div class="cwqi-container">
            <div class="cwqi-content">
              <div class="cwqi-score-section">
                <div class="cwqi-title">Health Related Parameters</div>
                <div class="cwqi-score" style="color: ${healthCWQI.score >= 80 ? '#059669' : healthCWQI.score >= 65 ? '#f59e0b' : '#dc2626'}">${healthCWQI.score}/100</div>
                <div class="cwqi-rating" style="color: ${healthCWQI.score >= 80 ? '#059669' : healthCWQI.score >= 65 ? '#f59e0b' : '#dc2626'}">${healthCWQI.rating}</div>
              </div>
              <div class="cwqi-description">
                ${healthConcerns.length === 0 
                  ? 'All health-related parameters are within acceptable limits.' 
                  : `${healthConcerns.length} health-related parameter(s) exceed recommended limits. We recommend consulting with a water treatment professional.`
                }
              </div>
            </div>
          </div>
          
          ${healthConcerns.length > 0 ? `
          <div class="alert danger">
            <div class="alert-title">Health Parameters of Concern</div>
            <div class="alert-content">
              <ul>
                ${healthConcerns.map(param => `<li>${param.parameter_name}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <!-- Aesthetic and Operational Parameters -->
        ${aoCWQI ? `
        <div class="section">
          <div class="subsection-title">Aesthetic and Operational Parameters</div>
          <div class="cwqi-container">
            <div class="cwqi-content">
              <div class="cwqi-score-section">
                <div class="cwqi-title">Aesthetic and Operational Parameters</div>
                <div class="cwqi-score" style="color: ${aoCWQI.score >= 80 ? '#059669' : aoCWQI.score >= 65 ? '#f59e0b' : '#dc2626'}">${aoCWQI.score}/100</div>
                <div class="cwqi-rating" style="color: ${aoCWQI.score >= 80 ? '#059669' : aoCWQI.score >= 65 ? '#f59e0b' : '#dc2626'}">${aoCWQI.rating}</div>
              </div>
              <div class="cwqi-description">
                ${aoConcerns.length === 0 
                  ? 'All aesthetic and operational parameters are within acceptable limits.' 
                  : `${aoConcerns.length} aesthetic/operational parameter(s) exceed recommended limits. These may affect taste, odor, or water system performance.`
                }
              </div>
            </div>
          </div>
          
          ${aoConcerns.length > 0 ? `
          <div class="alert warning">
            <div class="alert-title">Aesthetic/Operational Parameters of Concern</div>
            <div class="alert-content">
              <ul>
                ${aoConcerns.map(param => `<li>${param.parameter_name}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <!-- Coliform Warning -->
        ${hasColiformContamination ? `
        <div class="alert danger">
          <div class="alert-title">⚠ Important Notice: Coliform Bacteria Detected</div>
          <div class="alert-content">
            Coliform bacteria have been detected in your drinking water sample. While not necessarily harmful themselves, their presence indicates that disease-causing organisms may also be present. Immediate action is recommended.
            <br><br>
            <strong>Recommended Actions:</strong>
            <ul>
              <li>Contact a licensed water well contractor to inspect and disinfect your well</li>
              <li>Follow well disinfection instructions provided by Health Canada</li>
              <li>Re-test your water after disinfection to confirm effectiveness</li>
            </ul>
          </div>
        </div>
        ` : ''}
        
        <!-- Recommendations -->
        <div class="section">
          <div class="section-title">General Recommendations</div>
          <div class="recommendations">
            <div class="recommendations-title">General Recommendations</div>
            <div class="recommendations-content">
              <ol>
                <li>The water quality results presented in this Report should be carefully reviewed by a water treatment expert if treatment is necessary to improve the potability of the drinking water supply.</li>
                <li>Test your water annually or when you notice changes in taste, odor, or appearance.</li>
                <li>Maintain your well and water system according to manufacturer guidelines.</li>
                <li>Keep potential contamination sources away from your well head.</li>
                <li>If you have any questions on your drinking water quality results, please consult with a professional hydrogeologist.</li>
              </ol>
            </div>
          </div>
        </div>
        
        <!-- Full Results Tables -->
        <div class="page-break"></div>
        <div class="section">
          <div class="section-title">Full Results</div>
          
          ${healthParameters.length > 0 ? `
          <div class="subsection-title">Health-Related Parameter Results</div>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Unit</th>
                <th>Recommended Maximum</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${healthParameters.map(param => {
                const isExceeded = param.compliance_status === 'EXCEEDS_MAC';
                return `
                  <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
                    <td class="parameter-name">${param.parameter_name}</td>
                    <td>${param.result_units || param.parameter_unit || 'N/A'}</td>
                    <td>${param.mac_display_value || param.mac_display || 'No Standard'}</td>
                    <td>${formatLabResult(param)}</td>
                    <td class="${isExceeded ? 'status-fail' : 'status-pass'}">
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
                <th>Parameter</th>
                <th>Unit</th>
                <th>Recommended Maximum</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${aoParameters.map(param => {
                const isExceeded = param.compliance_status === 'EXCEEDS_AO' || 
                  (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
                return `
                  <tr ${isExceeded ? 'class="exceeded-row"' : ''}>
                    <td class="parameter-name">${param.parameter_name}</td>
                    <td>${param.result_units || param.parameter_unit || 'N/A'}</td>
                    <td>${param.ao_display_value || param.ao_display || 'No Standard'}</td>
                    <td>${formatLabResult(param)}</td>
                    <td class="${isExceeded ? 'status-fail' : 'status-pass'}">
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
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              ${generalParameters.map(param => `
                <tr>
                  <td class="parameter-name">${param.parameter_name}</td>
                  <td>${formatLabResult(param)}</td>
                  <td>${param.result_units || param.parameter_unit || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.</p>
          <p style="margin-top: 10px;">Report generated on ${new Date().toLocaleDateString()} | My Water Quality</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  processReportGeneration
};