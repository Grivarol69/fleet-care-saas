-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN', 'DRIVER');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'IN_PROCESS');

-- CreateEnum
CREATE TYPE "public"."VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD');

-- CreateEnum
CREATE TYPE "public"."VehicleSituation" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."VehicleOwner" AS ENUM ('OWN', 'LEASED', 'RENTED');

-- CreateEnum
CREATE TYPE "public"."PlateType" AS ENUM ('PARTICULAR', 'PUBLICO');

-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('DIESEL', 'GASOLINA', 'GAS', 'ELECTRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('PUBLICO', 'PARTICULAR', 'OFICIAL');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."MantType" AS ENUM ('PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExpenseType" AS ENUM ('PARTS', 'LABOR', 'TRANSPORT', 'TOOLS', 'MATERIALS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'MODIFIED', 'PAID', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."AlertLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('SOAT', 'TECNOMECANICA', 'INSURANCE', 'REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON');

-- CreateEnum
CREATE TYPE "public"."OdometerMeasureType" AS ENUM ('KILOMETERS', 'HOURS');

-- CreateEnum
CREATE TYPE "public"."TechnicianSpecialty" AS ENUM ('MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'ELECTRONICO', 'AIRE_ACONDICIONADO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."ProviderSpecialty" AS ENUM ('REPUESTOS', 'LUBRICANTES', 'NEUMATICOS', 'BATERIAS', 'FILTROS', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'SERVICIOS_GENERALES', 'GRUA', 'SEGUROS');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('SCHEDULED', 'DUE', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('PREVENTIVE', 'OVERDUE', 'EARLY_WARNING');

-- CreateEnum
CREATE TYPE "public"."AlertCategory" AS ENUM ('CRITICAL_SAFETY', 'MAJOR_COMPONENT', 'ROUTINE', 'MINOR');

-- CreateEnum
CREATE TYPE "public"."ItemType" AS ENUM ('ACTION', 'PART', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CompatibilityLevel" AS ENUM ('RECOMMENDED', 'COMPATIBLE', 'CONDITIONAL', 'INCOMPATIBLE');

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "settings" JSONB,
    "subscriptionId" TEXT,
    "subscriptionStatus" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'DRIVER',
    "avatar" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mercadoPagoUserId" TEXT,
    "preapprovalId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastPaymentId" TEXT,
    "failedPaymentAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "mercadoPagoId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "public"."PaymentStatus" NOT NULL,
    "paymentMethod" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleBrand" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleLine" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleType" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "lineId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "situation" "public"."VehicleSituation" NOT NULL DEFAULT 'AVAILABLE',
    "photo" TEXT,
    "cylinder" INTEGER,
    "bodyWork" TEXT,
    "engineNumber" TEXT,
    "chasisNumber" TEXT,
    "ownerCard" TEXT,
    "owner" "public"."VehicleOwner" NOT NULL DEFAULT 'OWN',
    "typePlate" "public"."PlateType" NOT NULL DEFAULT 'PARTICULAR',
    "lastKilometers" INTEGER,
    "lastRecorder" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fuelType" "public"."FuelType",
    "serviceType" "public"."ServiceType",
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantCategory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "public"."MantType" NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "type" "public"."ItemType" NOT NULL DEFAULT 'ACTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceTemplate" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleBrandId" INTEGER NOT NULL,
    "vehicleLineId" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenancePackage" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "packageType" "public"."MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackageItem" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedTime" DECIMAL(5,2),
    "technicalNotes" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMaintenanceMetrics" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "generatedFrom" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "assignmentKm" INTEGER NOT NULL,
    "nextMaintenanceKm" INTEGER NOT NULL,
    "nextMaintenanceDesc" TEXT,
    "totalMaintenances" INTEGER NOT NULL DEFAULT 0,
    "avgDeviationKm" INTEGER NOT NULL DEFAULT 0,
    "maintenanceScore" INTEGER NOT NULL DEFAULT 100,
    "lastScoreUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertOffsetKm" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledPackage" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageDescription" TEXT,
    "idealExecutionKm" INTEGER NOT NULL,
    "scheduledExecutionKm" INTEGER NOT NULL,
    "actualExecutionKm" INTEGER,
    "deviationKm" INTEGER,
    "onTimeExecution" BOOLEAN,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "workOrderId" INTEGER,
    "executedAt" TIMESTAMP(3),
    "alertLevel" "public"."AlertLevel" NOT NULL DEFAULT 'LOW',
    "adjustedBy" TEXT,
    "adjustmentReason" TEXT,
    "lastAlertSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrder" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "public"."MantType" NOT NULL,
    "priority" "public"."Priority" NOT NULL,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "creationMileage" INTEGER NOT NULL,
    "isPackageWork" BOOLEAN NOT NULL DEFAULT false,
    "packageName" TEXT,
    "scheduledPackageId" INTEGER,
    "requestedBy" TEXT NOT NULL,
    "authorizedBy" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "costCenter" TEXT,
    "budgetCode" TEXT,
    "plannedAmount" DECIMAL(10,2),
    "realAmount" DECIMAL(10,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderItem" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "partNumber" TEXT,
    "brand" TEXT,
    "supplier" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "purchasedBy" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "cost" DECIMAL(10,2),
    "executionMileage" INTEGER,
    "notes" TEXT,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderExpense" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "expenseType" "public"."ExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderApproval" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "approverLevel" INTEGER NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseAuditLog" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterPart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UNIDAD',
    "referencePrice" DECIMAL(10,2),
    "lastPriceUpdate" TIMESTAMP(3),
    "specifications" JSONB,
    "alternativeFor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantItemPart" (
    "id" TEXT NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItemPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "supplierId" INTEGER NOT NULL,
    "workOrderId" INTEGER,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "masterPartId" TEXT,
    "workOrderItemId" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartPriceHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT,
    "approvedBy" TEXT,
    "purchasedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartCompatibility" (
    "id" TEXT NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineType" TEXT,
    "transmission" TEXT,
    "compatibility" "public"."CompatibilityLevel" NOT NULL DEFAULT 'COMPATIBLE',
    "notes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Technician" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialty" "public"."TechnicianSpecialty",
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Provider" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "specialty" "public"."ProviderSpecialty",
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleDriver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OdometerLog" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "kilometers" INTEGER,
    "hours" INTEGER,
    "measureType" "public"."OdometerMeasureType" NOT NULL DEFAULT 'KILOMETERS',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceAlert" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "programItemId" INTEGER NOT NULL,
    "type" "public"."AlertType" NOT NULL DEFAULT 'PREVENTIVE',
    "category" "public"."AlertCategory" NOT NULL,
    "itemName" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "estimatedDuration" DECIMAL(5,2),
    "technicalNotes" TEXT,
    "recommendedParts" JSONB,
    "customNotes" TEXT,
    "scheduledKm" INTEGER NOT NULL,
    "currentKmAtCreation" INTEGER NOT NULL,
    "currentKm" INTEGER NOT NULL,
    "kmToMaintenance" INTEGER NOT NULL,
    "alertThresholdKm" INTEGER NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "alertLevel" "public"."AlertLevel" NOT NULL,
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'PENDING',
    "viewedBy" TEXT[],
    "firstViewedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "snoozeReason" TEXT,
    "snoozedBy" TEXT,
    "workOrderId" INTEGER,
    "workOrderCreatedAt" TIMESTAMP(3),
    "workOrderCreatedBy" TEXT,
    "responseTimeMinutes" INTEGER,
    "completionTimeHours" INTEGER,
    "wasOnTime" BOOLEAN,
    "actualCost" DECIMAL(10,2),
    "costVariance" DECIMAL(10,2),
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastNotificationAt" TIMESTAMP(3),
    "notes" TEXT,
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentNumber" TEXT,
    "entity" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMantProgram" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "generatedFrom" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "assignmentKm" INTEGER NOT NULL,
    "nextMaintenanceKm" INTEGER,
    "nextMaintenanceDesc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleProgramPackage" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKm" INTEGER,
    "packageType" "public"."MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "actualCost" DECIMAL(10,2),
    "actualTime" DECIMAL(5,2),
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledKm" INTEGER,
    "executedKm" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "workOrderId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProgramPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleProgramItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "mantType" "public"."MantType" NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "scheduledKm" INTEGER,
    "detectedKm" INTEGER,
    "executedKm" INTEGER,
    "scheduledDate" TIMESTAMP(3),
    "detectedDate" TIMESTAMP(3),
    "executedDate" TIMESTAMP(3),
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "actualCost" DECIMAL(10,2),
    "actualTime" DECIMAL(5,2),
    "localNotes" TEXT,
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "urgency" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "description" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProgramItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "public"."Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subscriptionId_key" ON "public"."Tenant"("subscriptionId");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "public"."Tenant"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "public"."User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "public"."User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_preapprovalId_key" ON "public"."Subscription"("preapprovalId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "public"."Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_mercadoPagoUserId_idx" ON "public"."Subscription"("mercadoPagoUserId");

-- CreateIndex
CREATE INDEX "Subscription_preapprovalId_idx" ON "public"."Subscription"("preapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mercadoPagoId_key" ON "public"."Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "public"."Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_mercadoPagoId_idx" ON "public"."Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "VehicleBrand_tenantId_idx" ON "public"."VehicleBrand"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_tenantId_name_key" ON "public"."VehicleBrand"("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleLine_tenantId_idx" ON "public"."VehicleLine"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleLine_brandId_idx" ON "public"."VehicleLine"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleLine_tenantId_brandId_name_key" ON "public"."VehicleLine"("tenantId", "brandId", "name");

-- CreateIndex
CREATE INDEX "VehicleType_tenantId_idx" ON "public"."VehicleType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_tenantId_name_key" ON "public"."VehicleType"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_idx" ON "public"."Vehicle"("tenantId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "public"."Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_brandId_idx" ON "public"."Vehicle"("brandId");

-- CreateIndex
CREATE INDEX "Vehicle_lineId_idx" ON "public"."Vehicle"("lineId");

-- CreateIndex
CREATE INDEX "Vehicle_typeId_idx" ON "public"."Vehicle"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_licensePlate_key" ON "public"."Vehicle"("tenantId", "licensePlate");

-- CreateIndex
CREATE INDEX "MantCategory_tenantId_idx" ON "public"."MantCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MantCategory_tenantId_name_key" ON "public"."MantCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MantItem_tenantId_idx" ON "public"."MantItem"("tenantId");

-- CreateIndex
CREATE INDEX "MantItem_categoryId_idx" ON "public"."MantItem"("categoryId");

-- CreateIndex
CREATE INDEX "MantItem_type_idx" ON "public"."MantItem"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MantItem_tenantId_name_key" ON "public"."MantItem"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_tenantId_idx" ON "public"."MaintenanceTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleBrandId_idx" ON "public"."MaintenanceTemplate"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleLineId_idx" ON "public"."MaintenanceTemplate"("vehicleLineId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_isDefault_idx" ON "public"."MaintenanceTemplate"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplate_tenantId_name_key" ON "public"."MaintenanceTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MaintenancePackage_templateId_idx" ON "public"."MaintenancePackage"("templateId");

-- CreateIndex
CREATE INDEX "MaintenancePackage_triggerKm_idx" ON "public"."MaintenancePackage"("triggerKm");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePackage_templateId_triggerKm_key" ON "public"."MaintenancePackage"("templateId", "triggerKm");

-- CreateIndex
CREATE INDEX "PackageItem_packageId_idx" ON "public"."PackageItem"("packageId");

-- CreateIndex
CREATE INDEX "PackageItem_mantItemId_idx" ON "public"."PackageItem"("mantItemId");

-- CreateIndex
CREATE INDEX "PackageItem_triggerKm_idx" ON "public"."PackageItem"("triggerKm");

-- CreateIndex
CREATE INDEX "PackageItem_priority_idx" ON "public"."PackageItem"("priority");

-- CreateIndex
CREATE INDEX "PackageItem_status_idx" ON "public"."PackageItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_packageId_mantItemId_key" ON "public"."PackageItem"("packageId", "mantItemId");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_tenantId_idx" ON "public"."VehicleMaintenanceMetrics"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_maintenanceScore_idx" ON "public"."VehicleMaintenanceMetrics"("maintenanceScore");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_avgDeviationKm_idx" ON "public"."VehicleMaintenanceMetrics"("avgDeviationKm");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMaintenanceMetrics_vehicleId_key" ON "public"."VehicleMaintenanceMetrics"("vehicleId");

-- CreateIndex
CREATE INDEX "ScheduledPackage_scheduleId_idx" ON "public"."ScheduledPackage"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledPackage_scheduledExecutionKm_idx" ON "public"."ScheduledPackage"("scheduledExecutionKm");

-- CreateIndex
CREATE INDEX "ScheduledPackage_alertLevel_idx" ON "public"."ScheduledPackage"("alertLevel");

-- CreateIndex
CREATE INDEX "ScheduledPackage_deviationKm_idx" ON "public"."ScheduledPackage"("deviationKm");

-- CreateIndex
CREATE INDEX "ScheduledPackage_onTimeExecution_idx" ON "public"."ScheduledPackage"("onTimeExecution");

-- CreateIndex
CREATE INDEX "WorkOrder_tenantId_idx" ON "public"."WorkOrder"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrder_vehicleId_idx" ON "public"."WorkOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "public"."WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_requestedBy_idx" ON "public"."WorkOrder"("requestedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_authorizedBy_idx" ON "public"."WorkOrder"("authorizedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_isPackageWork_idx" ON "public"."WorkOrder"("isPackageWork");

-- CreateIndex
CREATE INDEX "WorkOrderItem_workOrderId_idx" ON "public"."WorkOrderItem"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_mantItemId_idx" ON "public"."WorkOrderItem"("mantItemId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_supplier_idx" ON "public"."WorkOrderItem"("supplier");

-- CreateIndex
CREATE INDEX "WorkOrderItem_purchasedBy_idx" ON "public"."WorkOrderItem"("purchasedBy");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_workOrderId_idx" ON "public"."WorkOrderExpense"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_expenseType_idx" ON "public"."WorkOrderExpense"("expenseType");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_vendor_idx" ON "public"."WorkOrderExpense"("vendor");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_recordedBy_idx" ON "public"."WorkOrderExpense"("recordedBy");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_workOrderId_idx" ON "public"."WorkOrderApproval"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approverLevel_idx" ON "public"."WorkOrderApproval"("approverLevel");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approvedBy_idx" ON "public"."WorkOrderApproval"("approvedBy");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_status_idx" ON "public"."WorkOrderApproval"("status");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_workOrderId_idx" ON "public"."ExpenseAuditLog"("workOrderId");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedBy_idx" ON "public"."ExpenseAuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedAt_idx" ON "public"."ExpenseAuditLog"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterPart_code_key" ON "public"."MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_category_idx" ON "public"."MasterPart"("category");

-- CreateIndex
CREATE INDEX "MasterPart_tenantId_idx" ON "public"."MasterPart"("tenantId");

-- CreateIndex
CREATE INDEX "MasterPart_code_idx" ON "public"."MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_isActive_idx" ON "public"."MasterPart"("isActive");

-- CreateIndex
CREATE INDEX "MantItemPart_mantItemId_idx" ON "public"."MantItemPart"("mantItemId");

-- CreateIndex
CREATE INDEX "MantItemPart_masterPartId_idx" ON "public"."MantItemPart"("masterPartId");

-- CreateIndex
CREATE UNIQUE INDEX "MantItemPart_mantItemId_masterPartId_key" ON "public"."MantItemPart"("mantItemId", "masterPartId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "public"."Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_supplierId_idx" ON "public"."Invoice"("supplierId");

-- CreateIndex
CREATE INDEX "Invoice_workOrderId_idx" ON "public"."Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "public"."Invoice"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "public"."Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_masterPartId_idx" ON "public"."InvoiceItem"("masterPartId");

-- CreateIndex
CREATE INDEX "InvoiceItem_workOrderItemId_idx" ON "public"."InvoiceItem"("workOrderItemId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_masterPartId_supplierId_idx" ON "public"."PartPriceHistory"("masterPartId", "supplierId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_tenantId_idx" ON "public"."PartPriceHistory"("tenantId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_recordedAt_idx" ON "public"."PartPriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "PartPriceHistory_approvedBy_idx" ON "public"."PartPriceHistory"("approvedBy");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "public"."InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_paymentDate_idx" ON "public"."InvoicePayment"("paymentDate");

-- CreateIndex
CREATE INDEX "PartCompatibility_masterPartId_idx" ON "public"."PartCompatibility"("masterPartId");

-- CreateIndex
CREATE INDEX "PartCompatibility_brand_model_idx" ON "public"."PartCompatibility"("brand", "model");

-- CreateIndex
CREATE INDEX "Technician_tenantId_idx" ON "public"."Technician"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_tenantId_name_key" ON "public"."Technician"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Provider_tenantId_idx" ON "public"."Provider"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_tenantId_name_key" ON "public"."Provider"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Driver_tenantId_idx" ON "public"."Driver"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_tenantId_licenseNumber_key" ON "public"."Driver"("tenantId", "licenseNumber");

-- CreateIndex
CREATE INDEX "VehicleDriver_tenantId_idx" ON "public"."VehicleDriver"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleDriver_vehicleId_idx" ON "public"."VehicleDriver"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDriver_driverId_idx" ON "public"."VehicleDriver"("driverId");

-- CreateIndex
CREATE INDEX "VehicleDriver_status_idx" ON "public"."VehicleDriver"("status");

-- CreateIndex
CREATE INDEX "VehicleDriver_startDate_idx" ON "public"."VehicleDriver"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDriver_tenantId_vehicleId_driverId_key" ON "public"."VehicleDriver"("tenantId", "vehicleId", "driverId");

-- CreateIndex
CREATE INDEX "OdometerLog_vehicleId_idx" ON "public"."OdometerLog"("vehicleId");

-- CreateIndex
CREATE INDEX "OdometerLog_driverId_idx" ON "public"."OdometerLog"("driverId");

-- CreateIndex
CREATE INDEX "OdometerLog_recordedAt_idx" ON "public"."OdometerLog"("recordedAt");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_tenantId_idx" ON "public"."MaintenanceAlert"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_vehicleId_idx" ON "public"."MaintenanceAlert"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_programItemId_idx" ON "public"."MaintenanceAlert"("programItemId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_status_idx" ON "public"."MaintenanceAlert"("status");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_type_idx" ON "public"."MaintenanceAlert"("type");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_priority_idx" ON "public"."MaintenanceAlert"("priority");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_alertLevel_idx" ON "public"."MaintenanceAlert"("alertLevel");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_scheduledKm_idx" ON "public"."MaintenanceAlert"("scheduledKm");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_wasOnTime_idx" ON "public"."MaintenanceAlert"("wasOnTime");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAlert_programItemId_status_key" ON "public"."MaintenanceAlert"("programItemId", "status");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "public"."Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_vehicleId_idx" ON "public"."Document"("vehicleId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "public"."Document"("type");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "public"."Document"("expiryDate");

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "public"."Document"("documentNumber");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_tenantId_idx" ON "public"."VehicleMantProgram"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_vehicleId_idx" ON "public"."VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_isActive_idx" ON "public"."VehicleMantProgram"("isActive");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_nextMaintenanceKm_idx" ON "public"."VehicleMantProgram"("nextMaintenanceKm");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantProgram_vehicleId_key" ON "public"."VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_tenantId_idx" ON "public"."VehicleProgramPackage"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_programId_idx" ON "public"."VehicleProgramPackage"("programId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_triggerKm_idx" ON "public"."VehicleProgramPackage"("triggerKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_status_idx" ON "public"."VehicleProgramPackage"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_scheduledKm_idx" ON "public"."VehicleProgramPackage"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_packageType_idx" ON "public"."VehicleProgramPackage"("packageType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_tenantId_idx" ON "public"."VehicleProgramItem"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_packageId_idx" ON "public"."VehicleProgramItem"("packageId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantItemId_idx" ON "public"."VehicleProgramItem"("mantItemId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantType_idx" ON "public"."VehicleProgramItem"("mantType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_status_idx" ON "public"."VehicleProgramItem"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_scheduledKm_idx" ON "public"."VehicleProgramItem"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_urgency_idx" ON "public"."VehicleProgramItem"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleProgramItem_packageId_mantItemId_key" ON "public"."VehicleProgramItem"("packageId", "mantItemId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleBrand" ADD CONSTRAINT "VehicleBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleLine" ADD CONSTRAINT "VehicleLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleLine" ADD CONSTRAINT "VehicleLine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleType" ADD CONSTRAINT "VehicleType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "public"."VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantCategory" ADD CONSTRAINT "MantCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItem" ADD CONSTRAINT "MantItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItem" ADD CONSTRAINT "MantItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "public"."VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "public"."VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenancePackage" ADD CONSTRAINT "MaintenancePackage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."MaintenanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."MaintenancePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageItem" ADD CONSTRAINT "PackageItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMaintenanceMetrics" ADD CONSTRAINT "VehicleMaintenanceMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMaintenanceMetrics" ADD CONSTRAINT "VehicleMaintenanceMetrics_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledPackage" ADD CONSTRAINT "ScheduledPackage_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."VehicleMaintenanceMetrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledPackage" ADD CONSTRAINT "ScheduledPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderExpense" ADD CONSTRAINT "WorkOrderExpense_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderApproval" ADD CONSTRAINT "WorkOrderApproval_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseAuditLog" ADD CONSTRAINT "ExpenseAuditLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterPart" ADD CONSTRAINT "MasterPart_alternativeFor_fkey" FOREIGN KEY ("alternativeFor") REFERENCES "public"."MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItemPart" ADD CONSTRAINT "MantItemPart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItemPart" ADD CONSTRAINT "MantItemPart_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "public"."WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartCompatibility" ADD CONSTRAINT "PartCompatibility_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Technician" ADD CONSTRAINT "Technician_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provider" ADD CONSTRAINT "Provider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OdometerLog" ADD CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OdometerLog" ADD CONSTRAINT "OdometerLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_programItemId_fkey" FOREIGN KEY ("programItemId") REFERENCES "public"."VehicleProgramItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."VehicleMantProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."VehicleProgramPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

