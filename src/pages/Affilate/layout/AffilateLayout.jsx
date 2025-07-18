import { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import AffilateSidebar from '../components/AffilateSidebar';
import { FaBars } from 'react-icons/fa';

const AffilateLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  const getActiveItem = () => {
    const path = location.pathname;
    if (path.includes('profile')) return 'Profile';
    if (path.includes('update')) return 'Update Profile';
    if (path.includes('courses')) return 'My Courses';
    if (path.includes('payments')) return 'Payments';
    if (path.includes('certificates')) return 'Certificates';
    return 'Home';
  };

  const [activeItem, setActiveItem] = useState(getActiveItem());

  useEffect(() => {
    setActiveItem(getActiveItem());
  }, [location]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen w-full">
      <AffilateSidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />

      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar} />
      )}

      <main className={`flex-1 overflow-auto transition-all duration-300`}>
        <header className="md:hidden flex items-center p-4 bg-white shadow-sm sticky top-0 z-10">
          <button
            onClick={toggleSidebar}
            className="p-2 mr-4 text-indigo-800 hover:bg-gray-100 rounded-lg"
          >
            <FaBars size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{activeItem}</h1>
        </header>

        <div className="min-h-[calc(100vh-100px)] w-full flex justify-center px-1 py-0">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AffilateLayout;
