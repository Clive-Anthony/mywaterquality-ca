// src/lib/orderClient.js
import { supabase } from './supabaseClient';

/**
 * Order management utilities for authenticated users
 */

/**
 * Create a new order from cart items
 * @param {Object} orderData - Order information
 * @returns {Object} { order, error }
 */
export const createOrder = async (orderData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create orders');
    }

    // Start a transaction by creating the order first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        subtotal: orderData.subtotal,
        shipping_cost: orderData.shipping_cost || 0,
        tax_amount: orderData.tax_amount || 0,
        total_amount: orderData.total_amount,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        special_instructions: orderData.special_instructions || null,
        payment_method: orderData.payment_method || null,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'unfulfilled'
      }])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.order_id,
      test_kit_id: item.test_kit_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      product_name: item.product_name,
      product_description: item.product_description || null
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      // If items creation fails, we should delete the order
      await supabase
        .from('orders')
        .delete()
        .eq('order_id', order.order_id);
      
      throw itemsError;
    }

    return { 
      order: {
        ...order,
        items: createdItems
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return { order: null, error };
  }
};

/**
 * Get user's order history
 * @param {Object} options - Query options
 * @returns {Object} { orders, error }
 */
export const getUserOrders = async (options = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view orders');
    }

    const { limit = 50, offset = 0, status = null } = options;

    let query = supabase
      .from('orders')
      .select(`
        order_id,
        order_number,
        status,
        payment_status,
        fulfillment_status,
        subtotal,
        shipping_cost,
        tax_amount,
        total_amount,
        shipping_address,
        billing_address,
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
          product_description,
          test_kits (
            name,
            description,
            price
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    return { orders: orders || [], error: null };
  } catch (error) {
    console.error('Error getting user orders:', error);
    return { orders: [], error };
  }
};

/**
 * Get a specific order by ID
 * @param {string} orderId - Order ID
 * @returns {Object} { order, error }
 */
export const getOrderById = async (orderId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view orders');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          test_kits (
            name,
            description,
            price
          )
        )
      `)
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      throw error;
    }

    return { order, error: null };
  } catch (error) {
    console.error('Error getting order:', error);
    return { order: null, error };
  }
};

/**
 * Update order status (limited to certain fields)
 * @param {string} orderId - Order ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} { success, error }
 */
export const updateOrder = async (orderId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update orders');
    }

    // Only allow certain fields to be updated by users
    const allowedFields = ['special_instructions'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const { data, error } = await supabase
      .from('orders')
      .update(filteredUpdates)
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, data: null, error };
  }
};

/**
 * Get order statistics for user
 * @returns {Object} { stats, error }
 */
export const getOrderStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to view order stats');
    }

    // Get total orders count
    const { count: totalOrders, error: countError } = await supabase
      .from('orders')
      .select('order_id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      throw countError;
    }

    // Get orders by status
    const { data: statusData, error: statusError } = await supabase
      .from('orders')
      .select('status')
      .eq('user_id', user.id);

    if (statusError) {
      throw statusError;
    }

    const statusCounts = statusData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Get total spent
    const { data: totalData, error: totalError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', user.id)
      .eq('status', 'delivered'); // Only count delivered orders

    if (totalError) {
      throw totalError;
    }

    const totalSpent = totalData.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    const stats = {
      totalOrders: totalOrders || 0,
      totalSpent,
      ordersByStatus: statusCounts,
      pendingOrders: statusCounts.pending || 0,
      completedOrders: statusCounts.delivered || 0
    };

    return { stats, error: null };
  } catch (error) {
    console.error('Error getting order stats:', error);
    return { stats: null, error };
  }
};

/**
 * Convert cart items to order items format
 * @param {Array} cartItems - Cart items from cart context
 * @returns {Array} Order items format
 */
export const convertCartToOrderItems = (cartItems) => {
  return cartItems.map(item => ({
    test_kit_id: item.test_kit_id,
    quantity: item.quantity,
    unit_price: item.test_kits.price,
    product_name: item.test_kits.name,
    product_description: item.test_kits.description
  }));
};

/**
 * Calculate order totals
 * @param {Array} items - Order items
 * @param {Object} options - Calculation options
 * @returns {Object} Calculated totals
 */
export const calculateOrderTotals = (items, options = {}) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);

  const shippingCost = options.shippingCost || 0;
  
  // Tax calculation (simplified - in real app, this would be based on location)
  const taxRate = options.taxRate || 0.13; // 13% HST for Ontario
  const taxAmount = subtotal * taxRate;
  
  const total = subtotal + shippingCost + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

/**
 * Validate order data before creation
 * @param {Object} orderData - Order data to validate
 * @returns {Object} { isValid, errors }
 */
export const validateOrderData = (orderData) => {
  const errors = [];

  // Check required fields
  if (!orderData.shipping_address) {
    errors.push('Shipping address is required');
  }

  if (!orderData.billing_address) {
    errors.push('Billing address is required');
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  if (!orderData.total_amount || orderData.total_amount <= 0) {
    errors.push('Order total must be greater than zero');
  }

  // Validate shipping address
  if (orderData.shipping_address) {
    const required = ['firstName', 'lastName', 'address', 'city', 'province', 'postalCode', 'email'];
    required.forEach(field => {
      if (!orderData.shipping_address[field]) {
        errors.push(`Shipping address ${field} is required`);
      }
    });

    // Validate postal code format for Canada
    if (orderData.shipping_address.postalCode && 
        !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(orderData.shipping_address.postalCode)) {
      errors.push('Invalid postal code format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export all functions as default object for easier importing
export default {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrder,
  getOrderStats,
  convertCartToOrderItems,
  calculateOrderTotals,
  validateOrderData
};