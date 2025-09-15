// src/config/gtm.js - Final GTM configuration with purchase tracking
export const GTM_CONFIG = {
  // GTM Container ID
  CONTAINER_ID: 'GTM-5MKLRHX',
  
  // Google Ads Configuration
  GOOGLE_ADS: {
    // Your Google Ads account ID
    CONVERSION_ID: 'AW-10938159955',
    
    // Conversion labels - Update PURCHASE.LABEL with actual label from Google Ads
    CONVERSIONS: {
      SIGNUP: {
        LABEL: '8ralCLzR040YENOm3N8o', // Your existing signup label
        VALUE: 1.0,
        CURRENCY: 'USD'
      },
      SHOP_PAGE_VIEW: {
        LABEL: '8RaZCK7N1KoaENOm3N8o', // Your existing shop page view label
        DEFAULT_VALUE: 1.0,
        CURRENCY: 'CAD'
      },
      PURCHASE: {
        LABEL: 'BdB5CPeBoJsbENOm3N8o', // Replace with label from Step 2
        CURRENCY: 'CAD'
      }
    }
  },
  
  // Google Analytics 4 Configuration
  GA4: {
    MEASUREMENT_ID: 'G-8YYC0H41PQ'
  },
  
  // Event names for consistency
  EVENTS: {
    SIGNUP_CONVERSION: 'signup_conversion',
    SHOP_PAGE_VIEW_CONVERSION: 'shop_page_view_conversion',
    PURCHASE_CONVERSION: 'purchase_conversion',
    USER_LOGIN: 'login',
    PAGE_VIEW: 'page_view',
    ADD_TO_CART: 'add_to_cart',
    PURCHASE: 'purchase'
  },
  
  // Enhanced Conversions settings
  ENHANCED_CONVERSIONS: {
    ENABLED: true,
    HASH_USER_DATA: false // GTM will handle hashing
  }
};

export default GTM_CONFIG;