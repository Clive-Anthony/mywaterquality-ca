// src/pages/InsightsPage.jsx - Complete Water Quality Insights Dashboard
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { calculateCCMEWQI } from '../lib/ccmeWQI';
import PageLayout from '../components/PageLayout';
import DashboardTabs from '../components/DashboardTabs';
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

export default function InsightsPage() {
  const { user } = useAuth();
  const [allTestResults, setAllTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [parameterSearchTerm, setParameterSearchTerm] = useState('');
  const [showParameterSuggestions, setShowParameterSuggestions] = useState(false);

  // Load all reports for the user
  const loadUserReports = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: reportsData, error: reportsError } = await supabase
        .from('vw_customer_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('approval_status', true)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setAllTestResults([]);
        setLoading(false);
        return;
      }

      // Load test results for all reports
      const allResults = [];
      for (const report of reportsData) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('vw_test_results_with_parameters')
            .select('*')
            .eq('work_order_number', report.work_order_number)
            .order('parameter_name');

          if (testError) {
            console.error(`Error loading test results for ${report.work_order_number}:`, testError);
            continue;
          }

          if (testData && testData.length > 0) {
            // Add report metadata to each test result
            const enhancedResults = testData.map(result => ({
              ...result,
              report_id: report.report_id,
              kit_code: report.kit_code,
              report_date: report.created_at,
              test_kit_name: report.test_kit_name
            }));
            allResults.push(...enhancedResults);
          }
        } catch (err) {
          console.error(`Failed to load test results for report ${report.report_id}:`, err);
        }
      }

      setAllTestResults(allResults);
    } catch (err) {
      console.error('Error loading user reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserReports();
    }
  }, [user, loadUserReports]);

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

    // Group results by report
    const resultsByReport = filteredResults.reduce((acc, result) => {
      if (!acc[result.report_id]) {
        acc[result.report_id] = {
          report_id: result.report_id,
          kit_code: result.kit_code,
          report_date: result.report_date,
          test_kit_name: result.test_kit_name,
          results: []
        };
      }
      acc[result.report_id].results.push(result);
      return acc;
    }, {});

    const reportGroups = Object.values(resultsByReport);

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

    // Calculate overall CWQI scores across all reports
    const allHealthParameters = reportScores.flatMap(report => report.healthParameters);
    const allAoParameters = reportScores.flatMap(report => report.aoParameters);
    
    const overallHealthCWQI = calculateCCMEWQI(allHealthParameters);
    const overallAoCWQI = calculateCCMEWQI(allAoParameters);

    // Get unique parameters for search
    const uniqueParameters = [...new Set(filteredResults.map(r => r.parameter_name))].sort();

    // Calculate parameter trends (if multiple reports)
    const parameterTrends = {};
    if (reportScores.length > 1) {
      uniqueParameters.forEach(paramName => {
        const paramResults = reportScores
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
              improvement: percentChange < 0 // For most parameters, lower is better
            };
          }
        }
      });
    }

    return {
      reportScores: reportScores.sort((a, b) => new Date(a.report_date) - new Date(b.report_date)),
      overallHealthCWQI,
      overallAoCWQI,
      uniqueParameters,
      parameterTrends,
      totalReports: reportScores.length,
      dateRange: reportScores.length > 0 ? {
        earliest: new Date(Math.min(...reportScores.map(r => new Date(r.report_date)))),
        latest: new Date(Math.max(...reportScores.map(r => new Date(r.report_date))))
      } : null
    };
  }, [allTestResults, timeRange]);

  // Filter parameters based on search term
  const filteredParameters = useMemo(() => {
    if (!processedInsights) return [];
    return processedInsights.uniqueParameters.filter(param =>
      param.toLowerCase().includes(parameterSearchTerm.toLowerCase())
    );
  }, [processedInsights, parameterSearchTerm]);

  const handleParameterSearch = (value) => {
    setParameterSearchTerm(value);
    setShowParameterSuggestions(value.length > 0);
  };

  const handleParameterSelect = (parameter) => {
    setSelectedParameter(parameter);
    setParameterSearchTerm('');
    setShowParameterSuggestions(false);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8">
            <DashboardTabs />
            <div className="flex-1 flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading insights...</span>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8">
            <DashboardTabs />
            <div className="flex-1">
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
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!processedInsights || processedInsights.totalReports === 0) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8">
            <DashboardTabs />
            <div className="flex-1">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Reports Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You need at least one approved water quality report to view insights.
                </p>
                <div className="mt-6">
                  <Link
                    to="/shop"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Order a Water Testing Kit
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <DashboardTabs />
          
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Water Quality Insights</h1>
              <p className="text-gray-600">
                Track your water quality trends across {processedInsights.totalReports} report{processedInsights.totalReports !== 1 ? 's' : ''}
                {processedInsights.dateRange && (
                  <> from {processedInsights.dateRange.earliest.toLocaleDateString()} to {processedInsights.dateRange.latest.toLocaleDateString()}</>
                )}
              </p>
            </div>

            {/* Time Range Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
            </div>

            {/* Overall CWQI Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
              <div className="mb-8">
                <CWQITrendsChart reportScores={processedInsights.reportScores} />
              </div>
            )}

            {/* Parameter-Specific Analysis */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Parameter Analysis</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Parameter
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={parameterSearchTerm}
                    onChange={(e) => handleParameterSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowParameterSuggestions(false), 200)}
                    onFocus={() => setShowParameterSuggestions(parameterSearchTerm.length > 0)}
                    placeholder="Start typing to search parameters..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {showParameterSuggestions && filteredParameters.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                      {filteredParameters.slice(0, 10).map(param => (
                        <button
                          key={param}
                          onClick={() => handleParameterSelect(param)}
                          className="block w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 text-sm"
                        >
                          {param}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
              <div className="mb-8">
                <ParameterTrendsTable trends={processedInsights.parameterTrends} />
              </div>
            )}

            {/* Reports Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Reports</h2>
              <div className="space-y-3">
                {processedInsights.reportScores.map(report => (
                  <div key={report.report_id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <div>
                      <h3 className="font-medium text-gray-900">{report.kit_code}</h3>
                      <p className="text-sm text-gray-500">
                        {report.test_kit_name} • {new Date(report.report_date).toLocaleDateString()}
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
                      <Link
                        to={`/dashboard/reports/${report.kit_code}`}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        View Report
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// CWQI Score Card Component
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

// CWQI Trends Chart Component
function CWQITrendsChart({ reportScores }) {
  const chartRef = useCallback(node => {
    if (node !== null) {
      const ctx = node.getContext('2d');
      
      // Destroy existing chart if it exists
      if (node.chartInstance) {
        node.chartInstance.destroy();
      }

      const labels = reportScores.map(report => new Date(report.report_date).toLocaleDateString());
      
      const datasets = [];
      
      // Add health data if available
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

      // Add AO data if available
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
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0];
              const reportData = reportScores[element.index];
              // Navigate to report detail page
              window.location.href = `/dashboard/reports/${reportData.kit_code}`;
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

// Parameter Trend Chart Component
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
    <div className="bg-white rounded-lg shadow p-6">
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

// Parameter Trends Table Component
function ParameterTrendsTable({ trends }) {
  const sortedTrends = Object.entries(trends)
    .sort(([,a], [,b]) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 10); // Show top 10 changes

  const improvements = sortedTrends.filter(([,trend]) => trend.improvement);
  const deteriorations = sortedTrends.filter(([,trend]) => !trend.improvement);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Parameter Changes</h2>
        <p className="text-gray-600">Biggest changes between your first and latest tests</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Improvements */}
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

        {/* Deteriorations */}
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