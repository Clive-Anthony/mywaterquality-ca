// src/pages/OrdersPage.jsx - Dedicated orders page with admin breadcrumbs
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import DashboardTabs from '../components/DashboardTabs';
import OrdersList from '../components/OrdersList';

export default function OrdersPage() {
  // Hero component for the orders page
  const OrdersHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 h-64">
      <div className="absolute inset-0 bg-opacity-50 bg-blue-900">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Order History
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            Track and manage your water quality test kit orders.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<OrdersHero />}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                to="/admin-dashboard"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                <svg
                  className="w-3 h-3 mr-2.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
                </svg>
                Admin Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Orders</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <DashboardTabs />

          {/* Main Content Area */}
          <div className="flex-1">
            <OrdersList showTitle={false} maxHeight="max-h-full" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}