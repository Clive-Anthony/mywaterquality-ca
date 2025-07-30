// netlify/functions/test-report-generation.cjs - Updated to reference production code
const { createClient } = require('@supabase/supabase-js');

// Import production report generation functions
const { 
  generateHTMLToPDF, 
  processReportData,
  createReactPDFDocument 
} = require('./utils/reportGenerator.cjs');

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

    // Generate the test report using production functions
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

// Updated generateTestReport function to use production code
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
        orderNumber: customerInfo?.kitCode || 'TEST-001', // For test reports, use the same as display ID
        testKitName: testKitInfo?.name || 'Water Test Kit',
        testKitId: testKitInfo?.id || null,
        customerLocation: customerInfo?.location || 'Test Location, ON'
      };
      
      log('info', 'Using mock data', { count: testResults.length, requestId });
    }

    // Process the data into report format using production function
    const reportData = processReportData(testResults);
    
    if (!reportData) {
      throw new Error('Failed to process test results data');
    }

    console.log('About to generate PDF using production code...');
    console.log('ReportData processed successfully');
    
    // Generate PDF buffer using production React-PDF function
    const pdfBuffer = await generateHTMLToPDF(reportData, sampleNumber, kitInfo);
    
    console.log('PDF generation completed');
    
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Failed to generate PDF buffer - invalid buffer returned');
    }

    // Convert buffer to base64 for return
    const pdfBase64 = pdfBuffer.toString('base64');
    
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