import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { User, ClipboardList, QrCode, LogOut, CheckCircle, AlertCircle, Loader2, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import PortalAttendanceScanner from "@/components/portal/PortalAttendanceScanner";
import PortalSurveyForm from "@/components/portal/PortalSurveyForm";

const EDITABLE_FIELDS = [
  { key: "phone", label: "Nomor Telepon", type: "text", placeholder: "08xxx" },
  { key: "notes", label: "Catatan / Informasi Tambahan", type: "textarea", placeholder: "Catatan opsional..." },
];

const READONLY_FIELDS = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "desa", label: "Desa" },
  { key: "kelompok", label: "Kelompok" },
  { key: "dapukan", label: "Dapukan" },
  { key: "status", label: "Status" },
  { key: "visa_status", label: "Status Visa" },
  { key: "employment", label: "Pekerjaan" },
];

export default function JamaahPortal() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState("profil");

  // Cari data member berdasarkan email user
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["my-member", user?.email],
    queryFn: () => base44.entities.Member.list(),
    enabled: !!user,
  });

  const myMember = members.find(
    m => m.phone === user?.phone ||
    (user?.full_name && m.full_name?.toLowerCase() === user?.full_name?.toLowerCase())
  ) || members[0];

  useEffect(() => {
    if (myMember) {
      setEditData({
        phone: myMember.phone || "",
        notes: myMember.notes || "",
      });
    }
  }, [myMember?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.update(myMember.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-member"] });
      toast.success("Profil berhasil diperbarui");
    },
    onError: () => toast.error("Gagal menyimpan perubahan"),
  });

  const handleSave = () => {
    if (!myMember) return;
    updateMutation.mutate(editData);
  };

  const handleLogout = () => {
    window.location.href = "/login";
    base44.auth.logout();
  };

  if (loadingMembers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{user?.full_name || "Portal Jamaah"}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!myMember && (
          <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Data jamaah tidak ditemukan</p>
              <p className="text-xs text-amber-700 mt-0.5">Hubungi admin untuk menautkan akun Anda dengan data anggota.</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="profil" className="flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5" /> Profil
            </TabsTrigger>
            <TabsTrigger value="survey" className="flex items-center gap-1.5 text-xs">
              <ClipboardList className="w-3.5 h-3.5" /> Survei
            </TabsTrigger>
            <TabsTrigger value="absensi" className="flex items-center gap-1.5 text-xs">
              <QrCode className="w-3.5 h-3.5" /> Absensi
            </TabsTrigger>
          </TabsList>

          {/* TAB PROFIL */}
          <TabsContent value="profil" className="space-y-4">
            {myMember ? (
              <>
                {/* Info Read-Only */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Data Keanggotaan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {READONLY_FIELDS.map(f => {
                      const val = myMember[f.key];
                      if (!val) return null;
                      return (
                        <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-xs text-muted-foreground">{f.label}</span>
                          <span className="text-xs font-medium text-foreground">{val}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Info Editable */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Data Pribadi (Dapat Diedit)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {EDITABLE_FIELDS.map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        {f.type === "textarea" ? (
                          <Textarea
                            value={editData[f.key] || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            rows={3}
                            className="text-sm"
                          />
                        ) : (
                          <Input
                            value={editData[f.key] || ""}
                            onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="text-sm"
                          />
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="w-full"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Simpan Perubahan
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">Data anggota belum tersedia</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB SURVEY */}
          <TabsContent value="survey">
            <PortalSurveyForm member={myMember} user={user} />
          </TabsContent>

          {/* TAB ABSENSI */}
          <TabsContent value="absensi">
            <PortalAttendanceScanner member={myMember} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}