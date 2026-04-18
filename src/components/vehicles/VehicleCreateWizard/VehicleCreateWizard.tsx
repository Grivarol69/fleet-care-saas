'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import axios from 'axios';
import {
  Car,
  ChevronLeft,
  FileText,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadButton } from '@/lib/uploadthing';
import { useToast } from '@/components/hooks/use-toast';
import { LookupSelectField } from '@/components/ui/LookupSelectField';
import { FormAddBrand } from '@/app/dashboard/vehicles/brands/components/FormAddBrand';
import { FormEditBrand } from '@/app/dashboard/vehicles/brands/components/FormEditBrand';
import { FormAddLine } from '@/app/dashboard/vehicles/lines/components/FormAddLine';
import { FormEditLine } from '@/app/dashboard/vehicles/lines/components/FormEditLine';
import { FormAddType } from '@/app/dashboard/vehicles/types/components/FormAddType';
import { FormEditType } from '@/app/dashboard/vehicles/types/components/FormEditType';
import { cn } from '@/lib/utils';

import { vehicleFormSchema, VehicleFormValues } from './VehicleCreateWizard.form';
import type {
  WizardStep,
  PropertyCardOCRData,
  VehicleBrand,
  VehicleLine,
  VehicleType,
  CostCenter,
  DocumentTypeConfig,
} from './VehicleCreateWizard.types';
import { DocumentUploadCard } from './DocumentUploadCard';
import type { DocumentOCRResult } from '@/lib/ocr/claude-vision';

// Fuzzy-match: exact → partial contains → null
function fuzzyMatch<T extends { id: string; name: string }>(
  items: T[],
  query: string | null
): T | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  const exact = items.find(i => i.name.toLowerCase() === q);
  if (exact) return exact;
  const partial = items.find(
    i => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase())
  );
  return partial ?? null;
}

const PROPERTY_CARD_CODES = [
  'TARJETA_PROPIEDAD',
  'LICENCIA_TRANSITO',
  'TARJETA_DE_PROPIEDAD',
  'PROPERTY_CARD',
];

function isPropertyCardType(code: string) {
  return PROPERTY_CARD_CODES.some(c =>
    code.toUpperCase().replace(/[-\s]/g, '_').includes(c.replace(/[-\s]/g, '_'))
  );
}

export function VehicleCreateWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<WizardStep>(1);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'finish' | 'continue'>('continue');

  // Step 1 state
  const [propertyCardUrl, setPropertyCardUrl] = useState<string | null>(null);
  const [ocr, setOcr] = useState<PropertyCardOCRData | null>(null);

  // Step 2 state
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Unmatched OCR names (for pre-populate banners)
  const [unmatchedBrand, setUnmatchedBrand] = useState<string | null>(null);
  const [unmatchedLine, setUnmatchedLine] = useState<string | null>(null);
  const [unmatchedType, setUnmatchedType] = useState<string | null>(null);

  // Step 3 state
  const [createdLicensePlate, setCreatedLicensePlate] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeConfig[]>([]);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      photo: '',
      licensePlate: '',
      typePlate: 'PARTICULAR',
      brandId: '',
      lineId: '',
      typeId: '',
      mileage: 0,
      cylinder: undefined,
      bodyWork: '',
      engineNumber: '',
      chasisNumber: '',
      ownerCard: '',
      color: '',
      owner: 'OWN',
      costCenterId: null,
      year: new Date().getFullYear(),
      situation: '',
      fuelType: null,
      serviceType: null,
    },
  });

  const watchedOwner = form.watch('owner');
  const watchedBrandId = form.watch('brandId');

  const filteredLines = vehicleLines.filter(l => l.brandId === watchedBrandId);

  // Step 1 → 2: fetch catalog + fuzzy-match
  const advanceToStep2 = useCallback(async () => {
    setIsLoadingContinue(true);
    try {
      const [brandsRes, linesRes, typesRes, ccRes] = await Promise.all([
        axios.get<VehicleBrand[]>('/api/vehicles/brands'),
        axios.get<VehicleLine[]>('/api/vehicles/lines'),
        axios.get<VehicleType[]>('/api/vehicles/types'),
        axios.get<CostCenter[]>('/api/cost-centers'),
      ]);

      const brands = brandsRes.data;
      const lines = linesRes.data;
      const types = typesRes.data;

      setVehicleBrands(brands);
      setVehicleLines(lines);
      setVehicleTypes(types);
      setCostCenters(ccRes.data);

      // Fuzzy-match
      const matchedBrand = fuzzyMatch(brands, ocr?.brandName ?? null);
      const matchedType = fuzzyMatch(types, ocr?.typeName ?? null);

      let matchedLine: VehicleLine | null = null;
      if (matchedBrand) {
        const linesForBrand = lines.filter(l => l.brandId === matchedBrand.id);
        matchedLine = fuzzyMatch(linesForBrand, ocr?.lineName ?? null);
      }

      setUnmatchedBrand(!matchedBrand && ocr?.brandName ? ocr.brandName : null);
      setUnmatchedLine(!matchedLine && ocr?.lineName ? ocr.lineName : null);
      setUnmatchedType(!matchedType && ocr?.typeName ? ocr.typeName : null);

      // Pre-fill form
      form.reset({
        photo: '',
        licensePlate: ocr?.licensePlate ?? '',
        typePlate: ocr?.serviceType === 'PUBLICO' ? 'PUBLICO' : 'PARTICULAR',
        brandId: matchedBrand?.id ?? '',
        lineId: matchedLine?.id ?? '',
        typeId: matchedType?.id ?? '',
        mileage: 0,
        cylinder: ocr?.cylinder ?? undefined,
        bodyWork: '',
        engineNumber: ocr?.engineNumber ?? '',
        chasisNumber: ocr?.chasisNumber ?? '',
        ownerCard: ocr?.ownerCard ?? '',
        color: ocr?.color ?? '',
        owner: 'OWN',
        costCenterId: null,
        year: ocr?.year ?? new Date().getFullYear(),
        situation: 'AVAILABLE',
        fuelType: ocr?.fuelType ?? null,
        serviceType: ocr?.serviceType ?? null,
      });

      setStep(2);
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del catálogo',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingContinue(false);
    }
  }, [propertyCardUrl, ocr, form, toast]);

  // Step 2 submit: create vehicle
  const onSubmitVehicle = async (values: VehicleFormValues) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...values,
        licensePlate: values.licensePlate.toUpperCase(),
        color: values.color.toUpperCase(),
        photo: values.photo || undefined,
        fuelType: values.fuelType || undefined,
        serviceType: values.serviceType || undefined,
        costCenterId: values.costCenterId || undefined,
      };
      const response = await axios.post('/api/vehicles/vehicles', payload);
      setCreatedLicensePlate(response.data.licensePlate);

      // Fetch document types for step 3
      const dtRes = await axios.get<DocumentTypeConfig[]>('/api/vehicles/document-types');
      setDocumentTypes(dtRes.data);

      toast({
        title: 'Vehículo creado',
        description: `${response.data.licensePlate} registrado exitosamente`,
      });

      if (submitMode === 'finish') {
        router.push('/dashboard/vehicles/fleet');
        return;
      }

      setStep(3);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      let description = 'No se pudo crear el vehículo';
      if (axios.isAxiosError(error) && error.response?.data) {
        description = error.response.data;
      }
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const preloadedOcrForPropertyCard: DocumentOCRResult | undefined = ocr
    ? {
        confidence: ocr.confidence,
        documentNumber: ocr.ownerCard ?? undefined,
        vehiclePlate: ocr.licensePlate ?? undefined,
      }
    : undefined;

  const stepLabels: Record<WizardStep, string> = {
    1: 'Tarjeta de Propiedad',
    2: 'Datos del Vehículo',
    3: 'Documentos',
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push('/dashboard/vehicles/fleet')}
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Flota
        </Button>
        <h1 className="text-2xl font-bold mb-2">Registrar Nuevo Vehículo</h1>
        <p className="text-muted-foreground">
          Sube la tarjeta de propiedad para pre-llenar el formulario automáticamente.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2',
                step === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : step > s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {s}
            </div>
            <span
              className={cn(
                'text-sm hidden sm:block',
                step === s ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {stepLabels[s]}
            </span>
            {i < 2 && (
              <div
                className={cn(
                  'h-px flex-1 min-w-[24px]',
                  step > s ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Upload Property Card ===== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paso 1: Subir Tarjeta de Propiedad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Sube el PDF o imagen de la Licencia de Tránsito. Claude Vision
              extraerá automáticamente los datos del vehículo.
            </p>

            {!propertyCardUrl ? (
              <UploadButton
                endpoint="propertyCardUploader"
                onClientUploadComplete={res => {
                  const uploaded = res?.[0];
                  if (!uploaded?.url) return;

                  const sd = uploaded.serverData;
                  setPropertyCardUrl(sd?.fileUrl ?? uploaded.url);

                  const confidence =
                    typeof sd?.ocrConfidence === 'number' ? sd.ocrConfidence : 0;

                  setOcr({
                    confidence,
                    licensePlate:
                      typeof sd?.ocrLicensePlate === 'string'
                        ? sd.ocrLicensePlate
                        : null,
                    brandName:
                      typeof sd?.ocrBrandName === 'string' ? sd.ocrBrandName : null,
                    lineName:
                      typeof sd?.ocrLineName === 'string' ? sd.ocrLineName : null,
                    typeName:
                      typeof sd?.ocrTypeName === 'string' ? sd.ocrTypeName : null,
                    year:
                      typeof sd?.ocrYear === 'number' ? sd.ocrYear : null,
                    color:
                      typeof sd?.ocrColor === 'string' ? sd.ocrColor : null,
                    engineNumber:
                      typeof sd?.ocrEngineNumber === 'string'
                        ? sd.ocrEngineNumber
                        : null,
                    chasisNumber:
                      typeof sd?.ocrChasisNumber === 'string'
                        ? sd.ocrChasisNumber
                        : null,
                    ownerCard:
                      typeof sd?.ocrOwnerCard === 'string' ? sd.ocrOwnerCard : null,
                    cylinder:
                      typeof sd?.ocrCylinder === 'number' ? sd.ocrCylinder : null,
                    fuelType:
                      typeof sd?.ocrFuelType === 'string'
                        ? (sd.ocrFuelType as PropertyCardOCRData['fuelType'])
                        : null,
                    serviceType:
                      typeof sd?.ocrServiceType === 'string'
                        ? (sd.ocrServiceType as PropertyCardOCRData['serviceType'])
                        : null,
                  });

                  toast({
                    title: confidence >= 40 ? 'Datos detectados' : 'Archivo subido',
                    description:
                      confidence >= 40
                        ? `OCR completado con ${confidence}% de confianza`
                        : 'El archivo se cargó correctamente',
                  });
                }}
                onUploadError={error => {
                  toast({
                    title: 'Error al subir archivo',
                    description: error.message,
                    variant: 'destructive',
                  });
                }}
                className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
              />
            ) : (
              <div className="space-y-4">
                {/* Uploaded banner */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-green-700 font-medium">
                    Tarjeta de propiedad subida correctamente
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPropertyCardUrl(null);
                      setOcr(null);
                    }}
                  >
                    Cambiar archivo
                  </Button>
                </div>

                {/* OCR Results */}
                {ocr && ocr.confidence >= 40 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 font-semibold text-blue-700 mb-3">
                      <Sparkles className="h-4 w-4" />
                      Datos detectados — {ocr.confidence}% de confianza
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-600">
                      {ocr.licensePlate && (
                        <div>
                          <span className="text-xs text-blue-500 block">Placa</span>
                          <span className="font-bold">{ocr.licensePlate}</span>
                        </div>
                      )}
                      {ocr.brandName && (
                        <div>
                          <span className="text-xs text-blue-500 block">Marca</span>
                          <span>{ocr.brandName}</span>
                        </div>
                      )}
                      {ocr.lineName && (
                        <div>
                          <span className="text-xs text-blue-500 block">Línea</span>
                          <span>{ocr.lineName}</span>
                        </div>
                      )}
                      {ocr.typeName && (
                        <div>
                          <span className="text-xs text-blue-500 block">Tipo</span>
                          <span>{ocr.typeName}</span>
                        </div>
                      )}
                      {ocr.year && (
                        <div>
                          <span className="text-xs text-blue-500 block">Año</span>
                          <span>{ocr.year}</span>
                        </div>
                      )}
                      {ocr.color && (
                        <div>
                          <span className="text-xs text-blue-500 block">Color</span>
                          <span>{ocr.color}</span>
                        </div>
                      )}
                      {ocr.fuelType && (
                        <div>
                          <span className="text-xs text-blue-500 block">Combustible</span>
                          <span>{ocr.fuelType}</span>
                        </div>
                      )}
                      {ocr.serviceType && (
                        <div>
                          <span className="text-xs text-blue-500 block">Servicio</span>
                          <span>{ocr.serviceType}</span>
                        </div>
                      )}
                      {ocr.chasisNumber && (
                        <div>
                          <span className="text-xs text-blue-500 block">Chasis</span>
                          <span className="font-mono text-xs">{ocr.chasisNumber}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-blue-500">
                      Los campos serán pre-llenados en el formulario — revisá y aprobá antes de continuar
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={isLoadingContinue}
              onClick={advanceToStep2}
            >
              Sin tarjeta de propiedad
            </Button>
            {propertyCardUrl && (
              <Button
                type="button"
                disabled={isLoadingContinue}
                onClick={advanceToStep2}
                className="gap-2"
              >
                {isLoadingContinue && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Continuar
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ===== STEP 2: Vehicle Form ===== */}
      {step === 2 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitVehicle)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Paso 2: Datos del Vehículo
                </CardTitle>
                {ocr && ocr.confidence >= 40 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Sparkles className="h-4 w-4" />
                    Campos pre-llenados con {ocr.confidence}% de confianza — revisá antes de crear
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Unmatched banners */}
                {unmatchedBrand && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <strong>Marca no encontrada:</strong> &quot;{unmatchedBrand}&quot; — Créala con el botón + en el campo Marca
                  </div>
                )}
                {unmatchedLine && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <strong>Línea no encontrada:</strong> &quot;{unmatchedLine}&quot; — Créala con el botón + en el campo Línea
                  </div>
                )}
                {unmatchedType && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    <strong>Tipo no encontrado:</strong> &quot;{unmatchedType}&quot; — Créalo con el botón + en el campo Tipo
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main fields */}
                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Placa */}
                    <FormField
                      control={form.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABC123"
                              {...field}
                              onChange={e =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo de Placa */}
                    <FormField
                      control={form.control}
                      name="typePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Placa *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PARTICULAR">Particular</SelectItem>
                              <SelectItem value="PUBLICO">Público</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Marca */}
                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca *</FormLabel>
                          <LookupSelectField<VehicleBrand>
                            label="Marca"
                            placeholder="Seleccione marca"
                            value={field.value || ''}
                            onChange={newVal => {
                              field.onChange(newVal);
                              form.setValue('lineId', '');
                            }}
                            items={vehicleBrands}
                            onItemsChange={setVehicleBrands}
                            deleteEndpoint={id => `/api/vehicles/brands/${id}`}
                            renderCreateDialog={({ isOpen, setIsOpen, onSuccess }) => (
                              <FormAddBrand
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                initialName={unmatchedBrand ?? undefined}
                                onAddBrand={brand => {
                                  onSuccess({ ...brand, isGlobal: false });
                                  setUnmatchedBrand(null);
                                }}
                              />
                            )}
                            renderEditDialog={({ item, isOpen, setIsOpen, onSuccess }) => (
                              <FormEditBrand
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                brand={item}
                                onEditBrand={brand =>
                                  onSuccess({ ...brand, isGlobal: item.isGlobal })
                                }
                              />
                            )}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Línea */}
                    <FormField
                      control={form.control}
                      name="lineId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Línea *</FormLabel>
                          <LookupSelectField<VehicleLine>
                            label="Línea"
                            placeholder={
                              watchedBrandId
                                ? 'Seleccione línea'
                                : 'Seleccione marca primero'
                            }
                            value={field.value || ''}
                            onChange={field.onChange}
                            items={filteredLines}
                            onItemsChange={updated => {
                              setVehicleLines(prev => {
                                const others = prev.filter(
                                  l => l.brandId !== watchedBrandId
                                );
                                return [...others, ...updated];
                              });
                            }}
                            disabled={!watchedBrandId}
                            deleteEndpoint={id => `/api/vehicles/lines/${id}`}
                            renderCreateDialog={({ isOpen, setIsOpen, onSuccess }) => (
                              <FormAddLine
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                initialName={unmatchedLine ?? undefined}
                                onAddLine={line => {
                                  onSuccess({
                                    id: line.id,
                                    name: line.name,
                                    brandId: line.brandId,
                                    isGlobal: false,
                                  });
                                  setUnmatchedLine(null);
                                }}
                              />
                            )}
                            renderEditDialog={({ item, isOpen, setIsOpen, onSuccess }) => (
                              <FormEditLine
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                line={item}
                                onEditLine={line =>
                                  onSuccess({
                                    id: line.id,
                                    name: line.name,
                                    brandId: line.brandId,
                                    isGlobal: item.isGlobal,
                                  })
                                }
                              />
                            )}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo */}
                    <FormField
                      control={form.control}
                      name="typeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <LookupSelectField<VehicleType>
                            label="Tipo"
                            placeholder="Seleccione tipo"
                            value={field.value || ''}
                            onChange={field.onChange}
                            items={vehicleTypes}
                            onItemsChange={setVehicleTypes}
                            deleteEndpoint={id => `/api/vehicles/types/${id}`}
                            renderCreateDialog={({ isOpen, setIsOpen, onSuccess }) => (
                              <FormAddType
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                initialName={unmatchedType ?? undefined}
                                onAddType={type => {
                                  onSuccess({ ...type, isGlobal: false });
                                  setUnmatchedType(null);
                                }}
                              />
                            )}
                            renderEditDialog={({ item, isOpen, setIsOpen, onSuccess }) => (
                              <FormEditType
                                isOpen={isOpen}
                                setIsOpen={setIsOpen}
                                type={item}
                                onEditType={type =>
                                  onSuccess({ ...type, isGlobal: item.isGlobal })
                                }
                              />
                            )}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Año */}
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Año *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2024" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Color */}
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color *</FormLabel>
                          <FormControl>
                            <Input placeholder="BLANCO" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Kilometraje */}
                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kilometraje *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Propietario */}
                    <FormField
                      control={form.control}
                      name="owner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Propietario *</FormLabel>
                          <Select
                            onValueChange={value => {
                              field.onChange(value);
                              if (value !== 'THIRD_PARTY') {
                                form.setValue('costCenterId', null);
                              }
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione propietario" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="OWN">Propio</SelectItem>
                              <SelectItem value="LEASED">Arrendado</SelectItem>
                              <SelectItem value="RENTED">Rentado</SelectItem>
                              <SelectItem value="THIRD_PARTY">Tercero (administrado)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Centro de Costos condicional */}
                    {watchedOwner === 'THIRD_PARTY' && (
                      <FormField
                        control={form.control}
                        name="costCenterId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Costos *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione centro de costos" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {costCenters.map(cc => (
                                  <SelectItem key={cc.id} value={cc.id}>
                                    {cc.code} — {cc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Estado */}
                    <FormField
                      control={form.control}
                      name="situation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AVAILABLE">Disponible</SelectItem>
                              <SelectItem value="IN_USE">En uso</SelectItem>
                              <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Combustible */}
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Combustible</FormLabel>
                          <Select
                            onValueChange={val =>
                              field.onChange(val === 'NONE' ? null : val)
                            }
                            value={field.value ?? 'NONE'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione combustible" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Sin especificar</SelectItem>
                              <SelectItem value="DIESEL">Diesel</SelectItem>
                              <SelectItem value="GASOLINA">Gasolina</SelectItem>
                              <SelectItem value="GAS">Gas</SelectItem>
                              <SelectItem value="ELECTRICO">Eléctrico</SelectItem>
                              <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cilindraje */}
                    <FormField
                      control={form.control}
                      name="cylinder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cilindraje (cc)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1600"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Número de Motor */}
                    <FormField
                      control={form.control}
                      name="engineNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Motor</FormLabel>
                          <FormControl>
                            <Input placeholder="35013031" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Número de Chasis */}
                    <FormField
                      control={form.control}
                      name="chasisNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Chasis</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="3ALHCYCS18DZ56231"
                              className="font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* N° Licencia Tránsito */}
                    <FormField
                      control={form.control}
                      name="ownerCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° Licencia de Tránsito</FormLabel>
                          <FormControl>
                            <Input placeholder="10034191247" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Carrocería */}
                    <FormField
                      control={form.control}
                      name="bodyWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carrocería</FormLabel>
                          <FormControl>
                            <Input placeholder="Sedán" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Foto del vehículo */}
                  <div className="lg:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="photo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Foto del Vehículo</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {!previewImage ? (
                                <UploadButton
                                  endpoint="vehicleImageUploader"
                                  onClientUploadComplete={res => {
                                    if (res?.[0]?.url) {
                                      setPreviewImage(res[0].url);
                                      field.onChange(res[0].url);
                                      toast({
                                        title: 'Imagen subida',
                                        description: 'La imagen se cargó correctamente',
                                      });
                                    }
                                  }}
                                  onUploadError={error => {
                                    toast({
                                      title: 'Error al subir imagen',
                                      description: error.message,
                                      variant: 'destructive',
                                    });
                                  }}
                                  className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
                                />
                              ) : (
                                <div className="relative">
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                                    <Image
                                      src={previewImage}
                                      alt="Preview"
                                      fill
                                      className="object-cover"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => {
                                        setPreviewImage(null);
                                        field.onChange('');
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-green-600 mt-2">
                                    ✓ Imagen cargada
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Atrás
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmitting}
                    className="gap-2"
                    onClick={() => setSubmitMode('finish')}
                  >
                    {isSubmitting && submitMode === 'finish' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Finalizar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2"
                    onClick={() => setSubmitMode('continue')}
                  >
                    {isSubmitting && submitMode === 'continue' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Continuar con documentos
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}

      {/* ===== STEP 3: Documents ===== */}
      {step === 3 && createdLicensePlate && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Paso 3: Documentos del Vehículo
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-base">
                  {createdLicensePlate}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Sube los documentos del vehículo (opcional — podés hacerlo después)
                </span>
              </div>
            </CardHeader>
          </Card>

          {documentTypes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentTypes.map(dt => {
                const isPropertyCard = isPropertyCardType(dt.code);
                return (
                  <DocumentUploadCard
                    key={dt.id}
                    vehiclePlate={createdLicensePlate}
                    documentType={dt}
                    preloadedUrl={
                      isPropertyCard ? (propertyCardUrl ?? undefined) : undefined
                    }
                    preloadedOcr={
                      isPropertyCard ? preloadedOcrForPropertyCard : undefined
                    }
                  />
                );
              })}
            </div>
          )}

          {documentTypes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No hay tipos de documentos configurados para tu organización.
                Puedes configurarlos en Configuración → Tipos de Documentos.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => router.push('/dashboard/vehicles/fleet')}
            >
              Finalizar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
