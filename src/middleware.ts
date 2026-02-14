import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Rutas públicas que NO requieren autenticación
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/uploadthing(.*)',
  '/',
]);

// Rutas de admin que NO requieren organización (solo SUPER_ADMIN)
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId, orgId } = await auth();

  // Multi-tenant subdomain detection
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Detect subdomain
  const subdomain = getSubdomain(hostname);

  // Handle tenant routing based on subdomain or orgId
  if (subdomain && subdomain !== 'www') {
    // Add tenant info to headers for use in pages/API routes
    url.searchParams.set('tenant', subdomain);

    // Rewrite to tenant-specific path
    if (url.pathname === '/') {
      url.pathname = '/tenant';
    } else if (
      !url.pathname.startsWith('/tenant') &&
      !url.pathname.startsWith('/api') &&
      !url.pathname.startsWith('/_next')
    ) {
      url.pathname = `/tenant${url.pathname}`;
    }
  } else {
    // Para localhost y staging, usar orgId de Clerk como tenant
    if (orgId) {
      url.searchParams.set('tenant', orgId);
    }
  }

  // Proteger rutas privadas
  if (!isPublicRoute(request)) {
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // /admin requiere cuenta personal (sin org) — solo SUPER_ADMIN puede acceder.
    // La verificación final del rol ocurre en getCurrentUser(), pero aquí bloqueamos
    // a cualquier usuario con org activa como primera capa de defensa.
    if (isAdminRoute(request) && orgId) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Rutas que NO requieren organización:
    // - /admin: ya verificado arriba (sin org = posible SUPER_ADMIN)
    // - /dashboard: verificación en el layout con getCurrentUser()
    // - /api: cada endpoint verifica permisos via getCurrentUser() + permissions.ts
    // - /onboarding: es la propia pagina de onboarding
    const skipOrgCheck =
      isAdminRoute(request) ||
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/onboarding');

    if (!skipOrgCheck && !orgId) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  const response = NextResponse.rewrite(url);

  // Add tenant to response headers
  if (orgId) {
    response.headers.set('x-tenant-id', orgId);
  } else if (subdomain) {
    response.headers.set('x-tenant', subdomain);
  }

  return response;
});

function getSubdomain(hostname: string): string | null {
  // For development (localhost)
  if (hostname.includes('localhost')) {
    return null; // No subdomains en localhost para MVP
  }

  // For Vercel deployments
  if (hostname.includes('vercel.app')) {
    const parts = hostname.split('.');
    // fleet-care-staging.vercel.app = 3 parts (NO subdomain)
    // tenant.fleet-care-staging.vercel.app = 4 parts (SÍ subdomain)
    if (parts.length > 3 && parts[0]) {
      return parts[0];
    }
    return null;
  }

  // For production with custom domain
  const parts = hostname.split('.');
  if (parts.length > 2 && parts[0]) {
    return parts[0];
  }

  return null;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
