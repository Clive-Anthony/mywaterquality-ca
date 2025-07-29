// netlify/functions/utils/reportDataService.mjs
// Shared data service for Netlify functions (CommonJS/ESM compatible)

/**
 * Fetch report data by sample number from Supabase
 */
export const fetchReportDataBySampleNumber = async (supabase, sampleNumber) => {
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
   * Create anonymized mock data from real sample data
   */
  export const createMockDataFromReal = async (supabase, sampleNumber, customCustomerInfo = null, customKitInfo = null) => {
    try {
      const realData = await fetchReportDataBySampleNumber(supabase, sampleNumber);
      
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
        customerFirstName: 'Test',
        customerName: 'Test Customer',
        displayId: `TEST-${Date.now()}`,
        kitCode: `TEST-${Date.now()}`,
        testKitName: 'Test Water Kit',
        testKitId: null,
        customerLocation: 'Test Location, ON'
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