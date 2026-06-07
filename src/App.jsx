import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import PageTransition from '@/components/PageTransition';
import { AppConfigProvider } from '@/lib/AppConfigContext';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Members = lazy(() => import('@/pages/Members'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Structure = lazy(() => import('@/pages/Structure'));
const Events = lazy(() => import('@/pages/Events'));
const Settings = lazy(() => import('@/pages/Settings'));
const MonthlyReport = lazy(() => import('@/pages/MonthlyReport'));
const Reminders = lazy(() => import('@/pages/Reminders'));
const Documents = lazy(() => import('@/pages/Documents'));
const EventAttendance = lazy(() => import('@/pages/EventAttendance'));
const EventDisplay = lazy(() => import('@/pages/EventDisplay'));
const VolunteerScanner = lazy(() => import('@/pages/VolunteerScanner'));
const EventRegister = lazy(() => import('@/pages/EventRegister'));
const JamaahPortal = lazy(() => import('@/pages/JamaahPortal'));
const JamaahLogin = lazy(() => import('@/pages/JamaahLogin'));
const JamaahSignup = lazy(() => import('@/pages/JamaahSignup'));
const JamaahSurvey = lazy(() => import('@/pages/JamaahSurvey'));
const JamaahAbsensi = lazy(() => import('@/pages/JamaahAbsensi'));
const Login = lazy(() => import('@/pages/Login'));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app with page transitions (navigation persists during loading)
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes - tidak perlu menunggu auth check */}
        <Route path="/login" element={<SuspendedPage><Login /></SuspendedPage>} />
        <Route path="/jamaah-login" element={<SuspendedPage><JamaahLogin /></SuspendedPage>} />
        <Route path="/jamaah/signup" element={<SuspendedPage><JamaahSignup /></SuspendedPage>} />
        <Route path="/event-register/:eventId" element={<SuspendedPage><EventRegister /></SuspendedPage>} />
        <Route path="/event-register" element={<SuspendedPage><EventRegister /></SuspendedPage>} />
        <Route path="/event-display" element={<SuspendedPage><EventDisplay /></SuspendedPage>} />
        <Route path="/scanner-volunteer" element={<SuspendedPage><VolunteerScanner /></SuspendedPage>} />

        {/* Protected routes - pakai AppLayout dengan loading state */}
        <Route element={<AppLayout isLoading={isLoadingAuth || isLoadingPublicSettings} />}>
          <Route path="/" element={<SuspendedPage><Dashboard /></SuspendedPage>} />
          <Route path="/members" element={<SuspendedPage><Members /></SuspendedPage>} />
          <Route path="/attendance" element={<SuspendedPage><Attendance /></SuspendedPage>} />
          <Route path="/transfers" element={<SuspendedPage><Transfers /></SuspendedPage>} />
          <Route path="/structure" element={<SuspendedPage><Structure /></SuspendedPage>} />
          <Route path="/events" element={<SuspendedPage><Events /></SuspendedPage>} />
          <Route path="/settings" element={<SuspendedPage><Settings /></SuspendedPage>} />
          <Route path="/reports" element={<SuspendedPage><MonthlyReport /></SuspendedPage>} />
          <Route path="/reminders" element={<SuspendedPage><Reminders /></SuspendedPage>} />
          <Route path="/documents" element={<SuspendedPage><Documents /></SuspendedPage>} />
          <Route path="/event-attendance" element={<SuspendedPage><EventAttendance /></SuspendedPage>} />
          <Route path="/jamaah" element={<SuspendedPage><JamaahPortal /></SuspendedPage>} />
          <Route path="/jamaah/survey" element={<SuspendedPage><JamaahSurvey /></SuspendedPage>} />
          <Route path="/jamaah/absensi" element={<SuspendedPage><JamaahAbsensi /></SuspendedPage>} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

// Wrapper component for pages with Suspense and PageTransition
function SuspendedPage({ children }) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PageTransition>
        {children}
      </PageTransition>
    </Suspense>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AppConfigProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </AppConfigProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App