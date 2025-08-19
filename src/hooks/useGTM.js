// src/hooks/useGTM.js - React hook for GTM tracking
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  trackSignupConversion,
  trackShopPageView,
  trackCustomEvent,
  trackUserLogin,
  trackCartEvent,
  trackPurchaseConversion,
  trackAddToCart
} from '../utils/gtm';

/**
 * Custom hook for GTM tracking functionality
 * @returns {Object} - GTM tracking functions
 */
export const useGTM = () => {
  const location = useLocation();

  /**
   * Track sign-up conversion
   */
  const trackSignup = useCallback(async (userData, signupMethod = 'email') => {
    await trackSignupConversion(userData, signupMethod);
  }, []);

  /**
   * Track shop page view conversion
   */
  const trackShopPage = useCallback(async (pageData, productData = null) => {
    await trackShopPageView(pageData, productData);
  }, []);

  /**
   * Track custom event
   */
  const trackEvent = useCallback((eventName, eventParams = {}) => {
    trackCustomEvent(eventName, eventParams);
  }, []);

  /**
   * Track user login
   */
  const trackLogin = useCallback(async (loginMethod = 'email') => {
    await trackUserLogin(loginMethod);
  }, []);

  /**
   * Track cart events
   */
  const trackCart = useCallback((eventType, cartData) => {
    trackCartEvent(eventType, cartData);
  }, []);

  /**
   * Track purchase conversion
   */
  const trackPurchase = useCallback(async (purchaseData) => {
    await trackPurchaseConversion(purchaseData);
  }, []);

  /**
   * Track add to cart
   */
  const trackAddToCartEvent = useCallback(async (item, quantity = 1) => {
    await trackAddToCart(item, quantity);
  }, []);

  return {
    trackSignup,
    trackShopPage,
    trackEvent,
    trackLogin,
    trackCart,
    trackPurchase,
    trackAddToCartEvent,
    currentPath: location.pathname
  };
};

/**
 * Hook specifically for tracking page views on shop pages
 * Automatically tracks when component mounts if on a shop page
 */
export const useShopPageTracking = (pageTitle, productData = null, customValue = null) => {
  const location = useLocation();
  const { trackShopPage } = useGTM();

  useEffect(() => {
    // Only track if we're on a shop-related page
    const isShopPage = location.pathname.startsWith('/shop') || 
                      location.pathname === '/shop';

    if (isShopPage) {
      const pageData = {
        page_path: location.pathname,
        page_title: pageTitle || document.title,
        value: customValue
      };

      // Small delay to ensure page is fully loaded
      const timeoutId = setTimeout(() => {
        trackShopPage(pageData, productData);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, pageTitle, productData, customValue, trackShopPage]);
};

/**
 * Hook for tracking authentication events
 */
export const useAuthTracking = () => {
  const { trackSignup, trackLogin } = useGTM();

  const trackSuccessfulSignup = useCallback(async (userData, method = 'email') => {
    // Add a small delay to ensure the user is properly created
    setTimeout(async () => {
      await trackSignup(userData, method);
    }, 1000);
  }, [trackSignup]);

  const trackSuccessfulLogin = useCallback(async (method = 'email') => {
    // Add a small delay to ensure the session is established
    setTimeout(async () => {
      await trackLogin(method);
    }, 500);
  }, [trackLogin]);

  return {
    trackSuccessfulSignup,
    trackSuccessfulLogin
  };
};

export default useGTM;