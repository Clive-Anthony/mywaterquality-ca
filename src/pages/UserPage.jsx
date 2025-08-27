// src/pages/UserPage.jsx - Simplified dashboard main page
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import DashboardTabs from '../components/DashboardTabs';
import OrdersList from '../components/OrdersList';

export default function UserPage() {
  // Hero component for the dashboard
  const DashboardHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-64">
      <div className="absolute inset-0 bg-opacity-50 bg-blue-900">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Welcome to My Water Quality
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            Test, track, and improve your water quality with our comprehensive testing kits and detailed analysis.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<DashboardHero />}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <DashboardTabs />

          {/* Main Content Area */}
          <div className="flex-1">
            <DashboardContent />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Dashboard content component
function DashboardContent() {
  return (
    <>
      {/* Recent Orders Preview */}
      <div className="mb-8">
        <OrdersList showTitle={true} maxHeight="max-h-80" compact={true} />
      </div>

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Card 1 */}
        <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">Order Water Testing Kit</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Purchase a comprehensive water testing kit for your home or business.
                </p>
                <div className="mt-4">
                  <Link
                    to="/shop"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Browse Kits
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">Water Quality Tips</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Learn best practices for improving and maintaining your water quality.
                </p>
                <div className="mt-4">
                  <Link
                    to='/about-canadas-drinking-water'
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                  >
                    Read Tips
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resources Section */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Water Quality Resources</h2>
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-800 mb-3">Why Water Quality Matters</h3>
          <p className="text-blue-700 mb-4">
            Clean water is essential for health and well-being. Regular testing helps identify potential contaminants before they become health hazards.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-4 rounded shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Common Water Contaminants</h4>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Lead and heavy metals</li>
                <li>Bacteria</li>
                <li>Pesticides and chemicals</li>
                <li>Nitrates and phosphates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}