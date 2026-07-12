import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, BarChart2, MessageSquare, CheckSquare, Circle, PieChart as PieChartIcon } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart as BarChartRecharts
} from "recharts";

const typeIcons = {
  text: MessageSquare,
  radio: Circle,
  checkbox: CheckSquare,
};

const CHART_COLORS = [
  "hsl(243 75% 59%)",
  "hsl(167 72% 40%)",
  "hsl(34 100% 50%)",
  "hsl(0 84% 60%)",
  "hsl(270 60% 55%)",
  "hsl(199 89% 48%)",
  "hsl(280 65% 60%)",
  "hsl(45 93% 47%)",
];

function RadioChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={70}
          label={({ label, percent }) => percent > 0 ? `${label} ${(percent * 100).toFixed(0)}%` : ""}
          labelLine={false}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(val, name) => [`${val} responden`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CheckboxChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
        <Tooltip formatter={(val) => [`${val} responden`, "Jumlah"]} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DesaChart({ data }) {
  const chartData = Object.entries(data).map(([desa, cnt]) => ({ desa, count: cnt }));
  if (chartData.length <= 1) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChartRecharts data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="desa" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(val) => [`${val} responden`, "Jumlah"]} />
        <Bar dataKey="count" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
      </BarChartRecharts>
    </ResponsiveContainer>
  );
}

function QuestionSummary({ question, responses, idx }) {
  const Icon = typeIcons[question.type] || MessageSquare;
  const allAnswers = responses.map(r => {
    const parsed = JSON.parse(r.answers || "[]");
    const entry = parsed.find(a => a.question_id === question.id);
    return entry?.answer;
  }).filter(a => a !== undefined && a !== null && a !== "");

  if (question.type === "text") {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-2">
            <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{idx + 1}. {question.question}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{allAnswers.length} jawaban teks</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {allAnswers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Belum ada jawaban</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allAnswers.map((ans, i) => (
                <div key={i} className="bg-secondary/50 rounded-md px-3 py-1.5 text-xs text-foreground">
                  {ans}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // radio / checkbox — aggregate counts
  const optionCounts = {};
  (question.options || []).forEach(o => { optionCounts[o] = 0; });

  if (question.type === "radio") {
    allAnswers.forEach(ans => {
      if (ans in optionCounts) optionCounts[ans]++;
      else optionCounts[ans] = (optionCounts[ans] || 0) + 1;
    });
  } else {
    // checkbox — ans is an array
    allAnswers.forEach(ans => {
      const arr = Array.isArray(ans) ? ans : [];
      arr.forEach(opt => {
        if (opt in optionCounts) optionCounts[opt]++;
        else optionCounts[opt] = (optionCounts[opt] || 0) + 1;
      });
    });
  }

  const respCount = allAnswers.length;
  const chartData = Object.entries(optionCounts).map(([label, count]) => ({ label, count }));

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{idx + 1}. {question.question}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {respCount} responden · {question.type === "radio" ? "Pilihan tunggal" : "Pilihan ganda"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {respCount === 0 ? (
          <p className="text-xs text-muted-foreground italic">Belum ada jawaban</p>
        ) : question.type === "radio" ? (
          <div className="flex flex-col items-center">
            <RadioChart data={chartData} />
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <CheckboxChart data={chartData} />
        )}
      </CardContent>
    </Card>
  );
}

export default function SurveyResultSummary({ survey, onBack }) {
  const { isSuperAdmin, isAdminDesa, isAdminKelompok, userDesa, userKelompok } = useUserRole();

  const { data: allResponses = [], isLoading } = useQuery({
    queryKey: ["survey-responses", survey.id],
    queryFn: () => base44.entities.SurveyResponse.filter({ survey_id: survey.id }),
  });

  // Filter responses berdasarkan scope role admin
  const responses = (allResponses || []).filter(r => {
    if (isSuperAdmin) return true;
    if (isAdminDesa && userDesa) return r.desa === userDesa;
    if (isAdminKelompok && userDesa && userKelompok) return r.desa === userDesa && r.kelompok === userKelompok;
    return false;
  });

  const questions = JSON.parse(survey.questions || "[]");

  // Group responses by desa
  const byDesa = responses.reduce((acc, r) => {
    const key = r.desa || "—";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Responden per kelompok (untuk admin yang scope-nya lebih luas)
  const byKelompok = responses.reduce((acc, r) => {
    const key = r.kelompok || "—";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{survey.title}</h3>
          <p className="text-xs text-muted-foreground">{survey.description}</p>
        </div>
        <Badge variant={survey.status === "Aktif" ? "default" : "secondary"}>{survey.status}</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary/60 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{responses.length}</p>
                  <p className="text-xs text-muted-foreground">Total Responden</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-accent/60 shrink-0" />
                <div>
                  <p className="text-xl font-bold">{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Pertanyaan</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="p-3">
                <p className="text-xs font-medium mb-1.5">Responden per Desa</p>
                <div className="space-y-1">
                  {Object.entries(byDesa).length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  {Object.entries(byDesa).map(([desa, cnt]) => (
                    <div key={desa} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate">{desa}</span>
                      <span className="font-medium ml-2 shrink-0">{cnt}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grafik distribusi responden per desa */}
          {responses.length > 0 && Object.keys(byDesa).length > 1 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" />
                  Distribusi Responden per Desa
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <DesaChart data={byDesa} />
              </CardContent>
            </Card>
          )}

          {/* Per-question summaries with charts */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Ringkasan Per Pertanyaan</h4>
            {questions.map((q, idx) => (
              <QuestionSummary key={q.id} question={q} responses={responses} idx={idx} />
            ))}
          </div>

          {/* Individual responses table */}
          {responses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Daftar Responden</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Nama</th>
                        <th className="px-3 py-2 text-left font-medium">Desa</th>
                        <th className="px-3 py-2 text-left font-medium">Kelompok</th>
                        <th className="px-3 py-2 text-left font-medium">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-background" : "bg-secondary/20"}>
                          <td className="px-3 py-2 font-medium">{r.member_name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.desa || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.kelompok || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}