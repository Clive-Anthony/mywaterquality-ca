// Updated with dashboard functionality
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import WaterQualityDashboard from './WaterQualityDashboard';

export default function CustomerReports({ showTitle = true, maxHeight = "max-h-full", compact = false, onReportSelect }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomerReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: reportsError } = await supabase
        .from('vw_customer_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('approval_status', true)
        .order('order_number', { ascending: false });

      if (reportsError) {
        throw new Error(`Failed to load reports: ${reportsError.message}`);
      }

      setReports(data || []);
    } catch (err) {
      console.error('Error loading customer reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadCustomerReports();
    }
  }, [user, loadCustomerReports]);

  const handleReportSelect = (reportId) => {
  const report = reports.find(r => r.report_id === reportId);
  if (onReportSelect) {
    onReportSelect(reportId, report.kit_code);
  }
};



  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {showTitle && (
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              My Water Quality Reports
            </h3>
          </div>
        )}
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {showTitle && (
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2 sm:mb-0">
              My Water Quality Reports
            </h3>
            {reports.length > 0 && (
              <p className="text-sm text-gray-500">
                {reports.length} report{reports.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select a report to view detailed results or download the PDF.
          </p>
        </div>
      )}

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

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
          <p className="text-gray-500 mb-4">
            You don&apos;t have any completed water quality reports yet.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Reports will appear here once your water samples have been tested and approved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/shop"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
            >
              Shop Test Kits
            </a>
            <a
              href="/register-kit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200"
            >
              Register a Kit
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Report Selection Section */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label htmlFor="report-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Please select test kit to show results:
              </label>
              <select
                id="report-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleReportSelect(e.target.value);
                  }
                }}
                className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select a report...</option>
                {reports.map((report) => (
                  <option key={report.report_id} value={report.report_id}>
                    {report.kit_code} - {report.product_name} - Order {report.order_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reports Table */}
          <div className={`overflow-x-auto ${maxHeight}`}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Order
    </th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Kit Code
    </th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Product
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
                {reports.map((report) => (
                  <tr key={report.report_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.order_number}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.kit_code}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs">
                        {report.product_name}
                      </div>
                    </td>
                    
                    {/* ADD this new Date column before Actions */}
  <td className="px-4 py-4 whitespace-nowrap">
    <div className="text-sm text-gray-900">
      {new Date(report.created_at || report.order_date).toLocaleDateString()}
    </div>
  </td>
  
  <td className="px-4 py-4 whitespace-nowrap text-center">
    {/* REPLACE the entire actions div content with just the View Results button */}
    <button
      onClick={() => handleReportSelect(report.report_id)}
      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
      title="View Interactive Results"
    >
      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      </svg>
      View Results
    </button>
  </td>
</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!compact && reports.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Reports are generated after laboratory testing is complete and approved by our team.
          </p>
        </div>
      )}
    </div>
  );
}