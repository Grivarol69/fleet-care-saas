import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// Limpia registros de idempotencia con más de 7 días (Svix no reintenta después de 3 días)
const IDEMPOTENCY_CLEANUP_DAYS = 7;

/** Mapea un rol de Clerk (org:admin, org:manager, etc.) al UserRole de Prisma */
function mapClerkRoleToDbRole(clerkRoleRaw: string): UserRole {
  const role = clerkRoleRaw.replace('org:', '');
  const mapping: Record<string, UserRole> = {
    admin: 'OWNER',
    owner: 'OWNER', // Soporte para rol personalizado 'org:owner'
    manager: 'MANAGER',
    coordinator: 'COORDINATOR',
    technician: 'TECHNICIAN',
    purchaser: 'PURCHASER',
    driver: 'DRIVER',
  };
  return mapping[role] ?? 'DRIVER';
}

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Idempotency via DB: garantiza que múltiples instancias serverless
  // no procesen el mismo evento. Svix usa el mismo svix-id en retries.
  try {
    await prisma.processedWebhookEvent.create({ data: { svixId: svix_id } });
  } catch {
    // Unique constraint violation = evento ya procesado por otra instancia
    console.log(`[WEBHOOK] Duplicate event ${svix_id} skipped`);
    return new Response('', { status: 200 });
  }

  // Handle the event
  const eventType = evt.type;
  console.log(`[WEBHOOK] Processing ${eventType} (svix-id: ${svix_id})`);

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses[0]?.email_address;
        console.log(`[WEBHOOK] User event for ${email} (ID: ${id})`);

        if (!email) {
          console.log('[WEBHOOK] No email found for user', id);
          break;
        }

        const updatedCount = await prisma.user.updateMany({
          where: { email },
          data: {
            firstName: first_name,
            lastName: last_name,
          },
        });
        console.log(
          `[WEBHOOK] Updated ${updatedCount.count} user records for email ${email}`
        );
        break;
      }

      case 'organization.created':
      case 'organization.updated': {
        const { id, name, slug } = evt.data;
        console.log(`[WEBHOOK] Organization event for ${name} (ID: ${id})`);

        const tenant = await prisma.tenant.upsert({
          where: { id },
          create: {
            id,
            name,
            slug: slug || id.toLowerCase(),
            domain: slug ? `${slug}.localhost` : null,
            subscriptionStatus: 'TRIAL',
            onboardingStatus: 'PENDING',
          },
          update: {
            name,
            slug: slug || id.toLowerCase(),
          },
        });
        console.log(`[WEBHOOK] Tenant upserted: ${tenant.id}`);
        break;
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data, role } = evt.data;
        const email = public_user_data.identifier;
        const dbRole = mapClerkRoleToDbRole(role);
        console.log(
          `[WEBHOOK] Membership created for ${email} in org ${organization.id} as ${dbRole}`
        );

        if (!email) {
          console.error(
            '[WEBHOOK] No email (identifier) found in public_user_data'
          );
          break;
        }

        // Garantizar que el Tenant existe antes del User (FK constraint).
        // Puede ocurrir que organization.created haya fallado o llegue después.
        await prisma.tenant.upsert({
          where: { id: organization.id },
          create: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug || organization.id.toLowerCase(),
            subscriptionStatus: 'TRIAL',
            onboardingStatus: 'PENDING',
          },
          update: {},
        });

        const user = await prisma.user.upsert({
          where: {
            tenantId_email: {
              tenantId: organization.id,
              email: email,
            },
          },
          create: {
            id: public_user_data.user_id, // Usar el ID de Clerk para consistencia completa
            tenantId: organization.id,
            email: email,
            firstName: public_user_data.first_name || 'Usuario',
            lastName: public_user_data.last_name || 'Invitado',
            role: dbRole,
            isActive: true,
          },
          update: {
            role: dbRole,
            isActive: true,
            // Podríamos actualizar el id aquí si queremos forzarlo,
            // pero Prisma no recomienda cambiar IDs en upsert/update.
          },
        });
        console.log(`[WEBHOOK] User upserted via membership: ${user.id}`);
        break;
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = evt.data;
        const email = public_user_data.identifier;
        const dbRole = mapClerkRoleToDbRole(role);

        const updated = await prisma.user.updateMany({
          where: {
            tenantId: organization.id,
            email: email,
          },
          data: {
            role: dbRole,
          },
        });
        console.log(
          `[WEBHOOK] Membership updated for ${email} (${updated.count} records)`
        );
        break;
      }

      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = evt.data;
        const email = public_user_data.identifier;

        const updated = await prisma.user.updateMany({
          where: {
            tenantId: organization.id,
            email: email,
          },
          data: {
            isActive: false,
          },
        });
        console.log(
          `[WEBHOOK] Membership deleted (soft) for ${email} (${updated.count} records)`
        );
        break;
      }
    }
  } catch (error: any) {
    console.error('[WEBHOOK ERROR] Error processing webhook logic:', error);
    // Log detailed error info
    return new Response(`Error processing logic: ${error.message}`, {
      status: 500,
    });
  }

  // Limpieza asíncrona de registros viejos (no bloquea la respuesta)
  prisma.processedWebhookEvent
    .deleteMany({
      where: {
        processedAt: {
          lt: new Date(
            Date.now() - IDEMPOTENCY_CLEANUP_DAYS * 24 * 60 * 60 * 1000
          ),
        },
      },
    })
    .catch(err => console.warn('[WEBHOOK] Cleanup error (non-critical):', err));

  return new Response('', { status: 200 });
}
