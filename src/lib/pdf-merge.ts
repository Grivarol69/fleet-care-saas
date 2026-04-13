import { PDFDocument } from 'pdf-lib';

// A4 dimensions in points
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

type FileType = 'pdf' | 'jpeg' | 'png' | 'unknown';

/**
 * Detects file type from magic bytes — does NOT rely on Content-Type header,
 * which UploadThing often returns as application/octet-stream.
 */
function detectFileType(buffer: Buffer): FileType {
  if (buffer.length < 4) return 'unknown';

  // PDF: starts with %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  return 'unknown';
}

type Attachment = {
  buffer: Buffer;
  name: string;
};

export async function mergePdfWithAttachments(
  cvBuffer: Buffer,
  attachments: Attachment[]
): Promise<Buffer> {
  const mergedPdf = await PDFDocument.load(cvBuffer);

  for (const attachment of attachments) {
    try {
      const fileType = detectFileType(attachment.buffer);

      if (fileType === 'pdf') {
        const attachPdf = await PDFDocument.load(attachment.buffer);
        const pages = await mergedPdf.copyPages(
          attachPdf,
          attachPdf.getPageIndices()
        );
        for (const page of pages) {
          mergedPdf.addPage(page);
        }
      } else if (fileType === 'jpeg') {
        const image = await mergedPdf.embedJpg(attachment.buffer);
        const { width, height } = image.scale(1);
        const scale = Math.min(A4_WIDTH / width, A4_HEIGHT / height);
        const scaledW = width * scale;
        const scaledH = height * scale;
        const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(image, {
          x: (A4_WIDTH - scaledW) / 2,
          y: (A4_HEIGHT - scaledH) / 2,
          width: scaledW,
          height: scaledH,
        });
      } else if (fileType === 'png') {
        const image = await mergedPdf.embedPng(attachment.buffer);
        const { width, height } = image.scale(1);
        const scale = Math.min(A4_WIDTH / width, A4_HEIGHT / height);
        const scaledW = width * scale;
        const scaledH = height * scale;
        const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(image, {
          x: (A4_WIDTH - scaledW) / 2,
          y: (A4_HEIGHT - scaledH) / 2,
          width: scaledW,
          height: scaledH,
        });
      } else {
        console.warn(
          `[pdf-merge] Skipping unsupported file type for: ${attachment.name}`
        );
      }
    } catch (err) {
      console.error(`[pdf-merge] Failed to embed ${attachment.name}:`, err);
    }
  }

  return Buffer.from(await mergedPdf.save());
}
