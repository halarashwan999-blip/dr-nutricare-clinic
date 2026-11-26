import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Save, Video, XCircle } from 'lucide-react';
import { useApi } from '@/hooks';
import { api, errorMessage } from '@/api';
import { Alert, Badge, EmptyState, LoadingBlock, Modal, Spinner } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { APPOINTMENT_LABELS, CONDITION_LABELS, fmtDateTime, STATUS_LABELS } from '@/utils';
import type { AppointmentStatus, AppointmentWithPatient } from '@/types';

const tabs: Array<{ id: AppointmentStatus | 'all'; label: string }> = [
  { id: 'requested', label: 'بانتظار التأكيد' },
  { id: 'confirmed', label: 'مؤكدة' },
  { id: 'completed', label: 'مكتملة' },
  { id: 'cancelled', label: 'ملغية' },
  { id: 'all', label: 'الكل' },
];

const tone: Record<AppointmentStatus, 'green' | 'amber' | 'blue' | 'slate'> = {
  requested: 'amber',
  confirmed: 'green',
  completed: 'blue',
  cancelled: 'slate',
};

export function ClinicAppointments() {
  const { data, error, loading, reload } = useApi<AppointmentWithPatient[]>('/api/admin/appointments');
  const [tab, setTab] = useState<AppointmentStatus | 'all'>('requested');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [meetingFor, setMeetingFor] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState('');

  const list = useMemo(() => {
    const all = data ?? [];
    return tab === 'all' ? all : all.filter((item) => item.status === tab);
  }, [data, tab]);

  async function update(id: string, status: AppointmentStatus, link?: string) {
    setActionError(null);
    setBusy(id);
    try {
      await api(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        body: { status, ...(link ? { meeting_link: link } : {}) },
      });
      setMeetingFor(null);
      setMeetingLink('');
      reload();
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">المتابعات والمواعيد</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">أكد المواعيد وأرسل رابط المتابعة الإلكترونية — لا توجد زيارات للعيادة.</p>
        </div>
        <Badge tone="green"><Video className="size-3.5" /> إلكترونية بالكامل</Badge>
      </header>

      {actionError && <Alert tone="red">{actionError}</Alert>}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${tab === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !data ? <LoadingBlock /> : error ? <p className="text-sm text-red-600">{error}</p> : list.length === 0 ? (
        <div className="card-soft">
          <EmptyState icon={<CalendarClock className="size-5" />} title="لا توجد مواعيد في هذا التصنيف" description="ستظهر هنا طلبات المرضى ومواعيدهم." />
        </div>
      ) : (
        <div className="card-soft overflow-hidden">
          <ul className="divide-y divide-border/70">
            {list.map((appointment) => (
              <li key={appointment.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`#/clinic/patients/${appointment.user_id}`} className="text-sm font-semibold hover:text-primary hover:underline">{appointment.patient?.name ?? 'مريض'}</a>
                      <Badge tone={tone[appointment.status]}>{STATUS_LABELS[appointment.status]}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {APPOINTMENT_LABELS[appointment.kind]} · {fmtDateTime(appointment.scheduled_at)}
                      {appointment.patient?.condition ? ` · ${CONDITION_LABELS[appointment.patient.condition]}` : ''}
                      {appointment.patient?.phone ? ` · ${appointment.patient.phone}` : ''}
                    </p>
                    {appointment.patient_note && <p className="mt-1 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] leading-5">{appointment.patient_note}</p>}
                    {appointment.meeting_link && (
                      <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                        <Video className="size-3" /> فتح رابط المتابعة
                      </a>
                    )}
                  </div>
                  {['requested', 'confirmed'].includes(appointment.status) && (
                    <div className="flex flex-wrap gap-1.5">
                      {appointment.status === 'requested' && (
                        <Button type="button" size="xs" onClick={() => { setMeetingFor(appointment.id); setMeetingLink(appointment.meeting_link ?? ''); }} className="rounded-full">
                          <Video className="size-3" /> تأكيد مع رابط
                        </Button>
                      )}
                      {appointment.status === 'requested' && (
                        <Button type="button" size="xs" variant="outline" onClick={() => void update(appointment.id, 'confirmed')} disabled={busy === appointment.id} className="rounded-full">
                          {busy === appointment.id ? <Spinner /> : <CheckCircle2 className="size-3" />} تأكيد
                        </Button>
                      )}
                      <Button type="button" size="xs" variant="outline" onClick={() => void update(appointment.id, 'completed')} disabled={busy === appointment.id} className="rounded-full">إكمال</Button>
                      <Button type="button" size="xs" variant="ghost" onClick={() => void update(appointment.id, 'cancelled')} disabled={busy === appointment.id} className="rounded-full text-red-600 hover:bg-red-50">
                        <XCircle className="size-3" /> إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={Boolean(meetingFor)}
        onClose={() => setMeetingFor(null)}
        title="تأكيد الموعد مع رابط المتابعة"
        description="أدخل رابط HTTPS (مثل Google Meet أو Zoom). سيظهر للمريض في صفحة المواعيد."
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setMeetingFor(null)} className="rounded-full">إلغاء</Button>
            <Button
              type="button"
              disabled={busy !== null || !/^https:\/\//.test(meetingLink.trim())}
              onClick={() => meetingFor && void update(meetingFor, 'confirmed', meetingLink.trim())}
              className="rounded-full px-5"
            >
              {busy ? <Spinner className="text-primary-foreground" /> : <Save className="size-4" />} تأكيد وإرسال الرابط
            </Button>
          </div>
        )}
      >
        <label htmlFor="appt-link" className="text-xs font-semibold">رابط المتابعة</label>
        <input
          id="appt-link"
          dir="ltr"
          className="input-base mt-1.5 text-right font-mono text-xs"
          value={meetingLink}
          onChange={(event) => setMeetingLink(event.target.value)}
          placeholder="https://meet.google.com/..."
        />
      </Modal>
    </div>
  );
}
