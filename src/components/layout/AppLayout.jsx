import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        <div className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen md:w-64">
          <Sidebar />
        </div>
        <main className="md:ml-64 flex-1 min-h-screen pb-24 md:pb-0">
          <div className="p-3 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}