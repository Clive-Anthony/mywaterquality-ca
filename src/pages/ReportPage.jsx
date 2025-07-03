// src/pages/ReportPage.jsx - Updated with correct CCME WQI calculation
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';
import { pdf } from '@react-pdf/renderer';
import WaterQualityReportPDF from '../components/WaterQualityReportPDF';

// Import the correct CCME WQI calculation
import { 
  calculateCCMEWQIWithValidation,
  getCWQIRating 
} from '../lib/ccmeWQI'; // You'll need to create this file

// CWQIVisualization Component - Update the getTextColor function
function CWQIVisualization({ cwqi, title }) {
    if (!cwqi) return null;
  
    const { score, rating, color, totalTests, failedTests, components, warnings } = cwqi;
    
    // Calculate the position of the indicator on the scale
    const indicatorPosition = Math.max(0, Math.min(100, score));
    
    const getTextColor = (rating) => {
      switch (rating) {
        case 'Poor': return 'text-red-600';
        case 'Marginal': return 'text-orange-600';
        case 'Fair': return 'text-yellow-600';
        case 'Good': return 'text-blue-600';
        case 'Very Good': return 'text-teal-600';
        case 'Excellent': return 'text-green-600';
        default: return 'text-gray-600';
      }
    };
  
    // ... rest of the component remains the same

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      
      {/* Score Display */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold ${getTextColor(rating)} mb-2`}>
          {score}/100
        </div>
        <div className={`text-xl font-semibold ${getTextColor(rating)}`}>
          {rating}
        </div>
      </div>

      {/* Visual Scale - Update with Very Good segment */}
        <div className="mb-4">
        <div className="relative">
            {/* Background scale with color segments */}
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
            <div className="w-[44%] bg-red-500"></div>     {/* Poor: 0-44 */}
            <div className="w-[20%] bg-orange-500"></div>   {/* Marginal: 45-64 */}
            <div className="w-[15%] bg-yellow-500"></div>   {/* Fair: 65-79 */}
            <div className="w-[9%] bg-blue-500"></div>      {/* Good: 80-88 */}
            <div className="w-[6%] bg-teal-500"></div>      {/* Very Good: 89-94 */}
            <div className="w-[6%] bg-green-500"></div>     {/* Excellent: 95-100 */}
            </div>
            
            {/* Score indicator */}
            <div 
            className="absolute top-0 w-1 h-4 bg-gray-800 transform -translate-x-0.5"
            style={{ left: `${indicatorPosition}%` }}
            >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-gray-800"></div>
            </div>
            </div>
        </div>
        
        {/* Scale labels - Update with Very Good */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0</span>
            <span>45</span>
            <span>65</span>
            <span>80</span>
            <span>89</span>
            <span>95</span>
            <span>100</span>
        </div>
        </div>

    {/* CCME Components Breakdown */}
    <div className="mb-4 bg-gray-50 rounded-lg p-4">
    <h5 className="text-sm font-semibold text-gray-700 mb-3">CCME WQI Components (Standard Three-Factor Formula)</h5>
    <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="text-center">
        <div className="font-semibold text-gray-900">F1: {components?.F1?.toFixed(1) || 'N/A'}</div>
        <div className="text-gray-600">Scope</div>
        <div className="text-green-600 font-medium">✓ Used</div>
        </div>
        <div className="text-center">
        <div className="font-semibold text-gray-900">F2: {components?.F2?.toFixed(1) || 'N/A'}</div>
        <div className="text-gray-600">Frequency</div>
        <div className="text-green-600 font-medium">✓ Used</div>
        </div>
        <div className="text-center">
        <div className="font-semibold text-gray-900">F3: {components?.F3?.toFixed(3) || 'N/A'}</div>
        <div className="text-gray-600">Amplitude</div>
        <div className="text-green-600 font-medium">✓ Used</div>
        </div>
    </div>
    <div className="mt-2 text-xs text-gray-500 text-center">
        Formula: 100 - √((F1² + F2² + F3²) / 1.732)
    </div>
    <div className="mt-1 text-xs text-gray-400 text-center">
        Standard CCME three-factor formula using all components
    </div>
    </div>

      {/* Test Results Summary */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{totalTests - failedTests}</span> of <span className="font-medium">{totalTests}</span> tests passed
        </p>
        {failedTests > 0 && (
          <p className="text-sm text-orange-600 mt-1">
            {failedTests} test{failedTests !== 1 ? 's' : ''} exceeded recommended limits
          </p>
        )}
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h6 className="text-xs font-semibold text-yellow-800 mb-1">Data Quality Notes:</h6>
          {warnings.map((warning, index) => (
            <p key={index} className="text-xs text-yellow-700">{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const { sampleNumber } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [sampleNumber]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TEST SAMPLE 2131422
      // Fetch data from the view using correct sample number
      const { data, error } = await supabase
        .from('vw_test_results_with_parameters')
        .select('*')
        .eq('sample_number', '2157523')
        .order('parameter_name');

      if (error) throw error;

      // console.log('Report data loaded:', data);
      setReportData(processReportData(data));
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatLabResult = (param) => {
    // Use the pre-formatted display value from the database view
    if (param.result_display_value && param.result_display_value.trim() !== '') {
      // Trim whitespace around operators like "< 0.04" -> "<0.04"
      return param.result_display_value.trim().replace(/([<>=]+)\s+/g, '$1');
    }
    
    // Fallback to original logic if display value is not available
    if (param.result_value && param.result_value.trim() !== '') {
      // Trim whitespace around operators
      return param.result_value.trim().replace(/([<>=]+)\s+/g, '$1');
    }
    
    // Final fallback to numeric if both display and result values are not available
    const value = param.result_numeric;
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    
    const num = parseFloat(value);
    
    // Handle very small numbers
    if (Math.abs(num) < 0.001 && num !== 0) {
      return num.toExponential(2);
    }
    
    // Handle normal range - remove trailing zeros
    let formatted = num.toString();
    if (formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  };

  // PDF Download Function
  const downloadPDF = async () => {
    if (!reportData) return;
    
    try {
      setDownloadingPDF(true);
      
      // Generate PDF blob
      const blob = await pdf(<WaterQualityReportPDF reportData={reportData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Water_Quality_Report_${reportData.sampleInfo?.sampleNumber || 'Demo'}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const processReportData = (rawData) => {
    if (!rawData || rawData.length === 0) return null;
  
    // Group parameters by whether they have MAC values (health) or AO values (aesthetic/operational)
    // Hybrid parameters will appear in both arrays
    const healthParameters = rawData.filter(row => 
      (row.parameter_type === 'MAC' || row.parameter_type === 'Hybrid') &&
      row.mac_value !== null && row.mac_value !== undefined && row.mac_value !== ''
    ).map(row => ({
      ...row,
      // Use MAC-specific values for health parameters
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
        // Use AO-specific values for aesthetic/operational parameters
        objective_value: row.ao_value,
        objective_display: row.ao_display,
        compliance_status: row.ao_compliance_status,
        overall_compliance_status: row.compliance_status, // Keep track of overall compliance
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
  
    // Calculate parameters of concern using the mapped compliance status
    const healthConcerns = healthParameters.filter(row => 
      row.compliance_status === 'EXCEEDS_MAC'
    );
    
    const aoConcerns = aoParameters.filter(row => 
        row.compliance_status === 'EXCEEDS_AO' ||
        // For range values, check if the overall compliance is WARNING
        (row.compliance_status === 'AO_RANGE_VALUE' && rawData.find(r => 
          r.parameter_name === row.parameter_name && 
          r.sample_number === row.sample_number
        )?.compliance_status === 'WARNING')
      );
  
    // Check for coliform bacteria presence in health parameters
  const hasColiformBacteria = healthParameters.some(param => 
    (param.parameter_name?.toLowerCase().includes('coliform') || 
     param.parameter_name?.toLowerCase().includes('escherichia') ||
     param.parameter_name?.toLowerCase().includes('e. coli') ||
     param.parameter_name?.toLowerCase().includes('e.coli')) &&
    (param.result_value?.includes('NDOGT') || 
     param.result_numeric?.toString().includes('NDOGT') ||
     param.compliance_status === 'EXCEEDS_MAC')
  );

  // Calculate CWQI for health parameters
  // console.log('Calculating CCME WQI for health parameters:', healthParameters.length);
  let healthCWQI = calculateCCMEWQIWithValidation(healthParameters, { 
    debug: true,
    minParameters: 4,
    minSamples: 4 
  });

  // Calculate potential score without coliform parameters
  let potentialScore = null;
  if (hasColiformBacteria && healthCWQI.isValid) {
    // Filter out coliform and E.coli parameters
    const healthParametersWithoutColiform = healthParameters.filter(param => 
      !(param.parameter_name?.toLowerCase().includes('coliform') || 
        param.parameter_name?.toLowerCase().includes('escherichia') ||
        param.parameter_name?.toLowerCase().includes('e. coli') ||
        param.parameter_name?.toLowerCase().includes('e.coli'))
    );

    if (healthParametersWithoutColiform.length > 0) {
      const potentialCWQI = calculateCCMEWQIWithValidation(healthParametersWithoutColiform, { 
        debug: true,
        minParameters: 1, // Lower threshold since we're excluding parameters
        minSamples: 1 
      });

      if (potentialCWQI.isValid) {
        potentialScore = Math.round(potentialCWQI.score);
      }
    }

    // Override health CWQI if coliform bacteria detected
    healthCWQI = {
      ...healthCWQI,
      score: 0,
      rating: 'Poor - Coliform Present',
      color: 'text-red-600',
      coliformDetected: true,
      potentialScore: potentialScore
    };
  }
    
    // console.log('Calculating CCME WQI for AO parameters:', aoParameters.length);
    const aoCWQI = calculateCCMEWQIWithValidation(aoParameters, { 
      debug: true,
      minParameters: 4,
      minSamples: 4 
    });
  
    // Get sample info from first row using correct column names
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
      healthCWQI: healthCWQI.isValid ? healthCWQI : null,
      aoCWQI: aoCWQI.isValid ? aoCWQI : null,
      rawData
    };
  };

  const formatValue = (value, unit, decimalPlaces = 2) => {
    if (value === null || value === undefined) return 'N/A';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    
    return `${numValue.toFixed(decimalPlaces)} ${unit || ''}`.trim();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getConcernIcon = (isExceeded) => {
    return isExceeded ? (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ) : (
      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const isParameterExceeded = (param) => {
    // Check based on parameter category and compliance status
    if (param.parameter_category === 'health') {
      return param.compliance_status === 'EXCEEDS_MAC';
    } else if (param.parameter_category === 'ao') {
      if (param.compliance_status === 'EXCEEDS_AO') {
        return true;
      }
      // For range values, check the overall compliance status from original data
      if (param.compliance_status === 'AO_RANGE_VALUE') {
        const originalParam = reportData?.rawData?.find(r => 
          r.parameter_name === param.parameter_name && 
          r.sample_number === param.sample_number
        );
        return originalParam?.compliance_status === 'WARNING';
      }
      return false;
    } else {
      // For non-hybrid parameters, use the overall compliance status
      return param.compliance_status === 'FAIL';
    }
  };
  
  // Rest of the component rendering logic remains the same...
  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading water quality report...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Report</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!reportData) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data Available</h3>
            <p className="text-gray-600">No test results found for this sample.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const { sampleInfo, healthParameters, aoParameters, generalParameters,bacteriological, healthConcerns, aoConcerns, healthCWQI, aoCWQI } = reportData;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* PDF Download Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={downloadPDF}
            disabled={downloadingPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPDF ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-4-4m4 4l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* PDF Download Button */}
        <div className="mb-6 flex justify-end">
          {/* ... existing PDF button code ... */}
        </div>

        {/* Water First Banner */}
        <div className="bg-white border-2 border-blue-600 rounded-lg shadow-sm mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Supporting Water First's Drinking Water Internship
                </h2>
                <p className="text-gray-700 text-base">
                  $5 of every water quality package purchased through My Water Quality will go to Water First.
                </p>
              </div>
              <div className="flex-shrink-0">
                <img 
                  src="/images/water_first.png" 
                  alt="Water First Logo" 
                  className="h-16 w-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Document Container */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Connected Report Container */}
          <div className="bg-white">
          {/* Report Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Water Quality Report</h1>
                <p className="text-gray-600 mt-1">Comprehensive Analysis Results</p>
              </div>
              <div className="flex items-center">
                <img 
                  src="/MWQ-logo-final.png" 
                  alt="My Water Quality Logo" 
                  className="h-12 w-auto"
                />
              </div>
            </div>
          </div>
          
          <div className="px-6 py-6">
            {/* User and Sample Information - Priority Section */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Customer Name</p>
                    <p className="text-lg font-semibold text-gray-900">John Smith</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sample Location</p>
                    <p className="text-lg font-semibold text-gray-900">Kitchen Tap - Main Floor</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sample Description</p>
                    <p className="text-lg font-semibold text-gray-900">Residential Well Water</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Property Address</p>
                    <p className="text-lg font-semibold text-gray-900">123 Maple Street, Toronto, ON</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates Section - Secondary Priority */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Collection Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(sampleInfo?.collectionDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Received Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(sampleInfo?.receivedDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Report Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(sampleInfo?.reportDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary of Results with CWQI Visualizations */}
        <div className="bg-blue-600 px-6 py-4 -mx-8">
            <h2 className="text-xl font-bold text-white">Summary of Results</h2>
            <p className="text-blue-100 mt-1">Canadian Water Quality Index (CWQI) Scores</p>
          </div>
          <div className="px-6 py-6">
          
          <div className="p-6">
            {/* CWQI Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {healthCWQI && (
                <CWQIVisualization 
                  cwqi={healthCWQI} 
                  title="Health Related Parameters"
                />
              )}
              
              {aoCWQI && (
                <CWQIVisualization 
                  cwqi={aoCWQI} 
                  title="Aesthetic & Operational Parameters"
                />
              )}
            </div>

            {/* Health Related Parameters Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Related Parameters</h3>
              
              <div className={`border-l-4 p-4 mb-4 ${
                healthConcerns.length === 0 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-orange-50 border-orange-400'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {healthConcerns.length === 0 ? (
                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${
                      healthConcerns.length === 0 ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {healthConcerns.length === 0 
                        ? 'All health-related parameters are within acceptable limits' 
                        : `${healthConcerns.length} health-related parameter(s) exceed recommended limits`
                      }
                    </h4>
                    {healthConcerns.length > 0 && (
                      <div className="mt-4 px-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <ul className="space-y-2">
                            {healthConcerns.map((param, index) => (
                              <li key={index} className="text-gray-900 text-base">
                                • {param.parameter_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Health Parameter Recommendations */}
                        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h4>
                          <div className="border border-red-200 rounded-lg p-4">
                            <p className="text-gray-900 text-base">
                              Some health-related parameters exceed recommended limits. We recommend consulting with a water treatment professional and retesting after any treatment is installed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bacteriological Results */}
            {bacteriological.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bacteriological Results</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Bacterial contamination analysis
                      </h4>
                      <div className="mt-2">
                        {bacteriological.map((param, index) => (
                          <p key={index} className="text-sm text-yellow-700">
                            {param.parameter_name}: {formatValue(param.result_numeric, param.result_units)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aesthetic and Operational Parameters */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aesthetic and Operational Parameters</h3>
              
              <div className={`border-l-4 p-4 ${
                aoConcerns.length === 0 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-orange-50 border-orange-400'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {aoConcerns.length === 0 ? (
                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${
                      aoConcerns.length === 0 ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {aoConcerns.length === 0 
                        ? 'All aesthetic and operational parameters are within acceptable limits' 
                        : `${aoConcerns.length} aesthetic/operational parameter(s) exceed recommended limits`
                      }
                    </h4>
                    {aoConcerns.length > 0 && (
                      <div className="mt-4 px-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <ul className="space-y-2">
                            {aoConcerns.map((param, index) => (
                              <li key={index} className="text-gray-900 text-base">
                                • {param.parameter_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* AO Parameter Recommendations */}
                        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h4>
                          <div className="border border-yellow-200 rounded-lg p-4">
                            <p className="text-gray-900 text-base">
                              Some aesthetic or operational parameters exceed recommended limits. While not necessarily health concerns, these may affect taste, odor, or water system performance.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {/* General Recommendations */}
        <div className="bg-blue-600 px-6 py-4 -mx-8">
            <h2 className="text-xl font-bold text-white">General Recommendations</h2>
          </div>
          <div className="px-6 py-6">
              <ul className="text-gray-900 text-base space-y-2">
                <li>• Test your water annually or when you notice changes in taste, odor, or appearance</li>
                <li>• Maintain your well and water system according to manufacturer guidelines</li>
                <li>• Keep potential contamination sources away from your well head</li>
                <li>• Contact a water treatment professional for treatment options if needed</li>
              </ul>
          </div>

        {/* Full Results Tables */}
        {/* Full Results */}
        <div className="bg-blue-600 px-6 py-4 -mx-8">
            <h2 className="text-xl font-bold text-white">Full Results</h2>
          </div>
          <div className="px-6 py-6">
          
          <div className="p-6">
            {/* Health Parameters Table */}
            {healthParameters.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Parameter Results (MAC)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Maximum Concentration</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {healthParameters.map((param, index) => {
                        const isExceeded = isParameterExceeded(param);
                        return (
                            <tr key={index} className={isExceeded ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {param.parameter_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatLabResult(param)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {param.result_units || param.parameter_unit || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {param.mac_display || formatValue(param.mac_value, '', 3)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                {getConcernIcon(isExceeded)}
                                <span className={`ml-2 text-sm ${isExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                    {param.compliance_status === 'MEETS_MAC' ? 'Within Limit' : 
                                    param.compliance_status === 'EXCEEDS_MAC' ? 'Exceeds Limit' : 
                                    'No Standard'}
                                </span>
                                </div>
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AO Parameters Table */}
            {aoParameters.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aesthetic & Operational Parameter Results (AO)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Maximum Concentration</th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                {aoParameters.map((param, index) => {
                    const isExceeded = isParameterExceeded(param);
                    
                    // Get the overall compliance status for range values
                    const originalParam = reportData?.rawData?.find(r => 
                        r.parameter_name === param.parameter_name && 
                        r.sample_number === param.sample_number
                    );
                    
                    const getStatusText = () => {
                        if (param.compliance_status === 'MEETS_AO') {
                        return 'Within Limit';
                        } else if (param.compliance_status === 'EXCEEDS_AO') {
                        return 'Exceeds Limit';
                        } else if (param.compliance_status === 'AO_RANGE_VALUE') {
                        if (originalParam?.compliance_status === 'WARNING') {
                            return 'Outside Range';
                        } else if (originalParam?.compliance_status === 'PASS') {
                            return 'Within Range';
                        } else {
                            return 'Range Value';
                        }
                        } else {
                        return 'No Standard';
                        }
                    };

                    return (
                        <tr key={index} className={isExceeded ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {param.parameter_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatLabResult(param)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {param.result_units || param.parameter_unit || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {param.ao_display || formatValue(param.ao_value, '', 3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                            {getConcernIcon(isExceeded)}
                            <span className={`ml-2 text-sm ${isExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                {getStatusText()}
                            </span>
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Parameters of Concern Details */}
            {(healthConcerns.length > 0 || aoConcerns.length > 0) && (
              <div>
                
                {healthConcerns.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Parameters of Concern - Details</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                            <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="w-5/12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Effect</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {healthConcerns.map((param, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {param.parameter_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {param.description || param.parameter_description || 'A water quality parameter that requires monitoring for health and safety compliance.'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {param.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

             
                {aoConcerns.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aesthetic/Operational Parameters of Concern - Details</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                            <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="w-5/12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment Options</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {aoConcerns.map((param, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {param.parameter_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {param.description || param.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {param.treatment_options || 'Multiple treatment options are available including filtration, softening, and chemical treatment. Consult with a certified water treatment professional to determine the best solution for your specific situation.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-gray-50 px-6 py-6 rounded-b-lg text-center">
            <p className="text-sm text-gray-600">
              This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, 
              please consult with a qualified water treatment professional.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Report generated on {formatDate(new Date().toISOString())} | My Water Quality
            </p>
            </div>
        </div>
        </div>
    </PageLayout>
  );
}