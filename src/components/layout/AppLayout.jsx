import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-64 min-h-screen md:pb-8">
        <div className="p-3 md:p-8 pb-24">
          <Outlet />
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        <MobileNav />
      </div>
    </div>
  );
}