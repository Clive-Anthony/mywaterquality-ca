// Admin interface for viewing water quality results - Updated to use customer report URLs
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AdminWaterQualityResults() {
  const navigate = useNavigate();
  const [availableResults, setAvailableResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAvailableResults();
  }, []);

  const loadAvailableResults = async () => {
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
    } catch (err) {
      console.error('Error loading available results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSelect = (result) => {
    // Navigate to the same URL structure that customers use
    navigate(`/dashboard/reports/${result.kit_code}`);
  };

  const handleDownloadReport = async (reportId, kitCode, pdfFileUrl) => {
    try {
      if (!pdfFileUrl) {
        setError('Report PDF not available');
        return;
      }

      // Extract filename from URL
      let fileName;
      if (pdfFileUrl.includes('/')) {
        fileName = pdfFileUrl.split('/').pop();
      } else {
        fileName = `My-Water-Quality-Report-${kitCode}.pdf`;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('generated-reports')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        setError('Failed to generate download link');
        return;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
        setError(null);
      } else {
        setError('Failed to generate download link');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  // Filter results based on search query
  const filteredResults = availableResults.filter(result => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      result.kit_code?.toLowerCase().includes(query) ||
      result.customer_first_name?.toLowerCase().includes(query) ||
      result.customer_last_name?.toLowerCase().includes(query) ||
      result.customer_email?.toLowerCase().includes(query) ||
      result.order_number?.toLowerCase().includes(query) ||
      result.work_order_number?.toString().includes(query) ||
      result.sample_number?.toString().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Water Quality Results
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            View detailed water quality analysis for all completed test kits. Click "View Results" to access the same interactive dashboard that customers see.
          </p>
        </div>

        {/* Search and Stats */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by kit code, customer, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            {availableResults.length > 0 && (
              <p className="text-sm text-gray-500">
                {availableResults.length} total results available
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 sm:px-6 py-4 bg-red-50 border-b border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Loading test results...</span>
          </div>
        ) : filteredResults.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No results found' : 'No test results available'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search criteria.' 
                : 'Test results will appear here once laboratory analysis is completed and uploaded.'
              }
            </p>
          </div>
        ) : (
          /* Results Table */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kit Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <tr key={result.kit_id} className="hover:bg-gray-50">
                    {/* Customer Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {`${result.customer_first_name || ''} ${result.customer_last_name || ''}`.trim() || 'Unknown Customer'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {result.customer_email || 'No email'}
                        </div>
                      </div>
                    </td>

                    {/* Kit Details Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {result.kit_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          Order #{result.order_number}
                        </div>
                        <div className="text-xs text-gray-400">
                          {result.test_kit_name}
                        </div>
                      </div>
                    </td>

                    {/* Date Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(result.kit_created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleReportSelect(result)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                          title="View Interactive Results Dashboard"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                          </svg>
                          View Results
                        </button>
                        
                        {result.pdf_file_url && (
                          <button
                            onClick={() => handleDownloadReport(result.report_id, result.kit_code, result.pdf_file_url)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            title="Download PDF Report"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && filteredResults.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Showing {filteredResults.length} of {availableResults.length} available test results.
              Click "View Results" to access the same interactive water quality dashboard that customers see.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}