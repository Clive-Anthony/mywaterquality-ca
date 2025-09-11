// src/pages/ReportDetailPage.jsx - Fixed to work with existing AuthContext
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import WaterQualityDashboard from '../components/WaterQualityDashboard';
import PageLayout from '../components/PageLayout';
import DashboardTabs from '../components/DashboardTabs';

export default function ReportDetailPage() {
  const { kitCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Only get user, not isAdmin
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch user role to determine if admin
  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      setRoleLoading(false);
      return;
    }

    try {
      setRoleLoading(true);
      
      const { data, error } = await supabase.rpc('get_user_role', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // Default to regular user on error
      } else {
        setUserRole(data || 'user');
      }
    } catch (err) {
      console.error('Exception fetching user role:', err);
      setUserRole('user'); // Default to regular user on error
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Calculate isAdmin from userRole
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const loadReport = useCallback(async () => {
    if (!user || !kitCode || roleLoading) return;

    try {
      setLoading(true);
      setError(null);

      let reportData;

      if (isAdmin) {
        // Admin can view any report - use admin view
        const { data: adminData, error: adminError } = await supabase
          .from('vw_test_kits_admin')
          .select('*')
          .eq('kit_code', kitCode)
          .not('work_order_number', 'is', null)
          .single();

        if (adminError) {
          if (adminError.code === 'PGRST116') {
            setError('Report not found');
          } else {
            throw adminError;
          }
          return;
        }

        // Transform admin data to match expected format
        reportData = {
          report_id: adminData.report_id || `admin-${adminData.kit_id}`,
          kit_code: adminData.kit_code,
          product_name: adminData.test_kit_name,
          work_order_number: adminData.work_order_number,
          sample_number: adminData.sample_number,
          test_kit_id: adminData.test_kit_id,
          pdf_file_url: adminData.pdf_file_url,
          order_number: adminData.order_number
        };
      } else {
        // Customer can only view their own reports
        const { data: customerData, error: customerError } = await supabase
          .from('vw_customer_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('kit_code', kitCode)
          .eq('approval_status', true)
          .single();

        if (customerError) {
          if (customerError.code === 'PGRST116') {
            setError('Report not found or you do not have permission to view it');
          } else {
            throw customerError;
          }
          return;
        }

        reportData = customerData;
      }

      setReport(reportData);
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, kitCode, isAdmin, roleLoading]);

  useEffect(() => {
    if (user && !roleLoading) {
      loadReport();
    }
  }, [user, loadReport, roleLoading]);

  const handleBackToReports = () => {
    if (isAdmin) {
      // Admin should go back to admin dashboard results tab
      navigate('/admin-dashboard#results');
    } else {
      // Customer should go back to customer dashboard reports
      navigate('/dashboard/reports');
    }
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

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-6 max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Report</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={handleBackToReports}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  {isAdmin ? 'Back to Admin Results' : 'Back to Reports'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-6 max-w-md text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Found</h3>
          <p className="text-gray-600 mb-4">
            The requested report could not be found or you don't have access to it.
          </p>
          <button
            onClick={handleBackToReports}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
          >
            {isAdmin ? 'Back to Admin Results' : 'Back to Reports'}
          </button>
        </div>
      </div>
    );
  }

  // For admin users, render the dashboard without the standard page layout and tabs
  if (isAdmin) {
    return (
      <WaterQualityDashboard 
        report={report}
        onBack={handleBackToReports}
        onDownloadReport={handleDownloadReport}
      />
    );
  }

  // For customers, render within the standard page layout with tabs
  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <DashboardTabs />
          <div className="flex-1">
            <WaterQualityDashboard 
              report={report}
              onBack={handleBackToReports}
              onDownloadReport={handleDownloadReport}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}