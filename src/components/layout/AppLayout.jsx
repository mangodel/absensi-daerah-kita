import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <div className="p-3 md:p-8">
          <Outlet />
        </div>
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}