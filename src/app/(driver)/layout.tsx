import type { Metadata, Viewport } from 'next';
import { BottomTabBar } from './_components/BottomTabBar';
import { OfflineIndicator } from './_components/OfflineIndicator';

export const metadata: Metadata = {
  title: 'Fleet Care · Conductor',
  description: 'Checklist pre-operacional y reporte de novedades',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FleetDriver',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1E3A5F',
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="driver-pwa min-h-screen bg-[#F1F5F9]">
      <OfflineIndicator />
      <main
        className="relative"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
