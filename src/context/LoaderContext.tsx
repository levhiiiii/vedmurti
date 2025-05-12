// src/context/LoaderContext.tsx
import { createContext, useContext, useState } from 'react';
import LeafLoader from '../components/Loader';

const LoaderContext = createContext({
  show: false,
  setShow: (value: boolean) => {},
});

export const LoaderProvider = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <LoaderContext.Provider value={{ show, setShow }}>
      {children}
      {show && (
        <div className="fixed inset-0 z-[9999] bg-white bg-opacity-70 flex items-center justify-center">
          <LeafLoader size={72} />
        </div>
      )}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderContext);
