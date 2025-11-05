
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/PageLayout';
import PartnerStats from '../components/PartnerStats';
import PartnerOrdersTable from '../components/PartnerOrdersTable';
import { usePartnerOrders } from '../hooks/usePartnerOrders';
import { getUserPartnerAssociations } from '../lib/partnerClient';
import { supabase } from '../lib/supabaseClient';

export default function PartnerPortalPage() {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's partner association
  useEffect(() => {
    const fetchPartnerAssociation = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { associations, error: assocError } = await getUserPartnerAssociations(user.id);

        if (assocError) {
          throw assocError;
        }

        if (!associations || associations.length === 0) {
          throw new Error('No partner association found');
        }

        // Get first partner (in future, could support multiple)
        const partnerId = associations[0].partner_id;

        // Fetch partner details
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('partner_id', partnerId)
          .single();

        if (partnerError) {
          throw partnerError;
        }

        setPartner(partnerData);
      } catch (err) {
        console.error('Error fetching partner association:', err);
        setError(err.message || 'Failed to load partner information');
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerAssociation();
  }, [user]);

  // Use partner orders hook
  const {
    orders,
    stats,
    loading: ordersLoading,
    error: ordersError,
    filters,
    setFilters,
    refreshOrders,
  } = usePartnerOrders(partner?.partner_id);

  // Handle date filter changes
  const handleDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      'Date',
      'Product',
      'Quantity',
      'Revenue',
      ...(partner?.commission_rate > 0 ? ['Commission'] : [])
    ];

    const rows = orders.map(order => [
      order.order_date,
      order.product_name,
      order.product_quantity_sold,
      order.product_revenue,
      ...(partner?.commission_rate > 0 ? [order.commission_earned || 0] : [])
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partner-orders-${partner?.partner_slug}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Get max date (today)
  const getMaxDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Hero section
  const PortalHero = () => (
    <div className="relative bg-gradient-to-r from-purple-600 to-purple-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Partner Portal
          </h1>
          {partner && (
            <p className="mt-4 text-xl text-purple-100 max-w-3xl mx-auto">
              Welcome, {partner.partner_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <PageLayout hero={<PortalHero />}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-4 text-gray-600">Loading partner portal...</span>
        </div>
      </PageLayout>
    );
  }

  if (error || !partner) {
    return (
      <PageLayout hero={<PortalHero />}>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium">Access Denied</p>
                <p className="text-red-600 text-sm mt-1">
                  {error || 'You do not have access to the partner portal.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout hero={<PortalHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Partner Info Section */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {partner.logo_url && (
                <img
                  src={partner.logo_url}
                  alt={`${partner.partner_name} Logo`}
                  className="h-12 w-auto object-contain mr-4"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{partner.partner_name}</h2>
                {partner.commission_rate > 0 && (
                  <p className="text-sm text-gray-600">
                    Commission Rate: <span className="font-medium">{partner.commission_rate}%</span>
                  </p>
                )}
              </div>
            </div>
            {partner.website_url && (
              <a
                href={partner.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Visit Website →
              </a>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Overview</h2>
          {ordersLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <PartnerStats stats={stats} partner={partner} />
          )}
        </div>

        {/* Filters Section */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Orders</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    value={filters.startDate}
                    max={getMaxDate()}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    value={filters.endDate}
                    max={getMaxDate()}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={refreshOrders}
                disabled={ordersLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {ordersLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={orders.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Orders Error */}
        {ordersError && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-700">{ordersError}</span>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
          {ordersLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <PartnerOrdersTable orders={orders} partner={partner} />
          )}
        </div>
      </div>
    </PageLayout>
  );
}