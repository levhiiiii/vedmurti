// src/context/AlertContext.tsx
import  { createContext, useContext, useState, ReactNode } from 'react';
import Alert from '../components/Alert'; // Adjust the import path as necessary

type AlertType = 'success' | 'error' | 'warning' | 'info';

type AlertState = {
  type: AlertType;
  message: string;
  duration?: number;
  closable?: boolean;
};

type AlertContextProps = {
  showAlert: (
    type: AlertType,
    message: string,
    duration?: number,
    closable?: boolean
  ) => void;
};

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = (
    type: AlertType,
    message: string,
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
