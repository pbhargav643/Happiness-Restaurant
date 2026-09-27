import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { SettingsProvider } from './context/SettingsContext';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';

/**
 * App Component
 * Root component providing the context provider wrapper hierarchy.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomerAuthProvider>
          <SettingsProvider>
            <MenuProvider>
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </MenuProvider>
          </SettingsProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}


