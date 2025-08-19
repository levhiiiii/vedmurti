import {
  FaUser,
  FaNetworkWired,
  FaMoneyBill,
  FaSignOutAlt,
  FaHome,
  FaAward,
  FaTimes,
  FaBars,
  FaBoxOpen,
  FaShieldAlt,
  FaUsers,
  FaUserPlus
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";

const AdminSidebar = ({ isSidebarOpen, toggleSidebar, isMobile, activeItem, setActiveItem }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useUser();

  const menuItems = [
    { name: 'Dashboard', icon: FaHome, path: '/admin' },
    { name: 'Payment Requests', icon: FaMoneyBill, path: '/admin/payment-requests' },
    { name: 'Network', icon: FaNetworkWired, path: '/admin/tree' },
    { name: 'Payouts', icon: FaMoneyBill, path: '/admin/payouts' },
    { name: 'KYC Verification', icon: FaShieldAlt, path: '/admin/kyc-verification' },
    { name: 'Manage Users', icon: FaUsers, path: '/admin/manage-users' },
    { name: 'Add Admin', icon: FaUserPlus, path: '/admin/add-admin' },
    { name: 'Add Product', icon: FaBoxOpen, path: '/admin/add-product' },
    { name: 'Manage Products', icon: FaBoxOpen, path: '/admin/manage-products' },
  ];

  const handleNavigation = (path, name) => {
    setActiveItem(name);
    navigate(path);
    if (isMobile) toggleSidebar();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error('Logout error:', error);
      navigate("/login");
    }
  };

  return (
    <aside className={`fixed md:relative z-30 flex flex-col bg-green-400 text-white transition-all duration-300
      ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-15 -translate-x-full md:translate-x-0'} h-full shadow-lg`}>

      {isMobile && isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute right-4 top-4 p-1 text-white hover:text-green-200"
        >
          <FaTimes size={20} />
        </button>
      )}

      <div className="flex items-center justify-between p-4 border-b border-white h-16">
        {isSidebarOpen ? (
          <h1 className="text-xl font-bold whitespace-nowrap">Vedmurti</h1>
        ) : (
          <div className="w-6"></div>
        )}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaBars size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-1">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li className="font-semibold" key={item.name}>
                <button
                  onClick={() => handleNavigation(item.path, item.name)}
                  className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                    ${activeItem === item.name ? 'bg-green-600' : 'hover:bg-green-500'}
                    ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
                >
                  <Icon className="text-lg flex-shrink-0" />
                  {isSidebarOpen && <span className="ml-3">{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex justify-center p-4">
        <button onClick={() => navigate('/')} className="text-sm bg-green-600 hover:bg-green-700 px-1 py-2 rounded">
          Go Back
        </button>
      </div>

      <div className="p-4 border-t border-green-700">
        <div className={`flex items-center ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
          {currentUser?.profilePic ? (
            <img 
              src={currentUser.profilePic} 
              alt={currentUser.name} 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          )}
          {isSidebarOpen && (
            <div className="ml-3">
              <p className="text-sm font-medium">{currentUser?.name || 'Admin'}</p>
              <p className="text-xs text-green-200">{currentUser?.email || ''}</p>
              <p className="text-xs text-green-200">Role: {currentUser?.role || 'Admin'}</p>
              <button onClick={handleLogout} className="flex items-center text-xs text-green-200 hover:text-white mt-1">
                <FaSignOutAlt className="mr-1" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
