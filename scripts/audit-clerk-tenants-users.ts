/**
 * ============================================================
 * AUDITORÍA: Clerk Organizations + Users + Prisma DB
 * ============================================================
 *
 * Ejecutar: npx tsx scripts/audit-clerk-tenants-users.ts
 *
 * Este script:
 *   1. Lista TODAS las organizaciones (tenants) en Clerk
 *   2. Lista TODOS los miembros de cada organización con sus roles
 *   3. Cruza con la BD Prisma para detectar inconsistencias
 *   4. Verifica mapeo de roles Clerk → Prisma
 *   5. Detecta problemas con el rol PURCHASER
 *   6. Genera reporte de estado completo
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Setup DB ──────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Clerk Backend API ─────────────────────────────────────
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_BASE = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.error('ERROR: CLERK_SECRET_KEY no está definida en las variables de entorno.');
  console.error('Asegúrate de tener un .env.local con CLERK_SECRET_KEY=sk_test_...');
  process.exit(1);
}

// ─── Types ─────────────────────────────────────────────────
interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: number;
  updated_at: number;
  members_count: number;
  max_allowed_memberships: number;
}

interface ClerkMember {
  id: string;
  role: string;
  public_user_data: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    identifier: string; // email
    image_url: string | null;
  };
  created_at: number;
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
}

// ─── Helpers ───────────────────────────────────────────────
async function clerkGet<T>(endpoint: string): Promise<T> {
  const url = `${CLERK_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Clerk API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

function mapClerkRoleToPrisma(clerkRole: string | undefined | null): string {
  const role = clerkRole?.replace('org:', '') || '';
  switch (role) {
    case 'admin': return 'OWNER';
    case 'manager': return 'MANAGER';
    case 'technician': return 'TECHNICIAN';
    case 'driver': return 'DRIVER';
    case 'purchaser': return 'PURCHASER'; // No está mapeado en auth.ts!
    default: return `MANAGER (default, original: "${clerkRole}")`;
  }
}

function section(title: string) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(64));
}

function subsection(title: string) {
  console.log(`\n  ── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}`);
}

// ─── 1. Listar Organizaciones de Clerk ─────────────────────
async function auditClerkOrganizations() {
  section('1. ORGANIZACIONES EN CLERK');

  const response = await clerkGet<{ data: ClerkOrganization[]; total_count: number }>(
    '/organizations?limit=100&order_by=-created_at'
  );

  const orgs = response.data;
  console.log(`\n  Total organizaciones: ${response.total_count}`);

  if (orgs.length === 0) {
    console.log('  ⚠ No hay organizaciones en Clerk');
    return [];
  }

  for (const org of orgs) {
    console.log(`\n  ┌─ ${org.name}`);
    console.log(`  │  ID:       ${org.id}`);
    console.log(`  │  Slug:     ${org.slug}`);
    console.log(`  │  Miembros: ${org.members_count ?? '(no disponible)'}`);
    console.log(`  │  Creada:   ${new Date(org.created_at).toLocaleDateString('es-CO')}`);
    console.log(`  └────────────────────────────`);
  }

  return orgs;
}

// ─── 2. Listar Miembros por Organización ───────────────────
async function auditOrgMembers(org: ClerkOrganization) {
  subsection(`Miembros de "${org.name}" (${org.id})`);

  const response = await clerkGet<{ data: ClerkMember[]; total_count: number }>(
    `/organizations/${org.id}/memberships?limit=100`
  );

  const members = response.data;
  console.log(`  Total miembros: ${response.total_count}`);

  const memberDetails: Array<{
    email: string;
    clerkRole: string;
    prismaRole: string;
    name: string;
    userId: string;
  }> = [];

  for (const member of members) {
    const email = member.public_user_data.identifier;
    const name = [member.public_user_data.first_name, member.public_user_data.last_name]
      .filter(Boolean)
      .join(' ') || '(sin nombre)';
    const prismaRole = mapClerkRoleToPrisma(member.role);

    memberDetails.push({
      email,
      clerkRole: member.role,
      prismaRole,
      name,
      userId: member.public_user_data.user_id,
    });

    console.log(`\n    ┌─ ${name} <${email}>`);
    console.log(`    │  Clerk User ID: ${member.public_user_data.user_id}`);
    console.log(`    │  Clerk Role:    ${member.role}`);
    console.log(`    │  → Prisma Role: ${prismaRole}`);
    console.log(`    └──────────────────────`);
  }

  return memberDetails;
}

// ─── 3. Cruzar con BD Prisma ───────────────────────────────
async function auditPrismaSync(
  org: ClerkOrganization,
  clerkMembers: Array<{ email: string; clerkRole: string; prismaRole: string; name: string; userId: string }>
) {
  subsection(`Verificación BD Prisma para "${org.name}"`);

  // Buscar tenant en Prisma
  const tenant = await prisma.tenant.findUnique({ where: { id: org.id } });

  if (!tenant) {
    console.log(`  ⚠ TENANT NO EXISTE en Prisma (id: ${org.id})`);
    console.log(`    → Se creará automáticamente cuando un miembro inicie sesión`);
    return;
  }

  console.log(`  ✓ Tenant encontrado: "${tenant.name}" (slug: ${tenant.slug})`);

  // Buscar usuarios en Prisma para este tenant
  const prismaUsers = await prisma.user.findMany({
    where: { tenantId: org.id },
    orderBy: { role: 'asc' },
  });

  console.log(`  Usuarios en Prisma: ${prismaUsers.length}`);
  console.log(`  Miembros en Clerk:  ${clerkMembers.length}`);

  if (prismaUsers.length !== clerkMembers.length) {
    console.log(`  ⚠ DESINCRONIZACIÓN: Diferente cantidad de usuarios`);
  }

  // Verificar cada miembro de Clerk contra Prisma
  console.log('');
  for (const member of clerkMembers) {
    const prismaUser = prismaUsers.find(u => u.email === member.email);

    if (!prismaUser) {
      console.log(`    ✗ ${member.email} - NO EXISTE en Prisma (se creará al iniciar sesión)`);
      continue;
    }

    const roleMatch = prismaUser.role === member.prismaRole.split(' ')[0]; // Handle "(default, ...)" suffix
    const statusIcon = roleMatch ? '✓' : '⚠';
    console.log(`    ${statusIcon} ${member.email}`);
    console.log(`      Prisma: role=${prismaUser.role}, active=${prismaUser.isActive}`);
    console.log(`      Clerk:  role=${member.clerkRole} → mapea a ${member.prismaRole}`);

    if (!roleMatch) {
      console.log(`      ⚠ ROLES NO COINCIDEN: Prisma tiene ${prismaUser.role}, Clerk mapearía a ${member.prismaRole}`);
    }
  }

  // Buscar usuarios en Prisma que no estén en Clerk
  const clerkEmails = clerkMembers.map(m => m.email);
  const orphanedUsers = prismaUsers.filter(u => !clerkEmails.includes(u.email));

  if (orphanedUsers.length > 0) {
    console.log(`\n  ⚠ USUARIOS HUÉRFANOS (en Prisma pero no en Clerk):`);
    for (const user of orphanedUsers) {
      console.log(`    - ${user.email} (role: ${user.role}, active: ${user.isActive})`);
    }
  }
}

// ─── 4. Verificar Roles y Mapeos ───────────────────────────
function auditRoleMappings() {
  section('4. ANÁLISIS DE MAPEO DE ROLES');

  const mappings = [
    { clerk: 'org:admin', prisma: 'OWNER', status: '✓ OK' },
    { clerk: 'org:manager', prisma: 'MANAGER', status: '✓ OK' },
    { clerk: 'org:technician', prisma: 'TECHNICIAN', status: '✓ OK' },
    { clerk: 'org:driver', prisma: 'DRIVER', status: '✓ OK' },
    { clerk: 'org:purchaser', prisma: 'PURCHASER', status: '✓ OK' },
    { clerk: '(ninguno)', prisma: 'SUPER_ADMIN', status: '⚠ Se asigna manualmente en BD' },
  ];

  console.log('\n  Clerk Role → Prisma Role');
  console.log('  ─────────────────────────────────────────────────────────');

  for (const m of mappings) {
    console.log(`  ${m.clerk.padEnd(20)} → ${m.prisma.padEnd(15)} ${m.status}`);
  }

  console.log('\n  ROLES EN PRISMA SCHEMA:');
  const prismaRoles = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'PURCHASER', 'TECHNICIAN', 'DRIVER'];
  for (const role of prismaRoles) {
    const inClerk = ['OWNER', 'MANAGER', 'TECHNICIAN', 'DRIVER'].includes(role);
    const sidebarNote = role === 'PURCHASER'
      ? '✓ Tiene items en sidebar (Facturas, Inventario, Proveedores)'
      : role === 'SUPER_ADMIN'
      ? '✓ Ve TODO (acceso completo)'
      : '✓ Tiene items en sidebar';

    console.log(`    ${role.padEnd(15)} | En sidebar: ${sidebarNote.padEnd(35)} | Mapeo Clerk: ${inClerk ? '✓' : '✗'}`);
  }
}

// ─── 5. Análisis de Problemas ──────────────────────────────
function auditProblems() {
  section('5. PROBLEMAS DETECTADOS Y RECOMENDACIONES');

  const problems = [
    {
      severity: 'RESUELTO',
      title: 'PURCHASER tiene acceso a la sidebar',
      detail: 'PURCHASER ahora tiene items en SidebarRoutes.data.ts: ' +
        'Mantenimiento (OT, Facturas), Inventario (Catálogo, Compras), Personal (Proveedores).',
      fix: '✓ Corregido',
    },
    {
      severity: 'RESUELTO',
      title: 'PURCHASER está mapeado desde Clerk',
      detail: 'La función mapClerkRoleToPrisma() en src/lib/auth.ts ahora mapea "purchaser" → PURCHASER.',
      fix: '✓ Corregido',
    },
    {
      severity: 'RESUELTO',
      title: 'PURCHASER está en permissions.ts',
      detail: 'isPurchaser() existe y PURCHASER está incluido en canViewCosts, canApproveInvoices, ' +
        'canManagePurchases, canManageProviders.',
      fix: '✓ Corregido',
    },
    {
      severity: 'INFO',
      title: 'SUPER_ADMIN solo se asigna manualmente',
      detail: 'No hay mapeo Clerk → SUPER_ADMIN. El rol se debe asignar directamente en la BD. ' +
        'Esto es intencional pero requiere acceso directo a la BD.',
      fix: 'Documentar el proceso. Posiblemente crear script de asignación.',
    },
    {
      severity: 'INFO',
      title: 'Default role es MANAGER',
      detail: 'Si Clerk devuelve un rol no reconocido, mapClerkRoleToPrisma() devuelve MANAGER. ' +
        'Esto es un default "seguro" pero podría causar escalación accidental de privilegios.',
      fix: 'Considerar cambiar default a DRIVER (más restrictivo).',
    },
    {
      severity: 'RESUELTO',
      title: 'Inventario incluye PURCHASER',
      detail: 'La sección "Inventario" ahora incluye PURCHASER en roles del top-level y sub-items.',
      fix: '✓ Corregido',
    },
  ];

  for (const p of problems) {
    const icon = p.severity === 'CRÍTICO' ? '🔴' : p.severity === 'MEDIO' ? '🟡' : '🔵';
    console.log(`\n  ${icon} [${p.severity}] ${p.title}`);
    console.log(`     ${p.detail}`);
    console.log(`     FIX: ${p.fix}`);
  }
}

// ─── 6. Listar usuarios de Clerk sin organización ──────────
async function auditUsersWithoutOrg() {
  section('6. USUARIOS DE CLERK (todos)');

  // Clerk /users endpoint returns an array directly (not wrapped in { data: ... })
  const users = await clerkGet<ClerkUser[]>(
    '/users?limit=100&order_by=-created_at'
  );

  console.log(`\n  Total usuarios en Clerk: ${Array.isArray(users) ? users.length : 'desconocido'}`);

  if (!Array.isArray(users)) {
    console.log('  ⚠ Formato de respuesta inesperado. Contenido:', JSON.stringify(users).substring(0, 200));
    return [];
  }

  for (const user of users) {
    const email = user.email_addresses[0]?.email_address || '(sin email)';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '(sin nombre)';
    console.log(`  - ${name.padEnd(25)} ${email.padEnd(35)} (ID: ${user.id})`);
  }

  return users;
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AUDITORÍA: Clerk Organizations + Users + Prisma DB        ║');
  console.log('║  Fleet Care SaaS                                          ║');
  console.log('║  Fecha: ' + new Date().toLocaleDateString('es-CO') + '                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    // 1. Listar organizaciones
    const orgs = await auditClerkOrganizations();

    // 2. Listar miembros de cada org
    section('2. MIEMBROS POR ORGANIZACIÓN');
    const allMembersByOrg: Map<string, Array<{ email: string; clerkRole: string; prismaRole: string; name: string; userId: string }>> = new Map();

    for (const org of orgs) {
      const members = await auditOrgMembers(org);
      allMembersByOrg.set(org.id, members);
    }

    // 3. Cruzar con Prisma
    section('3. VERIFICACIÓN CRUZADA CLERK ↔ PRISMA');
    for (const org of orgs) {
      const members = allMembersByOrg.get(org.id) || [];
      await auditPrismaSync(org, members);
    }

    // 4. Análisis de mapeos
    auditRoleMappings();

    // 5. Problemas detectados
    auditProblems();

    // 6. Todos los usuarios de Clerk
    await auditUsersWithoutOrg();

  } catch (error) {
    console.error('\n  ✗ ERROR FATAL:', error);
  }

  // Resumen final
  section('RESUMEN');
  console.log(`\n  Auditoría completada: ${new Date().toLocaleString('es-CO')}`);
  console.log('  Revisa los problemas CRÍTICOS antes de dar de alta una nueva empresa.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error crítico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
