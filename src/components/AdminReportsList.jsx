// src/components/AdminReportsList.jsx - Component to view all generated reports
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminReportsList() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, registered, unregistered, one_off

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load reports from the admin view
      const { data, error: reportsError } = await supabase
        .from('vw_admin_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) {
        throw reportsError;
      }

      setReports(data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId, kitCode) => {
    try {
      const { data: report, error } = await supabase
        .from('reports')
        .select('pdf_file_url')
        .eq('report_id', reportId)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        setError('Failed to fetch report details');
        return;
      }

      if (!report?.pdf_file_url) {
        setError('Report PDF not available');
        return;
      }

      let fileName;
      if (report.pdf_file_url.includes('/')) {
        fileName = report.pdf_file_url.split('/').pop();
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
        setError(null); // Clear any previous errors on success
      } else {
        setError('Failed to generate download link');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReportTypeBadge = (reportType) => {
    const types = {
      registered: { color: 'bg-blue-100 text-blue-800', label: 'Registered' },
      unregistered: { color: 'bg-yellow-100 text-yellow-800', label: 'Unregistered' },
      one_off: { color: 'bg-purple-100 text-purple-800', label: 'One-off' }
    };
    
    const typeInfo = types[reportType] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statuses = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      processing: { color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' }
    };
    
    const statusInfo = statuses[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Filter reports based on search and filter criteria
  const filteredReports = reports.filter(report => {
    // Filter by type
    if (filterType !== 'all' && report.report_type !== filterType) {
      return false;
    }

    // Filter by search query
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      report.sample_number?.toLowerCase().includes(query) ||
      report.work_order_number?.toLowerCase().includes(query) ||
      report.customer_first_name?.toLowerCase().includes(query) ||
      report.customer_last_name?.toLowerCase().includes(query) ||
      report.customer_email?.toLowerCase().includes(query) ||
      report.kit_code?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Generated Reports
          </h3>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2 sm:mb-0">
              Generated Reports
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter dropdown */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Types</option>
                <option value="registered">Registered</option>
                <option value="unregistered">Unregistered</option>
                <option value="one_off">One-off</option>
              </select>
              
              {/* Search input */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          {reports.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {filteredReports.length} of {reports.length} reports
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No reports have been generated yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kit Info
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.report_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Sample: {report.sample_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          Work Order: {report.work_order_number || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Generated: {formatDate(report.created_at)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.customer_first_name} {report.customer_last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.customer_email || 'No email'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.kit_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.test_kit_name || 'Unknown Kit'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getReportTypeBadge(report.report_type)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(report.processing_status)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {report.processing_status === 'completed' && report.pdf_file_url ? (
                        <button
                          onClick={() => handleDownloadReport(report.report_id, report.kit_code)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                        >
                          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </button>
                      ) : report.processing_status === 'processing' ? (
                        <span className="text-gray-400 text-sm">Processing...</span>
                      ) : report.processing_status === 'failed' ? (
                        <span className="text-red-400 text-sm">Failed</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Refresh button */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={loadReports}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}