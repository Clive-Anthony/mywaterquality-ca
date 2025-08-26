// src/components/WaterQualityDashboard.jsx - Interactive water quality results dashboard
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateCCMEWQI } from '../lib/ccmeWQI';
import ParameterModal from './ParameterModal';
import CWQIGauge from './CWQIGauge';

export default function WaterQualityDashboard({ report, onBack, onDownloadReport }) {
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [parameterFilter, setParameterFilter] = useState('');
  const [activeSection, setActiveSection] = useState('all');

  const calculateRoadSaltAssessment = useCallback((allParameters) => {
    const chlorideParam = allParameters.find(param => 
      param.parameter_name?.toLowerCase().includes('chloride') && 
      !param.parameter_name?.toLowerCase().includes('bromide')
    );
    
    const bromideParam = allParameters.find(param => 
      param.parameter_name?.toLowerCase().includes('bromide')
    );

    if (!chlorideParam || !bromideParam) {
      return null;
    }

    const chlorideLevel = parseFloat(chlorideParam.result_numeric) || 0;
    const bromideLevel = parseFloat(bromideParam.result_numeric) || 0;
    
    const chlorideExceedsThreshold = chlorideLevel > 100;
    
    let hasContamination = false;
    let clBrRatio = null;
    let assessmentText = '';
    
    if (chlorideExceedsThreshold && bromideLevel > 0) {
      clBrRatio = Math.round(chlorideLevel / bromideLevel);
      hasContamination = clBrRatio > 1000;
      assessmentText = `Chloride: ${chlorideLevel} mg/L, Bromide: ${bromideLevel} mg/L, Cl:Br Ratio: ${clBrRatio}`;
    } else if (chlorideExceedsThreshold && bromideLevel === 0) {
      assessmentText = `Chloride: ${chlorideLevel} mg/L, Bromide: ${bromideLevel} mg/L - Cannot calculate ratio (bromide = 0)`;
    } else {
      assessmentText = `Chloride: ${chlorideLevel} mg/L (below 100 mg/L threshold)`;
    }

    return {
      hasContamination,
      clBrRatio,
      assessmentText,
      status: hasContamination ? 'Road Salt Impact Detected' : 'No Road Salt Impact',
      chlorideLevel,
      bromideLevel
    };
  }, []);

  const processTestResults = useCallback((rawData) => {
    if (!rawData || rawData.length === 0) return;

    // Group parameters by category
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

    // Check for coliform contamination
    const hasColiformContamination = bacteriological.some(param => {
      const isColiformParam = param.parameter_name?.toLowerCase().includes('coliform') || 
                             param.parameter_name?.toLowerCase().includes('e. coli') ||
                             param.parameter_name?.toLowerCase().includes('e.coli');
      
      if (!isColiformParam) return false;
      
      const hasDetectedInDisplay = param.result_display_value?.includes('Detected');
      const exceedsMAC = param.compliance_status === 'EXCEEDS_MAC';
      const numericValue = parseFloat(param.result_numeric);
      const hasNumericContamination = !isNaN(numericValue) && numericValue > 0;
      
      return hasDetectedInDisplay || exceedsMAC || hasNumericContamination;
    });

    // Calculate CWQI scores
    const healthCWQI = calculateCCMEWQI(healthParameters);
    const aoCWQI = calculateCCMEWQI(aoParameters);

    // Calculate Road Salt Assessment
    const roadSaltAssessment = calculateRoadSaltAssessment([...healthParameters, ...aoParameters, ...generalParameters]);

    // Determine if bacteriological results should be shown
    const ADVANCED_WATER_TEST_KIT_ID = 'a69fd2ca-232f-458e-a240-7e36f50ffa2b';
    const showBacteriologicalResults = report.test_kit_id === ADVANCED_WATER_TEST_KIT_ID;

    const processed = {
      healthParameters,
      aoParameters,
      generalParameters,
      bacteriological,
      healthConcerns,
      aoConcerns,
      healthCWQI,
      aoCWQI,
      hasColiformContamination,
      showBacteriologicalResults,
      roadSaltAssessment,
      rawData
    };

    setProcessedData(processed);
  }, [calculateRoadSaltAssessment, report.test_kit_id]);

  const loadTestResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: testError } = await supabase
        .from('vw_test_results_with_parameters')
        .select('*')
        .eq('work_order_number', report.work_order_number)
        .order('parameter_name');

      if (testError) {
        throw new Error(`Failed to load test results: ${testError.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No test results found for this report');
      }

      processTestResults(data);
    } catch (err) {
      console.error('Error loading test results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [report.work_order_number, processTestResults]);

  useEffect(() => {
    if (report?.work_order_number) {
      loadTestResults();
    }
  }, [report?.work_order_number, loadTestResults]);

  const formatLabResult = useCallback((param) => {
    if (param.result_display_value && param.result_display_value.trim() !== '') {
      return param.result_display_value.trim();
    }
    if (param.result_value && param.result_value.trim() !== '') {
      return param.result_value.trim();
    }
    const value = param.result_numeric;
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return parseFloat(value).toString();
  }, []);

  const handleParameterClick = useCallback((parameter) => {
    setSelectedParameter(parameter);
    setShowModal(true);
  }, []);

  const filteredParameters = useCallback((parameters) => {
    if (!parameterFilter) return parameters;
    return parameters.filter(param => 
      param.parameter_name.toLowerCase().includes(parameterFilter.toLowerCase())
    );
  }, [parameterFilter]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading test results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Results</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={onBack}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  Back to Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!processedData) {
    return null;
  }

  const { 
    healthParameters, 
    aoParameters, 
    generalParameters, 
    healthConcerns, 
    aoConcerns,
    healthCWQI,
    aoCWQI,
    hasColiformContamination,
    showBacteriologicalResults,
    roadSaltAssessment
  } = processedData;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Water Quality Results - {report.kit_code}
                </h1>
                <p className="text-sm text-gray-500">{report.product_name}</p>
              </div>
            </div>
            <button
              onClick={() => onDownloadReport(report.report_id, report.kit_code, report.pdf_file_url)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Snapshot of Results</h2>
          <div className={`grid gap-4 ${showBacteriologicalResults ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {showBacteriologicalResults && (
              <div className={`p-6 rounded-lg border-2 bg-white ${hasColiformContamination ? 'border-red-200' : 'border-green-200'}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Bacteriological Results</h3>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${hasColiformContamination ? 'text-red-600' : 'text-green-600'}`}>
                    {hasColiformContamination ? 'Bacteria Detected' : '0 concerns'}
                  </div>
                </div>
              </div>
            )}
            
            <div className={`p-6 rounded-lg border-2 bg-white ${healthConcerns.length > 0 ? 'border-red-200' : 'border-green-200'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Health-Related Results</h3>
              <div className="text-center">
                <div className={`text-4xl font-bold ${healthConcerns.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {healthConcerns.length}
                </div>
                <div className="text-sm text-gray-600">concerns present</div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg border-2 bg-white ${aoConcerns.length > 0 ? 'border-red-200' : 'border-green-200'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Aesthetic & Operational</h3>
              <div className="text-center">
                <div className={`text-4xl font-bold ${aoConcerns.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {aoConcerns.length}
                </div>
                <div className="text-sm text-gray-600">concerns present</div>
              </div>
            </div>
          </div>

          {/* Results Explanation */}
          <div className="mt-6">
            {healthCWQI?.score === 100 && aoCWQI?.score === 100 ? (
              <div className="bg-white border-2 border-green-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Your water shows no concerns!</h4>
                <p className="text-gray-700">
                  Congratulations! Your water quality results are excellent across all tested parameters. This indicates that your water source is well-maintained and meets all health and aesthetic standards.
                </p>
              </div>
            ) : hasColiformContamination ? (
              <div className="bg-white border-2 border-red-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Important Notice: Coliform Bacteria Detected - Do Not Drink Water</h4>
                <p className="text-gray-700 mb-2">
                  Coliform bacteria have been detected in your drinking water sample. Immediate action is recommended.
                </p>
                <p className="text-gray-700">
                  <strong>Disinfect Your Well System:</strong> Contact a licensed water well contractor to inspect and disinfect your well, or follow Health Canada guidelines.
                </p>
              </div>
            ) : (healthConcerns.length > 0 || aoConcerns.length > 0) ? (
              <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Results Explanation</h4>
                <p className="text-gray-700 font-semibold mb-2">
                  There are {healthConcerns.length > 0 && aoConcerns.length > 0 ? 'health-related and aesthetic' : 
                            healthConcerns.length > 0 ? 'health-related' : 'aesthetic'} concerns.
                </p>
                {healthConcerns.length > 0 && (
                  <p className="text-gray-700 mb-2">
                    We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.
                  </p>
                )}
                {aoConcerns.length > 0 && (
                  <p className="text-gray-700 mb-2">
                    While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.
                  </p>
                )}
                <p className="text-gray-700">
                  Please refer to the Next Steps section in the report for actions you can take to improve water quality.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* CWQI Gauges */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Water Quality Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {healthCWQI && (
              <CWQIGauge 
                title="Health-Related Score"
                score={healthCWQI.score}
                rating={healthCWQI.rating}
                totalTests={healthCWQI.totalTests}
                failedTests={healthCWQI.failedTests}
                type="health"
                showScale={false}
              />
            )}
            {aoCWQI && (
              <CWQIGauge 
                title="Aesthetic & Operational Score"
                score={aoCWQI.score}
                rating={aoCWQI.rating}
                totalTests={aoCWQI.totalTests}
                failedTests={aoCWQI.failedTests}
                type="aesthetic"
                showScale={false}
              />
            )}
          </div>

          {/* CWQI Score Scale Reference */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-4 text-center">CWQI Score Scale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">0-44: Poor</div>
                  <div className="text-gray-600 text-xs mt-1">Most parameters exceed guidelines by large amounts. Water quality is poor and likely unsafe.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">45-64: Marginal</div>
                  <div className="text-gray-600 text-xs mt-1">Many parameters exceed guidelines. Water quality is likely to pose issues without treatment.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">65-79: Fair</div>
                  <div className="text-gray-600 text-xs mt-1">Several parameters exceed guidelines, and some by larger amounts. Water quality may require treatment.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">80-88: Good</div>
                  <div className="text-gray-600 text-xs mt-1">Some parameters exceed guidelines, usually by small to moderate amounts. Water is generally acceptable.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-teal-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">89-94: Very Good</div>
                  <div className="text-gray-600 text-xs mt-1">One or more parameters slightly exceed guidelines, but overall water quality remains very safe and clean.</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex-shrink-0 mt-1"></div>
                <div>
                  <div className="font-medium text-gray-900">95-100: Excellent</div>
                  <div className="text-gray-600 text-xs mt-1">Almost all parameters meet the guidelines, and any exceedances are very small. Water quality is considered extremely high.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Road Salt Assessment */}
        {roadSaltAssessment && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Road Salt Impact Assessment</h2>
            <div className={`p-6 rounded-lg border-2 ${roadSaltAssessment.hasContamination ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{roadSaltAssessment.status}</h3>
                  <p className="text-sm text-gray-600 mt-1">{roadSaltAssessment.assessmentText}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${roadSaltAssessment.hasContamination ? 'text-red-600' : 'text-green-600'}`}>
                    {roadSaltAssessment.clBrRatio || roadSaltAssessment.chlorideLevel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parameters of Concern */}
        {(healthConcerns.length > 0 || aoConcerns.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Parameters of Concern</h2>
            
            {/* Instructions Container */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-800 font-medium">
                  Click on any parameter card below to view detailed health considerations and information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthConcerns.map((param, index) => (
                <div
                  key={`health-concern-${index}`}
                  onClick={() => handleParameterClick(param)}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <ParameterCard 
                    parameter={param} 
                    type="health" 
                    formatLabResult={formatLabResult}
                    isConcern={true}
                  />
                </div>
              ))}
              {aoConcerns.map((param, index) => (
                <div
                  key={`ao-concern-${index}`}
                  onClick={() => handleParameterClick(param)}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <ParameterCard 
                    parameter={param} 
                    type="aesthetic" 
                    formatLabResult={formatLabResult}
                    isConcern={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Results Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Results</h2>
          
          {/* Filter and Section Navigation */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveSection('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${activeSection === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All Results
                </button>
                <button
                  onClick={() => setActiveSection('health')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${activeSection === 'health' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Health-Related ({healthParameters.length})
                </button>
                <button
                  onClick={() => setActiveSection('aesthetic')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${activeSection === 'aesthetic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Aesthetic & Operational ({aoParameters.length})
                </button>
                <button
                  onClick={() => setActiveSection('general')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${activeSection === 'general' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  General ({generalParameters.length})
                </button>
              </div>
              
              <div className="w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter parameters..."
                  value={parameterFilter}
                  onChange={(e) => setParameterFilter(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Results Tables */}
          <div className="space-y-8">
            {(activeSection === 'all' || activeSection === 'health') && healthParameters.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Health-Related Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredParameters(healthParameters).map((param, index) => (
                    <ParameterCard key={`health-${index}`} parameter={param} type="health" formatLabResult={formatLabResult} />
                  ))}
                </div>
              </div>
            )}
            
            {(activeSection === 'all' || activeSection === 'aesthetic') && aoParameters.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Aesthetic & Operational Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredParameters(aoParameters).map((param, index) => (
                    <ParameterCard key={`ao-${index}`} parameter={param} type="aesthetic" formatLabResult={formatLabResult} />
                  ))}
                </div>
              </div>
            )}
            
            {(activeSection === 'all' || activeSection === 'general') && generalParameters.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">General Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredParameters(generalParameters).map((param, index) => (
                    <ParameterCard key={`general-${index}`} parameter={param} type="general" formatLabResult={formatLabResult} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h2>
          <div className="space-y-3 text-gray-700">
            <p>• Consult with a water treatment professional if any parameters exceed guidelines</p>
            <p>• Consider annual testing to monitor water quality changes</p>
            <p>• If bacteria are detected, disinfect your well system immediately</p>
            <p>• Contact My Water Quality if you have questions about your results</p>
          </div>
        </div>
      </div>

      {/* Parameter Details Modal */}
      {showModal && selectedParameter && (
        <ParameterModal
          parameter={selectedParameter}
          onClose={() => {
            setShowModal(false);
            setSelectedParameter(null);
          }}
          formatLabResult={formatLabResult}
        />
      )}
    </div>
  );
}

// Parameter Card Component
function ParameterCard({ parameter, type, formatLabResult, isConcern = false }) {
  // Determine if parameter exceeds limits
  let isExceeded = false;
  let statusColor = 'text-green-600';
  let bgColor = 'bg-white';
  let borderColor = 'border-gray-200';
  
  if (type === 'health') {
    isExceeded = parameter.compliance_status === 'EXCEEDS_MAC';
  } else if (type === 'aesthetic') {
    isExceeded = parameter.compliance_status === 'EXCEEDS_AO' || 
                (parameter.compliance_status === 'AO_RANGE_VALUE' && parameter.overall_compliance_status === 'WARNING');
  }
  
  // Override styling for concern cards
  if (isConcern || isExceeded) {
    if (type === 'health') {
      statusColor = 'text-red-600';
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
    } else if (type === 'aesthetic') {
      statusColor = 'text-yellow-600';
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-200';
    } else {
      statusColor = 'text-red-600';
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
    }
  }

  // Get proper result display value
  const resultValue = parameter.result_display_value || formatLabResult(parameter);
  const resultUnit = parameter.result_units || '';
  
  // Get proper limit display value based on parameter type
  let limitValue = 'No Standard';
  if (type === 'health' && parameter.mac_display_value) {
    limitValue = parameter.mac_display_value;
  } else if (type === 'aesthetic' && parameter.ao_display_value) {
    limitValue = parameter.ao_display_value;
  }
  
  const limitWithUnits = limitValue !== 'No Standard' && resultUnit ? `${limitValue} ${resultUnit}` : limitValue;
  const resultWithUnits = resultUnit ? `${resultValue} ${resultUnit}` : resultValue;

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 shadow-sm ${isConcern ? 'relative' : ''}`}>
      <h3 className={`font-semibold text-gray-900 mb-2 ${type === 'general' ? 'text-center' : ''}`}>{parameter.parameter_name}</h3>
      <div className="space-y-2">
        {type === 'general' ? (
          // For general parameters, only show the result value without "Result:" label
          <div className="text-center">
            <span className="text-lg font-medium">{resultWithUnits}</span>
          </div>
        ) : (
          // For health and aesthetic parameters, show full details
          <>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Result:</span>
              <span className="text-sm font-medium">{resultWithUnits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Limit:</span>
              <span className="text-sm">{limitWithUnits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`text-sm font-medium ${statusColor}`}>
                {isExceeded ? 'Exceeds Limit' : 'Within Limit'}
              </span>
            </div>
          </>
        )}
      </div>
      {isConcern && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">Click for detailed information</p>
        </div>
      )}
    </div>
  );
}