import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-64 flex-1 min-h-screen">
        <div className="p-3 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>
    </div>
  );
}