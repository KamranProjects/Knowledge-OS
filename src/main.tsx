import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StudyProvider } from './context/StudyContext';
import { AuthProvider } from './context/AuthContext';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
        <StudyProvider>
          <App />
        </StudyProvider>
    </AuthProvider>
  </StrictMode>,
);
