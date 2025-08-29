// src/components/AdminOrdersList.jsx - Complete responsive admin orders component
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Custom Status Dropdown Component
function CustomStatusDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate position when opening
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4, // Don't add scrollY for fixed positioning
        left: rect.left        // Don't add scrollX for fixed positioning
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="text-xs font-medium rounded-full px-3 py-2 lg:px-2.5 lg:py-1 xl:px-2.5 xl:py-0.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between min-w-[120px] w-full lg:w-auto cursor-pointer relative"
        style={{ 
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          minHeight: '44px', // Ensure minimum touch target size
          zIndex: 10
        }}
      >
        <span className="truncate text-left flex-1">{selectedOption?.label}</span>
        <svg className="ml-1 h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[60] bg-white border border-gray-300 rounded-md shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '280px',
            maxHeight: '240px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none block ${
                option.value === value ? 'bg-blue-50 text-blue-600' : ''
              }`}
              style={{ 
                whiteSpace: 'normal', 
                lineHeight: '1.4',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminOrdersList({ 
  showTitle = true, 
  maxHeight = 'max-h-96',
  compact = false 
}) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editedStatuses, setEditedStatuses] = useState({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Status options for the dropdown
  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'en_route_to_customer', label: 'En Route to Customer' },
    { value: 'delivered_awaiting_registration', label: 'Delivered Awaiting Registration' },
    { value: 'registered', label: 'Registered' },
    { value: 'en_route_to_lab', label: 'En Route to Lab' },
    { value: 'delivered_to_lab', label: 'Delivered to Lab' },
    { value: 'test_results_received', label: 'Test Results Received' },
    { value: 'report_generated', label: 'Report Generated' },
    { value: 'report_delivered', label: 'Report Delivered' }
  ];

  // Helper function to get display label for status
  const getStatusDisplayLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle status change in edit mode
  const handleStatusChange = (orderId, newStatus) => {
    // Find the original order to compare
    const originalOrder = orders.find(o => o.id === orderId);
    
    setEditedStatuses(prev => {
      const updated = { ...prev };
      
      if (originalOrder && newStatus === originalOrder.status) {
        // If the new status matches the original, remove it from edited statuses
        delete updated[orderId];
      } else {
        // If it's different from original, track the change
        updated[orderId] = newStatus;
      }
      
      return updated;
    });
  };

  // Save all status changes
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(editedStatuses).map(async ([orderId, newStatus]) => {
        // Find the order to determine if it's legacy or regular
        const order = orders.find(o => o.id === orderId);
        
        if (order.source === 'legacy') {
          // Update legacy kit registration status
          const { data, error } = await supabase
            .from('legacy_kit_registrations')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select();
          
          if (error) throw error;
        } else {
          // Update regular order status
          const { data, error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select();
          
          if (error) throw error;
        }
      });

      await Promise.all(promises);
      
      // Update local state immediately to reflect changes
      setOrders(prevOrders => 
        prevOrders.map(order => ({
          ...order,
          status: editedStatuses[order.id] || order.status
        }))
      );
      
      // Exit edit mode and clear changes first
      setEditMode(false);
      setEditedStatuses({});
      
      // Refresh from database in background with a small delay
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('vw_admin_orders')
            .select('*')
            .eq('environment', 'prod')
            .order('created_at', { ascending: false })
            .limit(compact ? 10 : 100);

          if (error) {
            console.error('Error refreshing orders:', error);
          } else {
            setOrders(data || []);
          }
        } catch (refreshError) {
          console.error('Error during refresh:', refreshError);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error saving status changes:', err);
      setError('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel with confirmation
  const handleCancelChanges = () => {
    if (Object.keys(editedStatuses).length > 0) {
      setShowCancelDialog(true);
    } else {
      setEditMode(false);
    }
  };

  // Confirm cancel action
  const confirmCancelChanges = () => {
    setEditMode(false);
    setEditedStatuses({});
    setShowCancelDialog(false);
  };

  // Helper function to create smart summarization of test kit names
const getTestKitSummary = (items) => {
  if (!items || items.length === 0) {
    return 'No items';
  }
  
  if (items.length === 1) {
    return items[0].product_name || 'Unknown Product';
  }
  
  // Group items by product name
  const productCounts = items.reduce((acc, item) => {
    const name = item.product_name || 'Unknown Product';
    acc[name] = (acc[name] || 0) + (item.quantity || 1);
    return acc;
  }, {});
  
  const uniqueProducts = Object.keys(productCounts);
  
  if (uniqueProducts.length === 1) {
    // Multiple of the same product
    const productName = uniqueProducts[0];
    const totalQuantity = productCounts[productName];
    return `${productName} (${totalQuantity}x)`;
  } else {
    // Multiple different products
    const firstProduct = uniqueProducts[0];
    const remainingCount = uniqueProducts.length - 1;
    return `${firstProduct} + ${remainingCount} more`;
  }
};

  // Load admin orders from vw_admin_orders
  useEffect(() => {
    const loadAdminOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Query the admin orders view, filtering for production orders only
        const { data, error } = await supabase
          .from('vw_admin_orders')
          .select('*')
          .eq('environment', 'prod')  // Only show production orders
          .order('created_at', { ascending: false })
          .limit(compact ? 10 : 100); // Limit for compact view

        if (error) {
          throw error;
        }

        setOrders(data || []);
      } catch (err) {
        console.error('Error loading admin orders:', err);
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadAdminOrders();
  }, [user, compact]);

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge styling
  const getStatusBadge = (status, type = 'status') => {
    const statusColors = {
      status: {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-indigo-100 text-indigo-800',
        registered: 'bg-green-100 text-green-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800',
        en_route_to_customer: 'bg-indigo-100 text-indigo-800',
        delivered_awaiting_registration: 'bg-yellow-100 text-yellow-800',
        en_route_to_lab: 'bg-purple-100 text-purple-800',
        delivered_to_lab: 'bg-purple-100 text-purple-800',
        test_results_received: 'bg-blue-100 text-blue-800',
        report_generated: 'bg-green-100 text-green-800',
        report_delivered: 'bg-green-100 text-green-800'
      },
      payment_status: {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800',
        partially_refunded: 'bg-orange-100 text-orange-800'
      },
      fulfillment_status: {
        unfulfilled: 'bg-gray-100 text-gray-800',
        fulfilled: 'bg-green-100 text-green-800',
        partially_fulfilled: 'bg-yellow-100 text-yellow-800',
        shipped: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800'
      }
    };

    const colorClass = statusColors[type]?.[status] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {getStatusDisplayLabel(status)}
      </span>
    );
  };

  // Show order details modal
  const showOrderDetailsModal = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Close order details modal
  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {showTitle && (
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              All Orders (Admin)
            </h3>
          </div>
        )}
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {showTitle && (
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              All Orders
            </h3>
          </div>
        )}
        <div className="px-6 py-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium">Error Loading Orders</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {showTitle && (
          <div className="px-4 sm:px-6 py-5 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                All Orders
              </h3>
              
              {/* Edit/Save/Cancel buttons */}
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelChanges}
                    disabled={saving}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {orders.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {compact ? `${orders.length} recent orders` : `${orders.length} total orders`}
                {editMode && Object.keys(editedStatuses).length > 0 && (
                  <span className="ml-2 text-orange-600">• {Object.keys(editedStatuses).length} change(s) pending</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* No Orders State */}
        {orders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Orders</h3>
            <p className="text-gray-500">No orders found in the production environment.</p>
          </div>
        ) : (
          /* Orders List */
          <div className={`${maxHeight} overflow-y-auto`}>
            {/* Desktop Table View - 1280px+ */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-500">
                              {getTestKitSummary(order.items)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_first_name} {order.customer_last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {editMode ? (
                            <CustomStatusDropdown
                              value={editedStatuses[order.id] || order.status}
                              onChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                              options={statusOptions}
                            />
                          ) : (
                            getStatusBadge(editedStatuses[order.id] || order.status, 'status')
                          )}
                          {!compact && (
                            <>
                              <br />
                              {getStatusBadge(order.payment_status, 'payment_status')}
                            </>
                          )}
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.source === 'legacy' ? 'Legacy Kit' : formatPrice(order.total_amount)}
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-middle text-sm font-medium">
                        <button
                          onClick={() => showOrderDetailsModal(order)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tablet Condensed Table View - 1024px to 1279px */}
            <div className="hidden lg:block xl:hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order & Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount & Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.customer_first_name} {order.customer_last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                              {getTestKitSummary(order.items)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {editMode ? (
                            <CustomStatusDropdown
                              value={editedStatuses[order.id] || order.status}
                              onChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                              options={statusOptions}
                            />
                          ) : (
                            getStatusBadge(editedStatuses[order.id] || order.status, 'status')
                          )}
                          <div className="text-xs">
                            {getStatusBadge(order.payment_status, 'payment_status')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.source === 'legacy' ? 'Legacy Kit' : formatPrice(order.total_amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-middle">
                        <button
                          onClick={() => showOrderDetailsModal(order)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Mobile Cards - Below 1024px */}
            <div className="lg:hidden space-y-4 p-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">#{order.order_number}</h3>
                      <p className="text-sm text-gray-600 mt-1">{order.customer_first_name} {order.customer_last_name}</p>
                      <p className="text-sm text-gray-500">{order.customer_email}</p>
                    </div>
                    <button
                      onClick={() => showOrderDetailsModal(order)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium ml-4"
                    >
                      View
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {order.source === 'legacy' ? 'Legacy Kit' : formatPrice(order.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</p>
                    {editMode ? (
                      <CustomStatusDropdown
                        value={editedStatuses[order.id] || order.status}
                        onChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                        options={statusOptions}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(editedStatuses[order.id] || order.status, 'status')}
                        {getStatusBadge(order.payment_status, 'payment_status')}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                    {getTestKitSummary(order.items)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Order Details - #{selectedOrder.order_number}
                </h3>
                <button
                  onClick={closeOrderDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Customer Information */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-sm text-gray-900">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-900">{selectedOrder.customer_email}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-sm text-gray-900">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Status</h4>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedOrder.status, 'status')}
                  {getStatusBadge(selectedOrder.payment_status, 'payment_status')}
                  {getStatusBadge(selectedOrder.fulfillment_status, 'fulfillment_status')}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Summary</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedOrder.source === 'legacy' ? (
                    <div className="text-center py-4">
                      <p className="text-gray-600 font-medium">Legacy Test Kit</p>
                      <p className="text-sm text-gray-500 mt-1">No payment was required for this kit</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>{selectedOrder.shipping_cost === 0 ? 'Free' : formatPrice(selectedOrder.shipping_cost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>{formatPrice(selectedOrder.tax_amount)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatPrice(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h4>
                <div className="text-sm text-gray-600">
                  {selectedOrder.shipping_address ? (
                    <>
                      <p>{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</p>
                      <p>{selectedOrder.shipping_address.address}</p>
                      <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province} {selectedOrder.shipping_address.postalCode}</p>
                      <p>{selectedOrder.shipping_address.country}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">
                      {selectedOrder.source === 'legacy' ? 'Legacy kit - no shipping address' : 'No shipping address available'}
                    </p>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.special_instructions && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Special Instructions</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.special_instructions}</p>
                </div>
              )}

              {/* Order Dates */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Important Dates</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Order Placed: {formatDate(selectedOrder.created_at)}</p>
                  {selectedOrder.shipped_at && (
                    <p>Shipped: {formatDate(selectedOrder.shipped_at)}</p>
                  )}
                  {selectedOrder.delivered_at && (
                    <p>Delivered: {formatDate(selectedOrder.delivered_at)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-orange-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Discard Changes?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This action will discard all changes made. Would you like to continue?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                No
              </button>
              <button
                onClick={confirmCancelChanges}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Yes, Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}