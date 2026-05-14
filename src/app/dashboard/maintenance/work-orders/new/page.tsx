import { redirect } from 'next/navigation';

// Legacy route — redirects to the new 4-step wizard
export default function NewWorkOrderLegacyPage() {
  redirect('/dashboard/maintenance/work-orders/nueva');
}
