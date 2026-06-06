import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle, Loader2, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function PortalSurveyForm({ member, user }) {
  const queryClient = useQueryClient();
  const [openSurveyId, setOpenSurveyId] = useState(null);
  const [answers, setAnswers] = useState({});

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys-active"],
    queryFn: () => base44.entities.SurveyConfig.filter({ status: "Aktif" }),
  });

  const { data: myResponses = [] } = useQuery({
    queryKey: ["my-survey-responses", member?.id],
    queryFn: () => base44.entities.SurveyResponse.filter({ member_id: member?.id }),
    enabled: !!member?.id,
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.SurveyResponse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-survey-responses"] });
      setOpenSurveyId(null);
      setAnswers({});
      toast.success("Survei berhasil dikirim!");
    },
    onError: () => toast.error("Gagal mengirim survei"),
  });

  const handleSubmit = (survey) => {
    const questions = JSON.parse(survey.questions || "[]");
    const missingRequired = questions.find(q => q.required && !answers[q.id]);
    if (missingRequired) {
      toast.error(`Pertanyaan "${missingRequired.question}" wajib diisi`);
      return;
    }
    submitMutation.mutate({
      survey_id: survey.id,
      survey_title: survey.title,
      member_id: member?.id || user?.id,
      member_name: member?.full_name || user?.full_name,
      desa: member?.desa || "",
      kelompok: member?.kelompok || "",
      answers: JSON.stringify(Object.entries(answers).map(([id, answer]) => ({ question_id: id, answer }))),
      submitted_at: new Date().toISOString(),
    });
  };

  const alreadyAnswered = (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey?.allow_multiple_responses) return false;
    return myResponses.some(r => r.survey_id === surveyId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (openSurveyId) {
    const survey = surveys.find(s => s.id === openSurveyId);
    const questions = JSON.parse(survey?.questions || "[]");
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{survey?.title}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setOpenSurveyId(null); setAnswers({}); }}>
              ← Kembali
            </Button>
          </div>
          {survey?.description && (
            <p className="text-xs text-muted-foreground mt-1">{survey.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm font-medium">
                {idx + 1}. {q.question}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {q.type === "text" && (
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Tulis jawaban Anda..."
                  rows={3}
                  className="text-sm"
                />
              )}
              {q.type === "radio" && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className="accent-primary"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "checkbox" && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => {
                    const selected = (answers[q.id] || []);
                    return (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => {
                            const updated = selected.includes(opt)
                              ? selected.filter(s => s !== opt)
                              : [...selected, opt];
                            setAnswers(prev => ({ ...prev, [q.id]: updated }));
                          }}
                          className="accent-primary"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <Button
            onClick={() => handleSubmit(survey)}
            disabled={submitMutation.isPending}
            className="w-full gap-2"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim Jawaban
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada survei aktif</p>
          <p className="text-xs text-muted-foreground mt-1">Admin akan memberitahu ketika ada survei baru</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Survei yang perlu Anda isi:</p>
      {surveys.map(survey => {
        const done = alreadyAnswered(survey.id);
        return (
          <Card
            key={survey.id}
            className={done ? "opacity-70" : "cursor-pointer hover:shadow-md transition-shadow"}
            onClick={() => !done && setOpenSurveyId(survey.id)}
          >
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{survey.title}</p>
                  {done && <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">✓ Sudah Diisi</Badge>}
                </div>
                {survey.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{survey.description}</p>
                )}
                {survey.deadline && (
                  <p className="text-[10px] text-destructive mt-1">Batas: {survey.deadline}</p>
                )}
              </div>
              {!done && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}