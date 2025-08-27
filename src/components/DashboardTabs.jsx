// Reusable dashboard navigation component
import { Link, useLocation } from 'react-router-dom';

export default function DashboardTabs() {
  const location = useLocation();
  
  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname === '/orders') return 'orders';
    if (location.pathname.startsWith('/dashboard/reports')) return 'reports';
    if (location.pathname === '/profile') return 'profile';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const tabClass = (tabName) => 
    `w-full text-left px-6 py-3 flex items-center ${
      activeTab === tabName
        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
        : 'text-gray-600 hover:bg-gray-50'
    }`;

  const iconClass = (tabName) =>
    `mr-3 h-5 w-5 ${
      activeTab === tabName ? 'text-blue-600' : 'text-gray-400'
    }`;

  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Menu</h3>
        </div>
        <nav className="py-2">
          <ul>
            <li>
              <Link
                to="/dashboard"
                className={tabClass('dashboard')}
              >
                <svg
                  className={iconClass('dashboard')}
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
              </Link>
            </li>
            <li>
              <Link
                to="/orders"
                className={tabClass('orders')}
              >
                <svg
                  className={iconClass('orders')}
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
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/reports"
                className={tabClass('reports')}
              >
                <svg
                  className={iconClass('reports')}
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
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className={tabClass('profile')}
              >
                <svg
                  className={iconClass('profile')}
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
              </Link>
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
  );
}