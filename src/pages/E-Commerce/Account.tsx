import { FiUser, FiShoppingBag, FiMapPin, FiHeart, FiLogOut } from 'react-icons/fi';
import { FaRegEdit } from 'react-icons/fa';

const AccountPage = () => {
  // Sample user data
  const user = {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    joinDate: "January 15, 2022"
  };

  // Sample orders
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

  // Sample saved addresses
  const addresses = [
    {
      id: 1,
      type: "Home",
      name: "Rahul Sharma",
      address: "123 Green Apartments, MG Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      phone: "+91 98765 43210",
      isDefault: true
    },
    {
      id: 2,
      type: "Work",
      name: "Rahul Sharma",
      address: "45 Tech Park, Outer Ring Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560103",
      phone: "+91 98765 43210",
      isDefault: false
    }
  ];

  // Sample wishlist items
  const wishlist = [
    {
      id: 1,
      name: "Noni Face Cream",
      price: 499,
      image: "/products/noni-face-cream.png"
    },
    {
      id: 2,
      name: "Noni + Aloe Vera Combo",
      price: 1299,
      image: "/products/noni-aloe-combo.png"
    }
  ];

  return (
    <div className="bg-green-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Account</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                  <FiUser className="text-green-600 text-xl" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{user.name}</h2>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <button className="flex items-center w-full px-4 py-3 rounded-lg bg-green-100 text-green-700 font-medium">
                  <FiUser className="mr-3" />
                  Profile Information
                </button>
                <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700">
                  <FiShoppingBag className="mr-3" />
                  My Orders
                </button>
                <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700">
                  <FiMapPin className="mr-3" />
                  Saved Addresses
                </button>
                <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700">
                  <FiHeart className="mr-3" />
                  Wishlist ({wishlist.length})
                </button>
                <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700">
                  <FiLogOut className="mr-3" />
                  Logout
                </button>
              </nav>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold mb-4">Account Details</h3>
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Member since:</span> {user.joinDate}</p>
                <p><span className="text-gray-500">Email:</span> {user.email}</p>
                <p><span className="text-gray-500">Phone:</span> {user.phone}</p>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Profile Information Section */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Profile Information</h2>
                <button className="text-green-600 hover:text-green-700 flex items-center">
                  <FaRegEdit className="mr-1" /> Edit
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-1">Full Name</label>
                  <div className="bg-green-50 p-3 rounded-lg">{user.name}</div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Email</label>
                  <div className="bg-green-50 p-3 rounded-lg">{user.email}</div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Phone Number</label>
                  <div className="bg-green-50 p-3 rounded-lg">{user.phone}</div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Password</label>
                  <div className="bg-green-50 p-3 rounded-lg">••••••••</div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
                  Save Changes
                </button>
              </div>
            </div>
            
            {/* Order History Section */}
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
            
            {/* Saved Addresses Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Saved Addresses</h2>
                <button className="text-green-600 hover:text-green-700 flex items-center">
                  <FaRegEdit className="mr-1" /> Add New
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`border rounded-lg p-4 ${address.isDefault ? "border-green-500 bg-green-50" : "border-gray-200"}`}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{address.type}</span>
                      {address.isDefault && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{address.name}</p>
                    <p className="text-gray-600">{address.address}</p>
                    <p className="text-gray-600">{address.city}, {address.state} - {address.pincode}</p>
                    <p className="text-gray-600 mt-2">Phone: {address.phone}</p>
                    
                    <div className="mt-4 flex space-x-3">
                      <button className="text-green-600 hover:text-green-700 text-sm">
                        Edit
                      </button>
                      {!address.isDefault && (
                        <button className="text-green-600 hover:text-green-700 text-sm">
                          Set as Default
                        </button>
                      )}
                      <button className="text-red-600 hover:text-red-700 text-sm">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;