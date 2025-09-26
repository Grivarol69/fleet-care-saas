/**
 * Servicio OCR para procesar imágenes de recibos
 * Estructura preparada para integración con Google Vision API
 */

export interface OCRResult {
  confidence: number;
  processingTime: number;
  extractedText: string;
  structuredData: {
    totalAmount?: number;
    currency?: string;
    vendor?: VendorData;
    date?: Date;
    invoiceNumber?: string;
    items?: ItemData[];
    tax?: TaxData;
  };
  boundingBoxes: BoundingBox[];
  qualityScore: number;
  suggestedCorrections?: Correction[];
}

export interface VendorData {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
}

export interface ItemData {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  partNumber?: string;
}

export interface TaxData {
  taxAmount?: number;
  taxRate?: number;
  subtotal?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface Correction {
  field: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number;
  reason: string;
}

export interface OCROptions {
  enhance: boolean;
  detectRotation: boolean;
  multipleReceipts: boolean;
  language: 'es' | 'en';
  domain: 'automotive' | 'general';
}

export interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  quality: number;
  rotationApplied?: number;
}

class OCRService {
  private isConfigured = false;

  constructor() {
    // Verificar si las variables de entorno están configuradas
    this.checkConfiguration();
  }

  private checkConfiguration(): void {
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
    ];

    const missing = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missing.length > 0) {
      console.warn(
        `OCR Service: Missing environment variables: ${missing.join(', ')}`
      );
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }
  }

  /**
   * Procesa una imagen de recibo y extrae datos estructurados
   */
  async analyzeReceipt(
    imageBase64: string,
    options: Partial<OCROptions> = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // 1. Pre-procesar imagen
      const processedImage = await this.preprocessImage(imageBase64, options);

      // 2. Extraer texto (mock por ahora, real con Google Vision después)
      const extractedText = await this.extractText(processedImage, options);

      // 3. Procesar texto para datos estructurados
      const structuredData = await this.parseStructuredData(extractedText, options);

      // 4. Validar y enriquecer
      const validatedData = await this.validateAndEnrich(structuredData);

      // 5. Calcular confidence score
      const confidence = this.calculateConfidence(extractedText, validatedData);

      return {
        confidence,
        processingTime: Date.now() - startTime,
        extractedText,
        structuredData: validatedData,
        boundingBoxes: [], // Se llenará con Google Vision
        qualityScore: processedImage.quality,
        suggestedCorrections: [],
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`Error procesando recibo: ${error.message}`);
    }
  }

  /**
   * Pre-procesa la imagen para mejorar accuracy del OCR
   */
  private async preprocessImage(
    imageBase64: string,
    options: Partial<OCROptions> = {}
  ): Promise<ProcessedImage> {
    // TODO: Implementar mejoras de imagen
    // - Detectar y corregir rotación
    // - Ajustar contraste y brillo
    // - Reducir ruido
    // - Recortar bordes irrelevantes

    // Por ahora, mock básico
    return {
      base64: imageBase64,
      width: 800, // Mock
      height: 1200, // Mock
      quality: 0.85, // Mock
    };
  }

  /**
   * Extrae texto de la imagen procesada
   */
  private async extractText(
    processedImage: ProcessedImage,
    options: Partial<OCROptions> = {}
  ): Promise<string> {
    if (!this.isConfigured) {
      // Mock data para desarrollo sin Google Vision
      return this.getMockExtractedText();
    }

    // TODO: Integrar con Google Cloud Document AI
    // const client = new DocumentProcessorServiceClient();
    // const request = {
    //   name: `projects/${PROJECT_ID}/locations/us/processors/${PROCESSOR_ID}`,
    //   rawDocument: {
    //     content: processedImage.base64,
    //     mimeType: 'image/jpeg',
    //   },
    // };
    // const [result] = await client.processDocument(request);
    // return result.document.text;

    return this.getMockExtractedText();
  }

  /**
   * Parsea texto extraído a datos estructurados
   */
  private async parseStructuredData(
    extractedText: string,
    options: Partial<OCROptions> = {}
  ): Promise<OCRResult['structuredData']> {
    // Regex patterns para extraer datos específicos de recibos automotrices
    const patterns = {
      totalAmount: /(?:total|valor|importe)[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/gi,
      vendor: /(?:empresa|proveedor|taller)[:\s]*([^\n\r]+)/gi,
      date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
      invoiceNumber: /(?:factura|recibo|no\.?)[:\s]*([a-z0-9\-]+)/gi,
      items: /(?:aceite|filtro|pastillas|frenos|neumatico|bateria|bujia)[^\n\r]*/gi,
    };

    const result: OCRResult['structuredData'] = {};

    // Extraer monto total
    const totalMatch = patterns.totalAmount.exec(extractedText);
    if (totalMatch) {
      result.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
      result.currency = 'COP'; // Asumir pesos colombianos por defecto
    }

    // Extraer vendor
    const vendorMatch = patterns.vendor.exec(extractedText);
    if (vendorMatch) {
      result.vendor = {
        name: vendorMatch[1].trim(),
      };
    }

    // Extraer fecha
    const dateMatch = patterns.date.exec(extractedText);
    if (dateMatch) {
      result.date = this.parseDate(dateMatch[1]);
    }

    // Extraer número de factura
    const invoiceMatch = patterns.invoiceNumber.exec(extractedText);
    if (invoiceMatch) {
      result.invoiceNumber = invoiceMatch[1];
    }

    // Extraer items
    const itemMatches = extractedText.match(patterns.items);
    if (itemMatches) {
      result.items = itemMatches.map((item) => ({
        description: item.trim(),
        quantity: 1, // Por defecto
      }));
    }

    return result;
  }

  /**
   * Valida y enriquece los datos extraídos
   */
  private async validateAndEnrich(
    structuredData: OCRResult['structuredData']
  ): Promise<OCRResult['structuredData']> {
    // TODO: Implementar validaciones
    // - Validar que suma de items = total declarado
    // - Enriquecer con data de proveedores conocidos
    // - Normalizar nombres de productos
    // - Detectar inconsistencias temporales

    return structuredData;
  }

  /**
   * Calcula confidence score basado en los datos extraídos
   */
  private calculateConfidence(
    extractedText: string,
    structuredData: OCRResult['structuredData']
  ): number {
    let confidence = 0;

    // Factores que aumentan confidence
    if (structuredData.totalAmount) confidence += 0.3;
    if (structuredData.vendor?.name) confidence += 0.2;
    if (structuredData.date) confidence += 0.2;
    if (structuredData.invoiceNumber) confidence += 0.1;
    if (structuredData.items && structuredData.items.length > 0) confidence += 0.2;

    // Penalizar si el texto es muy corto o muy largo
    const textLength = extractedText.length;
    if (textLength < 50) confidence *= 0.5;
    if (textLength > 5000) confidence *= 0.8;

    return Math.min(confidence, 1.0);
  }

  /**
   * Convierte string de fecha a Date object
   */
  private parseDate(dateString: string): Date {
    // Intentar diferentes formatos comunes
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
        const year = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
    }

    // Fallback: intentar parse directo
    return new Date(dateString);
  }

  /**
   * Retorna texto mock para desarrollo sin Google Vision
   */
  private getMockExtractedText(): string {
    return `
      REPUESTOS DÍAZ S.A.S
      NIT: 900123456-7
      Calle 45 #12-34, Medellín
      Tel: (4) 123-4567

      FACTURA DE VENTA No. RD-2024-1234
      Fecha: 23/09/2024

      Cliente: EMPRESA TRANSPORTES XYZ
      Vehículo: ABC-123

      DETALLE:
      Aceite motor 15W40 x 4 litros    $85,000
      Filtro aceite Mann W610/3        $35,000
      Mano de obra cambio aceite       $30,000

      SUBTOTAL:                        $150,000
      IVA 19%:                         $28,500
      TOTAL:                           $178,500

      ¡Gracias por su compra!
    `;
  }

  /**
   * Valida que el servicio esté configurado correctamente
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Retorna información de configuración
   */
  getConfigurationStatus(): {
    configured: boolean;
    missingEnvVars: string[];
  } {
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
    ];

    const missing = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    return {
      configured: missing.length === 0,
      missingEnvVars: missing,
    };
  }
}

// Singleton instance
export const ocrService = new OCRService();
export default ocrService;