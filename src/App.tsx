import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthForm } from './components/AuthForm';
import { ClientDashboard } from './components/ClientDashboard';
import { ClientWorkoutsView } from './components/ClientWorkoutsView';
import { WorkoutDetailsView } from './components/WorkoutDetailsView';
import { PhotoUploadView } from './components/PhotoUploadView';
import { ProgressPhotosView } from './components/ProgressPhotosView';
import { MeasurementsUploadView } from './components/MeasurementsUploadView';
import { MeasurementsView } from './components/MeasurementsView';
import { NutritionView } from './components/NutritionView';
import { TrainerDashboard } from './components/TrainerDashboard';
import { ClientProfile } from './components/ClientProfile';
import { ExercisesView } from './components/ExercisesView';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActivityForm } from './components/ActivityForm';
import { AchievementsView } from './components/AchievementsView';
import { NutritionStatsView } from './components/NutritionStatsView';

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      // Сначала проверяем текущую сессию
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        return;
      }

      // Если текущей сессии нет, проверяем localStorage
      const savedToken = localStorage.getItem('hardcase_auth_token');
      const savedRefreshToken = localStorage.getItem('hardcase_refresh_token');
      const rememberMe = localStorage.getItem('hardcase_remember_me');
      
      if (savedToken && savedRefreshToken && rememberMe === 'true') {
        console.log('App: Найдены сохраненные токены в localStorage, восстанавливаем сессию...');
        
        try {
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token: savedToken,
            refresh_token: savedRefreshToken
          });
          
          if (error) {
            console.error('App: Ошибка восстановления сессии:', error);
            // Удаляем недействительные токены
            localStorage.removeItem('hardcase_auth_token');
            localStorage.removeItem('hardcase_refresh_token');
            localStorage.removeItem('hardcase_user_email');
            localStorage.removeItem('hardcase_remember_me');
          } else if (sessionData.user) {
            console.log('App: Сессия успешно восстановлена');
            setUser(sessionData.user);
          }
        } catch (error) {
          console.error('App: Ошибка автологина:', error);
        }
      }
    };

    getUser();

    // Слушаем изменения состояния аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            marginTop: '15vh', // Добавляем отступ сверху на 15% высоты экрана
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate 
                to={user.user_metadata?.role === 'trainer' ? '/trainer' : '/client'} 
                replace 
              />
            ) : (
              <AuthForm />
            )
          } 
        />

        {/* Client routes */}
        <Route path="/client" element={
          <ProtectedRoute allowedRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/client/workouts" element={
          <ProtectedRoute allowedRole="client">
            <ClientWorkoutsView />
          </ProtectedRoute>
        } />
        <Route path="/client/workouts/:workoutId" element={
          <ProtectedRoute allowedRole="client">
            <WorkoutDetailsView />
          </ProtectedRoute>
        } />
        <Route path="/client/progress-photo/new" element={
          <ProtectedRoute allowedRole="client">
            <PhotoUploadView />
          </ProtectedRoute>
        } />
        <Route path="/client/progress" element={
          <ProtectedRoute allowedRole="client">
            <ProgressPhotosView />
          </ProtectedRoute>
        } />
        <Route path="/client/measurements/new" element={
          <ProtectedRoute allowedRole="client">
            <MeasurementsUploadView />
          </ProtectedRoute>
        } />
        <Route path="/client/measurements" element={
          <ProtectedRoute allowedRole="client">
            <MeasurementsView />
          </ProtectedRoute>
        } />
        <Route path="/client/nutrition" element={
          <ProtectedRoute allowedRole="client">
            <NutritionView />
          </ProtectedRoute>
        } />
        <Route path="/client/nutrition/new" element={
          <ProtectedRoute allowedRole="client">
            <NutritionView />
          </ProtectedRoute>
        } />
        <Route path="/client/activity" element={
          <ProtectedRoute allowedRole="client">
            <ActivityForm />
          </ProtectedRoute>
        } />
        <Route path="/client/activity/new" element={
          <ProtectedRoute allowedRole="client">
            <ActivityForm />
          </ProtectedRoute>
        } />
        <Route path="/client/achievements" element={
          <ProtectedRoute allowedRole="client">
            <AchievementsView />
          </ProtectedRoute>
        } />
        <Route path="/client/nutrition-stats" element={
          <ProtectedRoute allowedRole="client">
            <AchievementsView activeTab="nutrition" />
          </ProtectedRoute>
        } />

        {/* Trainer routes */}
        <Route path="/trainer" element={
          <ProtectedRoute allowedRole="trainer">
            <TrainerDashboard defaultView="calendar" />
          </ProtectedRoute>
        } />
        <Route path="/trainer/clients" element={
          <ProtectedRoute allowedRole="trainer">
            <TrainerDashboard defaultView="clients" />
          </ProtectedRoute>
        } />
        <Route path="/trainer/calendar" element={
          <ProtectedRoute allowedRole="trainer">
            <TrainerDashboard defaultView="calendar" />
          </ProtectedRoute>
        } />
        <Route path="/trainer/clients/:clientId" element={
          <ProtectedRoute allowedRole="trainer">
            <ClientProfile />
          </ProtectedRoute>
        } />
        <Route path="/trainer/exercises" element={
          <ProtectedRoute allowedRole="trainer">
            <ExercisesView />
          </ProtectedRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;