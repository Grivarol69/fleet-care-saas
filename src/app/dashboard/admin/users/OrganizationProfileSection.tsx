'use client';

import { OrganizationProfile } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';

export function OrganizationProfileSection() {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <OrganizationProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'w-full mx-auto',
              card: 'shadow-md border border-slate-200',
              navbar: 'hidden md:flex',
              headerTitle: 'text-slate-900',
              headerSubtitle: 'text-slate-500',
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
