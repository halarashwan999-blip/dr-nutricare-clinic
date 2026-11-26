import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, ExternalLink, ImagePlus, Info, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/api';
import { useApi } from '@/hooks';
import { compressPhoto } from '@/lib/image';
import { Alert, SectionCard, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { fmtDate, todayInput } from '@/utils';
import type { InbodyReport } from '@/types';

function photoUrl(id: string) {
  return `/functions/v1/app/api/inbody/${id}/image`;
}

export function InbodyUpload() {
  const reports = useApi<InbodyReport[]>('/api/inbody');
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [takenAt, setTakenAt] = useState(todayInput());
  const [note, setNote] = useState('');
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.size > 15 * 1024 * 1024) {
      setError('حجم الصورة الأصلي كبير جدًا. جرّب صورة أخرى أقل حجمًا.');
      return;
    }
    setReading(true);
    try {
      setPreview(await compressPhoto(file));
    } catch (reason) {
      const message = reason instanceof Error && reason.message === 'image_too_large'
        ? 'الصورة كبيرة بعد الضغط. صوّر القراءة عن قرب وبإضاءة جيدة.'
        : 'تعذر قراءة الصورة. استخدم صورة JPG أو PNG من الكاميرا أو الهاتف.';
      setError(message);
      setPreview(null);
    } finally {
      setReading(false);
    }
  }

  async function upload() {
    if (!preview) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api<InbodyReport>('/api/inbody', {
        method: 'POST',
        body: { image: preview, taken_at: takenAt, note: note.trim() || undefined },
      });
      setPreview(null);
      setNote('');
      setTakenAt(todayInput());
      setNotice('تم رفع صورة قراءة InBody — ستراجعها الأخصائية مع قياساتك.');
      reports.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('حذف صورة قراءة InBody هذه؟')) return;
    try {
      await api(`/api/inbody/${id}`, { method: 'DELETE' });
      reports.reload();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  const items = reports.data ?? [];

  return (
    <SectionCard title="صورة قراءة جهاز InBody" description="التقط صورة بالكاميرا أو ارفع صورة محفوظة في هاتفك بعد كل قياس.">
      <div className="space-y-4">
        <Alert tone="amber" title="نصيحة مهمة">
          يُفضّل تصوير قراءة جهاز InBody ورفع الصورة مع كل قياس جديد — تساعد الأخصائية على قراءة نسبة الدهون والعضلات
          والمياه بدقة أكبر من الأرقام وحدها. صوّر الورقة أو الشاشة كاملة، بشكل مستقيم وبإضاءة جيدة، وتأكد من وضوح
          الوزن والنسب قبل الرفع.
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => cameraInput.current?.click()} disabled={reading || busy}>
            <Camera className="size-4" /> تصوير بالكاميرا
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => galleryInput.current?.click()} disabled={reading || busy}>
            <ImagePlus className="size-4" /> اختيار صورة من الهاتف
          </Button>
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void onPick(event)} aria-label="تصوير قراءة InBody بالكاميرا" />
          <input ref={galleryInput} type="file" accept="image/*" className="sr-only" onChange={(event) => void onPick(event)} aria-label="رفع صورة قراءة InBody من الهاتف" />
        </div>

        {reading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="text-primary" /> جارٍ تجهيز الصورة…
          </p>
        )}

        {preview && (
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[220px_1fr]">
            <img src={preview} alt="معاينة صورة قراءة InBody" className="max-h-64 w-full rounded-xl object-contain" />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="inbody-date">تاريخ القياس</label>
                <input id="inbody-date" type="date" value={takenAt} max={todayInput()} onChange={(event) => setTakenAt(event.target.value)} className="input-base" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" htmlFor="inbody-note">ملاحظة (اختياري)</label>
                <input id="inbody-note" value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} className="input-base" placeholder="مثال: قياس صباحًا على الريق" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void upload()} disabled={busy || reading} className="rounded-full px-5">
                  {busy ? <Spinner className="text-primary-foreground" /> : <ImagePlus className="size-4" />} رفع الصورة
                </Button>
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setPreview(null)} disabled={busy}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && <Alert tone="red">{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}

        {reports.loading && !reports.data ? (
          <p className="text-xs text-muted-foreground">جارٍ تحميل الصور السابقة…</p>
        ) : items.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Info className="size-3.5" /> الصور المحفوظة لدى الأخصائية ({items.length})</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <a href={photoUrl(item.id)} target="_blank" rel="noreferrer" className="block">
                    <img src={photoUrl(item.id)} alt={`قراءة InBody — ${fmtDate(item.taken_at)}`} loading="lazy" className="aspect-[4/3] w-full bg-muted object-cover" />
                  </a>
                  <div className="space-y-1.5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold">{fmtDate(`${item.taken_at}T00:00:00`)}</p>
                      <div className="flex items-center gap-1">
                        <a href={photoUrl(item.id)} target="_blank" rel="noreferrer" className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="عرض الصورة بالحجم الكامل">
                          <ExternalLink className="size-3.5" />
                        </a>
                        <button type="button" onClick={() => void remove(item.id)} className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="حذف الصورة">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.note && <p className="truncate text-[10px] text-muted-foreground">{item.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-3 text-[11px] text-muted-foreground">
            لم ترفع صورة بعد. صوّر قراءة InBody الآن وستظهر للأخصائية في ملفك.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
