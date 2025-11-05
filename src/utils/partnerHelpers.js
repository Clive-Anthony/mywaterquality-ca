import { supabase } from '../lib/supabaseClient';

/**
 * Validate that a partner slug exists and is active
 * @param {string} slug - Partner slug to validate
 * @returns {Promise<{isValid: boolean, partner: object|null, error: string|null}>}
 */
export const validatePartnerSlug = async (slug) => {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, partner: null, error: 'Invalid slug format' };
  }

  try {
    const { data, error } = await supabase
      .rpc('validate_partner_slug', { slug });

    if (error) {
      console.error('Error validating partner slug:', error);
      return { isValid: false, partner: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { isValid: false, partner: null, error: 'Partner not found' };
    }

    return { isValid: true, partner: data[0], error: null };
  } catch (error) {
    console.error('Exception validating partner slug:', error);
    return { isValid: false, partner: null, error: error.message };
  }
};

/**
 * Get partner by slug (direct table query)
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
      return { partner: null, error };
    }

    return { partner: data, error: null };
  } catch (error) {
    console.error('Exception getting partner:', error);
    return { partner: null, error };
  }
};

/**
 * Format commission rate for display
 * @param {number} rate - Commission rate (e.g., 10.5)
 * @returns {string} Formatted rate (e.g., "10.5%")
 */
export const formatCommissionRate = (rate) => {
  if (!rate || rate === 0) return 'N/A';
  return `${parseFloat(rate).toFixed(1)}%`;
};

/**
 * Calculate commission amount
 * @param {number} amount - Total amount
 * @param {number} rate - Commission rate (e.g., 10.5)
 * @returns {number} Commission amount
 */
export const calculateCommission = (amount, rate) => {
  if (!amount || !rate) return 0;
  return (amount * rate) / 100;
};