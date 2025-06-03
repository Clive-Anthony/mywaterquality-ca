// src/pages/ReportPage.jsx - FIXED VERSION with correct column names
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

export default function ReportPage() {
  const { sampleNumber } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [sampleNumber]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from the view using correct sample number
      const { data, error } = await supabase
        .from('vw_test_results_with_parameters')
        .select('*')
        .eq('sample_number', sampleNumber || '2131422') // Updated to use correct sample number
        .order('parameter_name');

      if (error) throw error;

      console.log('Report data loaded:', data);
      setReportData(processReportData(data));
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (rawData) => {
    if (!rawData || rawData.length === 0) return null;

    // Group parameters by type using correct column name
    const healthParameters = rawData.filter(row => row.parameter_type === 'MAC');
    const aoParameters = rawData.filter(row => row.parameter_type === 'AO');
    const bacteriological = rawData.filter(row => 
      row.parameter_name?.toLowerCase().includes('coliform') ||
      row.parameter_name?.toLowerCase().includes('bacteria') ||
      row.parameter_name?.toLowerCase().includes('e. coli') ||
      row.parameter_name?.toLowerCase().includes('e.coli')
    );

    // Calculate parameters of concern using correct column names
    const healthConcerns = healthParameters.filter(row => 
      row.compliance_status === 'EXCEEDS' || row.compliance_status === 'OUTSIDE_RANGE'
    );
    
    const aoConcerns = aoParameters.filter(row => 
      row.compliance_status === 'EXCEEDS' || row.compliance_status === 'OUTSIDE_RANGE'
    );

    // Calculate CWQI scores (simplified calculation)
    const healthCWQI = calculateCWQI(healthParameters);
    const aoCWQI = calculateCWQI(aoParameters);

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
      bacteriological,
      healthConcerns,
      aoConcerns,
      healthCWQI,
      aoCWQI,
      rawData
    };
  };

  const calculateCWQI = (parameters) => {
    if (!parameters || parameters.length === 0) return null;

    // Simplified CWQI calculation using correct column names
    const totalTests = parameters.length;
    const failedTests = parameters.filter(p => 
      p.compliance_status === 'EXCEEDS' || p.compliance_status === 'OUTSIDE_RANGE'
    ).length;
    const passRate = ((totalTests - failedTests) / totalTests) * 100;

    let rating = 'Excellent';
    let score = Math.round(passRate);
    let color = 'text-green-600';

    if (passRate < 60) {
      rating = 'Poor';
      color = 'text-red-600';
    } else if (passRate < 80) {
      rating = 'Marginal';
      color = 'text-yellow-600';
    } else if (passRate < 95) {
      rating = 'Good';
      color = 'text-blue-600';
    }

    return { score, rating, color, totalTests, failedTests };
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
    return param.compliance_status === 'EXCEEDS' || param.compliance_status === 'OUTSIDE_RANGE';
  };

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
            <p className="text-gray-600">No test results found for sample {sampleNumber || '2131422'}.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const { sampleInfo, healthParameters, aoParameters, bacteriological, healthConcerns, aoConcerns, healthCWQI, aoCWQI } = reportData;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Report Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Water Quality Report</h1>
                <p className="text-blue-100 mt-1">Comprehensive Analysis Results</p>
              </div>
              <div className="text-right">
                <div className="text-white text-lg font-bold">MyWaterQuality</div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Sample Number</p>
                <p className="text-lg font-semibold text-gray-900">{sampleInfo?.sampleNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Collection Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(sampleInfo?.collectionDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Received Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(sampleInfo?.receivedDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Report Date</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(sampleInfo?.reportDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary of Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Summary of Results</h2>
          </div>
          
          <div className="p-6">
            {/* Health Related Parameters */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Related Parameters</h3>
              
              {healthCWQI && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Canadian Water Quality Index (CWQI)</p>
                      <p className={`text-2xl font-bold ${healthCWQI.color}`}>
                        {healthCWQI.score}/100 - {healthCWQI.rating}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {healthCWQI.totalTests - healthCWQI.failedTests} of {healthCWQI.totalTests} parameters passed
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      <div className="mt-2">
                        <ul className="list-disc list-inside text-sm text-orange-700">
                          {healthConcerns.map((param, index) => (
                            <li key={index}>
                              {param.parameter_name}: {formatValue(param.result_numeric, param.result_units)} 
                              (Limit: {formatValue(param.objective_value, param.parameter_unit)})
                            </li>
                          ))}
                        </ul>
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
              
              {aoCWQI && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Canadian Water Quality Index (CWQI)</p>
                      <p className={`text-2xl font-bold ${aoCWQI.color}`}>
                        {aoCWQI.score}/100 - {aoCWQI.rating}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {aoCWQI.totalTests - aoCWQI.failedTests} of {aoCWQI.totalTests} parameters passed
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      <div className="mt-2">
                        <ul className="list-disc list-inside text-sm text-orange-700">
                          {aoConcerns.map((param, index) => (
                            <li key={index}>
                              {param.parameter_name}: {formatValue(param.result_numeric, param.result_units)} 
                              (Limit: {formatValue(param.objective_value, param.parameter_unit)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recommendations</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {healthConcerns.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Health Parameter Concerns</h4>
                  <p className="text-red-700 text-sm">
                    Some health-related parameters exceed recommended limits. We recommend consulting with a water treatment professional and retesting after any treatment is installed.
                  </p>
                </div>
              )}
              
              {aoConcerns.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Aesthetic/Operational Concerns</h4>
                  <p className="text-yellow-700 text-sm">
                    Some aesthetic or operational parameters exceed recommended limits. While not necessarily health concerns, these may affect taste, odor, or water system performance.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">General Recommendations</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Test your water annually or when you notice changes in taste, odor, or appearance</li>
                  <li>• Maintain your well and water system according to manufacturer guidelines</li>
                  <li>• Keep potential contamination sources away from your well head</li>
                  <li>• Contact a water treatment professional for treatment options if needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Full Results Tables */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Full Results</h2>
          </div>
          
          <div className="p-6">
            {/* Health Parameters Table */}
            {healthParameters.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Parameter Results (MAC)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objective</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                              {formatValue(param.result_numeric, '', 3)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {param.result_units || param.parameter_unit || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {param.objective_display || formatValue(param.objective_value, '', 3)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getConcernIcon(isExceeded)}
                                <span className={`ml-2 text-sm ${isExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                  {param.compliance_status === 'MEETS' || param.compliance_status === 'WITHIN_RANGE' ? 'Within Limit' : 'Exceeds Limit'}
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objective</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {aoParameters.map((param, index) => {
                        const isExceeded = isParameterExceeded(param);
                        return (
                          <tr key={index} className={isExceeded ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {param.parameter_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatValue(param.result_numeric, '', 3)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {param.result_units || param.parameter_unit || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {param.objective_display || formatValue(param.objective_value, '', 3)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getConcernIcon(isExceeded)}
                                <span className={`ml-2 text-sm ${isExceeded ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {param.compliance_status === 'MEETS' || param.compliance_status === 'WITHIN_RANGE' ? 'Within Limit' : 'Exceeds Limit'}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Parameters of Concern - Details</h3>
                
                {healthConcerns.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-red-800 mb-3">Health Parameters of Concern</h4>
                    <div className="space-y-4">
                      {healthConcerns.map((param, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h5 className="font-medium text-red-900">{param.parameter_name}</h5>
                          <p className="text-sm text-red-700 mt-1">
                            <strong>Result:</strong> {formatValue(param.result_numeric, param.result_units)} 
                            (Objective: {param.objective_display || formatValue(param.objective_value, param.parameter_unit)})
                          </p>
                          <p className="text-sm text-red-700 mt-2">
                            <strong>Health Effects:</strong> {param.health_effects || 'Consult with a water treatment professional for specific health implications.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aoConcerns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-3">Aesthetic/Operational Parameters of Concern</h4>
                    <div className="space-y-4">
                      {aoConcerns.map((param, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h5 className="font-medium text-yellow-900">{param.parameter_name}</h5>
                          <p className="text-sm text-yellow-700 mt-1">
                            <strong>Result:</strong> {formatValue(param.result_numeric, param.result_units)} 
                            (Objective: {param.objective_display || formatValue(param.objective_value, param.parameter_unit)})
                          </p>
                          <p className="text-sm text-yellow-700 mt-2">
                            <strong>Treatment Options:</strong> {param.treatment_options || 'Various treatment options may be available. Consult with a water treatment professional.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600">
            This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, 
            please consult with a qualified water treatment professional.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Report generated on {formatDate(new Date().toISOString())} | MyWaterQuality.ca
          </p>
        </div>
      </div>
    </PageLayout>
  );
}