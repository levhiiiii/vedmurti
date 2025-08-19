import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import { useAlert } from '../../../context/AlertContext';
import { FaSignOutAlt, FaSpinner } from 'react-icons/fa';

const LogoutButton = ({ className = '', variant = 'default' }) => {
  const { logout } = useUser();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showAlert('success', 'You have been logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showAlert('error', error.message || 'Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Style variants
  const variants = {
    default: 'bg-green-200 hover:bg-red-700 text-black',
    outline: 'border border-red-600 text-red-600 hover:bg-red-50',
    ghost: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${variants[variant]} ${className} ${
        isLoggingOut ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      aria-label="Log out"
    >
      {isLoggingOut ? (
        <>
          <FaSpinner className="animate-spin mr-2" />
          Logging out...
        </>
      ) : (
        <>
          <FaSignOutAlt className="mr-2" />
          Log Out
        </>
      )}
    </button>
  );
};

export default LogoutButton;