// src/pages/AdminPage.jsx - Admin dashboard page
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/PageLayout';
import AdminOrdersList from '../components/AdminOrdersList';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Hero component for the admin dashboard
  const AdminHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-64">
      <div className="absolute inset-0 bg-opacity-50 bg-blue-900">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            Manage orders, users, and system operations for My Water Quality.
          </p>
        </div>
      </div>
    </div>
  );

  // Function to render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardContent />;
      case 'orders':
        return <AdminOrdersList showTitle={false} maxHeight="max-h-full" />;
      case 'reports':
      case 'users':
      case 'kit-registrations':
        return <ComingSoonContent tabName={activeTab} />;
      default:
        return <AdminDashboardContent />;
    }
  };
  
  return (
    <PageLayout hero={<AdminHero />}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Admin Menu</h3>
              </div>
              <nav className="py-2">
                <ul>
                  <li>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full text-left px-4 sm:px-6 py-3 flex items-center text-sm sm:text-base ${
                        activeTab === 'dashboard'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
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
                      <span className="truncate">Dashboard</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`w-full text-left px-4 sm:px-6 py-3 flex items-center text-sm sm:text-base ${
                        activeTab === 'orders'
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg
                        className={`mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
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
                      <span className="truncate">Orders</span>
                    </button>
                  </li>
                  <li>
                    <button
                      disabled
                      className="w-full text-left px-4 sm:px-6 py-3 flex items-center text-gray-400 cursor-not-allowed text-sm sm:text-base"
                    >
                      <svg
                        className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-400"
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
                      <span className="truncate">Reports</span>
                      <span className="ml-auto bg-gray-100 text-xs px-2 py-1 rounded-full flex-shrink-0">Soon</span>
                    </button>
                  </li>
                  <li>
                    <button
                      disabled
                      className="w-full text-left px-4 sm:px-6 py-3 flex items-center text-gray-400 cursor-not-allowed text-sm sm:text-base"
                    >
                      <svg
                        className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        />
                      </svg>
                      <span className="truncate">Users</span>
                      <span className="ml-auto bg-gray-100 text-xs px-2 py-1 rounded-full flex-shrink-0">Soon</span>
                    </button>
                  </li>
                  <li>
                    <button
                      disabled
                      className="w-full text-left px-4 sm:px-6 py-3 flex items-center text-gray-400 cursor-not-allowed text-sm sm:text-base"
                    >
                      <svg
                        className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-400"
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
                      <span className="truncate">Kit Registrations</span>
                      <span className="ml-auto bg-gray-100 text-xs px-2 py-1 rounded-full flex-shrink-0">Soon</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

         {/* Main Content Area */}
         <div className="flex-1 min-w-0">
            <div className="max-w-none">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Admin dashboard content component
function AdminDashboardContent() {
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Recent Orders Preview */}
      <div className="w-full">
        <AdminOrdersList showTitle={true} maxHeight="max-h-80" compact={true} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Admin Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3 mb-8 sm:mb-12 max-w-none">
          {/* Card 1 - Order Management */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
            <div className="px-4 py-4 sm:p-6">
              <div className="flex items-start sm:items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 sm:p-3">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Manage Orders</h3>
                  <p className="mt-1 sm:mt-2 text-sm text-gray-500 leading-relaxed">
                    View and manage all customer orders across the platform.
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <button
                      onClick={() => document.querySelector('[data-tab="orders"]')?.click()}
                      className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                    >
                      View All Orders
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - System Health */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md">
            <div className="px-4 py-4 sm:p-6">
              <div className="flex items-start sm:items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-2 sm:p-3">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">System Status</h3>
                  <p className="mt-1 sm:mt-2 text-sm text-gray-500 leading-relaxed">
                    Monitor system health and performance metrics.
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 - User Management */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-shadow duration-300 hover:shadow-md lg:col-span-2 xl:col-span-1">
            <div className="px-4 py-4 sm:p-6">
              <div className="flex items-start sm:items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 sm:p-3">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">User Management</h3>
                  <p className="mt-1 sm:mt-2 text-sm text-gray-500 leading-relaxed">
                    Manage user accounts, roles, and permissions.
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* System Overview Section */}
      <div className="border-t border-gray-200 pt-6 sm:pt-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">System Overview</h2>
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 max-w-none">
          <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2 sm:mb-3">Admin Dashboard</h3>
          <p className="text-sm sm:text-base text-blue-700 mb-3 sm:mb-4 leading-relaxed max-w-4xl">
            Monitor and manage all aspects of the My Water Quality platform from this centralized dashboard.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 sm:mt-6 max-w-5xl">
            <div className="bg-white p-3 sm:p-4 rounded shadow-sm">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Current Features</h4>
              <ul className="list-disc pl-4 sm:pl-5 text-xs sm:text-sm text-gray-600 space-y-1">
                <li>Order management and tracking</li>
                <li>Customer order history</li>
                <li>Basic dashboard analytics</li>
                <li>Admin order filtering</li>
              </ul>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded shadow-sm">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Coming Soon</h4>
              <ul className="list-disc pl-4 sm:pl-5 text-xs sm:text-sm text-gray-600 space-y-1">
                <li>User role management</li>
                <li>Advanced reporting and analytics</li>
                <li>Kit registration management</li>
                <li>System performance monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coming soon content component
function ComingSoonContent({ tabName }) {
  const getTabDisplayName = (tab) => {
    switch (tab) {
      case 'reports':
        return 'Reports';
      case 'users':
        return 'User Management';
      case 'kit-registrations':
        return 'Kit Registrations';
      default:
        return 'Feature';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
          {getTabDisplayName(tabName)}
        </h3>
      </div>
      <div className="px-4 sm:px-6 py-8 sm:py-12 text-center">
        <svg className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4 max-w-sm mx-auto">
          The {getTabDisplayName(tabName).toLowerCase()} feature is currently under development.
        </p>
        <p className="text-xs sm:text-sm text-gray-400">
          Check back soon for updates!
        </p>
      </div>
    </div>
  );
}