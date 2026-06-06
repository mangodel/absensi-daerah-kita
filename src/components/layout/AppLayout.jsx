import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-background md:flex-row">
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto md:ml-0 mb-20 md:mb-0">
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