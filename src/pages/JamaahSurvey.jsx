import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowLeft, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import PortalSurveyForm from "@/components/portal/PortalSurveyForm";

export default function JamaahSurvey() {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["my-member", user?.email],
    queryFn: () => base44.entities.Member.list(),
    enabled: !!user,
  });

  const myMember = members.find(
    m => m.phone === user?.phone ||
    (user?.full_name && m.full_name?.toLowerCase() === user?.full_name?.toLowerCase())
  ) || members[0];

  const handleLogout = () => {
    base44.auth.logout();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Survei</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10 gap-1.5">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PortalSurveyForm member={myMember} user={user} />
      </div>
    </div>
  );
}