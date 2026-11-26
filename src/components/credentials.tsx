import { useState } from 'react';
import { Award, ImageIcon, Stethoscope } from 'lucide-react';
import { CREDENTIALS, PHOTO_SRC, CONTACT, ABOUT } from '@/site';
import { Badge } from '@/components/ui-kit';

export function DietitianPhoto() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
      {failed ? (
        <div className="hero-wash flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">هـ ر</span>
          <p className="text-sm font-semibold">{CONTACT.name}</p>
          <p className="text-xs text-muted-foreground">{CONTACT.title}</p>
          <p className="mt-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] text-muted-foreground">الصورة الشخصية ستُضاف قريبًا</p>
        </div>
      ) : (
        <img src={PHOTO_SRC} alt={`${CONTACT.name} — ${CONTACT.title}`} className="aspect-[4/5] w-full object-cover" width={900} height={1125} onError={() => setFailed(true)} />
      )}
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-sm font-bold">{CONTACT.name}</p>
        <p className="text-[11px] text-muted-foreground">{CONTACT.title}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="green"><Stethoscope className="size-3" /> تغذية علاجية</Badge>
          <Badge tone="amber"><Award className="size-3" /> خبرة 10 سنوات</Badge>
        </div>
      </div>
    </div>
  );
}

function CredentialCard({ credential }: { credential: typeof CREDENTIALS[number] }) {
  const [failed, setFailed] = useState(true);
  return (
    <figure className="card-soft overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-secondary/50">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-card text-primary shadow-sm"><ImageIcon className="size-5" /></span>
            <p className="text-xs font-semibold">{credential.title}</p>
            <p className="text-[10px] text-muted-foreground">المستند قيد الإضافة</p>
          </div>
        ) : null}
        <img
          src={credential.src}
          alt={credential.title}
          className={`h-full w-full object-contain p-2 ${failed ? 'hidden' : ''}`}
          loading="lazy"
          onLoad={() => setFailed(false)}
          onError={() => setFailed(true)}
        />
      </div>
      <figcaption className="border-t border-border px-4 py-3">
        <p className="text-sm font-semibold">{credential.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{credential.issuer} · {credential.note}</p>
      </figcaption>
    </figure>
  );
}

export function CredentialsSection() {
  return (
    <section id="credentials" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="amber"><Award className="size-3.5" /> مؤهلات واعتمادات</Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">شهادات واعتماد مهني</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          دبلوم التغذية العلاجية من جامعة الزقازيق، وعضوية نقابة الصيادلة، وإدراج في جدول الأخصائيين.
          سيتم استبدال أماكن المستندات بنسخ واضحة بعد إرفاقها.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREDENTIALS.map((credential) => <CredentialCard key={credential.title} credential={credential} />)}
      </div>
      <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
        {ABOUT.points.slice(0, 4).map((point) => (
          <li key={point} className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-6">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /> {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
