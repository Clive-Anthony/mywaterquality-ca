// src/lib/cartClient.js - COMPLETE IMPROVED VERSION
// Replace your entire cartClient.js file with this improved version

import { supabase } from './supabaseClient';

/**
 * Get or create a cart for the authenticated user - IMPROVED VERSION
 * Handles multiple carts gracefully by using the most recent one with items
 * @returns {Object} { cart, error }
 */
export const getOrCreateUserCart = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access cart');
    }

    console.log('Getting cart for user:', user.id);

    // Get all carts for this user (handle multiple carts gracefully)
    const { data: existingCarts, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (cartError && cartError.code !== 'PGRST116') {
      // PGRST116 is "not found" - any other error is a real problem
      throw cartError;
    }

    let cart = null;

    if (existingCarts && existingCarts.length > 0) {
      // If multiple carts exist, use the most recent one
      cart = existingCarts[0];

      console.log(`Found ${existingCarts.length} existing carts, using cart:`, cart.cart_id);

      // If we found multiple carts, clean up the extras (non-blocking)
      if (existingCarts.length > 1) {
        console.log('Multiple carts detected, cleaning up extras...');
        const cartsToDelete = existingCarts
          .slice(1) // Keep the first (most recent), delete the rest
          .map(c => c.cart_id);
        
        // Delete extra carts in background (don't await)
        supabase
          .from('carts')
          .delete()
          .in('cart_id', cartsToDelete)
          .then(({ error: deleteError }) => {
            if (deleteError) {
              console.warn('Failed to clean up extra carts:', deleteError);
            } else {
              console.log('Successfully cleaned up', cartsToDelete.length, 'extra carts');
            }
          });
      }

      return { cart, error: null };
    }

    // No existing cart found, create a new one
    console.log('No existing cart found, creating new cart...');
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert([{ user_id: user.id }])
      .select()
      .single();

    if (createError) {
      // Handle unique constraint violation (in case of race condition)
      if (createError.code === '23505') {
        console.log('Cart creation failed due to uniqueness constraint, retrying...');
        // Race condition - cart was created by another request, try to get it again
        const { data: raceCart, error: raceError } = await supabase
          .from('carts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (raceError) {
          throw raceError;
        }
        return { cart: raceCart, error: null };
      }
      throw createError;
    }

    console.log('New cart created:', newCart.cart_id);
    return { cart: newCart, error: null };
  } catch (error) {
    console.error('Error getting or creating cart:', error);
    return { cart: null, error };
  }
};

/**
 * Get cart items for the authenticated user - IMPROVED VERSION
 * @returns {Object} { items, error }
 */
export const getCartItems = async () => {
  try {
    const { cart, error: cartError } = await getOrCreateUserCart();
    
    if (cartError || !cart) {
      throw cartError || new Error('Failed to get cart');
    }

    const { data: items, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        test_kits (
          id,
          name,
          description,
          price,
          quantity
        )
      `)
      .eq('cart_id', cart.cart_id);

    if (error) {
      throw error;
    }

    return { items: items || [], error: null };
  } catch (error) {
    console.error('Error getting cart items:', error);
    return { items: [], error };
  }
};

/**
 * Add item to cart - IMPROVED VERSION with better error handling
 * @param {string} testKitId - ID of the test kit to add
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Object} { success, error }
 */
export const addToCart = async (testKitId, quantity = 1) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to add items to cart');
    }

    // Validate test kit exists and is in stock
    const { data: testKit, error: testKitError } = await supabase
      .from('test_kits')
      .select('id, name, quantity')
      .eq('id', testKitId)
      .single();

    if (testKitError) {
      throw new Error('Test kit not found');
    }

    if (testKit.quantity < quantity) {
      throw new Error('Insufficient stock available');
    }

    const { cart, error: cartError } = await getOrCreateUserCart();
    
    if (cartError || !cart) {
      throw cartError || new Error('Failed to access cart');
    }

    // Check if item already exists in cart
    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.cart_id)
      .eq('test_kit_id', testKitId)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 results

    if (existingError) {
      throw existingError;
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      
      // Check stock for new total quantity
      if (testKit.quantity < newQuantity) {
        throw new Error('Insufficient stock for requested quantity');
      }

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('item_id', existingItem.item_id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Add new item to cart
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert([{
          cart_id: cart.cart_id,
          test_kit_id: testKitId,
          quantity: quantity
        }]);

      if (insertError) {
        throw insertError;
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, error };
  }
};

/**
 * Update cart item quantity
 * @param {string} itemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Object} { success, error }
 */
export const updateCartItemQuantity = async (itemId, quantity) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      return await removeFromCart(itemId);
    }

    // Get the cart item to validate ownership and check stock
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        *,
        carts!inner(user_id),
        test_kits(quantity)
      `)
      .eq('item_id', itemId)
      .single();

    if (itemError) {
      throw new Error('Cart item not found');
    }

    // Verify ownership
    if (cartItem.carts.user_id !== user.id) {
      throw new Error('Unauthorized access to cart item');
    }

    // Check stock
    if (cartItem.test_kits.quantity < quantity) {
      throw new Error('Insufficient stock available');
    }

    const { error: updateError } = await supabase
      .from('cart_items')
      .update({ 
        quantity: quantity,
        updated_at: new Date().toISOString()
      })
      .eq('item_id', itemId);

    if (updateError) {
      throw updateError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating cart item:', error);
    return { success: false, error };
  }
};

/**
 * Remove item from cart
 * @param {string} itemId - Cart item ID
 * @returns {Object} { success, error }
 */
export const removeFromCart = async (itemId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Verify ownership before deletion
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        *,
        carts!inner(user_id)
      `)
      .eq('item_id', itemId)
      .single();

    if (itemError) {
      throw new Error('Cart item not found');
    }

    if (cartItem.carts.user_id !== user.id) {
      throw new Error('Unauthorized access to cart item');
    }

    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('item_id', itemId);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing from cart:', error);
    return { success: false, error };
  }
};

/**
 * Get cart summary (total items and total price)
 * @returns {Object} { totalItems, totalPrice, error }
 */
export const getCartSummary = async () => {
  try {
    const { items, error } = await getCartItems();
    
    if (error) {
      throw error;
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => {
      return sum + (item.quantity * item.test_kits.price);
    }, 0);

    return { 
      totalItems, 
      totalPrice, 
      error: null 
    };
  } catch (error) {
    console.error('Error getting cart summary:', error);
    return { 
      totalItems: 0, 
      totalPrice: 0, 
      error 
    };
  }
};

/**
 * Enhanced clear cart function with retry logic and better error handling
 * @returns {Object} { success, error, attempts }
 */
export const clearCart = async () => {
    const maxAttempts = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🛒 Cart clearing attempt ${attempt}/${maxAttempts}`);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User must be authenticated to clear cart');
        }
  
        // Get user's cart with timeout
        const { cart, error: cartError } = await Promise.race([
          getOrCreateUserCart(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cart lookup timeout')), 5000)
          )
        ]);
        
        if (cartError || !cart) {
          throw cartError || new Error('Failed to access user cart');
        }
  
        console.log(`🛒 Found cart ${cart.cart_id}, clearing items...`);
  
        // Clear cart items with timeout
        const { error: deleteError } = await Promise.race([
          supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cart.cart_id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cart clearing timeout')), 8000)
          )
        ]);
  
        if (deleteError) {
          throw new Error(`Database delete failed: ${deleteError.message}`);
        }
  
        console.log(`✅ Cart cleared successfully on attempt ${attempt}`);
        return { success: true, error: null, attempts: attempt };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Cart clearing attempt ${attempt} failed:`, error.message);
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * attempt, 3000); // Progressive delay: 1s, 2s, 3s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    console.error(`💥 All ${maxAttempts} cart clearing attempts failed. Last error:`, lastError?.message);
    return { 
      success: false, 
      error: lastError || new Error('Cart clearing failed after multiple attempts'),
      attempts: maxAttempts
    };
  };
  
  /**
   * Alternative cart clearing method that clears via direct SQL
   * This can be used as a fallback if the primary method fails
   * @returns {Object} { success, error }
   */
  export const clearCartDirect = async () => {
    try {
      console.log('🛒 Attempting direct cart clearing...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }
  
      // Direct deletion using user_id through the carts relationship
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .in('cart_id', 
          supabase
            .from('carts')
            .select('cart_id')
            .eq('user_id', user.id)
        );
  
      if (deleteError) {
        throw new Error(`Direct cart clear failed: ${deleteError.message}`);
      }
  
      console.log('✅ Direct cart clearing successful');
      return { success: true, error: null };
      
    } catch (error) {
      console.error('❌ Direct cart clearing failed:', error.message);
      return { success: false, error };
    }
  };
  
  /**
   * Comprehensive cart clearing that tries multiple methods
   * @returns {Object} { success, error, method }
   */
  export const clearCartComprehensive = async () => {
    console.log('🛒 Starting comprehensive cart clearing...');
    
    // Method 1: Standard clearing with retry
    console.log('🛒 Trying Method 1: Standard clearing with retry...');
    const standardResult = await clearCart();
    
    if (standardResult.success) {
      return { ...standardResult, method: 'standard' };
    }
    
    console.log('🛒 Method 1 failed, trying Method 2: Direct clearing...');
    
    // Method 2: Direct clearing as fallback
    const directResult = await clearCartDirect();
    
    if (directResult.success) {
      return { ...directResult, method: 'direct' };
    }
    
    console.log('💥 All cart clearing methods failed');
    
    // Both methods failed
    return {
      success: false,
      error: new Error(`All clearing methods failed. Standard: ${standardResult.error?.message}, Direct: ${directResult.error?.message}`),
      method: 'none'
    };
  };
  
  // Update the default export to include the new functions
  export default {
    getOrCreateUserCart,
    getCartItems,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    getCartSummary,
    clearCart,
    clearCartDirect,
    clearCartComprehensive
  };