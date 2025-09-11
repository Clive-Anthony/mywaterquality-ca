// src/components/AdminInsights.jsx - Admin Water Quality Insights Dashboard with Report Links
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateCCMEWQI } from '../lib/ccmeWQI';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend
);

export default function AdminInsights() {
  const navigate = useNavigate();
  const [availableResults, setAvailableResults] = useState([]);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState('');
  const [allTestResults, setAllTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState('');
  const [timeRange, setTimeRange] = useState('all');

  // Load all available results using the same logic as AdminWaterQualityResults
  const loadAvailableResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all test kits that have completed test results
      const { data, error: resultsError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .not('work_order_number', 'is', null)
        .not('sample_number', 'is', null)
        .order('kit_created_at', { ascending: false });

      if (resultsError) {
        throw new Error(`Failed to load test results: ${resultsError.message}`);
      }

      setAvailableResults(data || []);

      // Get unique customers for dropdown
      const uniqueCustomers = (data || []).reduce((acc, result) => {
        if (!acc.find(c => c.customer_email === result.customer_email)) {
          acc.push({
            customer_email: result.customer_email,
            customer_first_name: result.customer_first_name,
            customer_last_name: result.customer_last_name,
            display_name: `${result.customer_first_name || ''} ${result.customer_last_name || ''}`.trim() || result.customer_email
          });
        }
        return acc;
      }, []);

      setCustomers(uniqueCustomers);
    } catch (err) {
      console.error('Error loading available results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const [customers, setCustomers] = useState([]);

  // Load test results for selected customer (or all customers)
  const loadTestResultsData = useCallback(async () => {
    try {
      if (availableResults.length === 0) {
        setAllTestResults([]);
        return;
      }

      let filteredResults = availableResults;

      // Filter by customer if one is selected
      if (selectedCustomerEmail) {
        filteredResults = availableResults.filter(result => 
          result.customer_email === selectedCustomerEmail
        );
      }

      if (filteredResults.length === 0) {
        setAllTestResults([]);
        return;
      }

      // Load test results for filtered results
      const allResults = [];
      for (const result of filteredResults) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('vw_test_results_with_parameters')
            .select('*')
            .eq('work_order_number', result.work_order_number)
            .order('parameter_name');

          if (testError) {
            console.error(`Error loading test results for ${result.work_order_number}:`, testError);
            continue;
          }

          if (testData && testData.length > 0) {
            // Add result metadata to each test result
            const enhancedResults = testData.map(testResult => ({
              ...testResult,
              kit_code: result.kit_code,
              report_date: result.kit_created_at,
              test_kit_name: result.test_kit_name,
              customer_email: result.customer_email,
              customer_first_name: result.customer_first_name,
              customer_last_name: result.customer_last_name
            }));
            allResults.push(...enhancedResults);
          }
        } catch (err) {
          console.error(`Failed to load test results for kit ${result.kit_code}:`, err);
        }
      }

      setAllTestResults(allResults);
    } catch (err) {
      console.error('Error loading test results data:', err);
      setError(err.message);
    }
  }, [availableResults, selectedCustomerEmail]);

  useEffect(() => {
    loadAvailableResults();
  }, [loadAvailableResults]);

  useEffect(() => {
    loadTestResultsData();
  }, [loadTestResultsData]);

  // Navigate to report detail page
  const handleViewReport = (kitCode) => {
    navigate(`/dashboard/reports/${kitCode}`);
  };

  // Process data for insights
  const processedInsights = useMemo(() => {
    if (allTestResults.length === 0) return null;

    // Filter by time range
    const now = new Date();
    const filteredResults = allTestResults.filter(result => {
      if (timeRange === 'all') return true;
      
      const resultDate = new Date(result.report_date);
      const monthsBack = timeRange === '3months' ? 3 : 
                        timeRange === '6months' ? 6 : 
                        timeRange === '1year' ? 12 : 0;
      
      if (monthsBack === 0) return true;
      
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
      return resultDate >= cutoffDate;
    });

    // Group results by kit_code for report-level analysis
    const resultsByKit = filteredResults.reduce((acc, result) => {
      if (!acc[result.kit_code]) {
        acc[result.kit_code] = {
          kit_code: result.kit_code,
          report_date: result.report_date,
          test_kit_name: result.test_kit_name,
          customer_email: result.customer_email,
          customer_first_name: result.customer_first_name,
          customer_last_name: result.customer_last_name,
          work_order_number: result.work_order_number,
          results: []
        };
      }
      acc[result.kit_code].results.push(result);
      return acc;
    }, {});

    const reportGroups = Object.values(resultsByKit);

    // Calculate CWQI scores for each report
    const reportScores = reportGroups.map(group => {
      // Separate health and AO parameters
      const healthParameters = group.results.filter(row => 
        (row.parameter_type === 'MAC' || row.parameter_type === 'Hybrid') &&
        row.mac_value !== null && row.mac_value !== undefined && row.mac_value !== ''
      ).map(row => ({
        ...row,
        objective_value: row.mac_value,
        objective_display: row.mac_display,
        compliance_status: row.mac_compliance_status,
        parameter_category: 'health'
      }));

      const aoParameters = group.results.filter(row => 
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

      const healthCWQI = calculateCCMEWQI(healthParameters);
      const aoCWQI = calculateCCMEWQI(aoParameters);

      return {
        ...group,
        healthCWQI,
        aoCWQI,
        healthParameters,
        aoParameters
      };
    });

    // Filter to show only the most recent report per kit_code
    const mostRecentReports = reportScores.reduce((acc, report) => {
      const existing = acc.find(r => r.kit_code === report.kit_code);
      if (!existing || new Date(report.report_date) > new Date(existing.report_date)) {
        if (existing) {
          const index = acc.indexOf(existing);
          acc[index] = report;
        } else {
          acc.push(report);
        }
      }
      return acc;
    }, []);

    // Sort by date
    const sortedReports = mostRecentReports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

    // Calculate overall CWQI scores across most recent reports only
    const allHealthParameters = sortedReports.flatMap(report => report.healthParameters);
    const allAoParameters = sortedReports.flatMap(report => report.aoParameters);
    
    const overallHealthCWQI = selectedCustomerEmail ? calculateCCMEWQI(allHealthParameters) : null;
    const overallAoCWQI = selectedCustomerEmail ? calculateCCMEWQI(allAoParameters) : null;

    // Get unique parameters for search (only if customer selected)
    const uniqueParameters = selectedCustomerEmail ? [...new Set(filteredResults.map(r => r.parameter_name))].sort() : [];

    // Calculate parameter trends (only if customer selected and multiple reports)
    const parameterTrends = {};
    if (selectedCustomerEmail && sortedReports.length > 1) {
      uniqueParameters.forEach(paramName => {
        const paramResults = sortedReports
          .map(report => {
            const param = report.results.find(r => r.parameter_name === paramName);
            return param ? {
              report_date: report.report_date,
              result_numeric: parseFloat(param.result_numeric),
              kit_code: report.kit_code
            } : null;
          })
          .filter(Boolean)
          .sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

        if (paramResults.length >= 2) {
          const firstValue = paramResults[0].result_numeric;
          const lastValue = paramResults[paramResults.length - 1].result_numeric;
          
          if (!isNaN(firstValue) && !isNaN(lastValue) && firstValue !== 0) {
            const percentChange = ((lastValue - firstValue) / firstValue) * 100;
            parameterTrends[paramName] = {
              results: paramResults,
              percentChange,
              improvement: percentChange < 0
            };
          }
        }
      });
    }

    return {
      reportScores: sortedReports,
      overallHealthCWQI,
      overallAoCWQI,
      uniqueParameters,
      parameterTrends,
      totalReports: sortedReports.length,
      dateRange: sortedReports.length > 0 ? {
        earliest: new Date(Math.min(...sortedReports.map(r => new Date(r.report_date)))),
        latest: new Date(Math.max(...sortedReports.map(r => new Date(r.report_date))))
      } : null
    };
  }, [allTestResults, timeRange, selectedCustomerEmail]);

  const getSelectedCustomerName = () => {
    if (!selectedCustomerEmail) return 'All Customers';
    const customer = customers.find(c => c.customer_email === selectedCustomerEmail);
    return customer ? customer.display_name : 'Unknown Customer';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Insights</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Water Quality Insights</h1>
          <p className="text-gray-600">
            Monitor water quality trends across all customers or select a specific customer for detailed analysis.
          </p>
          {/* Informational line */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Please select a customer to view detailed analytics and trends
            </p>
          </div>
        </div>

        {processedInsights && (
          <div className="mb-6">
            <p className="text-gray-600">
              {selectedCustomerEmail 
                ? `Analyzing water quality trends for ${getSelectedCustomerName()} across ${processedInsights.totalReports} test kit${processedInsights.totalReports !== 1 ? 's' : ''}`
                : `Viewing most recent reports for ${processedInsights.totalReports} test kit${processedInsights.totalReports !== 1 ? 's' : ''} across all customers`
              }
              {processedInsights.dateRange && (
                <> from {processedInsights.dateRange.earliest.toLocaleDateString()} to {processedInsights.dateRange.latest.toLocaleDateString()}</>
              )}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <select
              value={selectedCustomerEmail}
              onChange={(e) => setSelectedCustomerEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Customers (Most Recent Reports Only)</option>
              {customers.map(customer => (
                <option key={customer.customer_email} value={customer.customer_email}>
                  {customer.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {!processedInsights || processedInsights.totalReports === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Reports Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedCustomerEmail 
              ? `No water quality reports found for ${getSelectedCustomerName()}.`
              : 'No water quality reports found in the system.'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Only show detailed analysis when a customer is selected */}
          {selectedCustomerEmail && (
            <>
              {/* Overall CWQI Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CWQIScoreCard
                  title="Overall Health Score"
                  cwqi={processedInsights.overallHealthCWQI}
                />
                <CWQIScoreCard
                  title="Overall Aesthetic & Operational Score"
                  cwqi={processedInsights.overallAoCWQI}
                />
              </div>

              {/* CWQI Trends Over Time */}
              {processedInsights.totalReports > 1 && (
                <CWQITrendsChart reportScores={processedInsights.reportScores} />
              )}

              {/* Parameter-Specific Analysis */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Parameter Analysis</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Parameter
                  </label>
                  <select
                    value={selectedParameter}
                    onChange={(e) => setSelectedParameter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a parameter to view trends...</option>
                    {processedInsights.uniqueParameters.map(param => (
                      <option key={param} value={param}>
                        {param}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedParameter && (
                  <ParameterTrendChart
                    parameter={selectedParameter}
                    reportScores={processedInsights.reportScores}
                    onClose={() => setSelectedParameter('')}
                  />
                )}
              </div>

              {/* Parameter Trends Table */}
              {Object.keys(processedInsights.parameterTrends).length > 0 && (
                <ParameterTrendsTable trends={processedInsights.parameterTrends} />
              )}
            </>
          )}

          {/* Reports Summary - Always visible with View Report buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedCustomerEmail ? 'Customer Reports' : 'Most Recent Reports by Test Kit'}
            </h2>
            <div className="space-y-3">
              {processedInsights.reportScores.map(report => (
                <div key={`${report.kit_code}-${report.work_order_number}`} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {`${report.customer_first_name || ''} ${report.customer_last_name || ''}`.trim() || 'Unknown Customer'} - {report.test_kit_name} - {new Date(report.report_date).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {report.kit_code}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {report.healthCWQI && (
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          Health: {Math.round(report.healthCWQI.score)}
                        </div>
                        <div className={`text-xs ${report.healthCWQI.color}`}>
                          {report.healthCWQI.rating}
                        </div>
                      </div>
                    )}
                    {report.aoCWQI && (
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          A&O: {Math.round(report.aoCWQI.score)}
                        </div>
                        <div className={`text-xs ${report.aoCWQI.color}`}>
                          {report.aoCWQI.rating}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleViewReport(report.kit_code)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                      </svg>
                      View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Reuse components from customer insights
function CWQIScoreCard({ title, cwqi }) {
  if (!cwqi) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getColor = (score) => {
    if (score >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 89) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 65) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 45) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const colorClasses = getColor(cwqi.score);

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{Math.round(cwqi.score)}</div>
          <div className="text-sm font-medium">{cwqi.rating}</div>
        </div>
        <div className="text-right text-sm">
          <div>{cwqi.totalTests - cwqi.failedTests} of {cwqi.totalTests} passed</div>
          {cwqi.failedTests > 0 && (
            <div>{cwqi.failedTests} concern{cwqi.failedTests !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CWQITrendsChart({ reportScores }) {
  const chartRef = useCallback(node => {
    if (node !== null) {
      const ctx = node.getContext('2d');
      
      if (node.chartInstance) {
        node.chartInstance.destroy();
      }

      const labels = reportScores.map(report => new Date(report.report_date).toLocaleDateString());
      
      const datasets = [];
      
      const hasHealthData = reportScores.some(report => report.healthCWQI);
      if (hasHealthData) {
        datasets.push({
          label: 'Health Score',
          data: reportScores.map(report => report.healthCWQI ? report.healthCWQI.score : null),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#3B82F6',
          pointRadius: 5,
          spanGaps: true
        });
      }

      const hasAOData = reportScores.some(report => report.aoCWQI);
      if (hasAOData) {
        datasets.push({
          label: 'Aesthetic & Operational Score',
          data: reportScores.map(report => report.aoCWQI ? report.aoCWQI.score : null),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#10B981',
          pointRadius: 5,
          spanGaps: true
        });
      }

      if (datasets.length === 0) return;

      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Report Date'
              }
            },
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'CWQI Score'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Water Quality Trends Over Time'
            },
            tooltip: {
              callbacks: {
                afterLabel: (context) => {
                  const reportData = reportScores[context.dataIndex];
                  return [`Kit: ${reportData.kit_code}`, `Date: ${new Date(reportData.report_date).toLocaleDateString()}`];
                }
              }
            }
          }
        }
      });

      node.chartInstance = chart;
    }
  }, [reportScores]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <canvas ref={chartRef} width="400" height="200"></canvas>
    </div>
  );
}

function ParameterTrendChart({ parameter, reportScores, onClose }) {
  const chartRef = useCallback(node => {
    if (node !== null) {
      const ctx = node.getContext('2d');
      
      if (node.chartInstance) {
        node.chartInstance.destroy();
      }

      const parameterData = reportScores
        .map(report => {
          const param = report.results.find(r => r.parameter_name === parameter);
          return param ? {
            date: new Date(report.report_date).toLocaleDateString(),
            value: parseFloat(param.result_numeric),
            kitCode: report.kit_code,
            units: param.result_units,
            displayValue: param.result_display_value || param.result_value
          } : null;
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (parameterData.length === 0) return;

      const labels = parameterData.map(d => d.date);
      const values = parameterData.map(d => d.value);

      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: parameter,
            data: values,
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.1,
            pointBackgroundColor: '#8B5CF6',
            pointBorderColor: '#8B5CF6',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          interaction: {
            intersect: false,
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Report Date'
              }
            },
            y: {
              title: {
                display: true,
                text: parameterData[0]?.units || 'Value'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: `${parameter} Trend Over Time`
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const dataPoint = parameterData[context.dataIndex];
                  return `${dataPoint.displayValue} ${dataPoint.units || ''}`;
                },
                afterLabel: (context) => {
                  const dataPoint = parameterData[context.dataIndex];
                  return `Kit: ${dataPoint.kitCode}`;
                }
              }
            }
          }
        }
      });

      node.chartInstance = chart;
    }
  }, [parameter, reportScores]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{parameter} Trend</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <canvas ref={chartRef} width="400" height="200"></canvas>
    </div>
  );
}

function ParameterTrendsTable({ trends }) {
  const sortedTrends = Object.entries(trends)
    .sort(([,a], [,b]) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 10);

  const improvements = sortedTrends.filter(([,trend]) => trend.improvement);
  const deteriorations = sortedTrends.filter(([,trend]) => !trend.improvement);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Parameter Changes</h2>
        <p className="text-gray-600">Biggest changes between first and latest tests</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div>
          <h3 className="text-lg font-medium text-green-800 mb-3">Most Improved</h3>
          <div className="space-y-2">
            {improvements.length > 0 ? improvements.slice(0, 5).map(([parameter, trend]) => (
              <div key={parameter} className="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                <span className="text-sm text-gray-900 truncate pr-2">{parameter}</span>
                <span className="text-sm font-medium text-green-600">
                  {trend.percentChange.toFixed(1)}%
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-500">No improvements to display</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-red-800 mb-3">Most Concerning Changes</h3>
          <div className="space-y-2">
            {deteriorations.length > 0 ? deteriorations.slice(0, 5).map(([parameter, trend]) => (
              <div key={parameter} className="flex justify-between items-center py-2 border-b border-red-100 last:border-b-0">
                <span className="text-sm text-gray-900 truncate pr-2">{parameter}</span>
                <span className="text-sm font-medium text-red-600">
                  +{Math.abs(trend.percentChange).toFixed(1)}%
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-500">No concerning changes to display</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}