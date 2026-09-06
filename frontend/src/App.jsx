import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainLayout from './pages/MainLayout';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  return <MainLayout />;
}
