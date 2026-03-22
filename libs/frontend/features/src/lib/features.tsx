import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SkeletonList } from '@org/ui';
import { ProtectedRoute } from './auth/ProtectedRoute';

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DogsPage = lazy(() => import('./pages/DogsPage'));
const DogNewPage = lazy(() => import('./dogs/DogNewPage'));
const DogDetailPage = lazy(() => import('./dogs/DogDetail'));
const DogEditPage = lazy(() => import('./dogs/DogEditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MemberDirectory = lazy(() => import('./members/MemberDirectory'));
const MemberProfile = lazy(() => import('./members/MemberProfile'));
const ClubRegistrationFlow = lazy(() => import('./club-registration/ClubRegistrationFlow'));
const ClubSettings = lazy(() => import('./onboarding/ClubSettings'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const VaccineDashboard = lazy(() => import('./vaccine-dashboard/VaccineDashboard'));
const EventDetailPage = lazy(() => import('./events/EventDetail'));
const LicenseSettingsPage = lazy(() => import('./licenses/LicenseSettingsPage'));
const LicensesPage = lazy(() => import('./licenses/LicensesPage'));
const PaymentSuccessPage = lazy(() => import('./licenses/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./licenses/PaymentCancelPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:channelId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dogs"
          element={
            <ProtectedRoute>
              <DogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dogs/new"
          element={
            <ProtectedRoute>
              <DogNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dogs/:dogId"
          element={
            <ProtectedRoute>
              <DogDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dogs/:dogId/edit"
          element={
            <ProtectedRoute>
              <DogEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <MemberDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members/:memberId"
          element={
            <ProtectedRoute>
              <MemberProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/new"
          element={
            <ProtectedRoute>
              <ClubRegistrationFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/settings"
          element={
            <ProtectedRoute>
              <ClubSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vaccine-dashboard"
          element={
            <ProtectedRoute>
              <VaccineDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/licenses"
          element={
            <ProtectedRoute>
              <LicenseSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/licenses"
          element={
            <ProtectedRoute>
              <LicensesPage />
            </ProtectedRoute>
          }
        />
        {/* Stripe payment redirect pages — no ProtectedRoute needed (JWT may not be available on return) */}
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancelled" element={<PaymentCancelPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
