// src/lib/cartClient.js - FIXED VERSION - Resolves 406 error
import { supabase } from './supabaseClient';

/**
 * Get or create a cart for the authenticated user - FIXED VERSION
 * @returns {Object} { cart, error }
 */
export const getOrCreateUserCart = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to access cart');
    }

    console.log('Getting cart for user:', user.id);

    // Get all carts for this user
    const { data: existingCarts, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (cartError && cartError.code !== 'PGRST116') {
      throw cartError;
    }

    let cart = null;

    if (existingCarts && existingCarts.length > 0) {
      cart = existingCarts[0];
      console.log(`Found existing cart:`, cart.cart_id);
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
      if (createError.code === '23505') {
        // Race condition - try to get the cart again
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
 * Get cart items for the authenticated user - FIXED VERSION
 * @returns {Object} { items, error }
 */
export const getCartItems = async () => {
  try {
    const { cart, error: cartError } = await getOrCreateUserCart();
    
    if (cartError || !cart) {
      throw cartError || new Error('Failed to get cart');
    }

    // FIXED: Use proper query that expects array response with consistent ordering
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
      .eq('cart_id', cart.cart_id)
      .order('created_at', { ascending: true }); // Consistent ordering

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
 * Add item to cart - FIXED VERSION with proper header handling
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

    console.log('Adding item to cart:', { testKitId, quantity });

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

    // FIXED: Check if item already exists - use array query instead of single
    const { data: existingItems, error: existingError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.cart_id)
      .eq('test_kit_id', testKitId);

    if (existingError) {
      throw existingError;
    }

    const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

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

    console.log('Item added to cart successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, error };
  }
};

/**
 * Update cart item quantity - FIXED VERSION
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
      return await removeFromCart(itemId);
    }

    // FIXED: Get the cart item to validate ownership and check stock - use array query
    const { data: cartItemsData, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        *,
        carts!inner(user_id),
        test_kits(quantity)
      `)
      .eq('item_id', itemId);

    if (itemError) {
      throw new Error('Error fetching cart item');
    }

    if (!cartItemsData || cartItemsData.length === 0) {
      throw new Error('Cart item not found');
    }

    const cartItem = cartItemsData[0];

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
 * Remove item from cart - FIXED VERSION
 * @param {string} itemId - Cart item ID
 * @returns {Object} { success, error }
 */
export const removeFromCart = async (itemId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // FIXED: Verify ownership before deletion - use array query
    const { data: cartItemsData, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        *,
        carts!inner(user_id)
      `)
      .eq('item_id', itemId);

    if (itemError) {
      throw new Error('Error fetching cart item');
    }

    if (!cartItemsData || cartItemsData.length === 0) {
      throw new Error('Cart item not found');
    }

    const cartItem = cartItemsData[0];

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
 * Get cart summary (total items and total price) - FIXED VERSION
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

      const { cart, error: cartError } = await getOrCreateUserCart();
      
      if (cartError || !cart) {
        throw cartError || new Error('Failed to access user cart');
      }

      console.log(`🛒 Found cart ${cart.cart_id}, clearing items...`);

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.cart_id);

      if (deleteError) {
        throw new Error(`Database delete failed: ${deleteError.message}`);
      }

      console.log(`✅ Cart cleared successfully on attempt ${attempt}`);
      return { success: true, error: null, attempts: attempt };
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Cart clearing attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * attempt, 3000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`💥 All ${maxAttempts} cart clearing attempts failed. Last error:`, lastError?.message);
  return { 
    success: false, 
    error: lastError || new Error('Cart clearing failed after multiple attempts'),
    attempts: maxAttempts
  };
};

// Export all functions
export default {
  getOrCreateUserCart,
  getCartItems,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  getCartSummary,
  clearCart
};