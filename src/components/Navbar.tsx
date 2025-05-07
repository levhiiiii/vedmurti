import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md py-2' : 'bg-green-50 py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-green-700"
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
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
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
            <NavLink
              to="/account"
              className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors"
            >
              <FiUser className="text-xl" />
            </NavLink>
            <NavLink
              to="/cart"
              className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 transition-colors relative"
            >
              <FiShoppingCart className="text-xl" />
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </NavLink>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
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
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'text-green-700 bg-green-100'
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center space-x-4 mt-4 pl-3">
              <NavLink
                to="/account"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700"
              >
                <FiUser className="text-xl" />
              </NavLink>
              <NavLink
                to="/cart"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-green-100 text-gray-700 hover:text-green-700 relative"
              >
                <FiShoppingCart className="text-xl" />
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;