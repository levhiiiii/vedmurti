import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AlertProvider } from './context/AlertContext';
import { LoaderProvider } from './context/LoaderContext';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './context/UserContext';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
    <UserProvider>
        <AlertProvider>
        <LoaderProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LoaderProvider>
      </AlertProvider>
    </UserProvider>
    </StrictMode>
  );
}
