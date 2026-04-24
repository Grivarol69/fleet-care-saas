'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { LogOut } from 'lucide-react';

const TIMEOUT_MS = 30 * 60 * 1000;
const LOGOUT_EXEMPT = ['/home/login', '/home/checkin'];
const GATE_EXEMPT = ['/home/login', '/home/checkin', '/checklist'];

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateChecked = useRef(false);

  const doLogout = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await signOut();
    router.push('/home/login');
  }, [signOut, router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doLogout, TIMEOUT_MS);
  }, [doLogout]);

  // Auto-logout timer
  useEffect(() => {
    const events = ['pointermove', 'keydown', 'touchstart'] as const;
    const handleVisibility = () => {
      if (!document.hidden) resetTimer();
    };

    resetTimer();
    events.forEach(e =>
      window.addEventListener(e, resetTimer, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [resetTimer]);

  // Preoperatorio gate — run once per mount, skip on exempt paths
  useEffect(() => {
    const isGateExempt = GATE_EXEMPT.some(
      p =>
        pathname === p ||
        pathname.startsWith(p + '/') ||
        pathname.startsWith(p + '?')
    );
    if (isGateExempt || gateChecked.current) return;
    gateChecked.current = true;

    fetch('/api/driver/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        if (!data.vehicle) {
          router.replace('/home/checkin');
          return;
        }
        if (!data.checklistToday) {
          router.replace('/checklist?from=gate');
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  const isLogoutExempt = LOGOUT_EXEMPT.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  return (
    <>
      {!isLogoutExempt && (
        <div className="fixed top-2 right-2 z-50">
          <button
            onClick={doLogout}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-600 bg-white/80 rounded-lg shadow-sm border border-slate-100 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      )}
      {children}
    </>
  );
}
