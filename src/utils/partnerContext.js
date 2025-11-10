const PARTNER_COOKIE_NAME = 'mwq_partner_context';
const COOKIE_EXPIRY_DAYS = 30;

/**
 * Set partner context cookie and notify listeners
 * @param {string} partnerSlug - Partner slug to store
 */
export const setPartnerContext = (partnerSlug) => {
  if (!partnerSlug) return;
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
  
  document.cookie = `${PARTNER_COOKIE_NAME}=${partnerSlug}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax; Secure`;
  
  console.log('Partner context set:', partnerSlug);
  
  // Dispatch event to notify components (like TopNav)
  window.dispatchEvent(new CustomEvent('partnerContextChanged', { 
    detail: { partnerSlug } 
  }));
};

/**
 * Get partner context from cookie
 * @returns {string|null} Partner slug or null
 */
export const getPartnerContext = () => {
  const cookies = document.cookie.split(';');
  const partnerCookie = cookies.find(c => c.trim().startsWith(`${PARTNER_COOKIE_NAME}=`));
  
  if (partnerCookie) {
    const value = partnerCookie.split('=')[1].trim();
    return value || null;
  }
  
  return null;
};

/**
 * Clear partner context cookie and notify listeners
 */
export const clearPartnerContext = () => {
  document.cookie = `${PARTNER_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
  console.log('Partner context cleared');
  
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('partnerContextChanged', { 
    detail: { partnerSlug: null } 
  }));
};

/**
 * Check if user has partner context
 * @returns {boolean}
 */
export const hasPartnerContext = () => {
  return getPartnerContext() !== null;
};