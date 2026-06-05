import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useState } from "react";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar onCollapsedChange={setSidebarCollapsed} />
      </div>
      <div className="lg:hidden">
        <MobileNav />
      </div>
      <main className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-64"}`}>
        <div className="p-4 lg:p-8 pb-28 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}