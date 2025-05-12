import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AlertProvider } from './context/AlertContext.tsx'
import { LoaderProvider } from './context/LoaderContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <LoaderProvider>
        <App />
      </LoaderProvider>
    </AlertProvider>
  </StrictMode>,
)
