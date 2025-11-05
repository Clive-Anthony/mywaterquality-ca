
import { useState, useEffect } from 'react';
import { getPartnerBySlug } from '../lib/partnerClient';

/**
 * Hook to fetch and manage partner data by slug
 * @param {string} partnerSlug - Partner slug from URL
 * @returns {Object} { partner, loading, error }
 */
export const usePartner = (partnerSlug) => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPartner = async () => {
      if (!partnerSlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { partner: data, error: fetchError } = await getPartnerBySlug(partnerSlug);

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error('Partner not found');
        }

        setPartner(data);
      } catch (err) {
        console.error('Error fetching partner:', err);
        setError(err.message || 'Failed to load partner');
        setPartner(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [partnerSlug]);

  return { partner, loading, error };
};