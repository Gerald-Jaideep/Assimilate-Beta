/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, SUPER_ADMIN_EMAILS } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import LandingPage from './pages/CaseFeed';
import CaseDetail from './pages/CaseDetail';
import SeriesView from './pages/SeriesView';
import Profile from './pages/Profile';
import SpeakerProfile from './pages/SpeakerProfile';
import InternalDashboard from './pages/InternalDashboard';
import SpeakerDashboard from './pages/SpeakerDashboard';
import SponsorDashboard from './pages/SponsorDashboard';
import AudienceView from './pages/AudienceView';
import Login from './pages/Login';
import CertificateVerify from './pages/CertificateVerify';
import { Nav } from './components/layout/Nav';
import OnboardingModal from './components/auth/OnboardingModal';
import { Toaster } from 'sonner';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#F5F5F3] dark:bg-black dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
  if (role && profile?.role !== role && !isSuperAdmin) return <Navigate to="/" />;

  return (
    <>
      {children}
      {user && profile && !profile.onboardingCompleted && <OnboardingModal />}
    </>
  );
}

function AppContent() {
  const { user, profile } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F5F3] dark:bg-black text-[#1A1A1A] dark:text-white font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-300">
      <Toaster position="top-center" richColors />
      <Nav />
      {user && profile && !profile.onboardingCompleted && <OnboardingModal />}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/case/:id" element={<CaseDetail />} />
          <Route path="/series/:id" element={<SeriesView />} />
          <Route path="/verify/:id" element={<CertificateVerify />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/speaker/:id" element={<SpeakerProfile />} />
          
          <Route path="/admin" element={
            <ProtectedRoute role="internal">
              <InternalDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/speaker" element={
            <ProtectedRoute role="speaker">
              <SpeakerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/sponsor" element={
            <ProtectedRoute role="sponsor">
              <SponsorDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

