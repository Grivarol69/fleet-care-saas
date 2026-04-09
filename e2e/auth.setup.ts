/**
 * Auth Setup — crea los archivos de sesión para OWNER y TECHNICIAN.
 *
 * Usa Sign-In Tokens de la Clerk Backend API para bypasear contraseña y 2FA.
 * Requiere .env.e2e con CLERK_SECRET_KEY, E2E_OWNER_EMAIL y E2E_TECHNICIAN_EMAIL.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const OWNER_FILE = path.join(__dirname, '../playwright/.auth/owner.json');
const TECH_FILE = path.join(__dirname, '../playwright/.auth/technician.json');

const CLERK_API = 'https://api.clerk.com/v1';

async function getUserIdByEmail(
  email: string,
  secretKey: string
): Promise<string> {
  const res = await fetch(
    `${CLERK_API}/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  if (!res.ok)
    throw new Error(`Clerk API error buscando usuario: ${res.status}`);
  const users = await res.json();
  if (!users.length)
    throw new Error(`Usuario no encontrado en Clerk: ${email}`);
  return users[0].id;
}

async function createSignInToken(
  userId: string,
  secretKey: string
): Promise<string> {
  const res = await fetch(`${CLERK_API}/sign_in_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error creando sign-in token: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  // Extraemos el __clerk_ticket de la URL de Clerk
  const clerkUrl = new URL(data.url);
  const ticket = clerkUrl.searchParams.get('__clerk_ticket');
  if (!ticket)
    throw new Error('No se encontró __clerk_ticket en la URL de Clerk');
  console.log('   ticket:', ticket.slice(0, 30) + '...');
  return ticket;
}

async function loginWithToken(
  page: import('@playwright/test').Page,
  email: string,
  saveAs: string
) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

  if (!secretKey) throw new Error('CLERK_SECRET_KEY no definido en .env.e2e');

  console.log(`🔍 Buscando usuario ${email} en Clerk...`);
  const userId = await getUserIdByEmail(email, secretKey);
  console.log(`✓ User ID: ${userId}`);

  console.log(`🔑 Creando sign-in token...`);
  const ticket = await createSignInToken(userId, secretKey);

  // Pasamos el __clerk_ticket al sign-in de la APP (no al de accounts.dev)
  // El componente <SignIn> de Clerk lo procesa automáticamente
  const appSignInUrl = `${baseUrl}/sign-in#/?__clerk_ticket=${ticket}`;
  console.log(`🌐 Navegando a sign-in de la app con ticket...`);
  await page.goto(appSignInUrl);

  // Esperar que Clerk procese el ticket y redirija al dashboard
  await page.waitForURL(/(dashboard|onboarding|select-org)/, {
    timeout: 30000,
  });

  const afterRedirect = page.url();
  console.log(`   URL tras redirect: ${afterRedirect}`);

  // Si aterrizó en onboarding (primer login) o selector de org, ir al dashboard
  if (
    afterRedirect.includes('onboarding') ||
    afterRedirect.includes('select-org')
  ) {
    await page.goto('/dashboard');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  }

  // Esperar que la app termine de cargar y establecer la sesión
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

  await page.context().storageState({ path: saveAs });
  console.log(`✅ Sesión guardada para ${email} (URL: ${page.url()})`);
}

setup('crear sesión OWNER', async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  if (!email) throw new Error('E2E_OWNER_EMAIL no definido en .env.e2e');
  await loginWithToken(page, email, OWNER_FILE);
});

setup('crear sesión TECHNICIAN', async ({ page }) => {
  const email = process.env.E2E_TECHNICIAN_EMAIL;
  if (!email) throw new Error('E2E_TECHNICIAN_EMAIL no definido en .env.e2e');
  await loginWithToken(page, email, TECH_FILE);
});
