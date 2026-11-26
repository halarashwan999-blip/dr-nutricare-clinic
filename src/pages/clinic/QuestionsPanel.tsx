import { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { fmtDateTime } from '@/utils';
import type { Question } from '@/types';

export function QuestionsPanel({ questions, onChanged }: { questions: Question[]; onChanged: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(id: string) {
    const answer = (drafts[id] ?? '').trim();
    setError(null);
    if (answer.length < 2) {
      setError('اكتب ردًا واضحًا قبل الإرسال.');
      return;
    }
    setBusy(id);
    try {
      await api(`/api/admin/questions/${id}`, { method: 'PATCH', body: { answer } });
      setDrafts((current) => ({ ...current, [id]: '' }));
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionCard title="استفسارات المريض" description="تظهر ردودك مباشرة في صفحة استفسارات المريض.">
      {error && <div className="mb-3"><Alert tone="red">{error}</Alert></div>}
      {questions.length === 0 ? (
        <EmptyState icon={<MessageCircle className="size-5" />} title="لا توجد استفسارات" description="لم يرسل المريض أي استفسار بعد." />
      ) : (
        <ul className="space-y-3">
          {questions.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border/80 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-7">{item.body}</p>
                <Badge tone={item.answer ? 'green' : 'amber'}>{item.answer ? 'تم الرد' : 'بانتظار الرد'}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(item.created_at)}</p>
              {item.answer ? (
                <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary"><Sparkles className="size-3.5" /> ردك · {fmtDateTime(item.answered_at)}</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-6">{item.answer}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <textarea
                    className="input-base min-h-20 resize-y py-2.5 text-sm"
                    value={drafts[item.id] ?? ''}
                    onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    maxLength={2000}
                    placeholder="اكتب الرد الغذائي هنا..."
                    aria-label="الرد على الاستفسار"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="button" size="sm" onClick={() => void submit(item.id)} disabled={busy === item.id} className="rounded-full px-4">
                      {busy === item.id ? <Spinner className="text-primary-foreground" /> : <Send className="size-3.5" />} إرسال الرد
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
