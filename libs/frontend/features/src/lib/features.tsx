import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SkeletonList } from '@org/ui';
import { ProtectedRoute } from './auth/ProtectedRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
