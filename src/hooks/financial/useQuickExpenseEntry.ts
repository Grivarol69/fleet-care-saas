import { useState, useCallback, useRef } from 'react';
import { ocrService, OCRResult } from '@/lib/services/ai/ocr.service';
import { expensesService, CreateExpenseData } from '@/lib/services/expenses.service';

export interface UseQuickExpenseEntryProps {
  userId: string;
  tenantId: string;
  defaultVehicle?: Vehicle;
  enableOfflineMode?: boolean;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
}

interface ExpenseData {
  amount?: number;
  description?: string;
  vendor?: string;
  invoiceNumber?: string;
  expenseType?: 'PARTS' | 'LABOR' | 'TRANSPORT' | 'TOOLS' | 'MATERIALS' | 'OTHER';
  expenseDate?: Date;
}

interface SavedExpense {
  id: string;
  amount: number;
  description: string;
  vehicle: Vehicle;
  confidence: number;
}

export function useQuickExpenseEntry({
  userId,
  tenantId,
  defaultVehicle,
  enableOfflineMode = false,
}: UseQuickExpenseEntryProps) {
  // Estado principal
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>(defaultVehicle);
  const [expenseData, setExpenseData] = useState<ExpenseData>({});
  const [aiProcessing, setAiProcessing] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);

  // Referencias para cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Procesa imagen con OCR y extrae datos
   */
  const processImage = useCallback(async (imageBase64: string): Promise<void> => {
    setAiProcessing(true);

    try {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Procesar imagen con OCR
      const result = await ocrService.analyzeReceipt(imageBase64, {
        enhance: true,
        detectRotation: true,
        language: 'es',
        domain: 'automotive',
      });

      setOcrData(result);
      setConfidence(result.confidence);

      // Auto-llenar datos del formulario con OCR
      const autoFilledData: ExpenseData = {};

      if (result.structuredData.totalAmount) {
        autoFilledData.amount = result.structuredData.totalAmount;
      }

      if (result.structuredData.vendor?.name) {
        autoFilledData.vendor = result.structuredData.vendor.name;
      }

      if (result.structuredData.invoiceNumber) {
        autoFilledData.invoiceNumber = result.structuredData.invoiceNumber;
      }

      if (result.structuredData.date) {
        autoFilledData.expenseDate = result.structuredData.date;
      }

      // Generar descripción a partir de items detectados
      if (result.structuredData.items && result.structuredData.items.length > 0) {
        const descriptions = result.structuredData.items
          .map(item => item.description)
          .join(', ');
        autoFilledData.description = descriptions;
      }

      // Intentar categorizar automáticamente
      autoFilledData.expenseType = inferExpenseType(
        autoFilledData.description || result.extractedText
      );

      setExpenseData(autoFilledData);

    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    } finally {
      setAiProcessing(false);
    }
  }, []);

  /**
   * Selecciona vehículo para el gasto
   */
  const selectVehicle = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  }, []);

  /**
   * Actualiza datos del gasto
   */
  const updateExpenseData = useCallback((data: Partial<ExpenseData>) => {
    setExpenseData(prev => ({ ...prev, ...data }));
  }, []);

  /**
   * Guarda el gasto usando la API
   */
  const saveExpense = useCallback(async (): Promise<SavedExpense> => {
    if (!selectedVehicle || !expenseData.amount) {
      throw new Error('Vehículo y monto son requeridos');
    }

    // TODO: Crear WorkOrder automáticamente si no existe una activa para el vehículo
    const workOrderId = await getOrCreateWorkOrder(selectedVehicle.id);

    const createData: CreateExpenseData = {
      workOrderId,
      expenseType: expenseData.expenseType || 'OTHER',
      description: expenseData.description || 'Gasto registrado vía app',
      amount: expenseData.amount,
      vendor: expenseData.vendor || 'Sin especificar',
      invoiceNumber: expenseData.invoiceNumber,
      expenseDate: expenseData.expenseDate,
    };

    if (enableOfflineMode) {
      // Guardar localmente para sincronizar después
      return await saveOfflineExpense(createData, selectedVehicle);
    } else {
      // Guardar directamente via API
      const savedExpense = await expensesService.createExpense(createData);

      return {
        id: savedExpense.id,
        amount: savedExpense.amount,
        description: savedExpense.description,
        vehicle: selectedVehicle,
        confidence: confidence,
      };
    }
  }, [selectedVehicle, expenseData, confidence, enableOfflineMode]);

  /**
   * Resetea el estado para nuevo gasto
   */
  const reset = useCallback(() => {
    setOcrData(null);
    setSelectedVehicle(defaultVehicle);
    setExpenseData({});
    setConfidence(0);
    setAiProcessing(false);

    // Cancelar requests pendientes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [defaultVehicle]);

  return {
    // Estado
    ocrData,
    selectedVehicle,
    expenseData,
    aiProcessing,
    confidence,

    // Acciones
    processImage,
    selectVehicle,
    updateExpenseData,
    saveExpense,
    reset,
  };
}

/**
 * Infiere tipo de gasto basado en descripción
 */
function inferExpenseType(description: string): 'PARTS' | 'LABOR' | 'TRANSPORT' | 'TOOLS' | 'MATERIALS' | 'OTHER' {
  const text = description.toLowerCase();

  // Repuestos y partes
  if (text.includes('aceite') || text.includes('filtro') || text.includes('pastillas') ||
      text.includes('neumatico') || text.includes('bateria') || text.includes('bujia') ||
      text.includes('freno') || text.includes('llanta') || text.includes('repuesto')) {
    return 'PARTS';
  }

  // Mano de obra
  if (text.includes('mano de obra') || text.includes('instalacion') || text.includes('trabajo') ||
      text.includes('servicio') || text.includes('reparacion') || text.includes('mantenimiento')) {
    return 'LABOR';
  }

  // Transporte
  if (text.includes('transporte') || text.includes('grua') || text.includes('remolque') ||
      text.includes('combustible') || text.includes('gasolina') || text.includes('diesel')) {
    return 'TRANSPORT';
  }

  // Herramientas
  if (text.includes('herramienta') || text.includes('equipo') || text.includes('alquiler')) {
    return 'TOOLS';
  }

  // Materiales
  if (text.includes('material') || text.includes('insumo') || text.includes('consumible')) {
    return 'MATERIALS';
  }

  return 'OTHER';
}

/**
 * Obtiene o crea WorkOrder para el vehículo
 */
async function getOrCreateWorkOrder(vehicleId: number): Promise<number> {
  // TODO: Implementar lógica para buscar WorkOrder activa o crear nueva
  // Por ahora retornamos un ID mock
  return 1;
}

/**
 * Guarda gasto offline para sincronizar después
 */
async function saveOfflineExpense(
  data: CreateExpenseData,
  vehicle: Vehicle
): Promise<SavedExpense> {
  // TODO: Implementar storage offline con IndexedDB o similar
  const offlineId = `offline_${Date.now()}`;

  // Simular guardado local
  const offlineExpense = {
    ...data,
    id: offlineId,
    vehicle,
    savedAt: new Date(),
    synced: false,
  };

  // Guardar en localStorage temporalmente
  const offlineExpenses = JSON.parse(
    localStorage.getItem('fleet_care_offline_expenses') || '[]'
  );
  offlineExpenses.push(offlineExpense);
  localStorage.setItem('fleet_care_offline_expenses', JSON.stringify(offlineExpenses));

  return {
    id: offlineId,
    amount: data.amount,
    description: data.description,
    vehicle,
    confidence: 0.8, // Mock confidence para offline
  };
}