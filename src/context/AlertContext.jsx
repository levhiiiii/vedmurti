// src/context/AlertContext.jsx
import { createContext, useContext, useState } from 'react';
import Alert from '../components/Alert'; // Adjust the import path as necessary

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} AlertType
 */

/**
 * @typedef {Object} AlertState
 * @property {AlertType} type
 * @property {string} message
 * @property {number} [duration]
 * @property {boolean} [closable]
 */

/**
 * @typedef {Object} AlertContextProps
 * @property {(type: AlertType, message: string, duration?: number, closable?: boolean) => void} showAlert
 */

const AlertContext = createContext(undefined);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  const showAlert = (
    type,
    message,
    duration = 5000,
    closable = true
  ) => {
    setAlert({ type, message, duration, closable });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          duration={alert.duration}
          closable={alert.closable}
          onClose={() => setAlert(null)}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
