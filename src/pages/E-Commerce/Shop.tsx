import { useState } from 'react';
import { FiFilter, FiSearch, FiShoppingCart, FiHeart } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestSeller?: boolean;
};

const ShopPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Sample product data
  const products: Product[] = [
    {
      id: 1,
      name: 'Premium Noni Juice - 500ml',
      description: 'Cold-pressed, organic Noni juice with no additives',
      price: 899,
      originalPrice: 999,
      image: '/products/noni-juice-500ml.png',
      rating: 4.8,
      reviewCount: 124,
      isBestSeller: true
    },
    {
      id: 2,
      name: 'Noni Juice - Family Pack (1L)',
      description: 'Economical family size with all natural ingredients',
      price: 1599,
      originalPrice: 1799,
      image: '/products/noni-juice-1l.png',
      rating: 4.6,
      reviewCount: 89,
      isNew: true
    },
    {
      id: 3,
      name: 'Noni Juice + Aloe Vera Combo',
      description: 'Powerful combination for digestive health',
      price: 1299,
      image: '/products/noni-aloe-combo.png',
      rating: 4.9,
      reviewCount: 67
    },
    {
      id: 4,
      name: 'Noni Capsules (60 count)',
      description: 'Convenient Noni supplement for on-the-go wellness',
      price: 699,
      image: '/products/noni-capsules.png',
      rating: 4.5,
      reviewCount: 42
    },
    {
      id: 5,
      name: 'Noni Juice - Monthly Supply',
      description: 'Four 500ml bottles for complete monthly nutrition',
      price: 3199,
      originalPrice: 3596,
      image: '/products/noni-monthly-pack.png',
      rating: 4.7,
      reviewCount: 56
    },
    {
      id: 6,
      name: 'Noni Face Cream',
      description: 'Antioxidant-rich cream for radiant skin',
      price: 499,
      image: '/products/noni-face-cream.png',
      rating: 4.3,
      reviewCount: 38
    }
  ];

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'juices', name: 'Noni Juices' },
    { id: 'supplements', name: 'Supplements' },
    { id: 'skincare', name: 'Skincare' },
    { id: 'combos', name: 'Combo Packs' }
  ];

  const handleAddToCart = (productId: number) => {
    console.log(`Added product ${productId} to cart`);
    // Add your cart logic here
  };

  const toggleWishlist = (productId: number) => {
    console.log(`Toggled wishlist for product ${productId}`);
    // Add your wishlist logic here
  };

  return (
    <div className="bg-green-50  pt-15 min-h-screen">
      {/* Shop Header */}
      <div className="bg-green-700 text-white py-12">
        <div className=" flex justify-center flex-col items-center mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Noni Juice Shop</h1>
          <p className="text-green-100 max-w-2xl">
            Discover our range of premium Noni products for complete wellness
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className=" mx-auto px-10 py-8">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          
          {/* Category Tabs */}
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="min-w-max flex space-x-1 px-0 py-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === category.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-green-50'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>


          {/* Search and Filter */}
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <input
                type="text"
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                <FiFilter />
                <span>Filters</span>
              </button>

              {/* Filter Dropdown */}
              {showFilters && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-100 p-4">
                  <h3 className="font-medium mb-3">Sort By</h3>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full p-2 border rounded mb-4"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Customer Rating</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>

                  <h3 className="font-medium mb-3">Price Range</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-1/2 p-2 border rounded"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-1/2 p-2 border rounded"
                    />
                  </div>

                  <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              {/* Product Badges */}
              <div className="absolute z-10 flex space-x-2 m-2">
                {product.isNew && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    New
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Product Image */}
              <div className="relative h-48 bg-green-50 flex items-center justify-center p-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full object-contain"
                />
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <FiHeart className="text-gray-600" />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-center mb-1">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < Math.floor(product.rating) ? 'fill-current' : 'fill-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    ({product.reviewCount})
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{product.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-green-700 text-lg">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="text-gray-400 line-through ml-2">
                        ₹{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="flex items-center justify-center p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  >
                    <FiShoppingCart />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-12">
          <nav className="flex items-center space-x-2">
            <button className="px-3 py-1 rounded border bg-white text-gray-600 hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 rounded border bg-green-600 text-white">
              1
            </button>
           
            <button className="px-3 py-1 rounded border bg-white text-gray-600 hover:bg-gray-50">
              3
            </button>
            <span className="px-2">...</span>
            <button className="px-3 py-1 rounded border bg-white text-gray-600 hover:bg-gray-50">
              8
            </button>
            <button className="px-3 py-1 rounded border bg-white text-gray-600 hover:bg-gray-50">
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;