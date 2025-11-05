
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  getPartnerContext, 
  setPartnerContext as setPartnerCookie, 
  clearPartnerContext as clearPartnerCookie,
  hasPartnerContext
} from '../utils/partnerContext';

/**
 * Hook to manage partner context (cookie-based)
 * @param {string} currentPartnerSlug - Current partner slug from URL (if on partner page)
 * @returns {Object} { partnerSlug, setPartnerContext, clearPartnerContext, hasContext }
 */
export const usePartnerContext = (currentPartnerSlug = null) => {
  const [partnerSlug, setPartnerSlugState] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize partner context from cookie on mount
  useEffect(() => {
    const cookiePartnerSlug = getPartnerContext();
    if (cookiePartnerSlug) {
      setPartnerSlugState(cookiePartnerSlug);
    }
  }, []);

  // Set partner context when on partner shop page
  useEffect(() => {
    if (currentPartnerSlug) {
      setPartnerCookie(currentPartnerSlug);
      setPartnerSlugState(currentPartnerSlug);
    }
  }, [currentPartnerSlug]);

  // Redirect to partner shop if user has context but is on regular shop
  useEffect(() => {
    const cookiePartnerSlug = getPartnerContext();
    
    // Only redirect if:
    // 1. User has partner cookie
    // 2. User is on /shop (not /shop/:partnerSlug)
    // 3. Not already on a partner shop page
    if (cookiePartnerSlug && location.pathname === '/shop') {
      console.log('Redirecting to partner shop:', cookiePartnerSlug);
      navigate(`/shop/${cookiePartnerSlug}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  const setPartnerContext = (slug) => {
    setPartnerCookie(slug);
    setPartnerSlugState(slug);
  };

  const clearPartnerContext = () => {
    clearPartnerCookie();
    setPartnerSlugState(null);
  };

  return {
    partnerSlug,
    setPartnerContext,
    clearPartnerContext,
    hasContext: hasPartnerContext(),
  };
};