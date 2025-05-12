const Orders = () => {
  const orders = [
    {
      id: "#VEDI-2023-4567",
      date: "March 12, 2023",
      status: "Delivered",
      items: [
        { name: "Premium Noni Juice - 500ml", quantity: 2, price: 899 },
        { name: "Noni Capsules (60 count)", quantity: 1, price: 699 }
      ],
      total: 2497,
      tracking: "DEL123456789"
    },
    {
      id: "#VEDI-2023-3421",
      date: "February 5, 2023",
      status: "Delivered",
      items: [
        { name: "Noni Juice - Family Pack (1L)", quantity: 1, price: 1599 }
      ],
      total: 1599,
      tracking: "DEL987654321"
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
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
                <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                  View Order Details
                </button>
                {order.status === "Delivered" && (
                  <button className="border border-green-600 text-green-600 hover:bg-green-50 px-4 py-1 rounded-lg text-sm">
                    Buy Again
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
            Shop Noni Products
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders;