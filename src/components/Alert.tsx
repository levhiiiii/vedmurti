import { useState, useEffect } from 'react';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaTimesCircle
} from 'react-icons/fa';

type AlertProps = {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // in milliseconds
  onClose?: () => void;
  closable?: boolean;
  className?: string;
};

const Alert = ({
  type = 'info',
  message,
  duration = 5000,
  onClose,
  closable = true,
  className = ''
}: AlertProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  const alertConfig = {
    success: {
      icon: <FaCheckCircle className="text-xl" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300'
    },
    error: {
      icon: <FaTimesCircle className="text-xl" />,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300'
    },
    warning: {
      icon: <FaExclamationCircle className="text-xl" />,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300'
    },
    info: {
      icon: <FaInfoCircle className="text-xl" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300'
    }
  };

  const { icon, bgColor, textColor, borderColor } = alertConfig[type];

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-50 w-auto max-w-[90%] md:max-w-sm ${className}`}
      role="alert"
    >
      <div
        className={`flex items-center p-4 border rounded-lg shadow-lg ${bgColor} ${textColor} ${borderColor}`}
      >
        <div className="mr-3">
          {icon}
        </div>
        <div className="flex-1 break-words">
          {message}
        </div>
        {closable && (
          <button
            onClick={handleClose}
            className={`ml-3 p-1 rounded-full hover:bg-opacity-30 hover:bg-current ${textColor}`}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
