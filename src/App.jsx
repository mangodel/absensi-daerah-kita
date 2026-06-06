import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Members from '@/pages/Members';
import Attendance from '@/pages/Attendance';
import Transfers from '@/pages/Transfers';
import Structure from '@/pages/Structure.jsx';
import Events from '@/pages/Events';
import Settings from '@/pages/Settings';
import MonthlyReport from '@/pages/MonthlyReport';
import Reminders from '@/pages/Reminders';
import Documents from '@/pages/Documents';
import EventAttendance from '@/pages/EventAttendance';
import EventDisplay from '@/pages/EventDisplay';
import VolunteerScanner from '@/pages/VolunteerScanner';
import EventRegister from '@/pages/EventRegister';
import { AppConfigProvider } from '@/lib/AppConfigContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/structure" element={<Structure />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<MonthlyReport />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/event-attendance" element={<EventAttendance />} />
      </Route>
      <Route path="/event-display" element={<EventDisplay />} />
      <Route path="/scanner-volunteer" element={<VolunteerScanner />} />
      <Route path="/event-register/:eventId" element={<EventRegister />} />
      <Route path="/event-register" element={<EventRegister />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
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
  )
}

export default App