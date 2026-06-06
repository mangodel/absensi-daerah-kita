import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-64 flex-1 min-h-screen md:pb-0 pb-20">
        <div className="p-3 md:p-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}