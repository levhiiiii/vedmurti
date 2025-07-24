import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../Firebase/firebase';
import { FaStar, FaShoppingCart, FaHeart, FaChevronLeft } from 'react-icons/fa';
import { FiShare2, FiCheck } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useUser } from '../../context/UserContext';

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  
  const { addToCart, isInCart, getCartItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const db = getFirestore(app);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() });
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Failed to fetch product');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/products/${productId}` } });
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product, quantity);
      // Show success message or update UI
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      navigate('/login', { state: { from: `/products/${productId}` } });
      return;
    }
    setShowPaymentModal(true);
  };

  const placeOrder = async () => {
    try {
      if (!paymentMethod) {
        alert('Please select a payment method');
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;
      const db = getFirestore(app);

      const orderData = {
        userId: user.uid,
        products: [{
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.image
        }],
        totalAmount: product.price * quantity,
        paymentMethod,
        status: paymentMethod === 'COD' ? 'pending' : 'paid',
        shippingAddress: '', // You can add address selection
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      setShowPaymentModal(false);
      alert(`Order placed successfully! ${paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}`);
      navigate('/orders');
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order');
    }
  };

  const handleToggleWishlist = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/products/${productId}` } });
      return;
    }

    try {
      await toggleWishlist(product);
    } catch (err) {
      console.error('Error updating wishlist:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">{error}</h2>
          <button 
            onClick={() => navigate('/shop')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Determine images array
  const images = product.images && Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : ['/placeholder-product.jpg'];

  return (
    <div className="bg-green-50 min-h-screen">
      {/* Navigation */}
      <div className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-green-600 mr-4"
          >
            <FaChevronLeft className="mr-1" />
            Back
          </button>
          <h1 className="text-xl font-semibold text-gray-800 flex-1 text-center">
            Product Details
          </h1>
        </div>
      </div>

      {/* Product Details */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Product Images */}
          <div className="mb-8 lg:mb-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={images[mainImageIdx]}
                alt={product.name}
                className="w-full h-96 object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="flex space-x-2 mt-4 justify-center">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImageIdx(idx)}
                    className={`border rounded-md p-1 focus:outline-none ${mainImageIdx === idx ? 'border-green-600' : 'border-gray-300'}`}
                    style={{ width: 64, height: 64 }}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx+1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < Math.floor(product.rating || 0) ? 'fill-current' : 'fill-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    ({product.reviewCount || 0} reviews)
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleToggleWishlist}
                  className={`p-2 rounded-full transition-colors ${
                    isInWishlist(product?.id) 
                      ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <FaHeart className={isInWishlist(product?.id) ? 'fill-current' : ''} />
                </button>
                <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100">
                  <FiShare2 />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600">{product.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-green-700">
                  ₹{product.price?.toLocaleString() || '0'}
                </span>
                {product.originalPrice && (
                  <span className="text-gray-400 line-through ml-2">
                    ₹{product.originalPrice.toLocaleString()}
                  </span>
                )}
                {product.originalPrice && (
                  <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-1 rounded">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
              {product.stock > 0 ? (
                <p className="text-sm text-green-600 mt-1">In Stock ({product.stock} available)</p>
              ) : (
                <p className="text-sm text-red-600 mt-1">Out of Stock</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-100 hover:bg-gray-200"
                >
                  -
                </button>
                <span className="px-4 py-1 border-t border-b border-gray-300 bg-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-100 hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center px-6 py-3 border rounded-md transition-colors ${
                  isInCart(product?.id)
                    ? 'border-green-600 bg-green-50 text-green-600'
                    : 'border-green-600 text-green-600 hover:bg-green-50'
                }`}
                disabled={addingToCart || product?.stock <= 0}
              >
                {addingToCart ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Adding...
                  </>
                ) : isInCart(product?.id) ? (
                  <>
                    <FiCheck className="mr-2" />
                    In Cart
                  </>
                ) : (
                  <>
                    <FaShoppingCart className="mr-2" />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={product.stock <= 0}
              >
                Buy Now
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Details</h3>
              <div className="mt-4">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex">
                    <span className="w-24 font-medium">Category:</span>
                    <span>{product.category || 'N/A'}</span>
                  </li>
                  <li className="flex">
                    <span className="w-24 font-medium">Product ID:</span>
                    <span>{product.productId || product.id}</span>
                  </li>
                  <li className="flex">
                    <span className="w-24 font-medium">Weight:</span>
                    <span>{product.weight || 'N/A'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Payment Method</h2>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center space-x-3 p-3 border rounded-lg hover:border-green-500 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={() => setPaymentMethod('Online')}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <div>
                  <span className="block font-medium">Pay Online</span>
                  <span className="block text-sm text-gray-500">Credit/Debit Card, UPI, Net Banking</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg hover:border-green-500 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <div>
                  <span className="block font-medium">Cash on Delivery</span>
                  <span className="block text-sm text-gray-500">Pay when you receive the product</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;