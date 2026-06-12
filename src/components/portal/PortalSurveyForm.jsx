import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Loader2, Send, ChevronRight, ArrowLeft, Circle, CheckSquare, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS = { text: "Teks Bebas", radio: "Pilihan Tunggal", checkbox: "Pilihan Ganda" };
const TYPE_ICONS = { text: MessageSquare, radio: Circle, checkbox: CheckSquare };

function QuestionItem({ question, answer, onChange, idx }) {
  const Icon = TYPE_ICONS[question.type] || MessageSquare;

  return (
    <div className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed">
            {idx + 1}. {question.question}
            {question.required && <span className="text-destructive ml-1 text-xs">*</span>}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{TYPE_LABELS[question.type]}</p>
        </div>
      </div>

      {question.type === "text" && (
        <Textarea
          value={answer || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Tulis jawaban Anda di sini..."
          rows={3}
          className="text-sm"
        />
      )}

      {question.type === "radio" && (
        <div className="space-y-2 pl-1">
          {(question.options || []).map(opt => (
            <label key={opt} className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${answer === opt ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${answer === opt ? "border-primary" : "border-muted-foreground/50"}`}>
                {answer === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <input type="radio" name={question.id} value={opt} checked={answer === opt} onChange={() => onChange(opt)} className="sr-only" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "checkbox" && (
        <div className="space-y-2 pl-1">
          {(question.options || []).map(opt => {
            const selected = Array.isArray(answer) ? answer : [];
            const checked = selected.includes(opt);
            return (
              <label key={opt} className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "border-primary bg-primary" : "border-muted-foreground/50"}`}>
                  {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const updated = checked ? selected.filter(s => s !== opt) : [...selected, opt];
                    onChange(updated);
                  }}
                  className="sr-only"
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      toast.success("Survei berhasil dikirim! Terima kasih.");
    },
    onError: () => toast.error("Gagal mengirim survei"),
  });

  const handleSubmit = (survey) => {
    const questions = JSON.parse(survey.questions || "[]");
    for (const q of questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0) || ans === "") {
        toast.error(`Pertanyaan "${q.question}" wajib diisi`);
        return;
      }
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

  // Survey form view
  if (openSurveyId) {
    const survey = surveys.find(s => s.id === openSurveyId);
    const questions = JSON.parse(survey?.questions || "[]");
    const answeredCount = Object.keys(answers).filter(k => {
      const v = answers[k];
      return v && (Array.isArray(v) ? v.length > 0 : v.trim?.() !== "");
    }).length;
    const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setOpenSurveyId(null); setAnswers({}); }} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{survey?.title}</CardTitle>
            {survey?.description && <p className="text-sm text-muted-foreground">{survey.description}</p>}
            {survey?.deadline && (
              <p className="text-xs text-destructive">⏰ Batas pengisian: {new Date(survey.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
            )}
            {/* Progress bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{answeredCount}/{questions.length} pertanyaan dijawab</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {questions.map((q, idx) => (
              <QuestionItem
                key={q.id}
                question={q}
                answer={answers[q.id]}
                onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                idx={idx}
              />
            ))}
            <Button
              onClick={() => handleSubmit(survey)}
              disabled={submitMutation.isPending}
              className="w-full gap-2 mt-2"
            >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim Jawaban
            </Button>
          </CardContent>
        </Card>
      </div>
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
        const questions = JSON.parse(survey.questions || "[]");
        return (
          <Card
            key={survey.id}
            className={`transition-all ${done ? "opacity-60" : "cursor-pointer hover:shadow-md hover:border-primary/30"}`}
            onClick={() => !done && setOpenSurveyId(survey.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold">{survey.title}</p>
                    {done
                      ? <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />Sudah Diisi</Badge>
                      : <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Aktif</Badge>
                    }
                  </div>
                  {survey.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{survey.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{questions.length} pertanyaan</span>
                    {survey.deadline && <span className="text-destructive">⏰ {new Date(survey.deadline).toLocaleDateString("id-ID")}</span>}
                  </div>
                </div>
                {!done && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}