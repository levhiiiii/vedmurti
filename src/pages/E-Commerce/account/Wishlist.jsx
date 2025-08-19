import { useState } from 'react';
import { FiHeart, FiShoppingBag, FiLoader } from 'react-icons/fi';
import { useWishlist } from '../../../context/WishlistContext';
import { useCart } from '../../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Wishlist = () => {
  const { wishlistItems, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [processingItem, setProcessingItem] = useState(null);

  const handleAddToCart = async (item) => {
    setProcessingItem(item.productId);
    try {
      await addToCart({
        id: item.productId,
        name: item.productName,
        image: item.productImage,
        price: item.price,
        originalPrice: item.originalPrice
      });
      await removeFromWishlist(item.productId);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setProcessingItem(null);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    setProcessingItem(productId);
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    } finally {
      setProcessingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <FiLoader className="animate-spin text-4xl text-green-600" />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Your Wishlist</h2>
      
      {wishlistItems.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="relative">
                <div className="bg-gray-100 h-48 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {item.productImage ? (
                    <img 
                      src={item.productImage} 
                      alt={item.productName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FiHeart className="text-gray-300 text-4xl" />
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFromWishlist(item.productId)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={processingItem === item.productId}
                >
                  <FiHeart className="fill-current" />
                </button>
              </div>
              <h3 className="font-medium text-lg mb-1">{item.productName}</h3>
              <div className="flex items-baseline mb-4">
                <p className="text-green-600 font-medium">₹{item.price.toLocaleString()}</p>
                {item.originalPrice && (
                  <>
                    <p className="text-sm text-gray-500 line-through ml-2">
                      ₹{item.originalPrice.toLocaleString()}
                    </p>
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center disabled:opacity-50"
                  disabled={processingItem === item.productId}
                >
                  {processingItem === item.productId ? (
                    <FiLoader className="animate-spin mr-2" />
                  ) : (
                    <FiShoppingBag className="mr-2" />
                  )}
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiHeart className="text-gray-400 text-3xl" />
          </div>
          <p className="text-gray-600 mb-4">Your wishlist is empty</p>
          <button 
            onClick={() => navigate('/shop')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Browse Products
          </button>
        </div>
      )}
    </>
  );
};

export default Wishlist;
