
import { supabase } from './supabaseClient';

/**
 * Get partner by slug
 * @param {string} slug - Partner slug
 * @returns {Promise<{partner: object|null, error: object|null}>}
 */
export const getPartnerBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('partner_slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching partner:', error);
      return { partner: null, error };
    }

    return { partner: data, error: null };
  } catch (error) {
    console.error('Exception fetching partner:', error);
    return { partner: null, error };
  }
};

/**
 * Get partner products with pricing
 * @param {string} partnerId - Partner UUID
 * @returns {Promise<{products: array, error: object|null}>}
 */
export const getPartnerProducts = async (partnerId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_partner_products', { p_partner_id: partnerId });

    if (error) {
      console.error('Error fetching partner products:', error);
      return { products: [], error };
    }

    return { products: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching partner products:', error);
    return { products: [], error };
  }
};

/**
 * Get user's partner associations
 * @param {string} userId - User UUID
 * @returns {Promise<{associations: array, error: object|null}>}
 */
export const getUserPartnerAssociations = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_partner_ids', { user_uuid: userId });

    if (error) {
      console.error('Error fetching partner associations:', error);
      return { associations: [], error };
    }

    return { associations: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching partner associations:', error);
    return { associations: [], error };
  }
};

/**
 * Get partner order summary with filters
 * @param {string} partnerId - Partner UUID
 * @param {Object} filters - Optional filters {startDate, endDate}
 * @returns {Promise<{orders: array, error: object|null}>}
 */
export const getPartnerOrderSummary = async (partnerId, filters = {}) => {
  try {
    // Use RPC function - bypasses RLS completely
    const { data, error } = await supabase.rpc('get_partner_orders', {
      p_partner_id: partnerId,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null
    });

    if (error) {
      console.error('Error fetching partner orders:', error);
      return { orders: [], error };
    }

    return { orders: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching partner orders:', error);
    return { orders: [], error };
  }
};

/**
 * Get aggregated partner statistics
 * @param {string} partnerId - Partner UUID
 * @param {Object} filters - Optional filters {startDate, endDate}
 * @returns {Promise<{stats: object, error: object|null}>}
 */
export const getPartnerStats = async (partnerId, filters = {}) => {
  try {
    const { orders, error } = await getPartnerOrderSummary(partnerId, filters);

    if (error) {
      return { stats: getEmptyStats(), error };
    }

    if (!orders || orders.length === 0) {
      return { stats: getEmptyStats(), error: null };
    }

    // Aggregate statistics
    const uniqueOrderIds = new Set();
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalItemsSold = 0;

    orders.forEach(order => {
      // Count unique orders
      uniqueOrderIds.add(order.order_id);
      
      // Sum revenue
      totalRevenue += Number(order.product_revenue) || 0;
      
      // Sum commission
      totalCommission += Number(order.commission_earned) || 0;
      
      // Sum items sold
      totalItemsSold += Number(order.product_quantity_sold) || 0;
    });

    return { 
      stats: {
        totalOrders: uniqueOrderIds.size, // ← Count of unique order IDs
        totalRevenue: totalRevenue,
        totalCommission: totalCommission,
        totalItemsSold: totalItemsSold,
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Exception calculating partner stats:', error);
    return { stats: getEmptyStats(), error };
  }
};

/**
 * Get empty stats object
 * @returns {Object} Empty stats
 */
const getEmptyStats = () => ({
  totalOrders: 0,
  totalRevenue: 0,
  totalCommission: 0,
  totalItemsSold: 0,
});

export default {
  getPartnerBySlug,
  getPartnerProducts,
  getUserPartnerAssociations,
  getPartnerOrderSummary,
  getPartnerStats,
};