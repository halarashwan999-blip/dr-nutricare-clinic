import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SessionProvider, useSession } from '@/session';
import { useHashRoute, go } from '@/router';
import { Logo } from '@/components/brand';
import { LoadingBlock } from '@/components/ui-kit';
import { PatientShell, ClinicShell } from '@/layouts/shell';
import { LandingPage } from '@/pages/Landing';
import { AboutPage } from '@/pages/About';
import { AuthPage } from '@/pages/Auth';
import { SpecialistAuth } from '@/pages/SpecialistAuth';
import { PatientActivation } from '@/pages/patient/Activation';
import { PatientOverview } from '@/pages/patient/Overview';
import { PatientMeals } from '@/pages/patient/Meals';
import { PatientVitals } from '@/pages/patient/Vitals';
import { PatientAssessment } from '@/pages/patient/Assessment';
import { PatientPlan } from '@/pages/patient/Plan';
import { PatientAppointments } from '@/pages/patient/Appointments';
import { PatientQuestions } from '@/pages/patient/Questions';
import { PatientBilling } from '@/pages/patient/Billing';
import { PatientProfile } from '@/pages/patient/Profile';
import { ClinicOverview } from '@/pages/clinic/Overview';
import { ClinicPatients } from '@/pages/clinic/Patients';
import { ClinicPatientDetail } from '@/pages/clinic/PatientDetail';
import { ClinicAppointments } from '@/pages/clinic/Appointments';
import { ClinicPayments } from '@/pages/clinic/Payments';
import { ClinicActivations } from '@/pages/clinic/Activations';
import type { Role } from '@/types';

function Guard({ role, children, allowPending = false }: { role: Role; children: ReactNode; allowPending?: boolean }) {
  const { status, user } = useSession();
  const home = user?.role === 'dietitian' ? '/clinic/overview' : '/app/overview';
  const patientPending = role === 'patient' && user?.role === 'patient' && !user.activated_at;

  useEffect(() => {
    if (status === 'guest') go(role === 'dietitian' ? '/clinic/login' : '/login', { replace: true });
    else if (status === 'ready' && user && user.role !== role) go(home, { replace: true });
    else if (status === 'ready' && user?.role === 'patient' && user.role === role) {
      if (!user.activated_at && !allowPending) go('/app/activation', { replace: true });
      else if (user.activated_at && allowPending) go('/app/overview', { replace: true });
    }
  }, [status, user, role, home, allowPending]);

  if (status !== 'ready' || !user || user.role !== role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="جارٍ التحقق من الجلسة…" />
      </div>
    );
  }
  if (patientPending !== allowPending && role === 'patient') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="جارٍ التحقق من الجلسة…" />
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted-foreground">الرابط غير صحيح أو تم نقله. عد إلى الصفحة الرئيسية.</p>
      <a href="#/" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">الصفحة الرئيسية</a>
    </main>
  );
}

const patientPages: Record<string, () => ReactNode> = {
  '/app/overview': () => <PatientOverview />,
  '/app/meals': () => <PatientMeals />,
  '/app/vitals': () => <PatientVitals />,
  '/app/assessment': () => <PatientAssessment />,
  '/app/plan': () => <PatientPlan />,
  '/app/appointments': () => <PatientAppointments />,
  '/app/questions': () => <PatientQuestions />,
  '/app/billing': () => <PatientBilling />,
  '/app/profile': () => <PatientProfile />,
};

function Routes() {
  const raw = useHashRoute();
  const [path] = raw.split('?');

  if (path === '/') return <LandingPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/clinic/login') return <SpecialistAuth mode="login" />;
  if (path === '/clinic/register') return <SpecialistAuth mode="register" />;

  if (path === '/app/activation') {
    return (
      <Guard role="patient" allowPending>
        <PatientActivation />
      </Guard>
    );
  }

  if (path in patientPages) {
    return (
      <Guard role="patient">
        <PatientShell path={path}>{patientPages[path]()}</PatientShell>
      </Guard>
    );
  }

  if (path === '/clinic/overview' || path === '/clinic/activations' || path === '/clinic/patients' || path === '/clinic/appointments' || path === '/clinic/payments') {
    return (
      <Guard role="dietitian">
        <ClinicShell path={path}>
          {path === '/clinic/overview' && <ClinicOverview />}
          {path === '/clinic/activations' && <ClinicActivations />}
          {path === '/clinic/patients' && <ClinicPatients />}
          {path === '/clinic/appointments' && <ClinicAppointments />}
          {path === '/clinic/payments' && <ClinicPayments />}
        </ClinicShell>
      </Guard>
    );
  }

  const patientMatch = path.match(/^\/clinic\/patients\/([0-9a-f-]{36})$/);
  if (patientMatch) {
    return (
      <Guard role="dietitian">
        <ClinicShell path={path}>
          <ClinicPatientDetail id={patientMatch[1]} />
        </ClinicShell>
      </Guard>
    );
  }

  return <NotFound />;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes />
    </SessionProvider>
  );
}
