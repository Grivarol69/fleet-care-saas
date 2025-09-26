'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Camera, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { SmartCameraCapture } from './SmartCameraCapture';
import { SmartVehicleSelector } from './SmartVehicleSelector';
import { SmartExpenseInput } from './SmartExpenseInput';
import { OneClickSave } from './OneClickSave';
import { useQuickExpenseEntry } from '@/hooks/financial/useQuickExpenseEntry';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface QuickExpenseEntryProps {
  userId: string;
  tenantId: string;
  defaultVehicle?: Vehicle;
  onExpenseSaved?: (expense: SavedExpense) => void;
  onError?: (error: ExpenseError) => void;
  enableOfflineMode?: boolean;
  autoFocus?: boolean;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
}

interface SavedExpense {
  id: string;
  amount: number;
  description: string;
  vehicle: Vehicle;
  confidence: number;
}

interface ExpenseError {
  type: 'ocr_failed' | 'validation_failed' | 'save_failed' | 'network_error';
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

type QuickExpenseStep = 'camera' | 'processing' | 'review' | 'saving' | 'completed';

export function QuickExpenseEntry({
  userId,
  tenantId,
  defaultVehicle,
  onExpenseSaved,
  onError,
  enableOfflineMode = false,
  autoFocus = true,
}: QuickExpenseEntryProps) {
  const [step, setStep] = useState<QuickExpenseStep>('camera');
  const [errors, setErrors] = useState<ExpenseError[]>([]);

  const {
    ocrData,
    selectedVehicle,
    expenseData,
    aiProcessing,
    confidence,
    processImage,
    selectVehicle,
    updateExpenseData,
    saveExpense,
    reset,
  } = useQuickExpenseEntry({
    userId,
    tenantId,
    defaultVehicle,
    enableOfflineMode,
  });

  const handlePhotoCapture = useCallback(
    async (photoBase64: string) => {
      try {
        setStep('processing');
        setErrors([]);

        await processImage(photoBase64);

        // Si el OCR fue exitoso, pasar a revisión
        if (ocrData && ocrData.confidence > 0.7) {
          setStep('review');
        } else {
          // Si confidence es baja, permitir edición manual
          setStep('review');
          setErrors([{
            type: 'ocr_failed',
            message: 'No pudimos leer el recibo completamente',
            recoverable: true,
            suggestion: 'Puedes editar los datos manualmente'
          }]);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setErrors([{
          type: 'ocr_failed',
          message: 'Error procesando la imagen',
          recoverable: true,
          suggestion: 'Intenta tomar otra foto o ingresa los datos manualmente'
        }]);
        setStep('review');
      }
    },
    [processImage, ocrData]
  );

  const handleVehicleSelect = useCallback(
    (vehicle: Vehicle) => {
      selectVehicle(vehicle);
    },
    [selectVehicle]
  );

  const handleExpenseUpdate = useCallback(
    (data: any) => {
      updateExpenseData(data);
    },
    [updateExpenseData]
  );

  const handleSave = useCallback(
    async () => {
      try {
        setStep('saving');
        setErrors([]);

        const savedExpense = await saveExpense();

        setStep('completed');
        onExpenseSaved?.(savedExpense);

        // Auto-reset después de 3 segundos para siguiente gasto
        setTimeout(() => {
          reset();
          setStep('camera');
        }, 3000);

      } catch (error) {
        console.error('Error saving expense:', error);
        setErrors([{
          type: 'save_failed',
          message: 'Error guardando el gasto',
          recoverable: true,
          suggestion: 'Verifica tu conexión e intenta nuevamente'
        }]);
        setStep('review');
        onError?.({
          type: 'save_failed',
          message: error.message,
          recoverable: true,
        });
      }
    },
    [saveExpense, onExpenseSaved, onError, reset]
  );

  const handleRetakePhoto = useCallback(() => {
    reset();
    setStep('camera');
    setErrors([]);
  }, [reset]);

  const renderStepIndicator = () => (
    <div className="flex items-center space-x-2 mb-6">
      <div className={`flex items-center space-x-1 ${step === 'camera' ? 'text-blue-600' : 'text-gray-400'}`}>
        <Camera className="w-4 h-4" />
        <span className="text-sm">Foto</span>
      </div>
      <div className="w-8 h-px bg-gray-300" />
      <div className={`flex items-center space-x-1 ${step === 'processing' ? 'text-blue-600' : step === 'review' || step === 'saving' || step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm">Procesando</span>
      </div>
      <div className="w-8 h-px bg-gray-300" />
      <div className={`flex items-center space-x-1 ${['review', 'saving', 'completed'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
        <DollarSign className="w-4 h-4" />
        <span className="text-sm">Revisar</span>
      </div>
      <div className="w-8 h-px bg-gray-300" />
      <div className={`flex items-center space-x-1 ${step === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">Completado</span>
      </div>
    </div>
  );

  const renderErrors = () => {
    if (errors.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        {errors.map((error, index) => (
          <Alert key={index} variant={error.recoverable ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div>{error.message}</div>
              {error.suggestion && (
                <div className="text-sm text-muted-foreground mt-1">
                  {error.suggestion}
                </div>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  const renderConfidenceIndicator = () => {
    if (!confidence || step === 'camera') return null;

    const getConfidenceColor = (conf: number) => {
      if (conf >= 0.8) return 'bg-green-500';
      if (conf >= 0.6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    const getConfidenceText = (conf: number) => {
      if (conf >= 0.8) return 'Alta confianza';
      if (conf >= 0.6) return 'Confianza media';
      return 'Baja confianza';
    };

    return (
      <div className="flex items-center space-x-2 mb-4">
        <Badge variant="outline" className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getConfidenceColor(confidence)}`} />
          <span className="text-xs">
            {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
          </span>
        </Badge>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span>Registro Rápido de Gastos</span>
        </CardTitle>
        {renderStepIndicator()}
        {renderConfidenceIndicator()}
      </CardHeader>

      <CardContent className="space-y-6">
        {renderErrors()}

        {/* PASO 1: CAPTURA DE IMAGEN */}
        {step === 'camera' && (
          <SmartCameraCapture
            onPhotoCapture={handlePhotoCapture}
            onError={(error) => setErrors([error])}
            autoStart={autoFocus}
            enableFlash={true}
            quality="high"
            maxRetries={3}
          />
        )}

        {/* PASO 2: PROCESAMIENTO */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground mt-4">
              {aiProcessing ? 'IA leyendo recibo...' : 'Procesando imagen...'}
            </p>
          </div>
        )}

        {/* PASO 3: REVISIÓN Y EDICIÓN */}
        {step === 'review' && (
          <div className="space-y-6">
            <SmartVehicleSelector
              suggestions={[]} // TODO: Implementar sugerencias IA
              onVehicleSelect={handleVehicleSelect}
              selectedVehicle={selectedVehicle}
              maxSuggestions={3}
              showConfidence={true}
            />

            <SmartExpenseInput
              ocrData={ocrData}
              onExpenseChange={handleExpenseUpdate}
              expenseData={expenseData}
              enableAIValidation={true}
              enablePriceOptimization={true}
              showMarketComparison={true}
            />

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleRetakePhoto}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Nueva Foto
              </Button>

              <OneClickSave
                expenseData={expenseData}
                selectedVehicle={selectedVehicle}
                onSave={handleSave}
                disabled={!expenseData?.amount || !selectedVehicle}
                showApprovalPreview={true}
                enableOptimisticSave={enableOfflineMode}
                className="flex-2"
              />
            </div>
          </div>
        )}

        {/* PASO 4: GUARDANDO */}
        {step === 'saving' && (
          <div className="flex flex-col items-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground mt-4">
              Guardando gasto...
            </p>
          </div>
        )}

        {/* PASO 5: COMPLETADO */}
        {step === 'completed' && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              ¡Gasto guardado exitosamente!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {expenseData?.amount && (
                <>
                  ${expenseData.amount.toLocaleString()} registrado para{' '}
                  {selectedVehicle?.licensePlate}
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Preparando para siguiente registro...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}