
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

  const PortalHero = () => {
  // Convert hex to RGB for gradient
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getGradientStyle = () => {
    if (!partner?.primary_color) {
      return 'from-purple-600 to-purple-800'; // Default gradient classes
    }

    const rgb = hexToRgb(partner.primary_color);
    if (!rgb) {
      return 'from-purple-600 to-purple-800'; // Fallback
    }

    // Create gradient using inline styles instead of Tailwind classes
    return {
      background: `linear-gradient(to right, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}))`
    };
  };

  const gradientStyle = getGradientStyle();
  const isCustomColor = typeof gradientStyle === 'object';

  return (
    <div 
      className={`relative py-16 ${!isCustomColor ? gradientStyle : ''}`}
      style={isCustomColor ? gradientStyle : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Partner Portal
          </h1>
          {partner && (
            <p className="mt-4 text-xl text-white opacity-90 max-w-3xl mx-auto">
              Welcome, {partner.partner_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

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

        {/* Shop Link Banner - ADD THIS BEFORE STATS */}
<div className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Your Partner Shop
      </h3>
      <p className="text-gray-600">
        Share this link with your customers to generate more sales through your shop
      </p>
      <div className="mt-3 flex items-center space-x-2">
        <code className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700">
          {window.location.origin}/shop/partner/{partner.partner_slug}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/shop/partner/${partner.partner_slug}`);
            alert('Shop link copied to clipboard!');
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Copy Link
        </button>
      </div>
    </div>
    <a
      href={`/shop/partner/${partner.partner_slug}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ 
        backgroundColor: partner.primary_color || '#9333ea',
        color: 'white'
      }}
      className="inline-flex items-center px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 shadow-md"
    >
      <svg 
        className="h-5 w-5 mr-2" 
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
      Visit Your Shop
      <svg 
        className="h-4 w-4 ml-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
        />
      </svg>
    </a>
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
  <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Orders</h3>
  
  <div className="space-y-4">
    {/* Date Filters - Always Full Width */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
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
      <div>
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
    
    {/* Action Buttons - Full Width on Mobile, Side by Side on Desktop */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        onClick={refreshOrders}
        disabled={ordersLoading}
        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        {ordersLoading ? 'Refreshing...' : 'Refresh'}
      </button>
      
      <button
        onClick={exportToCSV}
        disabled={orders.length === 0}
        style={{ backgroundColor: partner?.primary_color || '#9333ea' }}
        className="inline-flex items-center justify-center px-4 py-2 text-white rounded-md hover:opacity-90 font-medium transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg 
          className="h-4 w-4 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
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
              <div 
                className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                style={{
                    borderColor: partner?.primary_color || '#9333ea'
                }}
                ></div>
            </div>
          ) : (
            <PartnerOrdersTable orders={orders} partner={partner} />
          )}
        </div>
      </div>
    </PageLayout>
  );
}