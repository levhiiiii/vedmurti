import { useState, useEffect } from 'react';
import { FiChevronLeft, FiMenu } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { NavLink, Outlet } from 'react-router-dom';
import AccountSidebar from '../Sidebar';

const AccountPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Sample user data
  const user = {
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    joinDate: "January 15, 2022"
  };

  const wishlistCount = 2; // You can fetch this from context or API

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="bg-green-50 pt-20 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Mobile Header with Toggle Button */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-green-700"
          >
            <FaLeaf className="text-3xl" />
            <span className="text-2xl font-bold">
              Vedamurti <span className="text-green-600">Noni</span>
            </span>
          </NavLink>
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-green-100 text-green-700"
          >
            {isSidebarOpen ? <FiChevronLeft size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 h-auto relative">
          {/* Sidebar Navigation - Collapsible */}
          <div 
            className={`bg-white rounded-xl shadow-md transition-all duration-300 ease-in-out fixed lg:static z-20 lg:z-auto
              ${isSidebarOpen ? 'left-0' : '-left-full'} lg:left-0
              w-3/4 lg:w-1/4 h-full lg:h-auto top-0 lg:top-auto p-1 lg:p-0
              overflow-y-auto lg:overflow-visible`}
          >
            <AccountSidebar 
              user={user} 
              wishlistCount={wishlistCount}
              isMobile={isMobile}
              onClose={toggleSidebar}
            />
          </div>

          {/* Overlay for mobile */}
          {isSidebarOpen && isMobile && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
              onClick={toggleSidebar}
            />
          )}

          {/* Main Content */}
          <div className={`lg:w-full transition-all duration-300 ${isSidebarOpen ? 'lg:ml-0' : 'lg:ml-[-16.666667%]'}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;