import {
  ArrowLeft, ArrowRight, Award, Check, GraduationCap, Mail, MessageCircle, Phone, ShieldCheck, Sparkles, Stethoscope, Video,
} from 'lucide-react';
import { Logo, BrandMark } from '@/components/brand';
import { CredentialsSection, DietitianPhoto } from '@/components/credentials';
import { ABOUT, CONTACT } from '@/site';

export function AboutPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="روابط الصفحة">
            <a href="#/" className="hover:text-foreground">الرئيسية</a>
            <a href="#/about" className="text-foreground">من نحن</a>
            <a href="#/register" className="hover:text-foreground">التسجيل</a>
            <a href="#/login" className="hover:text-foreground">دخول المرضى</a>
          </nav>
          <a href="#/" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted">
            <ArrowRight className="size-3.5" /> الرئيسية
          </a>
        </div>
      </header>

      <main>
        <section className="hero-wash relative overflow-hidden border-b border-border">
          <div className="clinic-grid absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-16">
            <div className="mx-auto w-full max-w-sm">
              <DietitianPhoto />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-[11px] font-semibold text-primary">
                <Stethoscope className="size-3.5" /> من نحن
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
                {CONTACT.name}
                <span className="mt-2 block text-lg font-semibold text-primary sm:text-xl">{CONTACT.title}</span>
              </h1>
              <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">{ABOUT.intro}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><GraduationCap className="size-5" /></span>
                  <div>
                    <p className="text-xs font-semibold">بكالوريوس الصيدلة</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">عام 2007</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Award className="size-5" /></span>
                  <div>
                    <p className="text-xs font-semibold">دبلوم التغذية العلاجية</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">جامعة الزقازيق</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 sm:col-span-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Sparkles className="size-5" /></span>
                  <div>
                    <p className="text-xs font-semibold">خبرة 10 سنوات في وضع خطط التغذية العلاجية</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">خطط فردية للسمنة والنحافة وأمراض القلب والضغط والسكري والغدة الدرقية، مع مراجعة كل خطة قبل إرسالها للمريض.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  <MessageCircle className="size-4" /> واتساب <span dir="ltr">{CONTACT.phone}</span>
                </a>
                <a href={CONTACT.emailLink} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold hover:bg-muted">
                  <Mail className="size-4" /> راسلني بالبريد
                </a>
                <a href="#/register" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  ابدأ المتابعة <ArrowLeft className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> سيرة مهنية مختصرة
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">مؤهلاتي وخبرتي</h2>
          </div>
          <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
            {ABOUT.points.map((point) => (
              <li key={point} className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-6">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {point}
              </li>
            ))}
          </ul>
        </section>

        <CredentialsSection />

        <section className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
            <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-primary"><Video className="size-3.5" /> متابعة إلكترونية فقط</p>
                  <h2 className="mt-3 text-xl font-bold sm:text-2xl">للتواصل والاستفسارات</h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">متاحة على واتساب أو الهاتف خلال أوقات العمل، ولأي استفسار غذائي بعد بدء المتابعة يمكنك إرساله من داخل حسابك.</p>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <a href={`tel:${CONTACT.phoneIntl}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 font-semibold hover:bg-muted">
                    <Phone className="size-3.5" /> <span dir="ltr" className="font-mono">{CONTACT.phone}</span>
                  </a>
                  <a href={CONTACT.emailLink} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 font-semibold hover:bg-muted">
                    <Mail className="size-3.5" /> <span dir="ltr">{CONTACT.email}</span>
                  </a>
                </div>
              </div>
              <p className="mt-5 border-t border-border/70 pt-4 text-[11px] leading-6 text-muted-foreground">
                المحتوى والخطط الغذائية إرشادية ولا تُغني عن الطبيب المعالج أو تعديل الأدوية. في حالات الطوارئ توجه لأقرب مستشفى.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-right">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="font-bold" dir="ltr">Dr. NutriCare Clinic</p>
              <p className="text-[10px] text-muted-foreground">عيادة تغذية علاجية أونلاين</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <a href="#/" className="hover:text-foreground">الرئيسية</a>
            <a href="#/register" className="hover:text-foreground">التسجيل</a>
            <a href="#/login" className="hover:text-foreground">دخول المرضى</a>
            <a href="#/clinic/login" className="hover:text-foreground">بوابة أخصائي التغذية</a>
          </div>
        </div>
        <div className="border-t border-border/70 px-4 py-4 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} <span dir="ltr">Dr. NutriCare Clinic</span> — جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
