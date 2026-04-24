'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertCircle, ClipboardList, ClipboardCheck } from 'lucide-react';

const TABS = [
  { href: '/home', label: 'Inicio', icon: Home },
  { href: '/checklist', label: 'Checklist', icon: ClipboardCheck },
  { href: '/incidents/new', label: 'Novedad', icon: AlertCircle },
  { href: '/history', label: 'Historial', icon: ClipboardList },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  if (pathname === '/home/login') {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center"
      style={{
        height: 'calc(4rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: 'var(--drv-shadow-bottom-bar, 0 -2px 12px rgba(0,0,0,0.10))',
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== '/home' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative min-w-[44px]"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
            )}
            <Icon
              className={`w-6 h-6 ${active ? 'text-primary' : 'text-slate-400'}`}
              strokeWidth={active ? 2.5 : 2}
            />
            <span
              className={`text-xs font-medium ${active ? 'text-primary' : 'text-slate-400'}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
