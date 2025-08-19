import { NavLink } from 'react-router-dom';
import {
  FiUser, FiShoppingBag, FiMapPin, FiHeart, FiLogOut,
  FiChevronLeft, FiMenu, FiChevronRight
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import LogoutButton from './LogoutButton';
import {useUser} from '../../../context/UserContext'
import { BiLeftArrow } from 'react-icons/bi';

const Sidebar = ({ isOpen, toggleSidebar, isMobile, currentUser }) => {
  const menuItems = [
    { icon: <FiUser size={18} />, label: "Profile", path: "/account" },
    { icon: (  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>), label: "Affilate", path: "/affilate-dashboard" },
    { icon: <FiShoppingBag size={18} />, label: "Orders", path: "/account/orders" },
    { icon: <FiMapPin size={18} />, label: "Addresses", path: "/account/addresses" },
    { icon: <FiHeart size={18} />, label: `Wishlist `, path: "/account/wishlist" },
    // (${currentUser.wishlistCount})
    { icon: <BiLeftArrow size={18} />, label: `Go Back`, path: "/" },
  ];

  const user = useUser();

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className={`fixed z-30 p-4 rounded-full bg-white shadow-md transition-all duration-300 ${isOpen ? 'left-64 ml-2' : 'right-10'
            } top-24`}
        >
          {isOpen ? <FiChevronLeft size={20} /> : <FiMenu size={20} />}
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white rounded-xl shadow-md transition-all duration-300 ease-in-out fixed lg:static z-20 lg:z-auto
          ${isOpen ? 'left-0' : '-left-full'} lg:left-0
          w-72 lg:w-64 h-full lg:h-auto top-0 lg:top-auto p-5 lg:p-4
          overflow-y-auto lg:overflow-visible`}
      >
        {/* Brand Logo */}
        <NavLink to="/" className="flex items-center p-4 mb-2">
          <FaLeaf className="text-3xl text-green-600 mr-2" />
          <span className="text-xl font-bold text-green-800">Vedamurti Noni</span>
        </NavLink>


        <div className="h-0.5 w-full mb-3 bg-green-200"></div>

        {/* Navigation Menu */}
        <nav className="space-y-1 mb-4">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end
              className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-green-100 text-green-700 font-medium'
                : 'hover:bg-green-50 text-gray-700'
                }`}
              onClick={isMobile ? toggleSidebar : undefined}
            >
              <span className="mr-3">{item.icon}</span>
              <span className={isOpen ? 'block' : 'lg:hidden'}>{item.label}</span>
            </NavLink>
          ))}
         <LogoutButton className='flex w-full items-center rounded-lg transition-colors bg-green-300'/>
        </nav>

    <div className="h-0.5 w-full bg-green-200"></div>

        {/* User Profile */}
        <div className="flex items-center mt-4 p-4 mb-4 bg-green-50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="bg-green-100 w-14 h-14 min-w-[3.5rem] rounded-full flex items-center justify-center mr-4">
           {user.currentUser ? <img className='h-10 w-10 rounded-full ' src={user.currentUser.profilePic}/> : <FiUser className="text-green-600 text-2xl" />}
          </div>
          <div className="overflow-hidden">
           <h2 className="font-semibold text-lg text-gray-800 truncate max-w-[200px] sm:max-w-[300px]">
  {user.currentUser ? user.currentUser.name : 'Guest User'}
</h2>
<p className="text-gray-600 text-sm break-all max-w-[300px] sm:max-w-[400px]">
  {user.currentUser ? user.currentUser.email : 'guest@example.com'}
</p>

          </div>
        </div>


      </aside>

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-transparent  z-10 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;