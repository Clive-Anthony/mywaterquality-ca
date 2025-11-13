import { supabase } from './supabaseClient';

/**
 * Get all coupons with usage statistics from the validation view
 * @returns {Promise<{coupons: array, error: object|null}>}
 */
export const getAllCoupons = async () => {
  try {
    const { data, error } = await supabase
      .from('coupon_validation_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return { coupons: [], error };
    }

    return { coupons: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching coupons:', error);
    return { coupons: [], error };
  }
};

/**
 * Get a single coupon by ID
 * @param {string} couponId - Coupon UUID
 * @returns {Promise<{coupon: object|null, error: object|null}>}
 */
export const getCouponById = async (couponId) => {
  try {
    const { data, error } = await supabase
      .from('coupon_validation_view')
      .select('*')
      .eq('coupon_id', couponId)
      .single();

    if (error) {
      console.error('Error fetching coupon:', error);
      return { coupon: null, error };
    }

    return { coupon: data, error: null };
  } catch (error) {
    console.error('Exception fetching coupon:', error);
    return { coupon: null, error };
  }
};

/**
 * Get a coupon by code
 * @param {string} code - Coupon code
 * @returns {Promise<{coupon: object|null, error: object|null}>}
 */
export const getCouponByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('coupon_validation_view')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error) {
      console.error('Error fetching coupon by code:', error);
      return { coupon: null, error };
    }

    return { coupon: data, error: null };
  } catch (error) {
    console.error('Exception fetching coupon by code:', error);
    return { coupon: null, error };
  }
};

/**
 * Create a new coupon
 * @param {object} couponData - Coupon data object
 * @returns {Promise<{coupon: object|null, error: object|null}>}
 */
export const createCoupon = async (couponData) => {
  try {
    // Validate and prepare data
    const insertData = {
      code: couponData.code.toUpperCase().trim(),
      type: couponData.type,
      value: parseFloat(couponData.value),
      description: couponData.description || null,
      usage_limit: couponData.usage_limit ? parseInt(couponData.usage_limit) : null,
      per_user_limit: couponData.per_user_limit ? parseInt(couponData.per_user_limit) : null,
      valid_from: couponData.valid_from || new Date().toISOString(),
      valid_until: couponData.valid_until || null,
      minimum_order_value: couponData.minimum_order_value ? parseFloat(couponData.minimum_order_value) : 0,
      is_active: couponData.is_active !== undefined ? couponData.is_active : true
    };

    const { data, error } = await supabase
      .from('coupons')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      return { coupon: null, error };
    }

    console.log('Coupon created successfully:', data);
    return { coupon: data, error: null };
  } catch (error) {
    console.error('Exception creating coupon:', error);
    return { coupon: null, error };
  }
};

/**
 * Update an existing coupon
 * @param {string} couponId - Coupon UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<{coupon: object|null, error: object|null}>}
 */
export const updateCoupon = async (couponId, updates) => {
  try {
    // Prepare update data, only include provided fields
    const updateData = {};
    
    if (updates.code !== undefined) {
      updateData.code = updates.code.toUpperCase().trim();
    }
    if (updates.type !== undefined) {
      updateData.type = updates.type;
    }
    if (updates.value !== undefined) {
      updateData.value = parseFloat(updates.value);
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description || null;
    }
    if (updates.usage_limit !== undefined) {
      updateData.usage_limit = updates.usage_limit ? parseInt(updates.usage_limit) : null;
    }
    if (updates.per_user_limit !== undefined) {
      updateData.per_user_limit = updates.per_user_limit ? parseInt(updates.per_user_limit) : null;
    }
    if (updates.valid_from !== undefined) {
      updateData.valid_from = updates.valid_from;
    }
    if (updates.valid_until !== undefined) {
      updateData.valid_until = updates.valid_until || null;
    }
    if (updates.minimum_order_value !== undefined) {
      updateData.minimum_order_value = parseFloat(updates.minimum_order_value);
    }
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('coupon_id', couponId)
      .select()
      .single();

    if (error) {
      console.error('Error updating coupon:', error);
      return { coupon: null, error };
    }

    console.log('Coupon updated successfully:', data);
    return { coupon: data, error: null };
  } catch (error) {
    console.error('Exception updating coupon:', error);
    return { coupon: null, error };
  }
};

/**
 * Soft delete a coupon by setting is_active to false
 * @param {string} couponId - Coupon UUID
 * @returns {Promise<{error: object|null}>}
 */
export const deactivateCoupon = async (couponId) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('coupon_id', couponId);

    if (error) {
      console.error('Error deactivating coupon:', error);
      return { error };
    }

    console.log('Coupon deactivated successfully');
    return { error: null };
  } catch (error) {
    console.error('Exception deactivating coupon:', error);
    return { error };
  }
};

/**
 * Reactivate a coupon by setting is_active to true
 * @param {string} couponId - Coupon UUID
 * @returns {Promise<{error: object|null}>}
 */
export const reactivateCoupon = async (couponId) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: true })
      .eq('coupon_id', couponId);

    if (error) {
      console.error('Error reactivating coupon:', error);
      return { error };
    }

    console.log('Coupon reactivated successfully');
    return { error: null };
  } catch (error) {
    console.error('Exception reactivating coupon:', error);
    return { error };
  }
};

/**
 * Check if a coupon code already exists
 * @param {string} code - Coupon code to check
 * @param {string} excludeCouponId - Optional coupon ID to exclude (for updates)
 * @returns {Promise<{exists: boolean, error: object|null}>}
 */
export const checkCouponCodeExists = async (code, excludeCouponId = null) => {
  try {
    let query = supabase
      .from('coupons')
      .select('coupon_id')
      .eq('code', code.toUpperCase().trim());

    if (excludeCouponId) {
      query = query.neq('coupon_id', excludeCouponId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking coupon code:', error);
      return { exists: false, error };
    }

    return { exists: data && data.length > 0, error: null };
  } catch (error) {
    console.error('Exception checking coupon code:', error);
    return { exists: false, error };
  }
};

/**
 * Get coupon statistics
 * @returns {Promise<{stats: object, error: object|null}>}
 */
export const getCouponStats = async () => {
  try {
    const { coupons, error } = await getAllCoupons();

    if (error) {
      return { stats: getEmptyStats(), error };
    }

    const now = new Date();
    
    const activeCoupons = coupons.filter(c => 
      c.is_active && 
      (!c.valid_until || new Date(c.valid_until) > now)
    );
    
    const inactiveCoupons = coupons.filter(c => !c.is_active);
    
    const expiredCoupons = coupons.filter(c => 
      c.is_active && 
      c.valid_until && 
      new Date(c.valid_until) <= now
    );

    const totalUsage = coupons.reduce((sum, c) => sum + (c.actual_usage_count || 0), 0);
    
    const percentageCoupons = coupons.filter(c => c.type === 'percentage');
    const fixedAmountCoupons = coupons.filter(c => c.type === 'fixed_amount');

    return {
      stats: {
        total: coupons.length,
        active: activeCoupons.length,
        inactive: inactiveCoupons.length,
        expired: expiredCoupons.length,
        totalUsage,
        percentageCoupons: percentageCoupons.length,
        fixedAmountCoupons: fixedAmountCoupons.length,
      },
      error: null
    };
  } catch (error) {
    console.error('Exception calculating coupon stats:', error);
    return { stats: getEmptyStats(), error };
  }
};

/**
 * Get empty stats object
 * @returns {object} Empty stats
 */
const getEmptyStats = () => ({
  total: 0,
  active: 0,
  inactive: 0,
  expired: 0,
  totalUsage: 0,
  percentageCoupons: 0,
  fixedAmountCoupons: 0,
});

export default {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  reactivateCoupon,
  checkCouponCodeExists,
  getCouponStats,
};