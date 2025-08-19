import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useUser } from '../../../context/UserContext';

const Account = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const currentUser = useUser();

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

  // If user is not logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-green-50 pt-10 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8 h-auto relative">
          {/* Sidebar Component */}
          <Sidebar 
            isOpen={isSidebarOpen} 
            toggleSidebar={toggleSidebar} 
            isMobile={isMobile} 
            currentUser={currentUser} 
          />

          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? '' : 'lg:ml-20'}`}>
            <div className="bg-white rounded-xl shadow-md p-6">
              <Outlet context={{ currentUser }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;