import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthForm />} />

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