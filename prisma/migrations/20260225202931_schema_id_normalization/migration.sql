/*
  Warnings:

  - The primary key for the `DocumentTypeConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Driver` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FinancialAlert` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MaintenanceAlert` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MaintenancePackage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MaintenanceTemplate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MantCategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MantItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MantItemRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MantItemVehiclePart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OdometerLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PackageItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Provider` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Technician` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleBrand` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleDriver` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleLine` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleMantProgram` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleProgramItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleProgramPackage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `VehicleType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `WorkOrder` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `WorkOrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_documentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseAuditLog" DROP CONSTRAINT "ExpenseAuditLog_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "FinancialAlert" DROP CONSTRAINT "FinancialAlert_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "InternalWorkTicket" DROP CONSTRAINT "InternalWorkTicket_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "InternalWorkTicket" DROP CONSTRAINT "InternalWorkTicket_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_workOrderItemId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT "MaintenanceAlert_programItemId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT "MaintenanceAlert_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT "MaintenanceAlert_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenancePackage" DROP CONSTRAINT "MaintenancePackage_templateId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey";

-- DropForeignKey
ALTER TABLE "MantItem" DROP CONSTRAINT "MantItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MantItemPart" DROP CONSTRAINT "MantItemPart_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "MantItemRequest" DROP CONSTRAINT "MantItemRequest_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MantItemVehiclePart" DROP CONSTRAINT "MantItemVehiclePart_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "MantItemVehiclePart" DROP CONSTRAINT "MantItemVehiclePart_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "MantItemVehiclePart" DROP CONSTRAINT "MantItemVehiclePart_vehicleLineId_fkey";

-- DropForeignKey
ALTER TABLE "OdometerLog" DROP CONSTRAINT "OdometerLog_driverId_fkey";

-- DropForeignKey
ALTER TABLE "OdometerLog" DROP CONSTRAINT "OdometerLog_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "PackageItem" DROP CONSTRAINT "PackageItem_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "PackageItem" DROP CONSTRAINT "PackageItem_packageId_fkey";

-- DropForeignKey
ALTER TABLE "PartPriceHistory" DROP CONSTRAINT "PartPriceHistory_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_providerId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_workOrderItemId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLaborEntry" DROP CONSTRAINT "TicketLaborEntry_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLaborEntry" DROP CONSTRAINT "TicketLaborEntry_workOrderItemId_fkey";

-- DropForeignKey
ALTER TABLE "TicketPartEntry" DROP CONSTRAINT "TicketPartEntry_workOrderItemId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_lineId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_typeId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_driverId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleLine" DROP CONSTRAINT "VehicleLine_brandId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleMantProgram" DROP CONSTRAINT "VehicleMantProgram_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramItem" DROP CONSTRAINT "VehicleProgramItem_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramItem" DROP CONSTRAINT "VehicleProgramItem_packageId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramItem" DROP CONSTRAINT "VehicleProgramItem_providerId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramItem" DROP CONSTRAINT "VehicleProgramItem_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramPackage" DROP CONSTRAINT "VehicleProgramPackage_programId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramPackage" DROP CONSTRAINT "VehicleProgramPackage_providerId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramPackage" DROP CONSTRAINT "VehicleProgramPackage_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleProgramPackage" DROP CONSTRAINT "VehicleProgramPackage_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_providerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderApproval" DROP CONSTRAINT "WorkOrderApproval_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderExpense" DROP CONSTRAINT "WorkOrderExpense_providerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderExpense" DROP CONSTRAINT "WorkOrderExpense_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItem" DROP CONSTRAINT "WorkOrderItem_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrderItem" DROP CONSTRAINT "WorkOrderItem_workOrderId_fkey";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ALTER COLUMN "documentTypeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DocumentTypeConfig" DROP CONSTRAINT "DocumentTypeConfig_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "DocumentTypeConfig_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DocumentTypeConfig_id_seq";

-- AlterTable
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Driver_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Driver_id_seq";

-- AlterTable
ALTER TABLE "ExpenseAuditLog" ALTER COLUMN "workOrderId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FinancialAlert" DROP CONSTRAINT "FinancialAlert_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ADD CONSTRAINT "FinancialAlert_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "FinancialAlert_id_seq";

-- AlterTable
ALTER TABLE "InternalWorkTicket" ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "supplierId" SET DATA TYPE TEXT,
ALTER COLUMN "workOrderId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ALTER COLUMN "workOrderItemId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT "MaintenanceAlert_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ALTER COLUMN "programItemId" SET DATA TYPE TEXT,
ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MaintenanceAlert_id_seq";

-- AlterTable
ALTER TABLE "MaintenancePackage" DROP CONSTRAINT "MaintenancePackage_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "templateId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MaintenancePackage_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MaintenancePackage_id_seq";

-- AlterTable
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleBrandId" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleLineId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MaintenanceTemplate_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MaintenanceTemplate_id_seq";

-- AlterTable
ALTER TABLE "MantCategory" DROP CONSTRAINT "MantCategory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MantCategory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MantCategory_id_seq";

-- AlterTable
ALTER TABLE "MantItem" DROP CONSTRAINT "MantItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "categoryId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MantItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MantItem_id_seq";

-- AlterTable
ALTER TABLE "MantItemPart" ALTER COLUMN "mantItemId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "MantItemRequest" DROP CONSTRAINT "MantItemRequest_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "categoryId" SET DATA TYPE TEXT,
ALTER COLUMN "createdMantItemId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MantItemRequest_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MantItemRequest_id_seq";

-- AlterTable
ALTER TABLE "MantItemVehiclePart" DROP CONSTRAINT "MantItemVehiclePart_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "mantItemId" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleBrandId" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleLineId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MantItemVehiclePart_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MantItemVehiclePart_id_seq";

-- AlterTable
ALTER TABLE "OdometerLog" DROP CONSTRAINT "OdometerLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ADD CONSTRAINT "OdometerLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OdometerLog_id_seq";

-- AlterTable
ALTER TABLE "PackageItem" DROP CONSTRAINT "PackageItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "packageId" SET DATA TYPE TEXT,
ALTER COLUMN "mantItemId" SET DATA TYPE TEXT,
ADD CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PackageItem_id_seq";

-- AlterTable
ALTER TABLE "PartPriceHistory" ALTER COLUMN "supplierId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Provider" DROP CONSTRAINT "Provider_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Provider_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Provider_id_seq";

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ALTER COLUMN "providerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "workOrderItemId" SET DATA TYPE TEXT,
ALTER COLUMN "mantItemId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Technician" DROP CONSTRAINT "Technician_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Technician_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Technician_id_seq";

-- AlterTable
ALTER TABLE "TicketLaborEntry" ALTER COLUMN "workOrderItemId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TicketPartEntry" ALTER COLUMN "workOrderItemId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "brandId" SET DATA TYPE TEXT,
ALTER COLUMN "lineId" SET DATA TYPE TEXT,
ALTER COLUMN "typeId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Vehicle_id_seq";

-- AlterTable
ALTER TABLE "VehicleBrand" DROP CONSTRAINT "VehicleBrand_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleBrand_id_seq";

-- AlterTable
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ALTER COLUMN "driverId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleDriver_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleDriver_id_seq";

-- AlterTable
ALTER TABLE "VehicleLine" DROP CONSTRAINT "VehicleLine_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "brandId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleLine_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleLine_id_seq";

-- AlterTable
ALTER TABLE "VehicleMantProgram" DROP CONSTRAINT "VehicleMantProgram_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleMantProgram_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleMantProgram_id_seq";

-- AlterTable
ALTER TABLE "VehicleProgramItem" DROP CONSTRAINT "VehicleProgramItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "packageId" SET DATA TYPE TEXT,
ALTER COLUMN "mantItemId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT,
ALTER COLUMN "providerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleProgramItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleProgramItem_id_seq";

-- AlterTable
ALTER TABLE "VehicleProgramPackage" DROP CONSTRAINT "VehicleProgramPackage_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "programId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT,
ALTER COLUMN "providerId" SET DATA TYPE TEXT,
ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleProgramPackage_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleProgramPackage_id_seq";

-- AlterTable
ALTER TABLE "VehicleType" DROP CONSTRAINT "VehicleType_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VehicleType_id_seq";

-- AlterTable
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicleId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT,
ALTER COLUMN "providerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "WorkOrder_id_seq";

-- AlterTable
ALTER TABLE "WorkOrderApproval" ALTER COLUMN "workOrderId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkOrderExpense" ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ALTER COLUMN "providerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkOrderItem" DROP CONSTRAINT "WorkOrderItem_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workOrderId" SET DATA TYPE TEXT,
ALTER COLUMN "mantItemId" SET DATA TYPE TEXT,
ADD CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "WorkOrderItem_id_seq";

-- AddForeignKey
ALTER TABLE "VehicleLine" ADD CONSTRAINT "VehicleLine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItem" ADD CONSTRAINT "MantItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemRequest" ADD CONSTRAINT "MantItemRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "MantItemPart" ADD CONSTRAINT "MantItemPart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriver" ADD CONSTRAINT "VehicleDriver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDriver" ADD CONSTRAINT "VehicleDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_programItemId_fkey" FOREIGN KEY ("programItemId") REFERENCES "VehicleProgramItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_programId_fkey" FOREIGN KEY ("programId") REFERENCES "VehicleMantProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "VehicleProgramPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkTicket" ADD CONSTRAINT "InternalWorkTicket_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkTicket" ADD CONSTRAINT "InternalWorkTicket_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPartEntry" ADD CONSTRAINT "TicketPartEntry_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
