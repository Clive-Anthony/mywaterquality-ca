//  Individual report detail page
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import WaterQualityDashboard from '../components/WaterQualityDashboard';
import PageLayout from '../components/PageLayout';

export default function ReportDetailPage() {
  const { kitCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    if (!user || !kitCode) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: reportError } = await supabase
        .from('vw_customer_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('kit_code', kitCode)
        .eq('approval_status', true)
        .single();

      if (reportError) {
        if (reportError.code === 'PGRST116') {
          setError('Report not found');
        } else {
          throw reportError;
        }
        return;
      }

      setReport(data);
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, kitCode]);

  useEffect(() => {
    if (user) {
      loadReport();
    }
  }, [user, loadReport]);

  const handleBackToReports = () => {
    navigate('/dashboard/reports');
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

  if (loading) {
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
                  Back to Reports
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
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <WaterQualityDashboard 
        report={report}
        onBack={handleBackToReports}
        onDownloadReport={handleDownloadReport}
      />
    </PageLayout>
  );
}