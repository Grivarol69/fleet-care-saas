'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RotateCcw, Zap, ZapOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface SmartCameraCaptureProps {
  onPhotoCapture: (photo: string) => void;
  onError: (error: CameraError) => void;
  autoStart?: boolean;
  enableFlash?: boolean;
  quality: 'low' | 'medium' | 'high';
  maxRetries: number;
}

interface CameraError {
  type: 'permission_denied' | 'camera_not_found' | 'capture_failed' | 'browser_not_supported';
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

export function SmartCameraCapture({
  onPhotoCapture,
  onError,
  autoStart = true,
  enableFlash = true,
  quality = 'high',
  maxRetries = 3,
}: SmartCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Configuración de calidad
  const getQualityConfig = useCallback(() => {
    switch (quality) {
      case 'high':
        return { width: 1920, height: 1080, jpeg: 0.9 };
      case 'medium':
        return { width: 1280, height: 720, jpeg: 0.8 };
      case 'low':
        return { width: 640, height: 480, jpeg: 0.7 };
      default:
        return { width: 1280, height: 720, jpeg: 0.8 };
    }
  }, [quality]);

  // Verificar soporte del navegador
  const checkBrowserSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError({
        type: 'browser_not_supported',
        message: 'Tu navegador no soporta acceso a cámara',
        recoverable: false,
        suggestion: 'Usa Chrome, Firefox o Safari actualizado',
      });
      return false;
    }
    return true;
  }, [onError]);

  // Inicializar cámara
  const initializeCamera = useCallback(async () => {
    if (!checkBrowserSupport()) return;

    try {
      const qualityConfig = getQualityConfig();

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: qualityConfig.width },
          height: { ideal: qualityConfig.height },
          facingMode: 'environment', // Cámara trasera preferida
          focusMode: 'continuous',
          exposureMode: 'continuous',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          setHasPermission(true);
        };
      }
    } catch (error) {
      console.error('Camera initialization error:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setHasPermission(false);
        onError({
          type: 'permission_denied',
          message: 'Permiso de cámara denegado',
          recoverable: true,
          suggestion: 'Habilita el acceso a cámara en configuración del navegador',
        });
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        onError({
          type: 'camera_not_found',
          message: 'No se encontró cámara disponible',
          recoverable: false,
          suggestion: 'Conecta una cámara o usa otro dispositivo',
        });
      } else {
        onError({
          type: 'capture_failed',
          message: 'Error iniciando cámara',
          recoverable: true,
          suggestion: 'Intenta recargar la página',
        });
      }
    }
  }, [checkBrowserSupport, getQualityConfig, onError]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;

    try {
      setCapturing(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('No se pudo obtener contexto del canvas');
      }

      // Configurar canvas con tamaño del video
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Dibujar frame actual del video en canvas
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Aplicar mejoras automáticas a la imagen
      await applyImageEnhancements(context, videoWidth, videoHeight);

      // Convertir a base64 con calidad configurada
      const qualityConfig = getQualityConfig();
      const dataUrl = canvas.toDataURL('image/jpeg', qualityConfig.jpeg);

      setCapturedImage(dataUrl);

      // Enviar imagen capturada
      onPhotoCapture(dataUrl);

      // Detener cámara después de captura exitosa
      stopCamera();

    } catch (error) {
      console.error('Capture error:', error);

      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => capturePhoto(), 1000);
      } else {
        onError({
          type: 'capture_failed',
          message: 'Error capturando imagen',
          recoverable: true,
          suggestion: 'Intenta con mejor iluminación o reinicia la cámara',
        });
      }
    } finally {
      setCapturing(false);
    }
  }, [capturing, retryCount, maxRetries, onPhotoCapture, stopCamera, getQualityConfig, onError]);

  // Aplicar mejoras automáticas a la imagen
  const applyImageEnhancements = useCallback(
    async (context: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Mejorar contraste y brillo para mejor OCR
      const contrast = 1.2;
      const brightness = 10;

      for (let i = 0; i < data.length; i += 4) {
        // Aplicar contraste y brillo a RGB
        data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness)); // R
        data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // G
        data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // B
        // Alpha channel (data[i + 3]) no se modifica
      }

      context.putImageData(imageData, 0, 0);
    },
    []
  );

  // Reiniciar captura
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setRetryCount(0);
    initializeCamera();
  }, [initializeCamera]);

  // Toggle flash (si está disponible)
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashEnabled }],
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch (error) {
      console.error('Flash toggle error:', error);
    }
  }, [flashEnabled]);

  // Auto-inicializar cámara
  useEffect(() => {
    if (autoStart && !cameraActive && !capturedImage) {
      initializeCamera();
    }

    // Cleanup al desmontar
    return () => {
      stopCamera();
    };
  }, [autoStart, initializeCamera, stopCamera, cameraActive, capturedImage]);

  // Si no hay permisos, mostrar instrucciones
  if (hasPermission === false) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Necesitamos acceso a tu cámara para escanear recibos.</p>
                <p className="text-sm text-muted-foreground">
                  Habilita el permiso de cámara y recarga la página.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <Button onClick={initializeCamera} className="w-full mt-4">
            <Camera className="w-4 h-4 mr-2" />
            Intentar Nuevamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Si ya se capturó imagen, mostrar preview
  if (capturedImage) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Recibo capturado"
                className="w-full h-64 object-contain rounded-lg border"
              />
            </div>
            <Button onClick={retakePhoto} variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Tomar Nueva Foto
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Video preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />

            {/* Overlay para guía de captura */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg opacity-50" />
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Centra el recibo en el marco
              </div>
            </div>

            {/* Flash indicator */}
            {flashEnabled && (
              <div className="absolute top-4 right-4 bg-yellow-500 text-white p-1 rounded">
                <Zap className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Canvas oculto para procesamiento */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controles */}
          <div className="flex space-x-2">
            {enableFlash && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlash}
                className="flex-1"
              >
                {flashEnabled ? (
                  <Zap className="w-4 h-4 mr-2" />
                ) : (
                  <ZapOff className="w-4 h-4 mr-2" />
                )}
                Flash
              </Button>
            )}

            <Button
              onClick={capturePhoto}
              disabled={!cameraActive || capturing}
              size="lg"
              className="flex-2"
            >
              <Camera className="w-5 h-5 mr-2" />
              {capturing ? 'Capturando...' : 'Capturar Recibo'}
            </Button>
          </div>

          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Intento {retryCount} de {maxRetries}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}