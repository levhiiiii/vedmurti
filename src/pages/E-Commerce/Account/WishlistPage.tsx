// pages/WishlistPage.jsx
import AccountLayout from "./components/layout/AccountLayout";

const WishlistPage = () => {
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
    <AccountLayout>
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">Your Wishlist</h2>
        
        {wishlist.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="bg-gray-100 rounded-lg h-40 mb-4 flex items-center justify-center">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <h3 className="font-medium mb-1">{item.name}</h3>
                <p className="text-green-600 font-semibold mb-4">₹{item.price}</p>
                <div className="flex space-x-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex-1">
                    Add to Cart
                  </button>
                  <button className="border border-red-500 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Your wishlist is empty</p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
              Browse Products
            </button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default WishlistPage;