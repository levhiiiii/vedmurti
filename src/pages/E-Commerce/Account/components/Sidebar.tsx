import { FiUser, FiShoppingBag, FiMapPin, FiHeart, FiLogOut } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

interface AccountSidebarProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
    phone: string;
  };
  wishlistCount: number;
  isMobile?: boolean;
  onClose?: () => void;
}

const AccountSidebar = ({ user, wishlistCount, isMobile, onClose }: AccountSidebarProps) => {
  return (
    <div className="lg:mb-2">
      {isMobile && (
        <div className="lg:hidden flex justify-end mb-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center p-5">
        <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
          <FiUser className="text-green-600 text-xl" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">{user.name}</h2>
          <p className="text-gray-600 text-sm">{user.email}</p>
        </div>
      </div>
      
      <div className="h-0.5 m-2 bg-green-200"></div>
      
      <nav className="space-y-2 px-5">
        <NavLink 
          to="/account/profile" 
          className={({ isActive }) => 
            `flex items-center w-full px-4 py-3 rounded-lg ${isActive ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-green-50 text-gray-700'}`
          }
          onClick={onClose}
        >
          <FiUser className="mr-3" />
          <span>Profile Information</span>
        </NavLink>
        
        <NavLink 
          to="/account/orders" 
          className={({ isActive }) => 
            `flex items-center w-full px-4 py-3 rounded-lg ${isActive ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-green-50 text-gray-700'}`
          }
          onClick={onClose}
        >
          <FiShoppingBag className="mr-3" />
          <span>My Orders</span>
        </NavLink>
        
        <NavLink 
          to="/account/addresses" 
          className={({ isActive }) => 
            `flex items-center w-full px-4 py-3 rounded-lg ${isActive ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-green-50 text-gray-700'}`
          }
          onClick={onClose}
        >
          <FiMapPin className="mr-3" />
          <span>Saved Addresses</span>
        </NavLink>
        
        <NavLink 
          to="/account/wishlist" 
          className={({ isActive }) => 
            `flex items-center w-full px-4 py-3 rounded-lg ${isActive ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-green-50 text-gray-700'}`
          }
          onClick={onClose}
        >
          <FiHeart className="mr-3" />
          <span>Wishlist ({wishlistCount})</span>
        </NavLink>
        
        <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-green-50 text-gray-700">
          <FiLogOut className="mr-3" />
          <span>Logout</span>
        </button>
      </nav>
      
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <h3 className="font-semibold mb-4">Account Details</h3>
        <div className="space-y-3 text-sm">
          <p><span className="text-gray-500">Member since:</span> {user.joinDate}</p>
          <p><span className="text-gray-500">Email:</span> {user.email}</p>
          <p><span className="text-gray-500">Phone:</span> {user.phone}</p>
        </div>
      </div>
    </div>
  );
};

export default AccountSidebar;