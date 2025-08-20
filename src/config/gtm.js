// src/config/gtm.js - GTM configuration
export const GTM_CONFIG = {
  // GTM Container ID - Replace GTM-XXXXXXX with your actual container ID
  CONTAINER_ID: 'GTM-GTM-5MKLRHX',
  
  // Google Ads Configuration
  GOOGLE_ADS: {
    // Your Google Ads account ID
    CONVERSION_ID: 'AW-10938159955',
    
    // Conversion labels - These will be provided by Google Ads when you create the conversions
    CONVERSIONS: {
      SIGNUP: {
        LABEL: '8ralCLzR040YENOm3N8o', // Replace with actual label from Google Ads
        VALUE: 1.0,
        CURRENCY: 'USD'
      },
      SHOP_PAGE_VIEW: {
        LABEL: '8RaZCK7N1KoaENOm3N8o', // Replace with actual label from Google Ads
        DEFAULT_VALUE: 1.0,
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
    USER_LOGIN: 'login',
    PAGE_VIEW: 'page_view',
    ADD_TO_CART: 'add_to_cart',
    PURCHASE: 'purchase'
  },
  
  // Enhanced Conversions settings
  ENHANCED_CONVERSIONS: {
    ENABLED: true,
    HASH_USER_DATA: true
  }
};

export default GTM_CONFIG;