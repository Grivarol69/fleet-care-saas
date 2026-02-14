import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  // Usuario no autenticado → redirigir a la página de sign-in de Clerk
  redirect('/sign-in');
}
