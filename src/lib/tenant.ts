import { prisma } from './prisma';
import { Prisma, UserRole } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';

export interface CreateTenantData {
  name: string;
  userId: string;
  userEmail: string;
  firstName?: string;
  lastName?: string;
  industryPreset?: string;
}

export const tenantService = {
  /**
   * Crear tenant automáticamente al registrarse
   */
  async createTenantForUser(data: CreateTenantData) {
    const { name, userId, userEmail, firstName, lastName, industryPreset } =
      data;

    // Generar slug único
    const slug = await this.generateUniqueSlug(name);

    // Obtener configuración del preset si existe
    const presetConfig = industryPreset
      ? this.getIndustryPreset(industryPreset)
      : null;

    try {
      // Transacción para crear tenant + usuario admin
      const result = await prisma.$transaction(async tx => {
        // 1. Crear el tenant
        const tenant = await tx.tenant.create({
          data: {
            name: name.trim(),
            slug: slug,
            billingEmail: userEmail,
            ...(presetConfig && {
              settings: {
                industrySettings: presetConfig.industrySettings,
                checklistPresets: presetConfig.checklistPresets,
                maintenancePresets: presetConfig.maintenancePresets,
              } as InputJsonValue,
            }),
          },
        });

        // 2. Crear el usuario admin
        const user = await tx.user.create({
          data: {
            id: userId,
            tenantId: tenant.id,
            email: userEmail,
            firstName: firstName || null,
            lastName: lastName || null,
            role: UserRole.OWNER, // Primer usuario es owner
          },
        });

        // 3. Crear datos iniciales del tenant
        await this.createInitialTenantData(tx, tenant.id);

        return { tenant, user };
      });

      return {
        success: true,
        tenant: result.tenant,
        user: result.user,
        slug: slug,
      };
    } catch (error) {
      console.error('Error creating tenant:', error);
      return {
        success: false,
        error: 'Error al crear la organización',
      };
    }
  },

  /**
   * Obtener tenant del usuario
   */
  async getUserTenant(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: true,
        },
      });

      if (!user || !user.tenant) {
        return { success: false, error: 'Usuario o tenant no encontrado' };
      }

      return {
        success: true,
        tenant: user.tenant,
        user: user,
      };
    } catch (error) {
      console.error('Error getting user tenant:', error);
      return { success: false, error: 'Error al obtener tenant' };
    }
  },

  /**
   * Generar slug único
   */
  async generateUniqueSlug(name: string): Promise<string> {
    // Limpiar nombre para slug
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-') // Solo letras, números y guiones
      .replace(/-+/g, '-') // Múltiples guiones → uno solo
      .replace(/^-|-$/g, '') // Quitar guiones del inicio/final
      .substring(0, 20); // Máximo 20 caracteres

    if (!baseSlug) {
      baseSlug = 'empresa';
    }

    let slug = baseSlug;
    let counter = 1;

    // Verificar que el slug sea único
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  },

  /**
   * Verificar si slug existe
   */
  async slugExists(slug: string): Promise<boolean> {
    const existing = await prisma.tenant.findUnique({
      where: { slug: slug },
    });
    return !!existing;
  },

  /**
   * Crear datos iniciales del tenant (roles, tipos base, etc.)
   */
  async createInitialTenantData(
    tx: Prisma.TransactionClient,
    tenantId: string
  ) {
    // Crear tipos de vehículos básicos
    await tx.vehicleType.createMany({
      data: [
        { tenantId, name: 'Camión' },
        { tenantId, name: 'Camioneta' },
        { tenantId, name: 'Automóvil' },
        { tenantId, name: 'Motocicleta' },
        { tenantId, name: 'Maquinaria Pesada' },
      ],
    });

    // Crear marcas básicas
    const toyotaBrand = await tx.vehicleBrand.create({
      data: { tenantId, name: 'Toyota' },
    });

    const chevroletBrand = await tx.vehicleBrand.create({
      data: { tenantId, name: 'Chevrolet' },
    });

    const fordBrand = await tx.vehicleBrand.create({
      data: { tenantId, name: 'Ford' },
    });

    // Crear líneas básicas
    await tx.vehicleLine.createMany({
      data: [
        // Toyota
        { tenantId, name: 'Hilux', brandId: toyotaBrand.id },
        { tenantId, name: 'Prado', brandId: toyotaBrand.id },
        { tenantId, name: 'Corolla', brandId: toyotaBrand.id },

        // Chevrolet
        { tenantId, name: 'D-Max', brandId: chevroletBrand.id },
        { tenantId, name: 'Captiva', brandId: chevroletBrand.id },
        { tenantId, name: 'Aveo', brandId: chevroletBrand.id },

        // Ford
        { tenantId, name: 'Ranger', brandId: fordBrand.id },
        { tenantId, name: 'Explorer', brandId: fordBrand.id },
        { tenantId, name: 'Fiesta', brandId: fordBrand.id },
      ],
    });

    // Crear técnico por defecto
    await tx.technician.create({
      data: {
        tenantId,
        name: 'Técnico General',
        phone: null,
        email: null,
        specialty: 'GENERAL',
      },
    });
  },

  /**
   * Obtener tenant por slug
   */
  async getTenantBySlug(slug: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: slug },
      });

      if (!tenant) {
        return { success: false, error: 'Tenant no encontrado' };
      }

      return { success: true, tenant };
    } catch (error) {
      console.error('Error getting tenant by slug:', error);
      return { success: false, error: 'Error al obtener tenant' };
    }
  },

  /**
   * Obtener configuración de preset por industria
   */
  getIndustryPreset(industryPreset: string) {
    const presets: Record<
      string,
      {
        businessType: string;
        industrySettings: object;
        checklistPresets: object[];
        maintenancePresets: object;
      }
    > = {
      construction: {
        businessType: 'Construcción y maquinaria pesada',
        industrySettings: {
          inspectionFrequency: 'EVERY_USE',
          maintenanceType: 'HOUR_BASED',
          maintenanceIntervals: {
            preventive: 250, // horas
            oilChange: 100,
            filters: 150,
            tires: 2000,
          },
          alertThresholds: {
            maintenance: 7,
            inspection: 2,
            costLimit: 1000000,
          },
        },
        checklistPresets: [
          {
            name: 'Inspección Pre-Uso Volqueta',
            items: [
              'Sistema hidráulico de volcado',
              'Presión neumáticos (alta carga)',
              'Frenos principales y auxiliares',
              'Luces y señalización',
              'Nivel aceite motor',
              'Nivel aceite hidráulico',
              'Estado carrocería y compuertas',
            ],
          },
        ],
        maintenancePresets: {
          vehicleTypes: [
            'Volqueta',
            'Excavadora',
            'Bulldozer',
            'Retroexcavadora',
          ],
          maintenanceCategories: [
            'Motor Pesado',
            'Sistema Hidráulico',
            'Transmisión Pesada',
          ],
        },
      },
      passenger_transport: {
        businessType: 'Transporte de pasajeros',
        industrySettings: {
          inspectionFrequency: 'DAILY',
          maintenanceType: 'KM_BASED',
          maintenanceIntervals: {
            preventive: 15000,
            oilChange: 5000,
            filters: 10000,
            tires: 40000,
          },
          alertThresholds: {
            maintenance: 3,
            inspection: 1,
            costLimit: 800000,
          },
        },
        checklistPresets: [
          {
            name: 'Inspección Diaria Bus Pasajeros',
            items: [
              'Sistema de frenos (crítico)',
              'Funcionamiento puertas',
              'Cinturones de seguridad',
              'Luces internas y externas',
              'Sistema de emergencia',
              'Asientos en buen estado',
              'Limpieza general',
            ],
          },
        ],
        maintenancePresets: {
          vehicleTypes: ['Bus', 'Microbus', 'Van Pasajeros'],
          maintenanceCategories: [
            'Frenos',
            'Seguridad Pasajeros',
            'Sistemas Eléctricos',
          ],
        },
      },
      logistics: {
        businessType: 'Logística y carga pesada',
        industrySettings: {
          inspectionFrequency: 'PRE_TRIP',
          maintenanceType: 'HYBRID',
          maintenanceIntervals: {
            preventive: 20000,
            oilChange: 8000,
            filters: 12000,
            tires: 50000,
          },
          alertThresholds: {
            maintenance: 5,
            inspection: 4,
            costLimit: 1200000,
          },
        },
        checklistPresets: [
          {
            name: 'Pre-Trip Camión Carga',
            items: [
              'Presión y estado neumáticos',
              'Sistema de frenos',
              'Luces de carretera',
              'Documentación vehicular',
              'Equipo de carretera',
              'Aseguramiento de carga',
              'Nivel combustible',
            ],
          },
        ],
        maintenancePresets: {
          vehicleTypes: ['Camión', 'Tractomula', 'Camión Articulado'],
          maintenanceCategories: [
            'Motor Diesel',
            'Transmisión Pesada',
            'Frenos Aire',
          ],
        },
      },
      rental: {
        businessType: 'Alquiler de vehículos',
        industrySettings: {
          inspectionFrequency: 'RENTAL_RETURN',
          maintenanceType: 'KM_BASED',
          maintenanceIntervals: {
            preventive: 10000,
            oilChange: 5000,
            filters: 8000,
            tires: 30000,
          },
          alertThresholds: {
            maintenance: 7,
            inspection: 1,
            costLimit: 600000,
          },
        },
        checklistPresets: [
          {
            name: 'Inspección Entrega/Devolución',
            items: [
              'Estado general carrocería',
              'Funcionamiento de luces',
              'Limpieza interior/exterior',
              'Accesorios completos',
              'Nivel combustible',
              'Documentos del vehículo',
              'Kit de herramientas',
            ],
          },
        ],
        maintenancePresets: {
          vehicleTypes: ['Camioneta', 'Automóvil', 'SUV'],
          maintenanceCategories: [
            'Mantenimiento General',
            'Estética',
            'Mecánica Básica',
          ],
        },
      },
    };

    return presets[industryPreset] || null;
  },
};
