// src/utils/gtm.js - Google Tag Manager utilities
import { supabase } from '../lib/supabaseClient';

// Initialize data layer if it doesn't exist
window.dataLayer = window.dataLayer || [];

/**
 * Push event to GTM data layer
 * @param {Object} eventData - Event data to push
 */
export const pushToDataLayer = (eventData) => {
  try {
    console.log('GTM: Pushing to dataLayer:', eventData);
    window.dataLayer.push(eventData);
  } catch (error) {
    console.error('GTM: Error pushing to dataLayer:', error);
  }
};

/**
 * Hash email for enhanced conversions (simple hash for privacy)
 * @param {string} email - Email to hash
 * @returns {Promise<string>} - Hashed email
 */
const hashEmail = async (email) => {
  if (!email) return '';
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('GTM: Error hashing email:', error);
    return '';
  }
};

/**
 * Get enhanced conversion data for current user
 * @returns {Promise<Object>} - Enhanced conversion data
 */
const getEnhancedConversionData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      return {};
    }

    const hashedEmail = await hashEmail(user.email);
    
    return {
      email: hashedEmail,
      // Add phone number hashing if available
      // phone_number: user.phone ? await hashPhone(user.phone) : undefined,
    };
  } catch (error) {
    console.error('GTM: Error getting enhanced conversion data:', error);
    return {};
  }
};

/**
 * Track sign-up conversion
 * @param {Object} userData - User data from sign-up
 * @param {string} userData.email - User email
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} signupMethod - Method used for signup ('email', 'google')
 */
export const trackSignupConversion = async (userData, signupMethod = 'email') => {
  try {
    const enhancedData = await getEnhancedConversionData();
    
    const eventData = {
      event: 'signup_conversion',
      event_category: 'conversion',
      event_label: 'user_signup',
      signup_method: signupMethod,
      conversion_value: 1.0,
      currency: 'USD',
      user_data: enhancedData,
      // Additional user data for enhanced conversions
      first_name: userData.firstName,
      last_name: userData.lastName,
      timestamp: new Date().toISOString()
    };

    pushToDataLayer(eventData);
    
    // Also track as a standard GA4 event
    pushToDataLayer({
      event: 'sign_up',
      method: signupMethod,
      user_id: userData.email ? await hashEmail(userData.email) : undefined
    });

    console.log('GTM: Sign-up conversion tracked successfully');
  } catch (error) {
    console.error('GTM: Error tracking sign-up conversion:', error);
  }
};

/**
 * Track shop page view conversion
 * @param {Object} pageData - Page data
 * @param {string} pageData.page_path - Current page path
 * @param {string} pageData.page_title - Current page title
 * @param {number} pageData.value - Page value (optional, defaults to 1.0 CAD)
 * @param {Object} productData - Product data (optional, for product pages)
 */
export const trackShopPageView = async (pageData, productData = null) => {
  try {
    const enhancedData = await getEnhancedConversionData();
    
    // Determine page value based on context
    let pageValue = pageData.value || 1.0;
    
    // Adjust value based on page type or product data
    if (productData) {
      // Higher value for premium products
      if (productData.price > 200) {
        pageValue = 5.0;
      } else if (productData.price > 100) {
        pageValue = 3.0;
      } else {
        pageValue = 2.0;
      }
    } else if (pageData.page_path === '/shop') {
      // Main shop page
      pageValue = 2.0;
    }

    const eventData = {
      event: 'shop_page_view_conversion',
      event_category: 'conversion',
      event_label: 'shop_page_view',
      page_location: window.location.href,
      page_path: pageData.page_path,
      page_title: pageData.page_title,
      conversion_value: pageValue,
      currency: 'CAD',
      user_data: enhancedData,
      timestamp: new Date().toISOString()
    };

    // Add product data if available
    if (productData) {
      eventData.product_data = {
        item_id: productData.id,
        item_name: productData.name,
        item_category: 'water_test_kit',
        price: productData.price,
        currency: 'CAD'
      };
    }

    pushToDataLayer(eventData);
    
    // Also track as a standard GA4 page view
    pushToDataLayer({
      event: 'page_view',
      page_location: window.location.href,
      page_path: pageData.page_path,
      page_title: pageData.page_title,
      content_group1: 'shop'
    });

    console.log('GTM: Shop page view conversion tracked successfully');
  } catch (error) {
    console.error('GTM: Error tracking shop page view conversion:', error);
  }
};

/**
 * Track custom event
 * @param {string} eventName - Event name
 * @param {Object} eventParams - Event parameters
 */
export const trackCustomEvent = (eventName, eventParams = {}) => {
  try {
    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...eventParams
    };

    pushToDataLayer(eventData);
    console.log(`GTM: Custom event '${eventName}' tracked successfully`);
  } catch (error) {
    console.error(`GTM: Error tracking custom event '${eventName}':`, error);
  }
};

/**
 * Track user login (not a conversion, but useful for analytics)
 * @param {string} loginMethod - Method used for login ('email', 'google')
 */
export const trackUserLogin = async (loginMethod = 'email') => {
  try {
    const enhancedData = await getEnhancedConversionData();
    
    const eventData = {
      event: 'login',
      method: loginMethod,
      user_data: enhancedData,
      timestamp: new Date().toISOString()
    };

    pushToDataLayer(eventData);
    console.log('GTM: User login tracked successfully');
  } catch (error) {
    console.error('GTM: Error tracking user login:', error);
  }
};

/**
 * Track cart events (add to cart, purchase, etc.)
 * @param {string} eventType - Type of cart event ('add_to_cart', 'purchase', etc.)
 * @param {Object} cartData - Cart/product data
 */
export const trackCartEvent = async (eventType, cartData) => {
  try {
    const enhancedData = await getEnhancedConversionData();
    
    const eventData = {
      event: eventType,
      event_category: 'ecommerce',
      currency: cartData.currency || 'CAD',
      timestamp: new Date().toISOString(),
      user_data: enhancedData,
      ...cartData
    };

    // For purchase events, also track conversion
    if (eventType === 'purchase') {
      // Track as Google Ads conversion
      pushToDataLayer({
        event: 'purchase_conversion',
        event_category: 'conversion',
        event_label: 'purchase_complete',
        transaction_id: cartData.transaction_id,
        conversion_value: cartData.value || 0,
        currency: cartData.currency || 'CAD',
        user_data: enhancedData,
        is_free_order: cartData.is_free_order || false,
        coupon_code: cartData.coupon || null,
        items: cartData.items || [],
        timestamp: new Date().toISOString()
      });
    }

    pushToDataLayer(eventData);
    console.log(`GTM: Cart event '${eventType}' tracked successfully`);
  } catch (error) {
    console.error(`GTM: Error tracking cart event '${eventType}':`, error);
  }
};

/**
 * Track purchase conversion specifically
 * @param {Object} purchaseData - Purchase data from order completion
 */
export const trackPurchaseConversion = async (purchaseData) => {
  try {
    const enhancedData = await getEnhancedConversionData();
    
    const eventData = {
      event: 'purchase_conversion',
      event_category: 'conversion',
      event_label: 'purchase_complete',
      transaction_id: purchaseData.transaction_id,
      conversion_value: purchaseData.value || 0,
      currency: purchaseData.currency || 'CAD',
      user_data: enhancedData,
      is_free_order: purchaseData.is_free_order || false,
      coupon_code: purchaseData.coupon || null,
      items: purchaseData.items || [],
      shipping: purchaseData.shipping || 0,
      tax: purchaseData.tax || 0,
      timestamp: new Date().toISOString()
    };

    pushToDataLayer(eventData);
    
    // Also track as standard GA4 purchase event
    pushToDataLayer({
      event: 'purchase',
      transaction_id: purchaseData.transaction_id,
      value: purchaseData.value || 0,
      currency: purchaseData.currency || 'CAD',
      items: purchaseData.items || [],
      coupon: purchaseData.coupon || undefined,
      shipping: purchaseData.shipping || 0,
      tax: purchaseData.tax || 0
    });

    console.log('GTM: Purchase conversion tracked successfully');
  } catch (error) {
    console.error('GTM: Error tracking purchase conversion:', error);
  }
};

/**
 * Track add to cart events specifically
 * @param {Object} item - Item being added to cart
 * @param {number} quantity - Quantity being added
 */
export const trackAddToCart = async (item, quantity = 1) => {
  try {
    const eventData = {
      currency: 'CAD',
      value: (item.price || 0) * quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        item_category: 'water_test_kit',
        quantity: quantity,
        price: item.price || 0
      }]
    };

    await trackCartEvent('add_to_cart', eventData);
  } catch (error) {
    console.error('GTM: Error tracking add to cart:', error);
  }
};

export default {
  pushToDataLayer,
  trackSignupConversion,
  trackShopPageView,
  trackCustomEvent,
  trackUserLogin,
  trackCartEvent,
  trackPurchaseConversion,
  trackAddToCart
};