// src/components/OrdersList.jsx - Reusable order history component
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function OrdersList({ 
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

  // Load user orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        console.log('Loading orders for user:', user.id);

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            payment_status,
            fulfillment_status,
            subtotal,
            shipping_cost,
            tax_amount,
            total_amount,
            shipping_address,
            special_instructions,
            created_at,
            updated_at,
            shipped_at,
            delivered_at,
            order_items (
              order_item_id,
              test_kit_id,
              quantity,
              unit_price,
              total_price,
              product_name,
              product_description
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(compact ? 5 : 50); // Limit for compact view

        if (error) {
          throw error;
        }

        console.log('Orders loaded:', data);
        setOrders(data || []);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
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
        processing: 'bg-purple-100 text-purple-800',
        shipped: 'bg-indigo-100 text-indigo-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800'
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
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
              Order History
            </h3>
          </div>
        )}
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your orders...</p>
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
              Order History
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
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order History
              </h3>
              {orders.length > 0 && compact && (
                <Link
                  to="/orders"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All →
                </Link>
              )}
            </div>
            {orders.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {compact ? `${orders.length} recent orders` : `${orders.length} total orders`}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <Link
              to="/test-kits"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Test Kits
            </Link>
          </div>
        ) : (
          /* Orders List */
          <div className={`${maxHeight} overflow-y-auto`}>
            <ul className="divide-y divide-gray-200">
              {orders.map((order) => (
                <li key={order.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.order_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(order.total_amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {getStatusBadge(order.status, 'status')}
                        {!compact && (
                          <>
                            {getStatusBadge(order.payment_status, 'payment_status')}
                            {getStatusBadge(order.fulfillment_status, 'fulfillment_status')}
                          </>
                        )}
                      </div>
                      
                      {/* Compact Order Items */}
                      {!compact && (
                        <div className="text-xs text-gray-600">
                          {order.order_items.slice(0, 1).map((item) => (
                            <span key={item.order_item_id}>
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                          {order.order_items.length > 1 && (
                            <span className="text-gray-500">
                              {' '}+{order.order_items.length - 1} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => showOrderDetailsModal(order)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.order_item_id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        {item.product_description && (
                          <p className="text-xs text-gray-500 mt-1">{item.product_description}</p>
                        )}
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
                  <p>{selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}</p>
                  <p>{selectedOrder.shipping_address.address}</p>
                  <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province} {selectedOrder.shipping_address.postalCode}</p>
                  <p>{selectedOrder.shipping_address.country}</p>
                </div>
              </div>

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
    </>
  );
}