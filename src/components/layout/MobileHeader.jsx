import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const ROOT_ROUTES = ['/', '/members', '/attendance', '/transfers', '/structure', '/events', '/settings', '/reports', '/reminders', '/documents', '/event-attendance'];

export default function MobileHeader({ title, logo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootRoute = ROOT_ROUTES.includes(location.pathname);

  return (
    <div className="safe-area-inset-top bg-card border-b border-border sticky top-0 z-50 px-4 py-3">
      <div className="flex items-center justify-between h-10">
        {!isRootRoute ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {logo && <img src={logo} alt="Logo" className="h-6 w-6" />}
            <span className="text-sm font-semibold">{title || 'Portal'}</span>
          </div>
        )}
      </div>
    </div>
  );
}