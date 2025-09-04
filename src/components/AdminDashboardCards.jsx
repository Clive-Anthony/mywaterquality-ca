// New dashboard cards for legacy kits and quick links
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Unregistered Legacy Kits Card Component
export function UnregisteredLegacyKitsCard() {
  const [legacyKits, setLegacyKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUnregisteredLegacyKits();
  }, []);

  const loadUnregisteredLegacyKits = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query for unregistered legacy kits
      const { data, error: queryError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .eq('kit_type', 'legacy')
        .eq('registration_status', 'unregistered')
        .order('kit_created_at', { ascending: false })
        .limit(10); // Show only the 10 most recent

      if (queryError) {
        throw queryError;
      }

      setLegacyKits(data || []);
    } catch (err) {
      console.error('Error loading unregistered legacy kits:', err);
      setError('Failed to load legacy kits');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDisplayName = (kit) => {
  // Special case for specific kit_code
  if (kit.kit_code === '780DA6211A') {
    return 'Adam Salsberg';
  }
  
  // Default behavior
  return `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Unknown Customer';
};

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-orange-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Unregistered Legacy Kits
            </h3>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {legacyKits.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Legacy kits awaiting customer registration
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <svg className="h-8 w-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : legacyKits.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="h-8 w-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-600">All legacy kits registered!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {legacyKits.map((kit) => (
              <div key={kit.kit_id} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {kit.kit_code || 'N/A'}
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Legacy
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                        {getDisplayName(kit)}                    
                      </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Order #{kit.order_number || 'N/A'} • {formatDate(kit.kit_created_at)}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          {legacyKits.length > 0 
            ? `Showing ${Math.min(legacyKits.length, 10)} unregistered legacy kits`
            : 'No unregistered legacy kits found'
          }
        </p>
      </div>
    </div>
  );
}

// Quick Links Card Component
export function QuickLinksCard({ setActiveTab }) {
  const quickLinks = [
    {
      id: 'approve-reports',
      name: 'Approve Reports',
      description: 'Approve test results for customer access',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'green',
      action: () => {
        setActiveTab('reports');
        // Small delay to ensure the tab has switched, then scroll to the test kits section
        setTimeout(() => {
          const testKitsSection = document.querySelector('[data-section="test-kits"]');
          if (testKitsSection) {
            testKitsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    },
    // {
    //   id: 'change-order-status',
    //   name: 'Change Order Status',
    //   description: 'Update order statuses and tracking',
    //   icon: (
    //     <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    //     </svg>
    //   ),
    //   color: 'blue',
    //   action: () => {
    //     // Stay on dashboard tab but scroll to orders section
    //     setTimeout(() => {
    //       const ordersSection = document.querySelector('[data-section="orders"]');
    //       if (ordersSection) {
    //         ordersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    //       }
    //     }, 100);
    //   }
    // },
    {
      id: 'see-results',
      name: 'See Results',
      description: 'View water quality analysis dashboards',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'purple',
      action: () => {
        setActiveTab('results');
      }
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      green: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        hover: 'hover:bg-green-200'
      },
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        hover: 'hover:bg-blue-200'
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-600',
        hover: 'hover:bg-purple-200'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Links
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Navigate to common admin tasks
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <div className="space-y-3">
          {quickLinks.map((link) => {
            const colors = getColorClasses(link.color);
            return (
              <button
                key={link.id}
                onClick={link.action}
                className={`w-full text-left p-3 rounded-lg border border-gray-200 ${colors.hover} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${link.color}-500`}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${colors.bg} rounded-md p-2 ${colors.text}`}>
                    {link.icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {link.name}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {link.description}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Click any link to navigate to the corresponding admin section
        </p>
      </div>
    </div>
  );
}