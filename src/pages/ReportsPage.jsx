//  Dedicated reports page
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import DashboardTabs from '../components/DashboardTabs';
import CustomerReports from '../components/CustomerReports';

export default function ReportsPage() {
  const navigate = useNavigate();

  // Hero component for the reports page
  const ReportsHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-64">
      <div className="absolute inset-0 bg-opacity-50 bg-blue-900">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Water Quality Reports
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            View and analyze your comprehensive water quality test results.
          </p>
        </div>
      </div>
    </div>
  );

  const handleReportSelect = (reportId, kitCode) => {
    navigate(`/dashboard/reports/${kitCode}`);
  };

  return (
    <PageLayout hero={<ReportsHero />}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <DashboardTabs />

          {/* Main Content Area */}
          <div className="flex-1">
            <CustomerReports 
              showTitle={false} 
              maxHeight="max-h-full" 
              onReportSelect={handleReportSelect}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}