import { useState, useEffect, useCallback } from 'react';
import * as couponClient from '../lib/couponClient';

/**
 * Custom hook for managing coupons
 * Provides coupon data, statistics, and CRUD operations
 * @returns {Object} Coupon state and operations
 */
export const useCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    expired: 0,
    totalUsage: 0,
    percentageCoupons: 0,
    fixedAmountCoupons: 0,
  });

  /**
   * Calculate statistics from coupon data
   * @param {Array} couponsData - Array of coupon objects
   */
  const calculateStats = useCallback((couponsData) => {
    const now = new Date();
    
    const activeCoupons = couponsData.filter(c => 
      c.is_active && 
      (!c.valid_until || new Date(c.valid_until) > now)
    );
    
    const inactiveCoupons = couponsData.filter(c => !c.is_active);
    
    const expiredCoupons = couponsData.filter(c => 
      c.is_active && 
      c.valid_until && 
      new Date(c.valid_until) <= now
    );

    const totalUsage = couponsData.reduce((sum, c) => sum + (c.actual_usage_count || 0), 0);
    
    const percentageCoupons = couponsData.filter(c => c.type === 'percentage');
    const fixedAmountCoupons = couponsData.filter(c => c.type === 'fixed_amount');

    setStats({
      total: couponsData.length,
      active: activeCoupons.length,
      inactive: inactiveCoupons.length,
      expired: expiredCoupons.length,
      totalUsage,
      percentageCoupons: percentageCoupons.length,
      fixedAmountCoupons: fixedAmountCoupons.length,
    });
  }, []);

  /**
   * Fetch all coupons from the database
   */
  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { coupons: data, error: fetchError } = await couponClient.getAllCoupons();

      if (fetchError) {
        throw fetchError;
      }

      setCoupons(data);
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err.message || 'Failed to load coupons');
      setCoupons([]);
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        expired: 0,
        totalUsage: 0,
        percentageCoupons: 0,
        fixedAmountCoupons: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  /**
   * Create a new coupon
   * @param {Object} couponData - Coupon data
   * @returns {Promise<{coupon: object|null, error: object|null}>}
   */
  const createCoupon = async (couponData) => {
    try {
      // Check if code already exists
      const { exists, error: checkError } = await couponClient.checkCouponCodeExists(couponData.code);
      
      if (checkError) {
        return { coupon: null, error: checkError };
      }

      if (exists) {
        return { 
          coupon: null, 
          error: { message: 'A coupon with this code already exists' } 
        };
      }

      const { coupon, error } = await couponClient.createCoupon(couponData);
      
      if (!error) {
        // Refresh the coupon list
        await fetchCoupons();
      }
      
      return { coupon, error };
    } catch (err) {
      console.error('Error creating coupon:', err);
      return { coupon: null, error: err };
    }
  };

  /**
   * Update an existing coupon
   * @param {string} couponId - Coupon UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{coupon: object|null, error: object|null}>}
   */
  const updateCoupon = async (couponId, updates) => {
    try {
      // If updating code, check if new code already exists
      if (updates.code) {
        const { exists, error: checkError } = await couponClient.checkCouponCodeExists(
          updates.code, 
          couponId
        );
        
        if (checkError) {
          return { coupon: null, error: checkError };
        }

        if (exists) {
          return { 
            coupon: null, 
            error: { message: 'A coupon with this code already exists' } 
          };
        }
      }

      const { coupon, error } = await couponClient.updateCoupon(couponId, updates);
      
      if (!error) {
        // Refresh the coupon list
        await fetchCoupons();
      }
      
      return { coupon, error };
    } catch (err) {
      console.error('Error updating coupon:', err);
      return { coupon: null, error: err };
    }
  };

  /**
   * Deactivate a coupon (soft delete)
   * @param {string} couponId - Coupon UUID
   * @returns {Promise<{error: object|null}>}
   */
  const deactivateCoupon = async (couponId) => {
    try {
      const { error } = await couponClient.deactivateCoupon(couponId);
      
      if (!error) {
        // Refresh the coupon list
        await fetchCoupons();
      }
      
      return { error };
    } catch (err) {
      console.error('Error deactivating coupon:', err);
      return { error: err };
    }
  };

  /**
   * Reactivate a coupon
   * @param {string} couponId - Coupon UUID
   * @returns {Promise<{error: object|null}>}
   */
  const reactivateCoupon = async (couponId) => {
    try {
      const { error } = await couponClient.reactivateCoupon(couponId);
      
      if (!error) {
        // Refresh the coupon list
        await fetchCoupons();
      }
      
      return { error };
    } catch (err) {
      console.error('Error reactivating coupon:', err);
      return { error: err };
    }
  };

  /**
   * Get a specific coupon by ID
   * @param {string} couponId - Coupon UUID
   * @returns {Promise<{coupon: object|null, error: object|null}>}
   */
  const getCoupon = async (couponId) => {
    try {
      return await couponClient.getCouponById(couponId);
    } catch (err) {
      console.error('Error getting coupon:', err);
      return { coupon: null, error: err };
    }
  };

  // Load coupons on mount
  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  return {
    // Data
    coupons,
    loading,
    error,
    stats,
    
    // Operations
    createCoupon,
    updateCoupon,
    deactivateCoupon,
    reactivateCoupon,
    getCoupon,
    refreshCoupons: fetchCoupons,
  };
};