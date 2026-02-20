import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { currentUser } from '@clerk/nextjs/server';
import {
  extractDocumentData,
  extractInvoiceData,
} from '@/lib/ocr/claude-vision';

const f = createUploadthing();

export const ourFileRouter = {
  // Vehicle image uploader
  vehicleImageUploader: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await currentUser();
      if (!user) throw new Error('Unauthorized');

      return {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete for userId:', metadata.userId);
      console.log('File URL:', file.url);
      return { uploadedBy: metadata.userId };
    }),

  // Document uploader (SOAT, Tecnomecánica, etc.)
  documentUploader: f({
    pdf: {
      maxFileSize: '8MB',
      maxFileCount: 1,
    },
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await currentUser();
      if (!user) throw new Error('Unauthorized');

      return {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Document upload complete:', file.url);
      const ocr = await extractDocumentData(file.url);
      console.log('[OCR_DOCUMENT] confidence:', ocr.confidence);
      // Return flat primitive fields (string | number | null) to satisfy
      // UploadThing's JsonObject constraint
      return {
        uploadedBy: metadata.userId,
        ocrConfidence: ocr.confidence,
        ocrDocumentNumber: ocr.documentNumber ?? null,
        ocrEntity: ocr.entity ?? null,
        ocrIssueDate: ocr.issueDate ?? null,
        ocrExpiryDate: ocr.expiryDate ?? null,
        ocrDocumentType: ocr.documentType ?? null,
        ocrVehiclePlate: ocr.vehiclePlate ?? null,
      };
    }),

  // Invoice uploader (Facturas de compra)
  invoiceUploader: f({
    pdf: {
      maxFileSize: '8MB',
      maxFileCount: 1,
    },
    image: {
      maxFileSize: '8MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await currentUser();
      if (!user) throw new Error('Unauthorized');

      return {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Invoice upload complete:', file.url);
      const ocr = await extractInvoiceData(file.url);
      console.log('[OCR_INVOICE] confidence:', ocr.confidence);
      // Return flat primitive fields + items serialized as JSON string to
      // satisfy UploadThing's JsonObject constraint
      return {
        uploadedBy: metadata.userId,
        ocrConfidence: ocr.confidence,
        ocrInvoiceNumber: ocr.invoiceNumber ?? null,
        ocrInvoiceDate: ocr.invoiceDate ?? null,
        ocrDueDate: ocr.dueDate ?? null,
        ocrSupplierName: ocr.supplierName ?? null,
        ocrSupplierNit: ocr.supplierNit ?? null,
        ocrSubtotal: ocr.subtotal ?? null,
        ocrTaxAmount: ocr.taxAmount ?? null,
        ocrTotal: ocr.total ?? null,
        ocrItemsJson: ocr.items ? JSON.stringify(ocr.items) : null,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
