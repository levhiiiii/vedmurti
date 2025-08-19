import { FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiCheck } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import LeafLoader from '../../components/Loader';

const CartPage = () => {
  const { cartItems, loading, updateCartItemQuantity, removeFromCart, getCartTotals, createOrder } = useCart();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [processingItem, setProcessingItem] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Handle quantity change
  const updateQuantity = async (cartItemId, newQuantity, maxQuantity) => {
    const finalQuantity = Math.min(Math.max(1, newQuantity), maxQuantity);
    setProcessingItem(cartItemId);
    try {
      await updateCartItemQuantity(cartItemId, finalQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setProcessingItem(null);
    }
  };

  // Remove item from cart
  const removeItem = async (cartItemId) => {
    setProcessingItem(cartItemId);
    try {
      await removeFromCart(cartItemId);
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setProcessingItem(null);
    }
  };

  // Get cart totals
  const { subtotal, totalItems, discount, shipping, total } = getCartTotals();

  // Handle coupon application
  const applyCoupon = () => {
    // Implement coupon logic here
    console.log('Applying coupon:', couponCode);
  };

  // Handle checkout process
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await createOrder();
      setOrderSuccess(result);
      // Auto redirect to orders page after 3 seconds
      setTimeout(() => {
        navigate('/account/orders');
      }, 3000);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed: ' + error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Redirect to login if not authenticated
  if (!currentUser) {
    return (
      <div className="bg-green-50 min-h-screen py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your cart.</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-green-50 min-h-screen py-8">
        <div className="container mx-auto px-4 flex justify-center items-center min-h-[400px]">
          <LeafLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Order Success Modal */}
        {orderSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="text-3xl text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h3>
              <p className="text-gray-600 mb-4">Thank you for your purchase. Your order has been confirmed.</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Order ID: <span className="font-medium">{orderSuccess.orderId}</span></p>
                <p className="text-sm text-gray-600">Tracking: <span className="font-medium">{orderSuccess.trackingNumber}</span></p>
              </div>
              <p className="text-sm text-gray-500 mb-4">Redirecting to your orders page...</p>
              <button 
                onClick={() => navigate('/account/orders')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                View Orders
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center mb-8">
          <FiShoppingCart className="text-3xl text-green-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
          <span className="ml-auto bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
            {totalItems}
          </span>
        </div>

        {cartItems.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items */}
            <div className="lg:w-2/3">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 bg-green-100 p-4 border-b">
                  <div className="col-span-5 font-medium text-gray-700">Product</div>
                  <div className="col-span-2 font-medium text-gray-700">Price</div>
                  <div className="col-span-3 font-medium text-gray-700">Quantity</div>
                  <div className="col-span-2 font-medium text-gray-700">Total</div>
                </div>

                {/* Cart Items */}
                {cartItems.map(item => (
                  <div key={item.id} className="p-4 border-b last:border-b-0">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Product Info */}
                      <div className="col-span-12 md:col-span-5">
                        <div className="flex items-center">
                          <img 
                            src={item.productImage || '/placeholder-product.jpg'} 
                            alt={item.productName}
                            className="w-20 h-20 object-contain mr-4"
                          />
                          <div>
                            <h3 className="font-medium text-gray-800">{item.productName}</h3>
                            {item.originalPrice && (
                              <p className="text-sm text-gray-500 line-through">
                                ₹{item.originalPrice.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="col-span-4 md:col-span-2">
                        <p className="font-medium text-gray-800">
                          ₹{item.price.toLocaleString()}
                        </p>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 md:col-span-3">
                        <div className="flex items-center border rounded-lg w-fit">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.maxQuantity)}
                            className="px-3 py-1 text-gray-600 hover:bg-green-50 disabled:opacity-50"
                            disabled={item.quantity <= 1 || processingItem === item.id}
                          >
                            <FiMinus />
                          </button>
                          <span className="px-3">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.maxQuantity)}
                            className="px-3 py-1 text-gray-600 hover:bg-green-50 disabled:opacity-50"
                            disabled={item.quantity >= item.maxQuantity || processingItem === item.id}
                          >
                            <FiPlus />
                          </button>
                        </div>
                        {item.quantity >= item.maxQuantity && (
                          <p className="text-xs text-red-500 mt-1">Max quantity reached</p>
                        )}
                        {processingItem === item.id && (
                          <p className="text-xs text-blue-500 mt-1">Updating...</p>
                        )}
                      </div>

                      {/* Total */}
                      <div className="col-span-4 md:col-span-2 flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-2 disabled:opacity-50"
                          disabled={processingItem === item.id}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon & Continue Shopping */}
              <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button 
                    onClick={applyCoupon}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-r-lg"
                  >
                    Apply
                  </button>
                </div>
                <button 
                  onClick={() => navigate('/shop')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  ← Continue Shopping
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <FaLeaf className="text-green-600 mr-2" />
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-₹{discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className={shipping > 0 ? "" : "text-green-600"}>
                      {shipping > 0 ? `₹${shipping.toLocaleString()}` : "FREE"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut || cartItems.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium mb-4 shadow-md flex items-center justify-center"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>

                <div className="flex items-center justify-center space-x-4">
                  <img src="/payment/visa.png" alt="Visa" className="h-8" />
                  <img src="/payment/mastercard.png" alt="Mastercard" className="h-8" />
                  <img src="/payment/rupay.png" alt="Rupay" className="h-8" />
                  <img src="/payment/upi.png" alt="UPI" className="h-8" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Empty Cart
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FiShoppingCart className="mx-auto text-5xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet</p>
            <button 
              onClick={() => navigate('/shop')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium"
            >
              Shop Noni Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;