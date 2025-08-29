import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiMenu, FiX, FiChevronDown, FiChevronUp, FiHeart } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { useUser } from '../context/UserContext'; // Import your UserContext
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import LogoutButton from '../pages/E-Commerce/components/LogoutButton'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { currentUser } = useUser(); // Get current user from context
  const { getCartTotals } = useCart(); // Get cart totals from context
  const { getWishlistCount } = useWishlist(); // Get wishlist count from context
  
  // Get cart total items
  const { totalItems } = getCartTotals();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'About Noni', path: '/aboutnoni' },
    { name: 'Benefits', path: '/benifits' },
    { name: 'Testimonials', path: '/testimonials' },
    { name: 'Contact', path: '/contact' },
  ];

  // Account links based on authentication status
  const accountLinks = currentUser
    ? [
      {
        name: 'Account',
        path: '/account',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      },
      {
        name: 'Affiliate',
        path: '/affiliate',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      {
        name: 'Logout',
        path: '#', // Using path '#' since we'll handle logout with onClick
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        ),
        isLogout: true
      }
    ]
    : [
      {
        name: 'Register',
        path: '/register',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      },
      {
        name: 'Login',
        path: '/login',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        )
      },
      {
        name: 'Join Affiliate',
        path: '/payment-request',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      },
      {
        name: 'Admin Login',
        path: '/adminlogin',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 7l6 3m-6-3l-6 3m6-3v10m-6-3v10m6-10l6 3m-6-3l6-3" />
          </svg>
        )
      }
    ];

  const toggleAccountMenu = () => {
    setAccountMenuOpen(!accountMenuOpen);
  };

  const closeAllMenus = () => {
    setIsOpen(false);
    setAccountMenuOpen(false);
  };

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-green-50 py-4'
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-green-700"
            onClick={closeAllMenus}
          >
            <FaLeaf className="text-3xl" />
            <span className="text-2xl font-bold">
              Vedamurti <span className="text-green-600">Noni</span>
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? 'text-green-700 bg-green-100'
                    : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Icons */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={toggleAccountMenu}
                className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors flex items-center"
              >
                {currentUser && currentUser.profilePic ? <img className='h-7 w-7 rounded-full' src={currentUser.profilePic} alt={currentUser.name || 'Profile'} /> : <FiUser className="text-xl" />}
                {accountMenuOpen ? (
                  <FiChevronUp className="ml-1" />
                ) : (
                  <FiChevronDown className="ml-1" />
                )}
              </button>

              {/* Account Dropdown */}
              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  onMouseLeave={() => setTimeout(() => setAccountMenuOpen(false), 300)}
                >
                  {accountLinks.map((link) => (
                    link.isLogout ? (
                      <LogoutButton
                        key="logout"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600"
                        variant="ghost"
                      />
                    ) : (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={closeAllMenus}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600"
                      >
                        {link.icon}
                        <span className="ml-2">{link.name}</span>
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </div>

            {currentUser && (
              <>
                <NavLink
                  to="/account/wishlist"
                  className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors relative"
                  onClick={closeAllMenus}
                >
                  <FiHeart className="text-xl" />
                  {getWishlistCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getWishlistCount() > 99 ? '99+' : getWishlistCount()}
                    </span>
                  )}
                </NavLink>
                <NavLink
                  to="/cart"
                  className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors relative"
                  onClick={closeAllMenus}
                >
                  <FiShoppingCart className="text-xl" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            {currentUser && (
              <>
                <NavLink
                  to="/account/wishlist"
                  className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 relative"
                  onClick={closeAllMenus}
                >
                  <FiHeart className="text-xl" />
                  {getWishlistCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getWishlistCount() > 99 ? '99+' : getWishlistCount()}
                    </span>
                  )}
                </NavLink>
                <NavLink
                  to="/cart"
                  className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 relative"
                  onClick={closeAllMenus}
                >
                  <FiShoppingCart className="text-xl" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </NavLink>
              </>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-green-600 focus:outline-none"
            >
              {isOpen ? (
                <FiX className="text-2xl" />
              ) : (
                <FiMenu className="text-2xl" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={closeAllMenus}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-base font-medium ${isActive
                      ? 'text-green-700 bg-green-100'
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 pl-3">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-green-600 hover:bg-green-50"
              >
                <FiUser className="text-xl" />
                <span>Account</span>
                {accountMenuOpen ? (
                  <FiChevronUp className="ml-1" />
                ) : (
                  <FiChevronDown className="ml-1" />
                )}
              </button>

              {/* Mobile Account Dropdown */}
              {accountMenuOpen && (
                <div className="ml-8 mt-2 space-y-2">
                  {accountLinks.map((link) => (
                    link.isLogout ? (
                      <LogoutButton
                        key="logout"
                        className="w-full text-left px-4 py-3 text-base font-medium"
                        variant="ghost"
                      />
                    ) : (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={closeAllMenus}
                        className={({ isActive }) => `
                          flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium
                          transition-all duration-200 transform hover:scale-[1.02]
                          ${isActive
                            ? 'bg-green-100 text-green-700 shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 shadow-sm'
                          }
                        `}
                      >
                        {link.icon}
                        <span>{link.name}</span>
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;