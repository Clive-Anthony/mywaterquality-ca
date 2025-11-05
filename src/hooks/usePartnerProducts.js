
import { useState, useEffect } from 'react';
import { getPartnerProducts } from '../lib/partnerClient';

/**
 * Hook to fetch partner products
 * @param {string} partnerId - Partner UUID
 * @returns {Object} { products, loading, error }
 */
export const usePartnerProducts = (partnerId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!partnerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { products: data, error: fetchError } = await getPartnerProducts(partnerId);

        if (fetchError) {
          throw fetchError;
        }

        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching partner products:', err);
        setError(err.message || 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [partnerId]);

  return { products, loading, error };
};