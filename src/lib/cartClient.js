// src/lib/cartClient.js
import { supabase } from './supabaseClient';

/**
 * Cart management utilities for authenticated users
 * Note: This implementation requires users to be logged in to manage cart items
 */

/**
 * Get or create a cart for the authenticated user
 * @returns {Object} { cart, error }
 */
export const getOrCreateUserCart = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access cart');
    }

    // Check if user already has a cart
    const { data: existingCart, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (cartError && cartError.code !== 'PGRST116') {
      // PGRST116 is "not found" - any other error is a real problem
      throw cartError;
    }

    if (existingCart) {
      return { cart: existingCart, error: null };
    }

    // Create new cart for user
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert([{ user_id: user.id }])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return { cart: newCart, error: null };
  } catch (error) {
    console.error('Error getting or creating cart:', error);
    return { cart: null, error };
  }
};

/**
 * Get cart items for the authenticated user
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
 * Add item to cart
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
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
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
 * Clear all items from user's cart
 * @returns {Object} { success, error }
 */
export const clearCart = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { cart, error: cartError } = await getOrCreateUserCart();
    
    if (cartError || !cart) {
      throw cartError || new Error('Failed to access cart');
    }

    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.cart_id);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error clearing cart:', error);
    return { success: false, error };
  }
};

// Export all functions as default object for easier importing
export default {
  getOrCreateUserCart,
  getCartItems,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  getCartSummary,
  clearCart
};