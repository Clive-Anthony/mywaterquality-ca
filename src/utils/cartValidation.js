/**
 * Check if cart has items from a specific partner
 * @param {Array} cartItems - Array of cart items
 * @param {string} partnerId - Partner UUID to check
 * @returns {boolean}
 */
export const hasItemsFromPartner = (cartItems, partnerId) => {
  return cartItems.some(item => item.partner_id === partnerId);
};

/**
 * Check if cart has items from any partner
 * @param {Array} cartItems - Array of cart items
 * @returns {boolean}
 */
export const hasPartnerItems = (cartItems) => {
  return cartItems.some(item => item.partner_id !== null);
};

/**
 * Check if cart has non-partner items
 * @param {Array} cartItems - Array of cart items
 * @returns {boolean}
 */
export const hasNonPartnerItems = (cartItems) => {
  return cartItems.some(item => item.partner_id === null);
};

/**
 * Get unique partner IDs from cart
 * @param {Array} cartItems - Array of cart items
 * @returns {Array} Array of unique partner IDs
 */
export const getCartPartnerIds = (cartItems) => {
  const partnerIds = cartItems
    .filter(item => item.partner_id !== null)
    .map(item => item.partner_id);
  
  return [...new Set(partnerIds)];
};

/**
 * Check if adding an item would cause a partner conflict
 * @param {Array} cartItems - Current cart items
 * @param {string|null} newItemPartnerId - Partner ID of item being added
 * @returns {Object} { allowed: boolean, reason: string, conflictType: string }
 */
export const validateAddToCart = (cartItems, newItemPartnerId) => {
  // Empty cart - always allow
  if (cartItems.length === 0) {
    return { allowed: true, reason: null, conflictType: null };
  }

  const hasPartner = hasPartnerItems(cartItems);
  const hasNonPartner = hasNonPartnerItems(cartItems);
  const existingPartnerIds = getCartPartnerIds(cartItems);

  // Adding non-partner item
  if (newItemPartnerId === null) {
    if (hasPartner) {
      return {
        allowed: false,
        reason: 'Your cart contains items from a partner shop. Please complete that purchase or clear your cart first.',
        conflictType: 'partner_to_regular'
      };
    }
    return { allowed: true, reason: null, conflictType: null };
  }

  // Adding partner item
  if (hasNonPartner) {
    return {
      allowed: false,
      reason: 'Your cart contains regular shop items. Please complete that purchase or clear your cart first.',
      conflictType: 'regular_to_partner'
    };
  }

  // Check for different partner
  if (existingPartnerIds.length > 0 && !existingPartnerIds.includes(newItemPartnerId)) {
    return {
      allowed: false,
      reason: 'Your cart contains items from a different partner. Please complete that purchase or clear your cart first.',
      conflictType: 'different_partner'
    };
  }

  return { allowed: true, reason: null, conflictType: null };
};

/**
 * Get partner info from cart items
 * @param {Array} cartItems - Array of cart items
 * @returns {Object|null} { partnerId, partnerName } or null
 */
export const getCartPartnerInfo = (cartItems) => {
  const partnerItem = cartItems.find(item => item.partner_id !== null);
  
  if (!partnerItem) return null;
  
  return {
    partnerId: partnerItem.partner_id,
    // Partner name would need to be fetched separately if needed
  };
};

/**
 * Check if cart can proceed to checkout
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} { canCheckout: boolean, reason: string }
 */
export const validateCheckout = (cartItems) => {
  if (cartItems.length === 0) {
    return {
      canCheckout: false,
      reason: 'Your cart is empty'
    };
  }

  const partnerIds = getCartPartnerIds(cartItems);
  
  // Multiple partners (shouldn't happen with validation, but double-check)
  if (partnerIds.length > 1) {
    return {
      canCheckout: false,
      reason: 'Cart contains items from multiple partners'
    };
  }

  // Check for mixed partner/non-partner (shouldn't happen, but double-check)
  if (hasPartnerItems(cartItems) && hasNonPartnerItems(cartItems)) {
    return {
      canCheckout: false,
      reason: 'Cart contains both partner and regular items'
    };
  }

  return {
    canCheckout: true,
    reason: null
  };
};