import { useState, useEffect } from 'react';
import { FiFilter, FiSearch, FiShoppingCart, FiHeart, FiCheck, FiImage } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useUser } from '../../context/UserContext';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { app } from '../../Firebase/firebase'; // Adjust path as needed
import LeafLoader from '../../components/Loader';
import { useNavigate } from 'react-router-dom';

const ShopPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'juices', name: 'Noni Juices' },
    { id: 'supplements', name: 'Supplements' },
    { id: 'skincare', name: 'Skincare' },
    { id: 'combos', name: 'Combo Packs' }
  ];

  // Fetch products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const db = getFirestore(app);
      let productsQuery = query(collection(db, 'products'));

      // Apply category filter if not 'all'
      if (selectedCategory !== 'all') {
        productsQuery = query(productsQuery, where('category', '==', selectedCategory));
      }

      // Apply search filter
      if (searchQuery) {
        productsQuery = query(productsQuery, where('name', '>=', searchQuery));
        productsQuery = query(productsQuery, where('name', '<=', searchQuery + '\uf8ff'));
      }

      // Apply price range filter
      if (priceRange.min || priceRange.max) {
        if (priceRange.min) {
          productsQuery = query(productsQuery, where('price', '>=', Number(priceRange.min)));
        }
        if (priceRange.max) {
          productsQuery = query(productsQuery, where('price', '<=', Number(priceRange.max)));
        }
      }

      // Apply sorting
      switch (sortOption) {
        case 'price-low':
          productsQuery = query(productsQuery, orderBy('price', 'asc'));
          break;
        case 'price-high':
          productsQuery = query(productsQuery, orderBy('price', 'desc'));
          break;
        case 'rating':
          productsQuery = query(productsQuery, orderBy('rating', 'desc'));
          break;
        case 'newest':
          productsQuery = query(productsQuery, orderBy('createdAt', 'desc'));
          break;
        default:
          // 'featured' - sort by featured first
          productsQuery = query(productsQuery, orderBy('featured', 'desc'));
      }

      try {
        const querySnapshot = await getDocs(productsQuery);
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });
        setProducts(productsData);
        console.log('Products loaded:', productsData);
        // Debug image data
        productsData.forEach(product => {
          if (product.images) {
            console.log(`Product ${product.name} images:`, product.images);
          }
        });
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, sortOption, searchQuery, priceRange]);

  const { addToCart, isInCart, getCartItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();
  const [addingToCart, setAddingToCart] = useState(null);
  const [togglingWishlist, setTogglingWishlist] = useState(null);

  const handleAddToCart = async (product) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/shop' } });
      return;
    }

    setAddingToCart(product.id);
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleToggleWishlist = async (product) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/shop' } });
      return;
    }

    setTogglingWishlist(product.id);
    try {
      await toggleWishlist(product);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setTogglingWishlist(null);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setShowFilters(false);
  };

  const calculateDiscount = (price, originalPrice) => {
    if (!originalPrice) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  return (
    <div className="bg-green-50 pt-15 min-h-screen">
      {/* Shop Header */}
      <div className="bg-green-700 text-white py-12">
        <div className="flex justify-center flex-col items-center mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Noni Juice Shop</h1>
          <p className="text-green-100 max-w-2xl">
            Discover our range of premium Noni products for complete wellness
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-10 py-8">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-10 p-4">
                  <form onSubmit={applyFilters}>
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
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-1/2 p-2 border rounded"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      Apply Filters
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <LeafLoader/>
          </div>
        )}

        {/* Product Grid */}
        {!loading && (
          <>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      navigate(`/products/${product.id}`)
                    }}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                  >
                    {/* Product Badges */}
                    <div className="absolute z-10 flex space-x-2 m-2">
                      {product.featured && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          Featured
                        </span>
                      )}
                      {product.discountPercentage > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                          {product.discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="relative h-48 bg-green-50 flex items-center justify-center p-4">
                      {(() => {
                        let imgSrc = null;
                        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                          imgSrc = product.images[0];
                        } else if (product.image) {
                          imgSrc = product.image;
                        }
                        
                        return imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={product.name}
                            className="h-full object-contain"
                            onError={(e) => {
                              console.error('Image failed to load:', imgSrc);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null;
                      })()}
                      
                      {/* Fallback placeholder when no image or image fails to load */}
                      <div 
                        className={`h-full w-full flex items-center justify-center text-gray-400 ${
                          (product.images && Array.isArray(product.images) && product.images.length > 0) || product.image 
                            ? 'hidden' 
                            : 'block'
                        }`}
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <FiImage className="mx-auto text-4xl mb-2" />
                          <p className="text-sm">No Image</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleWishlist(product); }}
                        className={`absolute top-2 right-2 p-2 rounded-full shadow transition-colors ${
                          isInWishlist(product.id)
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={togglingWishlist === product.id}
                      >
                        {togglingWishlist === product.id ? (
                          <span className="animate-spin">⌛</span>
                        ) : (
                          <FiHeart className={isInWishlist(product.id) ? 'fill-current' : ''} />
                        )}
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="flex items-center mb-1">
                        <div className="flex text-yellow-400 mr-2">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={i < Math.floor(product.rating || 0) ? 'fill-current' : 'fill-gray-300'}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          ({product.reviewCount || 0})
                        </span>
                      </div>

                      <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{product.description}</p>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-green-700 text-lg">
                            ₹{product.price?.toLocaleString() || '0'}
                          </span>
                          {product.originalPrice && (
                            <span className="text-gray-400 line-through ml-2">
                              ₹{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                            isInCart(product.id)
                              ? 'bg-green-100 text-green-600'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          disabled={addingToCart === product.id}
                        >
                          {addingToCart === product.id ? (
                            <span className="animate-spin">⌛</span>
                          ) : isInCart(product.id) ? (
                            <FiCheck />
                          ) : (
                            <FiShoppingCart />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-600">No products found</h3>
                <p className="text-gray-500 mt-2">
                  {searchQuery ? 'Try a different search term' : 'No products available in this category'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {products.length > 0 && !loading && (
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
        )}
      </div>
    </div>
  );
};

export default ShopPage;