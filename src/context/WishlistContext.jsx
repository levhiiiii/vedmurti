import { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { app } from '../Firebase/firebase';
import { useUser } from './UserContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useUser();
  const db = getFirestore(app);

  // Load wishlist items when user changes
  useEffect(() => {
    if (currentUser) {
      loadWishlistItems();
    } else {
      setWishlistItems([]);
    }
  }, [currentUser]);

  // Load wishlist items from Firebase
  const loadWishlistItems = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const wishlistQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(wishlistQuery);
      const items = [];
      
      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setWishlistItems(items);
    } catch (err) {
      console.error('Error loading wishlist items:', err);
      setError('Failed to load wishlist items');
    } finally {
      setLoading(false);
    }
  };

  // Add item to wishlist
  const addToWishlist = async (product) => {
    if (!currentUser) {
      throw new Error('Please login to add items to wishlist');
    }

    // Check if item already exists in wishlist
    const existingItem = wishlistItems.find(item => item.productId === product.id);
    if (existingItem) {
      throw new Error('Item already in wishlist');
    }

    setLoading(true);
    setError(null);

    try {
      const wishlistItem = {
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        price: product.price,
        originalPrice: product.originalPrice,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'wishlist'), wishlistItem);
      
      // Update local state
      setWishlistItems(prev => [...prev, {
        id: docRef.id,
        ...wishlistItem,
        createdAt: new Date()
      }]);
      
      return { success: true, message: 'Item added to wishlist successfully' };
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      setError('Failed to add item to wishlist');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId) => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Find the wishlist item by productId
      const wishlistItem = wishlistItems.find(item => item.productId === productId);
      if (!wishlistItem) {
        throw new Error('Item not found in wishlist');
      }

      await deleteDoc(doc(db, 'wishlist', wishlistItem.id));
      
      // Update local state
      setWishlistItems(prev => prev.filter(item => item.productId !== productId));
      
      return { success: true, message: 'Item removed from wishlist' };
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError('Failed to remove item from wishlist');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle wishlist status
  const toggleWishlist = async (product) => {
    if (!currentUser) {
      throw new Error('Please login to manage wishlist');
    }

    const isInWishlist = wishlistItems.some(item => item.productId === product.id);
    
    if (isInWishlist) {
      return await removeFromWishlist(product.id);
    } else {
      return await addToWishlist(product);
    }
  };

  // Clear entire wishlist
  const clearWishlist = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Delete all wishlist items for current user
      const wishlistQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(wishlistQuery);
      const deletePromises = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      // Update local state
      setWishlistItems([]);
      
      return { success: true, message: 'Wishlist cleared successfully' };
    } catch (err) {
      console.error('Error clearing wishlist:', err);
      setError('Failed to clear wishlist');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if product is in wishlist
  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.productId === productId);
  };

  // Get wishlist item by product ID
  const getWishlistItem = (productId) => {
    return wishlistItems.find(item => item.productId === productId);
  };

  // Get wishlist count
  const getWishlistCount = () => {
    return wishlistItems ? wishlistItems.length : 0;
  };

  const value = {
    wishlistItems,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    loadWishlistItems,
    isInWishlist,
    getWishlistItem,
    getWishlistCount
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
