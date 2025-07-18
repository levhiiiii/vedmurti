import { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../Firebase/firebase';
import { useUser } from './UserContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useUser();
  const db = getFirestore(app);

  // Load cart items when user changes
  useEffect(() => {
    if (currentUser) {
      loadCartItems();
    } else {
      setCartItems([]);
    }
  }, [currentUser]);

  // Load cart items from Firebase
  const loadCartItems = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const cartQuery = query(
        collection(db, 'cart'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(cartQuery);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setCartItems(items);
    } catch (err) {
      console.error('Error loading cart items:', err);
      setError('Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    if (!currentUser) {
      throw new Error('Please login to add items to cart');
    }

    setLoading(true);
    setError(null);

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.productId === product.id);
      
      if (existingItem) {
        // Update quantity if item exists
        await updateCartItemQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Add new item to cart
        const cartItem = {
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          price: product.price,
          originalPrice: product.originalPrice,
          quantity: quantity,
          userId: currentUser.uid,
          maxQuantity: product.stock || 10,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'cart'), cartItem);
        
        // Update local state
        setCartItems(prev => [...prev, {
          id: docRef.id,
          ...cartItem,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
      
      return { success: true, message: 'Item added to cart successfully' };
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError('Failed to add item to cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemId) => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'cart', cartItemId));
      
      // Update local state
      setCartItems(prev => prev.filter(item => item.id !== cartItemId));
      
      return { success: true, message: 'Item removed from cart' };
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError('Failed to remove item from cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update cart item quantity
  const updateCartItemQuantity = async (cartItemId, newQuantity) => {
    if (!currentUser) return;
    
    if (newQuantity <= 0) {
      return removeFromCart(cartItemId);
    }

    setLoading(true);
    setError(null);

    try {
      const cartItemRef = doc(db, 'cart', cartItemId);
      await updateDoc(cartItemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCartItems(prev => prev.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity: newQuantity, updatedAt: new Date() }
          : item
      ));
      
      return { success: true, message: 'Quantity updated' };
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Failed to update quantity');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Delete all cart items for current user
      const cartQuery = query(
        collection(db, 'cart'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(cartQuery);
      const deletePromises = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      // Update local state
      setCartItems([]);
      
      return { success: true, message: 'Cart cleared successfully' };
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Failed to clear cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get cart totals
  const getCartTotals = () => {
    if (!cartItems || cartItems.length === 0) {
      return {
        subtotal: 0,
        totalItems: 0,
        discount: 0,
        shipping: 0,
        total: 0
      };
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((count, item) => count + item.quantity, 0);
    const discount = subtotal > 2000 ? 200 : 0; // Sample discount logic
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal - discount + shipping;

    return {
      subtotal,
      totalItems,
      discount,
      shipping,
      total
    };
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return cartItems.some(item => item.productId === productId);
  };

  // Get cart item by product ID
  const getCartItem = (productId) => {
    return cartItems.find(item => item.productId === productId);
  };

  // Create order from cart items
  const createOrder = async (shippingAddress = null) => {
    if (!currentUser) {
      throw new Error('Please login to place an order');
    }

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    setLoading(true);
    setError(null);

    try {
      const { subtotal, totalItems, discount, shipping, total } = getCartTotals();
      
      // Generate order ID and tracking number
      const orderId = `ORD${Date.now()}`;
      const trackingNumber = `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const orderData = {
        id: orderId,
        userId: currentUser.uid,
        items: cartItems.map(item => ({
          productId: item.productId,
          name: item.productName,
          image: item.productImage,
          price: item.price,
          originalPrice: item.originalPrice,
          quantity: item.quantity
        })),
        subtotal,
        discount,
        shipping,
        total,
        totalItems,
        status: 'Processing',
        tracking: trackingNumber,
        date: new Date().toLocaleDateString('en-IN'),
        shippingAddress: shippingAddress || {
          name: currentUser.displayName || 'Customer',
          address: 'Default Address',
          city: 'City',
          state: 'State',
          pincode: '000000',
          phone: currentUser.phoneNumber || 'N/A'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save order to Firebase
      await addDoc(collection(db, 'orders'), orderData);
      
      // Clear cart after successful order
      await clearCart();
      
      return { 
        success: true, 
        message: 'Order placed successfully!', 
        orderId,
        trackingNumber 
      };
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Failed to place order');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Buy again functionality - add order items to cart
  const buyAgain = async (orderItems) => {
    if (!currentUser) {
      throw new Error('Please login to add items to cart');
    }

    setLoading(true);
    setError(null);

    try {
      const addPromises = orderItems.map(item => {
        const product = {
          id: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          originalPrice: item.originalPrice,
          stock: 10 // Default stock
        };
        return addToCart(product, item.quantity);
      });

      await Promise.all(addPromises);
      
      return { 
        success: true, 
        message: 'Items added to cart successfully!' 
      };
    } catch (err) {
      console.error('Error adding items to cart:', err);
      setError('Failed to add items to cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cartItems,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    loadCartItems,
    getCartTotals,
    isInCart,
    getCartItem,
    createOrder,
    buyAgain
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
