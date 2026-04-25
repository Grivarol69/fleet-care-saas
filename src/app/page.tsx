import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Home() {
  const { userId } = await auth();

  // Detección de dispositivo
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMobile =
    /mobile|android|iphone|ipad|ipod|blackberry|windows phone|opera mini/i.test(
      userAgent
    );

  if (isMobile) {
    if (userId) {
      redirect('/home'); // Si ya tiene sesión, va a la PWA
    }
    redirect('/home/login'); // Si no tiene sesión en celular, login nativo
  }

  if (userId) {
    redirect('/dashboard'); // Si tiene sesión en escritorio, va al dashboard
  }

  // Usuario no autenticado en escritorio → redirigir a la página de sign-in de Clerk
  redirect('/sign-in');
}
