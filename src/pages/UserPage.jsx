// src/pages/UserPage.jsx - Updated with working Orders tab
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/PageLayout';
import ProfileForm from '../components/ProfileForm';
import OrdersList from '../components/OrdersList';
import CustomerReports from '../components/CustomerReports';
// import KitRegistrationsSummary from '../components/KitRegistrationsSummary';


export default function UserPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  // Function to render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'orders':
        return <OrdersList showTitle={false} maxHeight="max-h-full" />;
      case 'reports':
        return <CustomerReports showTitle={false} maxHeight="max-h-full" />;
      case 'profile':
        return <ProfileForm />;
      default:
        return <DashboardContent />;
    }
  };
  
  return (
    <PageLayout hero={<DashboardHero />}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Menu</h3>
              </div>
              <nav className="py-2">
                <ul>
                  <li>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full text-left px-6 py-3 flex items-center ${
                        activeTab === 'dashboard'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 ${
                          activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`w-full text-left px-6 py-3 flex items-center ${
                        activeTab === 'orders'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 ${
                          activeTab === 'orders' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                      Orders
                    </button>
                  </li>
                    <li>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`w-full text-left px-6 py-3 flex items-center ${
                        activeTab === 'reports'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 ${
                          activeTab === 'reports' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Reports
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`w-full text-left px-6 py-3 flex items-center ${
                        activeTab === 'profile'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-3 h-5 w-5 ${
                          activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Profile
                    </button>
                  </li>
                </ul>
              </nav>
              {/* Register Test Kit Button */}
              <div className="px-6 py-4 border-t border-gray-200">
                <Link
                  to="/register-kit"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  Register a Test Kit
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {renderContent()}
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
      {/* Dashboard Summary */}
      {/* <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Your Dashboard
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Quick overview of your water quality testing status.
          </p>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Active Test Kits</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-600">0</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Tests Completed</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-600">0</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
              <dd className="mt-1">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  None
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div> */}

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
        {/* <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-gray-900">View Test Results</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Access and analyze your previous water testing results.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  >
                    View Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Card 3 */}
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
            {/* <div className="bg-white p-4 rounded shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Testing Frequency</h4>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Annual testing for most households</li>
                <li>Bi-annual for homes with private wells</li>
                <li>Quarterly for homes with water quality concerns</li>
                <li>After major plumbing work</li>
              </ul>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
}