import { FiShoppingCart, FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { useState } from 'react';

const CartPage = () => {
  // Sample cart items
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: 'Premium Noni Juice - 500ml',
      price: 899,
      originalPrice: 999,
      quantity: 2,
      image: '/products/noni-juice-500ml.png',
      maxQuantity: 5
    },
    {
      id: 2,
      name: 'Noni Capsules (60 count)',
      price: 699,
      quantity: 1,
      image: '/products/noni-capsules.png',
      maxQuantity: 10
    },
    {
      id: 3,
      name: 'Noni Face Cream',
      price: 499,
      quantity: 1,
      image: '/products/noni-face-cream.png',
      maxQuantity: 3
    }
  ]);

  // Handle quantity change
  const updateQuantity = (id: number, newQuantity: number) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: Math.min(Math.max(1, newQuantity), item.maxQuantity) } : item
    ));
  };

  // Remove item from cart
  const removeItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal > 2000 ? 200 : 0; // Sample discount logic
  const shipping = subtotal > 1000 ? 0 : 50;
  const total = subtotal - discount + shipping;

  return (
    <div className="bg-green-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <FiShoppingCart className="text-3xl text-green-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
          <span className="ml-auto bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
            {cartItems.reduce((count, item) => count + item.quantity, 0)}
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
                            src={item.image} 
                            alt={item.name}
                            className="w-20 h-20 object-contain mr-4"
                          />
                          <div>
                            <h3 className="font-medium text-gray-800">{item.name}</h3>
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
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-green-50"
                            disabled={item.quantity <= 1}
                          >
                            <FiMinus />
                          </button>
                          <span className="px-3">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-green-50"
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            <FiPlus />
                          </button>
                        </div>
                        {item.quantity >= item.maxQuantity && (
                          <p className="text-xs text-red-500 mt-1">Max quantity reached</p>
                        )}
                      </div>

                      {/* Total */}
                      <div className="col-span-4 md:col-span-2 flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-2"
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
                    className="px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-r-lg">
                    Apply
                  </button>
                </div>
                <button className="text-green-600 hover:text-green-700 font-medium">
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

                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium mb-4 shadow-md">
                  Proceed to Checkout
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
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium">
              Shop Noni Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;