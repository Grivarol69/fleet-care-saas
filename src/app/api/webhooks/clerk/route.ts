import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// Cache en memoria para idempotency de webhooks (previene procesamiento duplicado)
// Los svix-id se guardan por 5 minutos — suficiente para cubrir retries de Svix
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function isEventAlreadyProcessed(svixId: string): boolean {
  const timestamp = processedEvents.get(svixId);
  if (timestamp && Date.now() - timestamp < IDEMPOTENCY_TTL_MS) {
    return true;
  }
  // Limpiar entradas expiradas periódicamente (cada 100 eventos)
  if (processedEvents.size > 100) {
    const now = Date.now();
    for (const [key, ts] of processedEvents) {
      if (now - ts > IDEMPOTENCY_TTL_MS) {
        processedEvents.delete(key);
      }
    }
  }
  return false;
}

/** Mapea un rol de Clerk (org:admin, org:manager, etc.) al UserRole de Prisma */
function mapClerkRoleToDbRole(clerkRoleRaw: string): UserRole {
  const role = clerkRoleRaw.replace('org:', '');
  const mapping: Record<string, UserRole> = {
    admin: 'OWNER',
    manager: 'MANAGER',
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
  const payload = await req.json();
  const body = JSON.stringify(payload);

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

  // Idempotency: rechazar eventos ya procesados
  if (isEventAlreadyProcessed(svix_id)) {
    console.log(`[WEBHOOK] Duplicate event ${svix_id} skipped`);
    return new Response('', { status: 200 });
  }
  processedEvents.set(svix_id, Date.now());

  // Handle the event
  const eventType = evt.type;
  console.log(`[WEBHOOK] Processing ${eventType} (svix-id: ${svix_id})`);

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses[0]?.email_address;

        if (!email) {
          console.log('No email found for user', id);
          break;
        }

        // En un modelo multi-tenant donde el usuario pertenece a una organización,
        // el usuario se crea realmente cuando se une a la organización (organizationMembership.created).
        // Sin embargo, podemos actualizar sus datos básicos si ya existe en algun tenant.

        // Estrategia: Actualizar el usuario en TODOS los tenants donde exista ese email.
        // Esto es costoso pero correcto. O alternativamente, solo loguear.

        // Por ahora, actualizaremos si encontramos:
        await prisma.user.updateMany({
          where: { email },
          data: {
            firstName: first_name,
            lastName: last_name,
          },
        });
        break;
      }

      case 'organization.created':
      case 'organization.updated': {
        const { id, name, slug } = evt.data;

        await prisma.tenant.upsert({
          where: { id },
          create: {
            id,
            name,
            slug: slug || id.toLowerCase(), // Slug es opcional en Clerk, fallback al ID
            domain: slug ? `${slug}.localhost` : null, // Placeholder domain
            subscriptionStatus: 'TRIAL', // Default para nuevos
          },
          update: {
            name,
            slug: slug || id.toLowerCase(),
          },
        });
        break;
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data, role } = evt.data;
        const email = public_user_data.identifier;
        const dbRole = mapClerkRoleToDbRole(role);

        // Upsert: si el usuario fue soft-deleted previamente, lo reactiva
        await prisma.user.upsert({
          where: {
            tenantId_email: {
              tenantId: organization.id,
              email: email,
            },
          },
          create: {
            tenantId: organization.id,
            email: email,
            firstName: public_user_data.first_name,
            lastName: public_user_data.last_name,
            role: dbRole,
            isActive: true,
          },
          update: {
            role: dbRole,
            isActive: true,
          },
        });
        break;
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = evt.data;
        const email = public_user_data.identifier;
        const dbRole = mapClerkRoleToDbRole(role);

        await prisma.user.updateMany({
          where: {
            tenantId: organization.id,
            email: email,
          },
          data: {
            role: dbRole,
          },
        });
        break;
      }

      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = evt.data;
        const email = public_user_data.identifier;

        // Soft-delete: desactivar en vez de borrar para preservar audit trail
        // (facturas aprobadas, OTs creadas, etc. mantienen referencia al usuario)
        await prisma.user.updateMany({
          where: {
            tenantId: organization.id,
            email: email,
          },
          data: {
            isActive: false,
          },
        });
        break;
      }
    }
  } catch (error) {
    console.error('Error processing webhook logic:', error);
    return new Response('Error processing logic', { status: 500 });
  }

  return new Response('', { status: 200 });
}
