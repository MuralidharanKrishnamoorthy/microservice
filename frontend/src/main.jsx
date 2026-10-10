import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

createRoot(document.getElementById('root')).render(
  
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ThemeProvider>
  
);
