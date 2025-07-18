import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../Firebase/firebase';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';

const Orders = () => {
  const { currentUser, loading } = useOutletContext();
  const user = currentUser?.currentUser;
  const navigate = useNavigate();
  const { buyAgain } = useCart();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [buyingAgain, setBuyingAgain] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) return;

    const fetchOrders = async () => {
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedOrders = [];
      querySnapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(fetchedOrders);
    };

    fetchOrders();
  }, [user]);

  const closeModal = () => {
    setSelectedOrder(null);
  };

  // Handle buy again functionality
  const handleBuyAgain = async (order) => {
    setBuyingAgain(order.id);
    try {
      await buyAgain(order.items);
      alert('Items added to cart successfully!');
      navigate('/cart');
    } catch (error) {
      console.error('Buy again failed:', error);
      alert('Failed to add items to cart: ' + error.message);
    } finally {
      setBuyingAgain(null);
    }
  };

  // Navigate to shop
  const handleShopNow = () => {
    navigate('/shop');
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Recent Orders</h2>

      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                <div>
                  <p className="font-medium">Order #{order.id}</p>
                  <p className="text-gray-600 text-sm">{order.date}</p>
                </div>
                <div className={`mt-2 md:mt-0 px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === "Delivered" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {order.status}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between mb-2">
                    <p>{item.name} × {item.quantity}</p>
                    <p>₹{item.price}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between font-medium">
                <p>Total</p>
                <p>₹{order.total}</p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <button
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                  onClick={() => setSelectedOrder(order)}
                >
                  View Order Details
                </button>
                <button 
                  onClick={() => handleBuyAgain(order)}
                  disabled={buyingAgain === order.id}
                  className="border border-green-600 text-green-600 hover:bg-green-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 px-4 py-1 rounded-lg text-sm flex items-center justify-center"
                >
                  {buyingAgain === order.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                      Adding...
                    </>
                  ) : (
                    'Buy Again'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
          <button 
            onClick={handleShopNow}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Shop Noni Products
          </button>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-transparent  border-b bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white shadow-md border border-1 border-gray-400 rounded-lg p-6 w-11/12 max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={closeModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4">Order Details - {selectedOrder.id}</h3>
            <p className="mb-2">Date: {selectedOrder.date}</p>
            <p className="mb-2">Status: {selectedOrder.status}</p>
            <p className="mb-2">Tracking Number: {selectedOrder.tracking}</p>
            <div className="border-t border-gray-200 pt-4">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="flex justify-between mb-2">
                  <p>{item.name} × {item.quantity}</p>
                  <p>₹{item.price}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between font-medium">
              <p>Total</p>
              <p>₹{selectedOrder.total}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;

