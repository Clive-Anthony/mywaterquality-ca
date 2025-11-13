// src/components/AdminCouponManagement.jsx - UPDATED with Card Layout
import { useState, useMemo } from 'react';
import { useCoupons } from '../hooks/useCoupons';
import CouponFormModal from './CouponFormModal';
import CouponDeleteModal from './CouponDeleteModal';

export default function AdminCouponManagement() {
  const {
    coupons,
    loading,
    error,
    stats,
    createCoupon,
    updateCoupon,
    deactivateCoupon,
    reactivateCoupon,
  } = useCoupons();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive, expired
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filter and search coupons
  const filteredCoupons = useMemo(() => {
    let filtered = coupons;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (coupon.description && coupon.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    const now = new Date();
    switch (filterStatus) {
      case 'active':
        filtered = filtered.filter(c => 
          c.is_active && 
          (!c.valid_until || new Date(c.valid_until) > now)
        );
        break;
      case 'inactive':
        filtered = filtered.filter(c => !c.is_active);
        break;
      case 'expired':
        filtered = filtered.filter(c => 
          c.is_active && 
          c.valid_until && 
          new Date(c.valid_until) <= now
        );
        break;
      default:
        // Show all
        break;
    }

    return filtered;
  }, [coupons, searchTerm, filterStatus]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle create coupon
  const handleCreateCoupon = () => {
    setSelectedCoupon(null);
    setShowCreateModal(true);
  };

  // Handle create submit
  const handleCreateSubmit = async (formData) => {
    const {  error } = await createCoupon(formData);
    if (error) {
      showNotification(error.message || 'Failed to create coupon', 'error');
    } else {
      showNotification('Coupon created successfully!', 'success');
      setShowCreateModal(false);
    }
  };

  // Handle edit coupon
  const handleEditCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async (formData) => {
    const { error } = await updateCoupon(selectedCoupon.coupon_id, formData);
    if (error) {
      showNotification(error.message || 'Failed to update coupon', 'error');
    } else {
      showNotification('Coupon updated successfully!', 'success');
      setShowEditModal(false);
    }
  };

  // Handle deactivate/reactivate coupon
  const handleToggleActivation = (coupon) => {
    setSelectedCoupon(coupon);
    setShowDeleteModal(true);
  };

  // Handle delete/reactivate confirm
  const handleDeleteConfirm = async () => {
    if (!selectedCoupon) return;

    const isActive = selectedCoupon.is_active;
    
    if (isActive) {
      // Deactivate
      const { error } = await deactivateCoupon(selectedCoupon.coupon_id);
      if (error) {
        showNotification(error.message || 'Failed to deactivate coupon', 'error');
      } else {
        showNotification('Coupon deactivated successfully!', 'success');
      }
    } else {
      // Reactivate
      const { error } = await reactivateCoupon(selectedCoupon.coupon_id);
      if (error) {
        showNotification(error.message || 'Failed to reactivate coupon', 'error');
      } else {
        showNotification('Coupon reactivated successfully!', 'success');
      }
    }
    
    setShowDeleteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coupon Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage discount coupons for your store
          </p>
        </div>
        <button
          onClick={handleCreateCoupon}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Coupon
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`rounded-md p-4 ${
          notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setNotification(null)}
                className={`inline-flex ${
                  notification.type === 'success' ? 'text-green-500 hover:text-green-600' : 'text-red-500 hover:text-red-600'
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <CouponStatsCards stats={stats} loading={loading} />

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Coupons
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Coupons</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupon Cards */}
      <CouponCardList
        coupons={filteredCoupons}
        loading={loading}
        error={error}
        onEdit={handleEditCoupon}
        onToggleActivation={handleToggleActivation}
      />

      {/* Modals */}
      <CouponFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        mode="create"
      />

      <CouponFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        coupon={selectedCoupon}
        mode="edit"
      />

      <CouponDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        coupon={selectedCoupon}
      />
    </div>
  );
}

// Statistics Cards Component
function CouponStatsCards({ stats, loading }) {
  const cards = [
    {
      title: 'Total Coupons',
      value: stats.total,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'blue',
    },
    {
      title: 'Active Coupons',
      value: stats.active,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'green',
    },
    {
      title: 'Total Usage',
      value: stats.totalUsage,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'purple',
    },
    {
      title: 'Expired Coupons',
      value: stats.expired,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'orange',
    },
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const colors = getColorClasses(card.color);
        return (
          <div key={card.title} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${colors.bg} rounded-md p-3 ${colors.text}`}>
                  {card.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                        ) : (
                          card.value
                        )}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Coupon Card List Component
function CouponCardList({ coupons, loading, error, onEdit, onToggleActivation }) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading coupons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <p className="text-gray-600">No coupons found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {coupons.map((coupon) => (
        <CouponCard
          key={coupon.coupon_id}
          coupon={coupon}
          onEdit={onEdit}
          onToggleActivation={onToggleActivation}
        />
      ))}
    </div>
  );
}

// Individual Coupon Card Component
function CouponCard({ coupon, onEdit, onToggleActivation }) {
  // Helper function to get status badge
  const getStatusBadge = (coupon) => {
    const now = new Date();
    
    if (!coupon.is_active) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
          Inactive
        </span>
      );
    }
    
    if (coupon.valid_until && new Date(coupon.valid_until) <= now) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-300">
          Expired
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
        Active
      </span>
    );
  };

  // Helper function to format value
  const formatValue = (coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`;
    }
    return `$${parseFloat(coupon.value).toFixed(2)}`;
  };

  // Helper function to format date range
  const formatDateRange = (coupon) => {
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    if (!coupon.valid_until) {
      return `From ${formatDate(coupon.valid_from)}`;
    }

    return `${formatDate(coupon.valid_from)} - ${formatDate(coupon.valid_until)}`;
  };

  const getTypeLabel = (type) => {
    return type === 'percentage' ? 'Percentage' : 'Fixed Amount';
  };

  return (
    <div className="bg-white border-2 border-blue-100 rounded-lg shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-200">
      {/* Card Header - Code, Status, and Value */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">{coupon.code}</h3>
            <div className="mt-2">
              {getStatusBadge(coupon)}
            </div>
          </div>
          <div className="ml-3 flex-shrink-0 text-right">
            <div className="text-2xl font-bold text-blue-600">{formatValue(coupon)}</div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">{getTypeLabel(coupon.type)}</div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Description - Fixed Height (2 lines) */}
        <div className="h-10">
          {coupon.description ? (
            <p className="text-sm text-gray-600 line-clamp-2">{coupon.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description</p>
          )}
        </div>

        {/* Limits Section with Total Uses - Fixed Height */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 h-28">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Limit Per User:</span>
            <span className="text-gray-900 font-semibold">
              {coupon.per_user_limit ? coupon.per_user_limit : 'Unlimited'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Max Uses:</span>
            <span className="text-gray-900 font-semibold">
              {coupon.usage_limit ? coupon.usage_limit : 'Unlimited'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Total Uses:</span>
            <span className="text-gray-900 font-semibold">
              {coupon.usage_limit 
                ? `${coupon.actual_usage_count || 0}/${coupon.usage_limit}`
                : (coupon.actual_usage_count || 0)
              }
            </span>
          </div>
        </div>

        {/* Valid Period - Fixed Height - Reduced padding */}
        <div className="border-t border-gray-100 h-11 pt-1">
          <div className="text-xs text-gray-500 mb-1 font-medium">Valid Period</div>
          <div className="text-sm text-gray-900">{formatDateRange(coupon)}</div>
        </div>

        {/* Minimum Order - Fixed Height */}
        <div className="h-6">
          {coupon.minimum_order_value > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Min. Order:</span>
              <span className="text-gray-900 font-semibold">${parseFloat(coupon.minimum_order_value).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer - Actions */}
      <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200 flex gap-2">
        <button
          onClick={() => onEdit(coupon)}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => onToggleActivation(coupon)}
          className={`flex-1 inline-flex items-center justify-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            coupon.is_active
              ? 'border-red-600 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500'
              : 'border-green-600 text-green-700 bg-white hover:bg-green-50 focus:ring-green-500'
          }`}
        >
          {coupon.is_active ? (
            <>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Deactivate
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reactivate
            </>
          )}
        </button>
      </div>
    </div>
  );
}