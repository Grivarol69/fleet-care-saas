import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Endpoint temporal para debug: muestra todas las cookies que llegan
 * Úsalo para copiar el formato correcto a Insomnia
 */
export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    message: "Cookies recibidas del navegador",
    totalCookies: allCookies.length,
    cookies: allCookies.map(c => ({
      name: c.name,
      valuePreview: c.value.substring(0, 50) + "...",
      fullValue: c.value
    })),
    // Formato para copiar a Insomnia:
    insomniaCookieHeader: allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')
  });
}
