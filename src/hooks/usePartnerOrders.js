
import { useState, useEffect, useCallback } from 'react';
import { getPartnerOrderSummary, getPartnerStats } from '../lib/partnerClient';

/**
 * Hook to fetch and manage partner orders with filtering
 * @param {string} partnerId - Partner UUID
 * @returns {Object} { orders, stats, loading, error, filters, setFilters, refreshOrders }
 */
export const usePartnerOrders = (partnerId) => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Default to last 2 weeks
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const [filters, setFilters] = useState(getDefaultDateRange());

  const fetchOrders = useCallback(async () => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch orders and stats in parallel
      const [ordersResult, statsResult] = await Promise.all([
        getPartnerOrderSummary(partnerId, filters),
        getPartnerStats(partnerId, filters),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (statsResult.error) {
        console.warn('Error fetching stats:', statsResult.error);
      }

      setOrders(ordersResult.orders || []);
      setStats(statsResult.stats || null);
    } catch (err) {
      console.error('Error fetching partner orders:', err);
      setError(err.message || 'Failed to load orders');
      setOrders([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refreshOrders = () => {
    fetchOrders();
  };

  return {
    orders,
    stats,
    loading,
    error,
    filters,
    setFilters,
    refreshOrders,
  };
};