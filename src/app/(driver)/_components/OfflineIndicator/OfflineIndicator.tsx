'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

export function OfflineIndicator() {
  const [status, setStatus] = useState<'online' | 'offline' | 'syncing'>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [visible, setVisible] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const onOffline = () => {
      setStatus('offline');
      setVisible(true);
    };
    const onOnline = () => {
      setStatus('syncing');
      setTimeout(() => {
        setStatus('online');
        setVisible(false);
      }, 2000);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!visible) return null;

  const isSyncing = status === 'syncing';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1 text-xs font-semibold text-white transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${isSyncing ? 'bg-green-600' : 'bg-amber-500'}`}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Conectado — Sincronizando...
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          Sin conexión — los datos se guardarán localmente
        </>
      )}
    </div>
  );
}
