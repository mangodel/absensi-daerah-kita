import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout({ isLoading = false }) {
  return (
    <>
      <div className="min-h-screen bg-background md:flex">
        <div className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:overflow-y-auto">
          <Sidebar />
        </div>
        <main className="w-full md:ml-64 pb-36 md:pb-8">
          <div className="p-3 md:p-8">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}