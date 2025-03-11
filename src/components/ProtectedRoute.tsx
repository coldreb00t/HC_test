import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'client' | 'trainer';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        // Проверяем текущего пользователя
        const { data: { user } } = await supabase.auth.getUser();
        
        // Если пользователь уже авторизован
        if (user) {
          setUser(user);
          setUserRole(user.user_metadata.role);
          setLoading(false);
          return;
        }
        
        // Если пользователь не авторизован, проверяем localStorage
        const savedToken = localStorage.getItem('hardcase_auth_token');
        const savedRefreshToken = localStorage.getItem('hardcase_refresh_token');
        const rememberMe = localStorage.getItem('hardcase_remember_me');
        
        if (savedToken && savedRefreshToken && rememberMe === 'true') {
          console.log('Found saved credentials, attempting auto-login...');
          
          // Пытаемся восстановить сессию
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: savedToken,
            refresh_token: savedRefreshToken
          });
          
          if (sessionError) {
            console.error('Error restoring session:', sessionError);
            // Если токены устарели, удаляем их
            localStorage.removeItem('hardcase_auth_token');
            localStorage.removeItem('hardcase_refresh_token');
            localStorage.removeItem('hardcase_user_email');
            localStorage.removeItem('hardcase_remember_me');
          } else if (sessionData.user) {
            console.log('Auto-login successful');
            setUser(sessionData.user);
            setUserRole(sessionData.user.user_metadata.role);
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-400 to-gray-500 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== allowedRole) {
    return <Navigate to={`/${userRole}`} replace />;
  }

  return <>{children}</>;
}