'use client';

import { useEffect, useState, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Send,
} from 'lucide-react';

// Schema para creación directa (OWNER/MANAGER)
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  description: z.string().optional(),
  mantType: z.enum(['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'], {
    required_error: 'Debe seleccionar un tipo de mantenimiento',
  }),
  categoryId: z.string().min(1).min(1, {
    message: 'Debe seleccionar una categoría',
  }),
  type: z.enum(['ACTION', 'PART', 'SERVICE']).default('ACTION'),
  justification: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MantCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SimilarItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  mantType: string;
  isGlobal: boolean;
  category: { id: string; name: string };
  score: number;
}

interface MantItemResponse {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  categoryId: string;
  type: 'ACTION' | 'PART' | 'SERVICE';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
}

type Step = 'search' | 'form';

// Roles que pueden crear directamente
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER'];

export interface FormAddMantItemProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddMantItem: (mantItem: MantItemResponse) => void;
}

export function FormAddMantItem({
  isOpen,
  setIsOpen,
  onAddMantItem,
}: FormAddMantItemProps) {
  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [mantCategories, setMantCategories] = useState<MantCategory[]>([]);

  // Búsqueda fuzzy
  const [searchQuery, setSearchQuery] = useState('');
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Rol del usuario
  const [userRole, setUserRole] = useState<string | null>(null);
  const canCreate = userRole ? MANAGEMENT_ROLES.includes(userRole) : false;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      type: 'ACTION',
      justification: '',
    },
  });

  const router = useRouter();
  const { toast } = useToast();

  // Obtener rol del usuario
  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.role) setUserRole(data.role);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await axios.get('/api/maintenance/mant-categories');
        setMantCategories(response.data);
      } catch (error) {
        console.error('Error al cargar las categorías:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las categorías de mantenimiento',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, toast]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setSearchQuery('');
      setSimilarItems([]);
      setHasSearched(false);
      form.reset();
    }
  }, [isOpen, form]);

  // Búsqueda fuzzy con debounce
  const searchSimilar = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSimilarItems([]);
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(
        `/api/maintenance/mant-items/similar?q=${encodeURIComponent(query.trim())}`
      );
      setSimilarItems(response.data);
      setHasSearched(true);
    } catch (error) {
      console.error('Error buscando items similares:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchSimilar(searchQuery);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSimilar]);

  const handleProceedToCreate = () => {
    form.setValue('name', searchQuery.trim());
    setStep('form');
  };

  const formatMantType = (mantType: string) => {
    const map: Record<string, string> = {
      PREVENTIVE: 'Preventivo',
      PREDICTIVE: 'Predictivo',
      CORRECTIVE: 'Correctivo',
      EMERGENCY: 'Emergencia',
    };
    return map[mantType] || mantType;
  };

  const formatItemType = (type: string) => {
    const map: Record<string, string> = {
      ACTION: 'Accion',
      PART: 'Repuesto',
      SERVICE: 'Servicio',
    };
    return map[type] || type;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const onSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);

      if (canCreate) {
        // Creación directa (OWNER/MANAGER)
        const response = await axios.post(
          '/api/maintenance/mant-items',
          values
        );
        const newMantItem = response.data;

        onAddMantItem(newMantItem);
        setIsOpen(false);
        form.reset();

        toast({
          title: 'Item de Mantenimiento creado',
          description: `El item "${newMantItem.name}" fue creado exitosamente.`,
        });

        router.refresh();
      } else {
        // Solicitud (TECHNICIAN/PURCHASER)
        const requestData = {
          suggestedName: values.name,
          description: values.description,
          mantType: values.mantType,
          categoryId: values.categoryId,
          type: values.type,
          justification: values.justification,
          similarItems: similarItems.map(s => ({
            id: s.id,
            name: s.name,
            score: s.score,
          })),
        };

        await axios.post('/api/maintenance/mant-item-requests', requestData);

        setIsOpen(false);
        form.reset();

        toast({
          title: 'Solicitud enviada',
          description: `Su solicitud para "${values.name}" fue enviada. Un administrador la revisara.`,
        });
      }
    } catch (error) {
      console.error('Error:', error);

      let errorMessage = 'Algo salio mal';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          errorMessage = 'Ya existe un item con este nombre';
        } else if (error.response?.status === 403) {
          errorMessage =
            error.response.data?.error || 'No tiene permisos para esta accion';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'search'
              ? 'Buscar Item de Mantenimiento'
              : canCreate
                ? 'Crear Nuevo Item'
                : 'Solicitar Nuevo Item'}
          </DialogTitle>
          {step === 'search' && (
            <DialogDescription>
              Busque primero si el item ya existe antes de crear uno nuevo.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ===== PASO 1: BÚSQUEDA OBLIGATORIA ===== */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escriba el nombre del item... (ej: cambio aceite)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Resultados de búsqueda */}
            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando items similares...
              </div>
            )}

            {hasSearched && similarItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Se encontraron {similarItems.length} item(s) similares:
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {similarItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${getScoreColor(item.score)}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.name}
                            {item.isGlobal && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                Global
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs mt-0.5 opacity-75">
                              {item.description}
                            </div>
                          )}
                          <div className="text-xs mt-1 flex gap-2">
                            <span>{item.category.name}</span>
                            <span>{formatMantType(item.mantType)}</span>
                            <span>{formatItemType(item.type)}</span>
                          </div>
                        </div>
                        <div className="text-xs font-bold ml-2 whitespace-nowrap">
                          {item.score}% similar
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {similarItems.some(s => s.score >= 80) && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Hay items con alta similitud. Verifique que no sea un
                    duplicado.
                  </p>
                )}
              </div>
            )}

            {hasSearched && similarItems.length === 0 && !isSearching && (
              <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                <CheckCircle2 className="h-4 w-4" />
                No se encontraron items similares.
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleProceedToCreate}
                disabled={!hasSearched || searchQuery.trim().length < 2}
              >
                {canCreate ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Nuevo Item
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Solicitar Nuevo Item
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ===== PASO 2: FORMULARIO DE CREACIÓN O SOLICITUD ===== */}
        {step === 'form' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!canCreate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  Su solicitud sera revisada por un administrador antes de crear
                  el item.
                </div>
              )}

              {/* Nombre */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Item</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Cambio de aceite, Revision frenos..."
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripcion (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripcion detallada del mantenimiento..."
                        className="resize-none"
                        rows={2}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Mantenimiento */}
                <FormField
                  control={form.control}
                  name="mantType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Mantenimiento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                          <SelectItem value="PREDICTIVE">Predictivo</SelectItem>
                          <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                          <SelectItem value="EMERGENCY">Emergencia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipo de Item */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Item</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'ACTION'}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTION">Accion</SelectItem>
                          <SelectItem value="PART">Repuesto</SelectItem>
                          <SelectItem value="SERVICE">Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Categoría */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={isLoading || isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingCategories
                                ? 'Cargando categorias...'
                                : 'Seleccione una categoria'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mantCategories.length === 0 && !isLoadingCategories ? (
                          <SelectItem value="no-categories" disabled>
                            No hay categorias disponibles
                          </SelectItem>
                        ) : (
                          mantCategories.map((category: MantCategory) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Justificación (solo para solicitudes) */}
              {!canCreate && (
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justificacion (por que se necesita)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explique por que necesita este item..."
                          className="resize-none"
                          rows={2}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('search')}
                  disabled={isLoading}
                >
                  Volver a buscar
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || isLoadingCategories}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLoading
                      ? canCreate
                        ? 'Creando...'
                        : 'Enviando...'
                      : canCreate
                        ? 'Crear Item'
                        : 'Enviar Solicitud'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
