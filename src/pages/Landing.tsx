import {
  ArrowLeft, Check, CreditCard, Mail, MessageCircle, ShieldCheck, Sparkles, Stethoscope, Video,
} from 'lucide-react';
import { useSession } from '@/session';
import { useCatalog } from '@/catalog';
import { Logo, BrandMark } from '@/components/brand';
import { Badge } from '@/components/ui-kit';
import { Button } from '@/components/ui/button';
import { CONTACT } from '@/site';
import { fmtMoney } from '@/utils';
import type { PaymentKind } from '@/types';

const fallbackPrices: Record<PaymentKind, { amount: number; label: string; note: string; days: number }> = {
  consultation: { amount: 150, label: 'استشارة أولى', note: 'تقييم شامل ووضع الخطة الغذائية', days: 0 },
  monthly: { amount: 500, label: 'متابعة شهرية', note: 'متابعة أونلاين لمدة 30 يومًا', days: 30 },
  quarter: { amount: 1250, label: 'خطة 3 شهور', note: 'خصم 250 ج.م عن الدفع الشهري', days: 90 },
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingPage() {
  const { user } = useSession();
  const { catalog } = useCatalog();
  const pricing = catalog?.pricing ?? fallbackPrices;
  const homeForRole = user?.role === 'dietitian' ? '#/clinic/overview' : '#/app/overview';

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="روابط الموقع">
            <a href="#/about" className="hover:text-foreground">من نحن</a>
            <button type="button" onClick={() => scrollTo('pricing')} className="hover:text-foreground">الأسعار</button>
            <button type="button" onClick={() => scrollTo('contact')} className="hover:text-foreground">تواصل</button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="rounded-full px-4">
                <a href={homeForRole}>لوحتي <ArrowLeft className="size-4" /></a>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <a href="#/login">دخول</a>
                </Button>
                <Button asChild size="sm" className="rounded-full px-4">
                  <a href="#/register">سجّل الآن</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero-wash relative overflow-hidden">
          <div className="clinic-grid absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pb-20 lg:pt-16">
            <div>
              <Badge tone="green" className="border-primary/25 bg-white/70 px-3 py-1 text-[11px]">
                <Video className="size-3.5" /> متابعة إلكترونية 100% من خلال الموقع
              </Badge>
              <h1 className="mt-5 text-4xl font-bold leading-[1.25] tracking-tight text-foreground sm:text-5xl">
                تغذية علاجية
                <span className="relative mx-2 inline-block text-primary">
                  تناسب حالتك
                  <svg className="absolute -bottom-1.5 right-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 7c40-5 90-6 196-3" stroke="#c98a2b" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".75" />
                  </svg>
                </span>
                بإشراف أخصائية
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                عيادة تغذية علاجية أونلاين للسمنة والنحافة ومرضى القلب والضغط والسكري. سجّل حسابك،
                حوّل قيمة الباقة على فودافون كاش، ويُفعّل حسابك بعد تأكيد التحويل.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20">
                  <a href={user ? homeForRole : '#/register'}>
                    {user ? 'ادخل إلى لوحتك' : 'أنشئ حسابك وابدأ'} <ArrowLeft className="size-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-border bg-white/60 px-6 text-base">
                  <a href="#/login">لديّ حساب بالفعل</a>
                </Button>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-1.5"><Stethoscope className="size-4 text-primary" /> إشراف أخصائية تغذية علاجية</li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" /> بياناتك محمية ومشفّرة</li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl shadow-emerald-950/15">
                <img src="/images/hero-meal.png" alt="وجبة متوازنة من الخضروات والبروتين والحبوب" className="aspect-[4/3] w-full object-cover" width={1536} height={1024} />
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-xs text-muted-foreground">خطة غذائية فردية</p>
                    <p className="mt-1 text-sm font-semibold">مبنية على حالتك وقياساتك وتحاليلك</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"><Sparkles className="size-5" /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="amber"><CreditCard className="size-3.5" /> أسعار واضحة</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">اختر ما يناسب متابعتك</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">الدفع عبر فودافون كاش، وكل الأسعار بالجنيه المصري.</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {(['consultation', 'monthly', 'quarter'] as PaymentKind[]).map((kind) => {
              const plan = pricing[kind];
              const featured = kind === 'quarter';
              return (
                <article key={kind} className={`card-soft relative flex flex-col p-6 ${featured ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
                  {featured && <Badge tone="amber" className="absolute -top-3 right-6">الأكثر توفيرًا</Badge>}
                  <p className="text-sm font-semibold text-muted-foreground">{plan.label}</p>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{fmtMoney(plan.amount)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{kind === 'consultation' ? 'دفعة واحدة' : kind === 'monthly' ? 'كل 30 يومًا' : 'لمدة 90 يومًا'}</p>
                  <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs leading-6 text-secondary-foreground">{plan.note}</p>
                  <ul className="mt-4 flex-1 space-y-2.5 text-xs text-muted-foreground">
                    {(kind === 'consultation'
                      ? ['تقييم الحالة ووضع الخطة', 'خطة غذائية أساسية', 'وصول لكامل أدوات المتابعة']
                      : kind === 'monthly'
                        ? ['متابعة أونلاين شهرية', 'تعديل الخطة حسب القياسات', 'مواعيد ورابط متابعة إلكتروني']
                        : ['3 شهور متابعة متواصلة', 'خصم 250 ج.م عن الدفع الشهري', 'مراجعة الخطة والقياسات شهريًا']
                    ).map((line) => (
                      <li key={line} className="flex items-center gap-2"><Check className="size-3.5 text-primary" /> {line}</li>
                    ))}
                  </ul>
                  <Button asChild variant={featured ? 'default' : 'outline'} className="mt-6 rounded-full">
                    <a href={user ? '#/app/billing' : '#/register'}>{user ? 'اذهب للدفع' : 'سجّل ثم ادفع'}</a>
                  </Button>
                </article>
              );
            })}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-6 text-muted-foreground">
            يُفعّل الحساب بعد التأكد من التحويل. الاستشارة الأولى لا تشمل فترة متابعة، ويمكن ترقيتها لاحقًا إلى باقة شهرية.
          </p>
        </section>

        <section id="contact" className="scroll-mt-20 border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">لديك سؤال قبل البدء؟</h2>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto">
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  <MessageCircle className="size-4" /> واتساب
                </a>
                <a href={CONTACT.emailLink} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted">
                  <Mail className="size-4" /> البريد
                </a>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[1.5rem] bg-primary px-6 py-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-lg font-bold text-primary-foreground">جاهز لبدء متابعتك الغذائية؟</p>
                <p className="mt-1 text-xs leading-6 text-primary-foreground/80">أنشئ حسابك، حوّل على المحفظة، وسيُفعّل حسابك بعد التأكد من التحويل.</p>
              </div>
              <Button asChild variant="secondary" className="shrink-0 rounded-full bg-white px-6 text-primary hover:bg-white/90">
                <a href={user ? homeForRole : '#/register'}>ابدأ من هنا <ArrowLeft className="size-4" /></a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <a
        href={CONTACT.whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل عبر واتساب"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-xl shadow-emerald-900/25 transition-transform hover:-translate-y-0.5 hover:bg-emerald-700 print:hidden"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">واتساب</span>
      </a>

      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <div>
                <p className="font-bold" dir="ltr">Dr. NutriCare Clinic</p>
                <p className="text-[10px] text-muted-foreground">عيادة تغذية علاجية أونلاين</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">روابط سريعة</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li><a href="#/about" className="hover:text-foreground">من نحن</a></li>
              <li><a href="#/register" className="hover:text-foreground">إنشاء حساب مريض</a></li>
              <li><a href="#/login" className="hover:text-foreground">تسجيل الدخول</a></li>
              <li><a href="#/clinic/login" className="hover:text-foreground">بوابة أخصائي التغذية</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">تواصل مباشر</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li><a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="size-3.5 text-emerald-600" /> واتساب</a></li>
              <li><a href={CONTACT.emailLink} className="flex items-center gap-2 break-all hover:text-foreground"><Mail className="size-3.5" /> <span dir="ltr">{CONTACT.email}</span></a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">تنبيه صحي</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              المحتوى والخطط الغذائية إرشادية ولا تُغني عن الطبيب المعالج أو تعديل الأدوية. في حالات الطوارئ توجه لأقرب مستشفى.
            </p>
          </div>
        </div>
        <div className="border-t border-border/70 px-4 py-4 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} <span dir="ltr">Dr. NutriCare Clinic</span> — جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
