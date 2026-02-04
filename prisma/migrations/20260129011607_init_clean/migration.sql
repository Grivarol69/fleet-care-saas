-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'PURCHASER', 'TECHNICIAN', 'DRIVER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'IN_PROCESS');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD');

-- CreateEnum
CREATE TYPE "VehicleSituation" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "VehicleOwner" AS ENUM ('OWN', 'LEASED', 'RENTED');

-- CreateEnum
CREATE TYPE "PlateType" AS ENUM ('PARTICULAR', 'PUBLICO');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'GASOLINA', 'GAS', 'ELECTRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PUBLICO', 'PARTICULAR', 'OFICIAL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MantType" AS ENUM ('PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'PENDING_INVOICE', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('PARTS', 'LABOR', 'TRANSPORT', 'TOOLS', 'MATERIALS', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'MODIFIED', 'PAID', 'CANCELLED', 'COMPLETED', 'FLAGGED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON');

-- CreateEnum
CREATE TYPE "OdometerMeasureType" AS ENUM ('KILOMETERS', 'HOURS');

-- CreateEnum
CREATE TYPE "TechnicianSpecialty" AS ENUM ('MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'ELECTRONICO', 'AIRE_ACONDICIONADO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'GENERAL');

-- CreateEnum
CREATE TYPE "ProviderSpecialty" AS ENUM ('REPUESTOS', 'LUBRICANTES', 'NEUMATICOS', 'BATERIAS', 'FILTROS', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'SERVICIOS_GENERALES', 'GRUA', 'SEGUROS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PREVENTIVE', 'OVERDUE', 'EARLY_WARNING', 'PRICE_DEVIATION', 'BUDGET_OVERRUN');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('CRITICAL_SAFETY', 'MAJOR_COMPONENT', 'ROUTINE', 'MINOR');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ACTION', 'PART', 'SERVICE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OCRStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CompatibilityLevel" AS ENUM ('RECOMMENDED', 'COMPATIBLE', 'CONDITIONAL', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_SUPPLIER', 'RETURN_STOCK', 'DAMAGED', 'COUNT_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "MovementReferenceType" AS ENUM ('INVOICE', 'INTERNAL_TICKET', 'MANUAL_ADJUSTMENT', 'TRANSFER', 'PHYSICAL_COUNT');

-- CreateEnum
CREATE TYPE "InternalTicketStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemClosureType" AS ENUM ('PENDING', 'EXTERNAL_INVOICE', 'INTERNAL_TICKET', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('INTERNAL', 'CONTRACTOR', 'FREELANCE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "settings" JSONB,
    "subscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "avatar" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mercadoPagoUserId" TEXT,
    "preapprovalId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
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
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "mercadoPagoId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "PaymentStatus" NOT NULL,
    "paymentMethod" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleBrand" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLine" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "lineId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "situation" "VehicleSituation" NOT NULL DEFAULT 'AVAILABLE',
    "photo" TEXT,
    "cylinder" INTEGER,
    "bodyWork" TEXT,
    "engineNumber" TEXT,
    "chasisNumber" TEXT,
    "ownerCard" TEXT,
    "owner" "VehicleOwner" NOT NULL DEFAULT 'OWN',
    "typePlate" "PlateType" NOT NULL DEFAULT 'PARTICULAR',
    "lastKilometers" INTEGER,
    "lastRecorder" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fuelType" "FuelType",
    "serviceType" "ServiceType",
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantCategory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "MantType" NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "type" "ItemType" NOT NULL DEFAULT 'ACTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTemplate" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleBrandId" INTEGER NOT NULL,
    "vehicleLineId" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePackage" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "triggerKm" INTEGER,
    "description" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "packageType" "MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "isPattern" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedTime" DECIMAL(5,2),
    "technicalNotes" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "MantType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "creationMileage" INTEGER NOT NULL,
    "isPackageWork" BOOLEAN NOT NULL DEFAULT false,
    "packageName" TEXT,
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
CREATE TABLE "WorkOrderItem" (
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
    "closureType" "ItemClosureType" NOT NULL DEFAULT 'PENDING',
    "invoiceItemId" TEXT,
    "internalTicketEntryId" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "cost" DECIMAL(10,2),
    "executionMileage" INTEGER,
    "notes" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderExpense" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT,
    "providerId" INTEGER,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderApproval" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "approverLevel" INTEGER NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAuditLog" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
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
CREATE TABLE "MasterPart" (
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
CREATE TABLE "MantItemPart" (
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
CREATE TABLE "Invoice" (
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
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "pdfUrl" TEXT,
    "ocrStatus" "OCRStatus" NOT NULL DEFAULT 'PENDING',
    "ocrRawData" JSONB,
    "ocrConfidence" DECIMAL(5,2),
    "ocrProcessedAt" TIMESTAMP(3),
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
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
CREATE TABLE "PartPriceHistory" (
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
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
CREATE TABLE "PartCompatibility" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "masterPartId" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineType" TEXT,
    "transmission" TEXT,
    "compatibility" "CompatibilityLevel" NOT NULL DEFAULT 'COMPATIBLE',
    "notes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialty" "TechnicianSpecialty",
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'INTERNAL',
    "hourlyRate" DECIMAL(10,2),
    "location" TEXT,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "specialty" "ProviderSpecialty",
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDriver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
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
CREATE TABLE "OdometerLog" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "kilometers" INTEGER,
    "hours" INTEGER,
    "measureType" "OdometerMeasureType" NOT NULL DEFAULT 'KILOMETERS',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceAlert" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "programItemId" INTEGER NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'PREVENTIVE',
    "category" "AlertCategory" NOT NULL,
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
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "alertLevel" "AlertLevel" NOT NULL,
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
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
CREATE TABLE "FinancialAlert" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "workOrderId" INTEGER,
    "masterPartId" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertLevel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "FinancialAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "documentTypeId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentNumber" TEXT,
    "entity" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTypeConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "countryCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT true,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 30,
    "expiryCriticalDays" INTEGER NOT NULL DEFAULT 7,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMantProgram" (
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
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleProgramPackage" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKm" INTEGER,
    "packageType" "MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "actualCost" DECIMAL(10,2),
    "actualTime" DECIMAL(5,2),
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
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
CREATE TABLE "VehicleProgramItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "mantType" "MantType" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
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
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "urgency" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "description" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProgramItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL DEFAULT 'PRINCIPAL',
    "location" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "minStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxStock" DECIMAL(10,2),
    "averageCost" DECIMAL(10,2) NOT NULL,
    "totalValue" DECIMAL(10,2) NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "previousStock" DECIMAL(10,2) NOT NULL,
    "newStock" DECIMAL(10,2) NOT NULL,
    "previousAvgCost" DECIMAL(10,2) NOT NULL,
    "newAvgCost" DECIMAL(10,2) NOT NULL,
    "referenceType" "MovementReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalWorkTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "ticketDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technicianId" INTEGER NOT NULL,
    "totalLaborHours" DECIMAL(5,2) NOT NULL,
    "totalLaborCost" DECIMAL(10,2) NOT NULL,
    "totalPartsCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "status" "InternalTicketStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalWorkTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketLaborEntry" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "workOrderItemId" INTEGER,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "laborCost" DECIMAL(10,2) NOT NULL,
    "technicianId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketLaborEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPartEntry" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "workOrderItemId" INTEGER,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "inventoryMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketPartEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subscriptionId_key" ON "Tenant"("subscriptionId");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_preapprovalId_key" ON "Subscription"("preapprovalId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_mercadoPagoUserId_idx" ON "Subscription"("mercadoPagoUserId");

-- CreateIndex
CREATE INDEX "Subscription_preapprovalId_idx" ON "Subscription"("preapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mercadoPagoId_key" ON "Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_mercadoPagoId_idx" ON "Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "VehicleBrand_isGlobal_idx" ON "VehicleBrand"("isGlobal");

-- CreateIndex
CREATE INDEX "VehicleBrand_status_idx" ON "VehicleBrand"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_tenantId_name_key" ON "VehicleBrand"("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleLine_brandId_idx" ON "VehicleLine"("brandId");

-- CreateIndex
CREATE INDEX "VehicleLine_isGlobal_idx" ON "VehicleLine"("isGlobal");

-- CreateIndex
CREATE INDEX "VehicleLine_status_idx" ON "VehicleLine"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleLine_tenantId_brandId_name_key" ON "VehicleLine"("tenantId", "brandId", "name");

-- CreateIndex
CREATE INDEX "VehicleType_isGlobal_idx" ON "VehicleType"("isGlobal");

-- CreateIndex
CREATE INDEX "VehicleType_status_idx" ON "VehicleType"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_tenantId_name_key" ON "VehicleType"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_brandId_idx" ON "Vehicle"("brandId");

-- CreateIndex
CREATE INDEX "Vehicle_lineId_idx" ON "Vehicle"("lineId");

-- CreateIndex
CREATE INDEX "Vehicle_typeId_idx" ON "Vehicle"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_tenantId_licensePlate_key" ON "Vehicle"("tenantId", "licensePlate");

-- CreateIndex
CREATE INDEX "MantCategory_isGlobal_idx" ON "MantCategory"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "MantCategory_tenantId_name_key" ON "MantCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MantItem_categoryId_idx" ON "MantItem"("categoryId");

-- CreateIndex
CREATE INDEX "MantItem_type_idx" ON "MantItem"("type");

-- CreateIndex
CREATE INDEX "MantItem_isGlobal_idx" ON "MantItem"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "MantItem_tenantId_name_key" ON "MantItem"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleBrandId_idx" ON "MaintenanceTemplate"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleLineId_idx" ON "MaintenanceTemplate"("vehicleLineId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_isDefault_idx" ON "MaintenanceTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_isGlobal_idx" ON "MaintenanceTemplate"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplate_tenantId_name_key" ON "MaintenanceTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MaintenancePackage_templateId_idx" ON "MaintenancePackage"("templateId");

-- CreateIndex
CREATE INDEX "MaintenancePackage_triggerKm_idx" ON "MaintenancePackage"("triggerKm");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePackage_templateId_name_key" ON "MaintenancePackage"("templateId", "name");

-- CreateIndex
CREATE INDEX "PackageItem_packageId_idx" ON "PackageItem"("packageId");

-- CreateIndex
CREATE INDEX "PackageItem_mantItemId_idx" ON "PackageItem"("mantItemId");

-- CreateIndex
CREATE INDEX "PackageItem_triggerKm_idx" ON "PackageItem"("triggerKm");

-- CreateIndex
CREATE INDEX "PackageItem_priority_idx" ON "PackageItem"("priority");

-- CreateIndex
CREATE INDEX "PackageItem_status_idx" ON "PackageItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_packageId_mantItemId_key" ON "PackageItem"("packageId", "mantItemId");

-- CreateIndex
CREATE INDEX "WorkOrder_tenantId_idx" ON "WorkOrder"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrder_vehicleId_idx" ON "WorkOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_requestedBy_idx" ON "WorkOrder"("requestedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_authorizedBy_idx" ON "WorkOrder"("authorizedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_isPackageWork_idx" ON "WorkOrder"("isPackageWork");

-- CreateIndex
CREATE INDEX "WorkOrderItem_workOrderId_idx" ON "WorkOrderItem"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_mantItemId_idx" ON "WorkOrderItem"("mantItemId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_supplier_idx" ON "WorkOrderItem"("supplier");

-- CreateIndex
CREATE INDEX "WorkOrderItem_purchasedBy_idx" ON "WorkOrderItem"("purchasedBy");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_workOrderId_idx" ON "WorkOrderExpense"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_expenseType_idx" ON "WorkOrderExpense"("expenseType");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_vendor_idx" ON "WorkOrderExpense"("vendor");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_providerId_idx" ON "WorkOrderExpense"("providerId");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_recordedBy_idx" ON "WorkOrderExpense"("recordedBy");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_status_idx" ON "WorkOrderExpense"("status");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_workOrderId_idx" ON "WorkOrderApproval"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approverLevel_idx" ON "WorkOrderApproval"("approverLevel");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approvedBy_idx" ON "WorkOrderApproval"("approvedBy");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_status_idx" ON "WorkOrderApproval"("status");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_workOrderId_idx" ON "ExpenseAuditLog"("workOrderId");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedBy_idx" ON "ExpenseAuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedAt_idx" ON "ExpenseAuditLog"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterPart_code_key" ON "MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_category_idx" ON "MasterPart"("category");

-- CreateIndex
CREATE INDEX "MasterPart_tenantId_idx" ON "MasterPart"("tenantId");

-- CreateIndex
CREATE INDEX "MasterPart_code_idx" ON "MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_isActive_idx" ON "MasterPart"("isActive");

-- CreateIndex
CREATE INDEX "MantItemPart_mantItemId_idx" ON "MantItemPart"("mantItemId");

-- CreateIndex
CREATE INDEX "MantItemPart_masterPartId_idx" ON "MantItemPart"("masterPartId");

-- CreateIndex
CREATE UNIQUE INDEX "MantItemPart_mantItemId_masterPartId_key" ON "MantItemPart"("mantItemId", "masterPartId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_supplierId_idx" ON "Invoice"("supplierId");

-- CreateIndex
CREATE INDEX "Invoice_workOrderId_idx" ON "Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_masterPartId_idx" ON "InvoiceItem"("masterPartId");

-- CreateIndex
CREATE INDEX "InvoiceItem_workOrderItemId_idx" ON "InvoiceItem"("workOrderItemId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_masterPartId_supplierId_idx" ON "PartPriceHistory"("masterPartId", "supplierId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_tenantId_idx" ON "PartPriceHistory"("tenantId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_recordedAt_idx" ON "PartPriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "PartPriceHistory_approvedBy_idx" ON "PartPriceHistory"("approvedBy");

-- CreateIndex
CREATE INDEX "InvoicePayment_tenantId_idx" ON "InvoicePayment"("tenantId");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_paymentDate_idx" ON "InvoicePayment"("paymentDate");

-- CreateIndex
CREATE INDEX "PartCompatibility_tenantId_idx" ON "PartCompatibility"("tenantId");

-- CreateIndex
CREATE INDEX "PartCompatibility_masterPartId_idx" ON "PartCompatibility"("masterPartId");

-- CreateIndex
CREATE INDEX "PartCompatibility_brand_model_idx" ON "PartCompatibility"("brand", "model");

-- CreateIndex
CREATE INDEX "Technician_tenantId_idx" ON "Technician"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_tenantId_name_key" ON "Technician"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Provider_tenantId_idx" ON "Provider"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_tenantId_name_key" ON "Provider"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Driver_tenantId_idx" ON "Driver"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_tenantId_licenseNumber_key" ON "Driver"("tenantId", "licenseNumber");

-- CreateIndex
CREATE INDEX "VehicleDriver_tenantId_idx" ON "VehicleDriver"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleDriver_vehicleId_idx" ON "VehicleDriver"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDriver_driverId_idx" ON "VehicleDriver"("driverId");

-- CreateIndex
CREATE INDEX "VehicleDriver_status_idx" ON "VehicleDriver"("status");

-- CreateIndex
CREATE INDEX "VehicleDriver_startDate_idx" ON "VehicleDriver"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDriver_tenantId_vehicleId_driverId_key" ON "VehicleDriver"("tenantId", "vehicleId", "driverId");

-- CreateIndex
CREATE INDEX "OdometerLog_vehicleId_idx" ON "OdometerLog"("vehicleId");

-- CreateIndex
CREATE INDEX "OdometerLog_driverId_idx" ON "OdometerLog"("driverId");

-- CreateIndex
CREATE INDEX "OdometerLog_recordedAt_idx" ON "OdometerLog"("recordedAt");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_tenantId_idx" ON "MaintenanceAlert"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_vehicleId_idx" ON "MaintenanceAlert"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_programItemId_idx" ON "MaintenanceAlert"("programItemId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_status_idx" ON "MaintenanceAlert"("status");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_type_idx" ON "MaintenanceAlert"("type");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_priority_idx" ON "MaintenanceAlert"("priority");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_alertLevel_idx" ON "MaintenanceAlert"("alertLevel");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_scheduledKm_idx" ON "MaintenanceAlert"("scheduledKm");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_wasOnTime_idx" ON "MaintenanceAlert"("wasOnTime");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAlert_programItemId_status_key" ON "MaintenanceAlert"("programItemId", "status");

-- CreateIndex
CREATE INDEX "FinancialAlert_tenantId_idx" ON "FinancialAlert"("tenantId");

-- CreateIndex
CREATE INDEX "FinancialAlert_status_idx" ON "FinancialAlert"("status");

-- CreateIndex
CREATE INDEX "FinancialAlert_type_idx" ON "FinancialAlert"("type");

-- CreateIndex
CREATE INDEX "FinancialAlert_severity_idx" ON "FinancialAlert"("severity");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_vehicleId_idx" ON "Document"("vehicleId");

-- CreateIndex
CREATE INDEX "Document_documentTypeId_idx" ON "Document"("documentTypeId");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "Document"("documentNumber");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_isGlobal_idx" ON "DocumentTypeConfig"("isGlobal");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_countryCode_idx" ON "DocumentTypeConfig"("countryCode");

-- CreateIndex
CREATE INDEX "DocumentTypeConfig_status_idx" ON "DocumentTypeConfig"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTypeConfig_tenantId_code_key" ON "DocumentTypeConfig"("tenantId", "code");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_tenantId_idx" ON "VehicleMantProgram"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_vehicleId_idx" ON "VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_isActive_idx" ON "VehicleMantProgram"("isActive");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_nextMaintenanceKm_idx" ON "VehicleMantProgram"("nextMaintenanceKm");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantProgram_vehicleId_key" ON "VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_tenantId_idx" ON "VehicleProgramPackage"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_programId_idx" ON "VehicleProgramPackage"("programId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_triggerKm_idx" ON "VehicleProgramPackage"("triggerKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_status_idx" ON "VehicleProgramPackage"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_scheduledKm_idx" ON "VehicleProgramPackage"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_packageType_idx" ON "VehicleProgramPackage"("packageType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_tenantId_idx" ON "VehicleProgramItem"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_packageId_idx" ON "VehicleProgramItem"("packageId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantItemId_idx" ON "VehicleProgramItem"("mantItemId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantType_idx" ON "VehicleProgramItem"("mantType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_status_idx" ON "VehicleProgramItem"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_scheduledKm_idx" ON "VehicleProgramItem"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_urgency_idx" ON "VehicleProgramItem"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleProgramItem_packageId_mantItemId_key" ON "VehicleProgramItem"("packageId", "mantItemId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryItem_masterPartId_idx" ON "InventoryItem"("masterPartId");

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_masterPartId_warehouse_key" ON "InventoryItem"("tenantId", "masterPartId", "warehouse");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_idx" ON "InventoryMovement"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_movementType_idx" ON "InventoryMovement"("movementType");

-- CreateIndex
CREATE INDEX "InventoryMovement_performedAt_idx" ON "InventoryMovement"("performedAt");

-- CreateIndex
CREATE INDEX "InternalWorkTicket_tenantId_idx" ON "InternalWorkTicket"("tenantId");

-- CreateIndex
CREATE INDEX "InternalWorkTicket_workOrderId_idx" ON "InternalWorkTicket"("workOrderId");

-- CreateIndex
CREATE INDEX "InternalWorkTicket_technicianId_idx" ON "InternalWorkTicket"("technicianId");

-- CreateIndex
CREATE INDEX "InternalWorkTicket_status_idx" ON "InternalWorkTicket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InternalWorkTicket_tenantId_ticketNumber_key" ON "InternalWorkTicket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "TicketLaborEntry_ticketId_idx" ON "TicketLaborEntry"("ticketId");

-- CreateIndex
CREATE INDEX "TicketLaborEntry_workOrderItemId_idx" ON "TicketLaborEntry"("workOrderItemId");

-- CreateIndex
CREATE INDEX "TicketLaborEntry_technicianId_idx" ON "TicketLaborEntry"("technicianId");

-- CreateIndex
CREATE INDEX "TicketPartEntry_ticketId_idx" ON "TicketPartEntry"("ticketId");

-- CreateIndex
CREATE INDEX "TicketPartEntry_workOrderItemId_idx" ON "TicketPartEntry"("workOrderItemId");

-- CreateIndex
CREATE INDEX "TicketPartEntry_inventoryItemId_idx" ON "TicketPartEntry"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleBrand" ADD CONSTRAINT "VehicleBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLine" ADD CONSTRAINT "VehicleLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLine" ADD CONSTRAINT "VehicleLine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleType" ADD CONSTRAINT "VehicleType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantCategory" ADD CONSTRAINT "MantCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItem" ADD CONSTRAINT "MantItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItem" ADD CONSTRAINT "MantItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePackage" ADD CONSTRAINT "MaintenancePackage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MaintenancePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderExpense" ADD CONSTRAINT "WorkOrderExpense_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderExpense" ADD CONSTRAINT "WorkOrderExpense_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderApproval" ADD CONSTRAINT "WorkOrderApproval_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAuditLog" ADD CONSTRAINT "ExpenseAuditLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPart" ADD CONSTRAINT "MasterPart_alternativeFor_fkey" FOREIGN KEY ("alternativeFor") REFERENCES "MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemPart" ADD CONSTRAINT "MantItemPart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemPart" ADD CONSTRAINT "MantItemPart_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCompatibility" ADD CONSTRAINT "PartCompatibility_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriver" ADD CONSTRAINT "VehicleDriver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriver" ADD CONSTRAINT "VehicleDriver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriver" ADD CONSTRAINT "VehicleDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_programItemId_fkey" FOREIGN KEY ("programItemId") REFERENCES "VehicleProgramItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeConfig" ADD CONSTRAINT "DocumentTypeConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_programId_fkey" FOREIGN KEY ("programId") REFERENCES "VehicleMantProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "VehicleProgramPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkTicket" ADD CONSTRAINT "InternalWorkTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkTicket" ADD CONSTRAINT "InternalWorkTicket_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkTicket" ADD CONSTRAINT "InternalWorkTicket_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InternalWorkTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPartEntry" ADD CONSTRAINT "TicketPartEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InternalWorkTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPartEntry" ADD CONSTRAINT "TicketPartEntry_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPartEntry" ADD CONSTRAINT "TicketPartEntry_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
