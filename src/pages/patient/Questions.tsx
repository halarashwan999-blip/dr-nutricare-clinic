import { useState } from 'react';
import { CreditCard, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useSession } from '@/session';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONTACT } from '@/site';
import { fmtDate, fmtDateTime } from '@/utils';
import type { Question } from '@/types';

export function PatientQuestions() {
  const { user } = useSession();
  const { data, error, loading, reload } = useApi<Question[]>('/api/questions');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setFormError(null);
    setNotice(null);
    if (body.trim().length < 3) {
      setFormError('اكتب سؤالك في سطر واحد على الأقل.');
      return;
    }
    setBusy(true);
    try {
      await api<Question>('/api/questions', { method: 'POST', body: { body: body.trim() } });
      setBody('');
      setNotice('وصل سؤالك للأخصائي. ستجد الرد هنا وفي المتابعة.');
      reload();
    } catch (reason) {
      setFormError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const list = data ?? [];
  const open = list.filter((item) => !item.answer);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">استفساراتي للأخصائي</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">اكتب ما تريد من الأخصائي — أسئلة عن الخطة، الأكل، القياسات أو الأدوية.</p>
        </div>
        <Badge tone={open.length ? 'amber' : 'green'}>{open.length ? `${open.length} بانتظار الرد` : 'كل الأسئلة مجابة'}</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <SectionCard title="اسأل الأخصائي" description="سيظهر رد الأخصائي هنا بعد المراجعة، وقد يُناقش في المتابعة.">
          <label className="text-xs font-semibold" htmlFor="question">سؤالك</label>
          <textarea
            id="question"
            className="input-base mt-1.5 min-h-32 resize-y py-3"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="مثال: هل يمكنني استبدال الأرز بالبرغل في الغداء؟ وهل يؤثر على دواء الضغط؟"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>لا تشارك أرقام بطاقات أو بيانات حساسة.</span>
            <span>{body.length}/2000</span>
          </div>
          {formError && <div className="mt-3"><Alert tone="red">{formError}</Alert></div>}
          {notice && <div className="mt-3"><Alert tone="green">{notice}</Alert></div>}
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={() => void submit()} disabled={busy || !body.trim()} className="rounded-full px-6">
              {busy ? <Spinner className="text-primary-foreground" /> : <Send className="size-4" />} إرسال السؤال
            </Button>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary"><MessageCircle className="size-5" /></span>
            <p className="mt-3 font-semibold">تواصل مباشر</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">للاستفسارات السريعة أو حجز موعد، تواصل مع د. هالة رشوان مباشرة.</p>
            <div className="mt-3 space-y-2 text-xs">
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 font-semibold text-emerald-900 hover:bg-emerald-100">
                واتساب <span dir="ltr">{CONTACT.phone}</span>
              </a>
              <a href={CONTACT.emailLink} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-muted-foreground hover:bg-muted">
                البريد <span dir="ltr" className="truncate text-[11px]">{CONTACT.email}</span>
              </a>
            </div>
          </div>
          <Alert tone="amber">هذه القناة للاستفسارات الغذائية وليست للطوارئ. عند أعراض حادة أو انخفاض/ارتفاع شديد في السكر أو الضغط اتصل بالطبيب فورًا.</Alert>
        </div>
      </div>

      <SectionCard title="سجل الاستفسارات" description={loading ? 'جارٍ التحميل…' : `${list.length} استفسارًا`}>
        {error && <Alert tone="red">{error}</Alert>}
        {loading && !data ? <LoadingBlock /> : list.length === 0 ? (
          <EmptyState icon={<MessageCircle className="size-5" />} title="لم ترسل أي استفسار بعد" description="اكتب سؤالك في النموذج وسيصل للأخصائي." />
        ) : (
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border/80 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-7">{item.body}</p>
                  <Badge tone={item.answer ? 'green' : 'amber'}>{item.answer ? 'تم الرد' : 'بانتظار الرد'}</Badge>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(item.created_at)}</p>
                {item.answer && (
                  <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary"><Sparkles className="size-3.5" /> رد الأخصائي · {fmtDateTime(item.answered_at)}</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-6">{item.answer}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CreditCard className="size-4 text-primary" /> جميع الاستفسارات مرتبطة بحسابك: {fmtDate(user?.created_at)}
      </p>
    </div>
  );
}
