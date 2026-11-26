import { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { api } from '@/api';
import { Modal, EmptyState } from '@/components/ui-kit';
import { fmtDateTime } from '@/utils';
import type { NotificationItem } from '@/types';

interface NotificationsResponse {
  items: NotificationItem[];
  unread: number;
}

export function NotificationBell() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<NotificationsResponse>('/api/admin/notifications'));
    } catch { /* silent: bell is supplementary */ }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function openPanel() {
    setOpen(true);
    if ((data?.unread ?? 0) > 0) {
      try { await api('/api/admin/notifications/read', { method: 'POST' }); } catch { /* keep unread */ }
      void load();
    }
  }

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => void openPanel()}
        className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={unread > 0 ? `الإشعارات — ${unread} غير مقروء` : 'الإشعارات'}
        title="الإشعارات"
      >
        {unread > 0 ? <BellRing className="size-4 text-primary" /> : <Bell className="size-4" />}
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="الإشعارات" description="التحويلات والطلبات الجديدة التي تحتاج مراجعتك.">
        {items.length === 0 ? (
          <EmptyState icon={<Bell className="size-5" />} title="لا توجد إشعارات" description="ستظهر هنا إشعارات تحويلات المرضى فور إرسالها." />
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{item.title}</p>
                    {!item.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-red-500" aria-label="غير مقروء" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(item.created_at)}</p>
                </>
              );
              return (
                <li key={item.id}>
                  {item.link ? (
                    <a
                      href={`#${item.link}`}
                      onClick={() => setOpen(false)}
                      className={`block rounded-2xl border p-3 transition-colors hover:bg-muted/60 ${item.read_at ? 'border-border/70' : 'border-primary/30 bg-secondary/40'}`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="rounded-2xl border border-border/70 p-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
