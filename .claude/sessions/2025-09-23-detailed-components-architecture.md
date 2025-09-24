# Arquitectura Detallada de Componentes - Fleet Care IA-First

## Contexto del Proyecto
Fleet Care SaaS - Especificación completa de componentes UI y servicios IA backend para el módulo financiero con control total de gastos.

## Objetivo del Documento
Definir exactamente qué va a hacer cada componente, sus props, interfaces y funcionalidades específicas para la implementación del sistema IA-First.

---

# 🎯 COMPONENTES UI PRINCIPALES

## 1. **QuickExpenseEntry** - Componente Central de Captura

### **Funcionalidad Principal**
- **Propósito**: Entry point ultra-simple para registrar gastos en 15 segundos máximo
- **Ubicación**: Pantalla principal de la aplicación, siempre accesible
- **Filosofía de diseño**: "Como enviar un WhatsApp - tan simple que no necesita explicación"
- **Prioridad**: CRÍTICA - Es el componente más importante del sistema

### **Props e Interface**
```typescript
interface QuickExpenseEntryProps {
  userId: string;
  tenantId: string;
  defaultVehicle?: Vehicle;
  onExpenseSaved: (expense: SavedExpense) => void;
  onError: (error: ExpenseError) => void;
  enableOfflineMode: boolean;
  autoFocus?: boolean;
}

interface ExpenseError {
  type: 'ocr_failed' | 'validation_failed' | 'save_failed' | 'network_error';
  message: string;
  recoverable: boolean;
  suggestion?: string;
}
```

### **Estados del Componente**
```typescript
interface QuickExpenseEntryState {
  step: 'camera' | 'processing' | 'review' | 'saving' | 'completed';
  ocrData: OCRResult | null;
  selectedVehicle: Vehicle | null;
  expenseData: ExpenseData | null;
  aiProcessing: boolean;
  errors: ExpenseError[];
  confidence: number;
}
```

---

### **1.1 SmartCameraCapture** - Captura Inteligente

#### **Funcionalidad Específica**
```typescript
interface SmartCameraCaptureProps {
  onPhotoCapture: (photo: string, ocrData: OCRResult) => void;
  onError: (error: CameraError) => void;
  autoStart?: boolean;
  enableFlash?: boolean;
  quality: 'low' | 'medium' | 'high';
  maxRetries: number;
}

interface OCRResult {
  confidence: number;
  extractedText: string;
  structuredData: {
    totalAmount?: number;
    currency?: string;
    vendor?: string;
    date?: string;
    invoiceNumber?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
    }>;
  };
  rawBoundingBoxes: BoundingBox[];
  processingTime: number;
}
```

#### **¿Qué hace exactamente el SmartCameraCapture?**
1. **Auto-inicialización**:
   - Se abre automáticamente al entrar a la app
   - Configura cámara con settings optimizados para documentos
   - Detecta capacidades del dispositivo (flash, enfoque, resolución)

2. **Captura optimizada**:
   - Un solo tap para capturar
   - Auto-detección de bordes del documento
   - Optimización automática de brillo y contraste
   - Estabilización para evitar fotos borrosas

3. **Procesamiento inmediato**:
   - Ejecuta OCR en paralelo mientras usuario ve preview
   - No bloquea UI durante procesamiento
   - Muestra indicador de progreso discreto
   - Retry automático si confidence < 70%

4. **Validación de calidad**:
   - Detecta si foto está borrosa o mal iluminada
   - Sugiere retomar automáticamente si es necesario
   - Permite ajuste manual de brillo/contraste
   - Optimiza calidad antes de enviar a OCR

5. **Feedback inmediato**:
   - Preview de imagen capturada
   - Indicadores visuales de calidad
   - Progress indicator de procesamiento OCR
   - Opción de retomar si usuario no está satisfecho

---

### **1.2 SmartVehicleSelector** - Selección Inteligente de Vehículo

#### **Funcionalidad Específica**
```typescript
interface SmartVehicleSelectorProps {
  suggestions: VehicleSuggestion[];
  onVehicleSelect: (vehicle: Vehicle) => void;
  onManualSearch: (query: string) => void;
  autoSelect?: boolean;
  maxSuggestions: number;
  showConfidence: boolean;
}

interface VehicleSuggestion {
  vehicle: Vehicle;
  confidence: number;
  reason: 'location' | 'temporal' | 'maintenance' | 'historical';
  explanation: string;
  metadata: {
    distance?: number;
    lastUsed?: Date;
    maintenanceDue?: boolean;
    usageFrequency?: number;
  };
}
```

#### **¿Qué hace exactamente el SmartVehicleSelector?**
1. **Sugerencias basadas en IA**:
   - **Ubicación GPS**: "Estás cerca del vehículo ABC-123"
   - **Patrones temporales**: "Los lunes manejas DEF-456"
   - **Historial reciente**: "Último registro fue para GHI-789"
   - **Mantenimiento pendiente**: "JKL-012 tiene mantenimiento vencido"

2. **Auto-selección inteligente**:
   - Si confidence > 90%, selecciona automáticamente
   - Muestra selección con opción de cambiar
   - Learn de decisiones del usuario para mejorar
   - Fallback a última selección si IA falla

3. **Interface optimizada**:
   - Máximo 3 opciones mostradas
   - Razón clara de por qué se sugiere cada vehículo
   - Búsqueda rápida por placa con autocomplete
   - Fotos de vehículos para identificación visual

4. **Learning continuo**:
   - Aprende patrones específicos del usuario
   - Ajusta sugerencias basado en feedback
   - Mejora accuracy con el tiempo
   - Detecta cambios en rutinas automáticamente

---

### **1.3 SmartExpenseInput** - Input Inteligente de Gastos

#### **Funcionalidad Específica**
```typescript
interface SmartExpenseInputProps {
  ocrData: OCRResult;
  onExpenseChange: (expense: ExpenseData) => void;
  onValidationResult: (result: ValidationResult) => void;
  enableAIValidation: boolean;
  enablePriceOptimization: boolean;
  showMarketComparison: boolean;
}

interface ExpenseData {
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  subcategory?: string;
  vendor: string;
  date: Date;
  items: ExpenseItem[];
  confidence: number;
  aiSuggestions: AISuggestion[];
}

interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  priceAnalysis: PriceAnalysis;
  fraudScore: number;
  suggestions: OptimizationSuggestion[];
}
```

#### **¿Qué hace exactamente el SmartExpenseInput?**
1. **Auto-completado inteligente**:
   - Monto auto-completado desde OCR
   - Descripción mejorada con IA ("filtro aceite" → "Filtro de aceite motor 15W40")
   - Categorización automática con explicación
   - Vendor normalizado con base de datos

2. **Validación en tiempo real**:
   - Compara precio vs mercado mientras usuario escribe
   - Alerta si precio está 30%+ sobre promedio
   - Valida coherencia de items vs descripción
   - Detecta posibles errores de OCR

3. **Optimización automática**:
   - Busca proveedores alternativos con mejores precios
   - Sugiere timing optimal para la compra
   - Identifica oportunidades de bulk purchase
   - Recomienda items relacionados faltantes

4. **Interfaz adaptativa**:
   - Muestra solo campos necesarios
   - Expande opciones avanzadas bajo demanda
   - Valida automáticamente mientras usuario escribe
   - Guarda borradores para completar después

5. **Feedback contextual**:
   - Explicaciones claras de categorizaciones IA
   - Alertas visuales para precios anómalos
   - Sugerencias accionables para optimización
   - Confidence scores discretos pero informativos

---

### **1.4 OneClickSave** - Guardado Inteligente

#### **Funcionalidad Específica**
```typescript
interface OneClickSaveProps {
  expenseData: CompleteExpenseData;
  validationResult: ValidationResult;
  onSave: (expense: SavedExpense) => Promise<SaveResult>;
  onPreSaveValidation: () => Promise<ValidationResult>;
  showApprovalPreview: boolean;
  enableOptimisticSave: boolean;
}

interface SaveResult {
  success: boolean;
  expenseId?: string;
  approvalRequired: boolean;
  nextSteps: NextStep[];
  estimatedApprovalTime?: number;
  warnings: SaveWarning[];
}

interface NextStep {
  type: 'approval' | 'notification' | 'maintenance_update' | 'budget_update';
  description: string;
  estimatedTime: number;
  responsible?: string;
}
```

#### **¿Qué hace exactamente el OneClickSave?**
1. **Validación pre-guardado**:
   - Verifica que todos los campos obligatorios están completos
   - Ejecuta validaciones finales de IA en paralelo
   - Confirma que no hay conflictos con data existente
   - Valida permisos del usuario para el monto

2. **Preview inteligente**:
   - Muestra resumen ejecutivo del gasto
   - Indica si requiere aprobación y de quién
   - Estima tiempo hasta aprobación final
   - Muestra impacto en presupuesto/KPIs

3. **Guardado optimizado**:
   - Guarda localmente primero (optimistic UI)
   - Sincroniza con servidor en background
   - Maneja errores de red gracefully
   - Retry automático con backoff exponencial

4. **Workflow automático**:
   - Dispara aprobaciones automáticamente si aplica
   - Envía notificaciones a stakeholders relevantes
   - Actualiza cronogramas de mantenimiento si corresponde
   - Actualiza KPIs y analytics en tiempo real

5. **Confirmación y próximos pasos**:
   - Confirmación clara del guardado exitoso
   - Lista de próximos pasos automáticos
   - Opción de hacer seguimiento al proceso
   - Limpia formulario para siguiente registro

---

## 2. **FinancialDashboard** - Centro de Control

### **Funcionalidad Principal**
- **Propósito**: Vista ejecutiva de estado financiero de la flota en tiempo real
- **Ubicación**: Pantalla principal después de autenticación
- **Filosofía**: "Solo la información que necesitas para tomar decisiones"
- **Actualización**: Tiempo real con WebSockets + polling fallback

### **Props e Interface**
```typescript
interface FinancialDashboardProps {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  dateRange: DateRange;
  vehicleFilter?: string[];
  refreshInterval: number;
  enableRealTimeUpdates: boolean;
}

interface DashboardData {
  kpis: FinancialKPI[];
  recentExpenses: Expense[];
  pendingApprovals: WorkOrder[];
  aiInsights: AIInsight[];
  alerts: Alert[];
  lastUpdated: Date;
}
```

---

### **2.1 FinancialKPICards** - Indicadores Clave

#### **Funcionalidad Específica**
```typescript
interface FinancialKPICardsProps {
  kpis: FinancialKPI[];
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  refreshInterval: number;
  onKPIClick: (kpi: FinancialKPI) => void;
  enableDrillDown: boolean;
}

interface FinancialKPI {
  id: string;
  title: string;
  value: number;
  currency?: string;
  previousValue?: number;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'good' | 'warning' | 'critical';
  insight?: string;
  lastUpdated: Date;
}
```

#### **¿Qué hace exactamente FinancialKPICards?**
1. **Solo 4 KPIs críticos mostrados**:
   - **Gasto mensual**: Actual vs presupuesto con % de cumplimiento
   - **Órdenes pendientes**: Cantidad y valor total esperando aprobación
   - **Alertas IA**: Número de items que requieren atención inmediata
   - **Ahorro potencial**: Cantidad que se puede ahorrar según IA

2. **Actualización inteligente**:
   - Refresh automático cada 30 segundos
   - WebSocket updates para cambios inmediatos
   - Animaciones suaves para cambios de valores
   - Indicadores visuales de "actualizando"

3. **Visualización efectiva**:
   - Colores semánticos (verde/amarillo/rojo)
   - Tendencias con íconos direccionales claros
   - Porcentajes de cambio vs período anterior
   - Sparklines discretos para tendencias

4. **Interactividad**:
   - Tap para drill-down en detalle
   - Long press para opciones de filtrado
   - Swipe para cambiar período de comparación
   - Pull-to-refresh para actualización manual

---

### **2.2 SmartExpenseList** - Lista Inteligente de Gastos

#### **Funcionalidad Específica**
```typescript
interface SmartExpenseListProps {
  expenses: Expense[];
  filterPreset: 'recent' | 'pending' | 'alerts' | 'high_value';
  onExpenseSelect: (expense: Expense) => void;
  onSwipeAction: (expense: Expense, action: SwipeAction) => void;
  enableSwipeActions: boolean;
  groupBy?: 'vehicle' | 'date' | 'category' | 'vendor';
  maxItems: number;
}

interface SwipeAction {
  type: 'approve' | 'reject' | 'investigate' | 'edit' | 'duplicate';
  requiresConfirmation: boolean;
  icon: string;
  color: string;
}
```

#### **¿Qué hace exactamente SmartExpenseList?**
1. **Listado optimizado**:
   - Últimos 20 gastos con información mínima pero suficiente
   - Agrupación inteligente por vehículo/fecha automática
   - Infinite scroll para cargar más registros
   - Cache local para performance offline

2. **Highlighting inteligente**:
   - Resalta gastos que requieren atención (colores/iconos)
   - Marca gastos con alertas de fraude
   - Indica estado de aprobación visualmente
   - Muestra confidence score discretamente

3. **Acciones rápidas**:
   - Swipe right para aprobar gastos pendientes
   - Swipe left para investigar/rechazar
   - Long press para opciones avanzadas
   - Double tap para ver detalles completos

4. **Filtrado inteligente**:
   - Tabs simples para diferentes vistas (Recientes, Pendientes, Alertas)
   - IA sugiere filtros relevantes basados en contexto
   - Búsqueda rápida con autocomplete
   - Filtros inteligentes por patrón de uso

5. **Estados visuales claros**:
   - Iconografía consistente para estados
   - Loading states durante acciones
   - Confirmaciones visuales de acciones
   - Rollback automático si acción falla

---

### **2.3 AIInsightsPanel** - Panel de Insights IA

#### **Funcionalidad Específica**
```typescript
interface AIInsightsPanelProps {
  insights: AIInsight[];
  onInsightAction: (insight: AIInsight, action: InsightAction) => void;
  onInsightDismiss: (insightId: string) => void;
  maxInsights: number;
  prioritizeBy: 'impact' | 'urgency' | 'confidence';
}

interface AIInsight {
  id: string;
  type: 'cost_optimization' | 'fraud_alert' | 'maintenance_prediction' | 'budget_warning';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  actions: InsightAction[];
  metadata: {
    potentialSaving?: number;
    riskLevel?: number;
    timeframe?: string;
    affectedVehicles?: string[];
  };
  expiresAt?: Date;
}

interface InsightAction {
  type: 'accept' | 'dismiss' | 'investigate' | 'schedule' | 'contact_vendor';
  label: string;
  requiresConfirmation: boolean;
  estimatedTime?: number;
}
```

#### **¿Qué hace exactamente AIInsightsPanel?**
1. **Insights priorizados**:
   - Máximo 3 insights más importantes mostrados
   - IA prioriza por impacto potencial y urgencia
   - Auto-rotación de insights basada en relevancia temporal
   - Descarta insights ya atendidos o expirados

2. **Tipos de insights específicos**:
   - **Optimización costos**: "Puedes ahorrar $25,000 cambiando proveedor X por Y"
   - **Predicción mantenimiento**: "Vehículo ABC-123 necesitará frenos en 2 semanas"
   - **Alerta fraude**: "Gasto inusual detectado - revisar recibo #1234"
   - **Presupuesto**: "Vas 15% sobre presupuesto en categoría Motor"

3. **Acciones directas**:
   - Botones de acción específicos por insight
   - "Contactar proveedor", "Programar mantenimiento", "Investigar gasto"
   - Seguimiento de acciones tomadas
   - Feedback al usuario sobre resultados

4. **Learning automático**:
   - Aprende qué insights son más útiles por usuario
   - Ajusta frecuencia y tipo de insights mostrados
   - Mejora accuracy basado en acciones tomadas
   - Personaliza recomendaciones por patrón de empresa

5. **Actualización inteligente**:
   - Se actualiza basado en nueva data automáticamente
   - Insights urgentes aparecen inmediatamente
   - Notificaciones push para insights críticos
   - Historial de insights para referencia

---

## 3. **ApprovalWorkflow** - Sistema de Aprobaciones Inteligente

### **Funcionalidad Principal**
- **Propósito**: Gestionar aprobaciones de manera automática e inteligente
- **Ubicación**: Notificaciones push + pantalla dedicada de aprobaciones
- **Filosofía**: "Aprobar debería ser tan fácil como dar like en Instagram"
- **Routing**: Automático basado en montos, categorías y reglas de negocio

### **Props e Interface**
```typescript
interface ApprovalWorkflowProps {
  pendingApprovals: WorkOrder[];
  userRole: UserRole;
  approvalLimits: ApprovalLimits;
  onApprovalAction: (workOrderId: string, action: ApprovalAction) => Promise<void>;
  enableBulkApprovals: boolean;
  showAIRecommendations: boolean;
}

interface ApprovalLimits {
  maxAmount: number;
  categories: string[];
  requiresSecondApproval?: number;
  emergencyOverride?: boolean;
}
```

---

### **3.1 SmartApprovalCard** - Tarjeta de Aprobación Inteligente

#### **Funcionalidad Específica**
```typescript
interface SmartApprovalCardProps {
  workOrder: WorkOrderWithDetails;
  approvalLevel: number;
  aiRecommendation: AIApprovalRecommendation;
  onApprove: (workOrderId: string, notes?: string) => void;
  onReject: (workOrderId: string, reason: string) => void;
  onRequestInfo: (workOrderId: string, questions: string[]) => void;
  showComparison: boolean;
}

interface AIApprovalRecommendation {
  recommendation: 'approve' | 'reject' | 'request_info';
  confidence: number;
  reasoning: string[];
  riskFactors: RiskFactor[];
  comparableExpenses: Expense[];
  estimatedImpact: {
    budget: number;
    maintenance: string;
    operational: string;
  };
}
```

#### **¿Qué hace exactamente SmartApprovalCard?**
1. **Resumen ejecutivo**:
   - Información clave en 5 segundos de lectura
   - Vehículo, monto, categoría, proveedor claramente visible
   - Razón del gasto y urgencia explicadas
   - Impacto en presupuesto mostrado inmediatamente

2. **Recomendación IA**:
   - IA analiza y recomienda: aprobar/rechazar/pedir info
   - Confidence score visible (85% confianza → "Muy seguro")
   - Razones específicas listadas claramente
   - Comparación automática con gastos similares históricos

3. **Factores de decisión**:
   - Riesgo de fraude si aplica
   - Comparación precio vs mercado
   - Historial del empleado solicitante
   - Urgencia operacional del gasto
   - Impacto en mantenimiento preventivo

4. **Acciones una sola tap**:
   - Botón grande "Aprobar" si IA recomienda
   - "Rechazar" con razones pre-definidas
   - "Más info" para solicitar clarificaciones
   - "Aprobar con condiciones" para casos especiales

5. **Contexto automático**:
   - Muestra otros gastos recientes del mismo vehículo
   - Indica si es parte de mantenimiento mayor
   - Alerta si excede patrones históricos
   - Sugiere timing optimal si no es urgente

---

### **3.2 ApprovalTimeline** - Línea de Tiempo de Aprobaciones

#### **Funcionalidad Específica**
```typescript
interface ApprovalTimelineProps {
  workOrderId: string;
  approvalHistory: ApprovalStep[];
  currentStep: number;
  estimatedCompletion: Date;
  onEscalate: (workOrderId: string, reason: string) => void;
  onReminder: (approverId: string) => void;
  showDetails: boolean;
}

interface ApprovalStep {
  level: number;
  approverRole: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  timestamp?: Date;
  notes?: string;
  estimatedTime: number;
  isUrgent: boolean;
}
```

#### **¿Qué hace exactamente ApprovalTimeline?**
1. **Visualización clara del proceso**:
   - Timeline visual mostrando pasos completados y pendientes
   - Estado actual resaltado claramente
   - Próximo aprobador identificado con foto/nombre
   - Tiempo estimado para cada paso

2. **Tracking de progreso**:
   - Muestra quién aprobó y cuándo exactamente
   - Notas y comentarios de cada aprobador
   - Tiempo total transcurrido vs. tiempo esperado
   - Alertas si proceso está retrasado

3. **Acciones proactivas**:
   - Botón para acelerar si es urgente
   - Opción de recordar a aprobadores pendientes
   - Escalación automática si excede tiempo límite
   - Notificación automática a próximo nivel

4. **Estimaciones inteligentes**:
   - IA calcula tiempo probable hasta aprobación final
   - Considera patrones históricos de cada aprobador
   - Ajusta estimaciones basado en urgencia
   - Alerta si proceso tomará más de lo normal

---

### **3.3 BulkApprovalInterface** - Aprobaciones en Lote

#### **Funcionalidad Específica**
```typescript
interface BulkApprovalInterfaceProps {
  pendingApprovals: WorkOrder[];
  onBulkAction: (workOrderIds: string[], action: BulkAction) => void;
  onIndividualReview: (workOrderId: string) => void;
  maxBulkSize: number;
  enableSmartGrouping: boolean;
}

interface BulkAction {
  type: 'approve_all' | 'reject_all' | 'request_info_all';
  notes?: string;
  conditions?: ApprovalCondition[];
}

interface SmartGroup {
  criteria: 'same_category' | 'same_vendor' | 'low_risk' | 'routine_maintenance';
  items: WorkOrder[];
  recommendation: 'safe_bulk' | 'review_individual';
  riskScore: number;
}
```

#### **¿Qué hace exactamente BulkApprovalInterface?**
1. **Agrupación inteligente**:
   - IA agrupa aprobaciones que pueden procesarse juntas
   - Separar rutinarias (cambios aceite) de excepcionales (reparaciones)
   - Identifica patrones de gasto similares
   - Destaca items que requieren revisión individual

2. **Validación de seguridad**:
   - Previene aprobación accidental de gastos altos
   - Requiere confirmación explícita para lotes grandes
   - Muestra resumen total antes de confirmar
   - Permite revisar items individuales antes de procesar

3. **Filtros automáticos**:
   - "Gastos rutinarios bajo $100k" → apto para bulk
   - "Mismo proveedor, mismo tipo" → apto para bulk
   - "Gastos con alertas de fraude" → requiere revisión individual
   - "Nuevos proveedores" → requiere revisión individual

4. **Audit trail completo**:
   - Registra todas las aprobaciones bulk con timestamp
   - Mantiene trazabilidad de quién aprobó qué
   - Permite rollback si se detecta error
   - Genera reporte de acciones bulk para compliance

---

## 4. **FraudDetectionInterface** - Alertas Inteligentes

### **Funcionalidad Principal**
- **Propósito**: Mostrar alertas de IA sobre gastos sospechosos y prevenir fraude
- **Ubicación**: Notificaciones push + dashboard de alertas + integrado en flujos
- **Filosofía**: "Prevenir problemas antes que sucedan, no después"
- **Tiempo real**: Detección instantánea durante el registro de gastos

### **Props e Interface**
```typescript
interface FraudDetectionInterfaceProps {
  alerts: FraudAlert[];
  onAlertAction: (alertId: string, action: FraudAction) => void;
  onFalsePositive: (alertId: string, feedback: string) => void;
  userRole: UserRole;
  enableRealTimeDetection: boolean;
  showEvidence: boolean;
}

interface FraudAlert {
  id: string;
  workOrderId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  detectedAt: Date;
  reasons: FraudReason[];
  evidence: Evidence[];
  recommendedAction: 'investigate' | 'block' | 'require_approval' | 'monitor';
  affectedAmount: number;
  falsePositiveProbability: number;
}
```

---

### **4.1 FraudAlertCard** - Tarjeta de Alerta de Fraude

#### **Funcionalidad Específica**
```typescript
interface FraudAlertCardProps {
  alert: FraudAlert;
  onAlertAction: (action: 'investigate' | 'dismiss' | 'approve' | 'block') => void;
  onFeedback: (feedback: FraudFeedback) => void;
  showEvidence: boolean;
  enableQuickActions: boolean;
}

interface FraudReason {
  type: 'price_anomaly' | 'new_vendor' | 'time_anomaly' | 'location_mismatch' | 'pattern_break';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  confidence: number;
}

interface Evidence {
  type: 'price_comparison' | 'location_data' | 'historical_pattern' | 'vendor_analysis';
  data: any;
  visualization?: 'chart' | 'map' | 'table';
  explanation: string;
}
```

#### **¿Qué hace exactamente FraudAlertCard?**
1. **Alerta visual clara**:
   - Colores semánticos por nivel de riesgo (amarillo/naranja/rojo)
   - Íconos específicos por tipo de anomalía detectada
   - Score de riesgo prominente pero no alarmista
   - Timestamp de detección y tiempo transcurrido

2. **Explicación comprensible**:
   - Describe POR QUÉ IA considera sospechoso el gasto
   - Lista razones específicas en lenguaje claro
   - Evita jerga técnica, usa explicaciones de negocio
   - Muestra nivel de confianza de cada factor

3. **Evidencia específica**:
   - "Precio 45% sobre promedio histórico"
   - "Proveedor nuevo con gasto inusualmente alto"
   - "Registro fuera de horario laboral (3:47 AM)"
   - "Ubicación del vehículo no coincide con factura"

4. **Acciones recomendadas**:
   - IA sugiere acción específica basada en evidencia
   - "Investigar" para casos con múltiples señales de alerta
   - "Requiere aprobación adicional" para casos borderline
   - "Bloquear temporalmente" para casos críticos

5. **Learning de feedback**:
   - Permite marcar como falso positivo con razón
   - "Este proveedor siempre cobra este precio"
   - "Empleado tiene autorización para trabajar fines de semana"
   - IA aprende y mejora detección future

---

### **4.2 AnomalyVisualization** - Visualización de Anomalías

#### **Funcionalidad Específica**
```typescript
interface AnomalyVisualizationProps {
  expense: Expense;
  historicalData: HistoricalExpense[];
  anomalyFactors: AnomalyFactor[];
  comparisonPeriod: DateRange;
  showInteractiveChart: boolean;
}

interface AnomalyFactor {
  type: 'price' | 'frequency' | 'timing' | 'location' | 'vendor';
  normalRange: { min: number; max: number };
  actualValue: number;
  deviationPercentage: number;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}
```

#### **¿Qué hace exactamente AnomalyVisualization?**
1. **Gráfico simple de comparación**:
   - Muestra precio actual vs distribución histórica
   - Resalta donde cae el gasto actual en la distribución
   - Usa colores para mostrar qué tan anómalo es
   - Permite ver diferentes períodos de comparación

2. **Breakdown de factores**:
   - Lista cada factor anómalo con su impacto
   - Muestra desviación específica ("+45% vs promedio")
   - Explica por qué cada factor es problemático
   - Permite drill-down en data histórica

3. **Contexto histórico**:
   - Muestra última vez que se vio precio similar
   - Identifica si es tendencia o evento aislado
   - Compara con gastos similares en otros vehículos
   - Considera estacionalidad y patrones conocidos

4. **Exportable para auditoría**:
   - Genera reporte PDF con evidencia visual
   - Incluye data raw para verificación independiente
   - Timestamps y trazabilidad completa
   - Links a documentos de respaldo

---

## 5. **VehicleFinancialProfile** - Vista por Vehículo

### **Funcionalidad Principal**
- **Propósito**: Vista financiera completa y análisis por vehículo específico
- **Ubicación**: Pantalla de detalle de vehículo, tab "Financiero"
- **Filosofía**: "Historia financiera completa de cada activo de la flota"
- **Analytics**: Retrospectivo + predictivo con IA

### **Props e Interface**
```typescript
interface VehicleFinancialProfileProps {
  vehicleId: string;
  dateRange: DateRange;
  comparisonVehicles?: string[];
  showPredictions: boolean;
  enableExport: boolean;
}

interface VehicleFinancialData {
  totalCost: number;
  costPerKm: number;
  maintenanceRatio: number;
  categoryBreakdown: CategoryCost[];
  trends: FinancialTrend[];
  predictions: CostPrediction[];
  benchmarks: BenchmarkData;
}
```

---

### **5.1 VehicleCostSummary** - Resumen de Costos

#### **Funcionalidad Específica**
```typescript
interface VehicleCostSummaryProps {
  vehicleId: string;
  period: DateRange;
  categories: ExpenseCategory[];
  showComparison: boolean;
  comparisonVehicles?: string[];
}

interface CategoryCost {
  category: string;
  amount: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  frequency: number;
  avgCostPerIncident: number;
}
```

#### **¿Qué hace exactamente VehicleCostSummary?**
1. **Resumen financiero integral**:
   - Costo total del período seleccionado
   - Breakdown por categorías principales (Motor, Frenos, etc.)
   - Costo por kilómetro calculado automáticamente
   - Comparación vs presupuesto asignado

2. **Análisis de tendencias**:
   - Gráfico de evolución de gastos en el tiempo
   - Identificación de picos y patrones estacionales
   - Detección de categorías con crecimiento anómalo
   - Proyección de gastos futuros basada en tendencias

3. **Comparación con flota**:
   - Posición del vehículo vs promedio de flota
   - Identificación de vehículos similares más eficientes
   - Benchmarking contra mejores performers
   - Alertas si vehículo está consistentemente sobre promedio

4. **Drill-down interactivo**:
   - Click en categoría para ver gastos específicos
   - Filtrado por proveedor, tipo de gasto, urgencia
   - Export a Excel con data granular
   - Links directos a órdenes de trabajo relacionadas

---

### **5.2 MaintenanceROI** - ROI de Mantenimiento

#### **Funcionalidad Específica**
```typescript
interface MaintenanceROIProps {
  vehicleId: string;
  maintenanceHistory: MaintenanceRecord[];
  calculationMethod: 'simple' | 'advanced';
  includeOpportunityCost: boolean;
}

interface ROICalculation {
  preventiveCost: number;
  correctiveCost: number;
  avoidedDowntime: number;
  avoidedMajorRepairs: number;
  totalROI: number;
  roiPercentage: number;
  paybackPeriod: number;
}
```

#### **¿Qué hace exactamente MaintenanceROI?**
1. **Cálculo de ROI real**:
   - Costo de mantenimiento preventivo vs correctivo
   - Quantifica ahorros por evitar fallas mayores
   - Incluye costo de downtime evitado
   - Calcula payback period de estrategia preventiva

2. **Análisis predictivo**:
   - Identifica mantenimientos que evitaron fallas costosas
   - Proyecta ahorros futuros de mantener estrategia actual
   - Recomienda ajustes a cronograma para maximizar ROI
   - Alerta sobre mantenimientos con ROI negativo

3. **Comparación de estrategias**:
   - Reactivo vs preventivo vs predictivo
   - Costo/beneficio de diferentes frecuencias
   - Impacto de calidad de repuestos en ROI total
   - Optimización de mix de proveedores

4. **Valor residual**:
   - Impacto del mantenimiento en valor del vehículo
   - Proyección de vida útil restante
   - Momento optimal para replacement vs overhaul
   - Análisis lease vs buy basado en costos reales

---

### **5.3 PredictiveCostAnalysis** - Análisis Predictivo

#### **Funcionalidad Específica**
```typescript
interface PredictiveCostAnalysisProps {
  vehicleId: string;
  aiPredictions: CostPrediction[];
  confidence: number;
  timeHorizon: 'short' | 'medium' | 'long'; // 3, 6, 12 meses
}

interface CostPrediction {
  category: string;
  predictedCost: number;
  confidence: number;
  reasoning: string[];
  triggers: PredictionTrigger[];
  recommendedActions: RecommendedAction[];
  timeline: PredictionTimeline[];
}

interface PredictionTrigger {
  type: 'mileage' | 'time' | 'usage_pattern' | 'historical_pattern';
  threshold: number;
  currentValue: number;
  estimatedDays: number;
}
```

#### **¿Qué hace exactamente PredictiveCostAnalysis?**
1. **Predicciones basadas en IA**:
   - Analiza patrones históricos del vehículo específico
   - Considera edad, kilometraje, uso y condiciones operación
   - Predice cuándo necesitará mantenimientos mayores
   - Estima costos con rangos de confianza

2. **Alertas proactivas**:
   - "Frenos necesitarán reemplazo en 3 semanas"
   - "Motor muestra signos de wear acelerado"
   - "Transmisión puede requerir servicio en 6 meses"
   - "Costo anual proyectado excederá presupuesto en 15%"

3. **Optimización de timing**:
   - Identifica ventanas optimales para mantenimientos
   - Sugiere combinar trabajos para minimizar downtime
   - Recomienda timing basado en disponibilidad de vehículo
   - Considera factores estacionales (precios, disponibilidad)

4. **Planificación presupuestaria**:
   - Proyecta gastos por trimestre basado en predicciones
   - Identifica gastos grandes que requieren planning
   - Sugiere reservas para contingencias
   - Permite simular diferentes estrategias de mantenimiento

---

# 🔧 SERVICIOS IA BACKEND

## 6. **OCRIntelligenceService** - Computer Vision

### **Funcionalidad Principal**
- **Propósito**: Extraer datos estructurados de fotos de recibos con alta precisión
- **Tecnología**: Computer Vision + Machine Learning + OCR avanzado
- **Performance**: <3 segundos para procesar recibo típico
- **Accuracy**: 95%+ en recibos estándar automotrices

### **Interface del Servicio**
```typescript
class OCRIntelligenceService {
  async analyzeReceipt(imageBase64: string, options: OCROptions): Promise<OCRResult>;
  async validateExtraction(ocrResult: OCRResult, userInput: any): Promise<ValidationResult>;
  async trainWithFeedback(ocrResult: OCRResult, corrections: UserCorrections): Promise<void>;
  async getConfidenceScore(ocrResult: OCRResult): Promise<number>;
}

interface OCROptions {
  enhance: boolean;
  detectRotation: boolean;
  multipleReceipts: boolean;
  language: 'es' | 'en';
  domain: 'automotive' | 'general';
}

interface OCRResult {
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
```

#### **¿Qué hace exactamente OCRIntelligenceService?**

1. **Pre-procesamiento inteligente de imagen**:
   ```typescript
   async preprocessImage(imageBase64: string): Promise<ProcessedImage> {
     // Mejora automática de calidad
     - Detecta y corrige orientación automáticamente
     - Ajusta contraste y brillo para mejor legibilidad
     - Reduce ruido y mejora definición de texto
     - Recorta bordes irrelevantes automáticamente
     - Detecta si hay múltiples documentos en la imagen
     - Mejora resolución usando super-resolution AI
   }
   ```

2. **Extracción de texto multi-engine**:
   ```typescript
   async extractText(processedImage: ProcessedImage): Promise<TextExtractionResult> {
     // Combinación de múltiples engines OCR
     - Tesseract para texto general
     - Cloud Vision API para mayor accuracy
     - Modelo custom entrenado en recibos automotrices
     - Combina resultados para maximizar confidence
     - Validación cruzada entre engines
     - Fallback a engine manual si todos fallan
   }
   ```

3. **Parsing estructurado inteligente**:
   ```typescript
   async parseStructuredData(extractedText: string): Promise<StructuredData> {
     // NLP especializado para recibos automotrices
     - Identifica monto total vs subtotales vs impuestos
     - Extrae fecha en múltiples formatos (DD/MM/YYYY, DD-MM-YY, etc.)
     - Detecta RUT/NIT del proveedor con validación
     - Lista items individuales con cantidad y precio unitario
     - Identifica números de factura/recibo
     - Detecta part numbers de repuestos específicos
     - Clasifica items automáticamente (aceites, filtros, etc.)
   }
   ```

4. **Validación y enriquecimiento**:
   ```typescript
   async validateAndEnrich(structuredData: StructuredData): Promise<EnrichedData> {
     // Validación de coherencia y enriquecimiento
     - Valida que suma de items = total declarado
     - Detecta y corrige errores comunes de OCR
     - Enriquece con data de proveedores conocidos
     - Normaliza nombres de productos con catálogo
     - Detecta inconsistencias temporales
     - Calcula confidence score por campo
     - Sugiere correcciones para campos dudosos
   }
   ```

5. **Learning continuo**:
   ```typescript
   async learnFromFeedback(ocrResult: OCRResult, userCorrections: UserCorrections): Promise<void> {
     // Mejora modelo con feedback del usuario
     - Almacena correcciones para reentrenamiento
     - Ajusta confidence scores basado en accuracy real
     - Mejora detección de patrones específicos de cliente
     - Actualiza diccionario de productos automotrices
     - Refina detección de layouts de proveedores conocidos
   }
   ```

---

## 7. **ExpenseCategorizationService** - NLP Intelligence

### **Funcionalidad Principal**
- **Propósito**: Categorizar gastos automáticamente usando NLP avanzado
- **Tecnología**: Natural Language Processing + Machine Learning + Domain Knowledge
- **Performance**: <1 segundo para categorizar gasto típico
- **Accuracy**: 92%+ en categorías principales, 85%+ en subcategorías

### **Interface del Servicio**
```typescript
class ExpenseCategorizationService {
  async categorizeExpense(description: string, context: ExpenseContext): Promise<CategoryResult>;
  async suggestSubcategory(category: string, itemDetails: ItemDetails): Promise<SubcategoryResult>;
  async detectMaintenanceType(expense: Expense): Promise<MaintenanceTypeResult>;
  async learnFromUserFeedback(expense: Expense, userCategory: Category): Promise<void>;
}

interface ExpenseContext {
  vehicleType: string;
  vehicleAge: number;
  recentMaintenance: Expense[];
  seasonality: 'winter' | 'summer' | 'rainy';
  operationType: 'urban' | 'highway' | 'mixed' | 'off_road';
}

interface CategoryResult {
  primaryCategory: string;
  subcategory?: string;
  confidence: number;
  alternativeCategories: AlternativeCategory[];
  reasoning: string[];
  suggestedTags: string[];
  estimatedUrgency: 'low' | 'medium' | 'high';
  relatedMaintenanceItems: string[];
}
```

#### **¿Qué hace exactamente ExpenseCategorizationService?**

1. **Análisis semántico avanzado**:
   ```typescript
   async analyzeSemantics(description: string): Promise<SemanticAnalysis> {
     // NLP especializado en dominio automotriz
     - Tokeniza respetando jerga automotriz ("cambio de aceite", "pastillas de freno")
     - Identifica entidades específicas (marcas, part numbers, herramientas)
     - Detecta sinónimos técnicos ("filtro" = "elemento filtrante")
     - Clasifica intención (compra, reparación, mantenimiento, emergencia)
     - Extrae modifiers importantes (urgente, preventivo, correctivo)
     - Reconoce abreviaciones comunes del sector
   }
   ```

2. **Categorización multi-nivel inteligente**:
   ```typescript
   async categorizeMultiLevel(semanticAnalysis: SemanticAnalysis, context: ExpenseContext): Promise<MultiLevelCategory> {
     // Clasificación jerárquica contextual
     - Categoría primaria: Motor, Frenos, Suspensión, Neumáticos, Eléctrico, etc.
     - Subcategoría: Aceites, Filtros, Pastillas, Discos, Amortiguadores, etc.
     - Tipo mantenimiento: Preventivo, Predictivo, Correctivo, Emergencia
     - Prioridad operacional: Crítica, Alta, Media, Baja
     - Urgencia temporal: Inmediata, Esta semana, Este mes, Programable
   }
   ```

3. **Enriquecimiento contextual**:
   ```typescript
   async enrichWithContext(category: MultiLevelCategory, context: ExpenseContext): Promise<EnrichedCategory> {
     // Consideración de contexto específico
     - Historial del vehículo: "Si cambió aceite hace 1000km, probablemente es filtro"
     - Timing vs cronograma: "Mantenimiento 10k km está próximo"
     - Detección de trabajos relacionados: "Cambio pastillas → revisar discos"
     - Estacionalidad: "Neumáticos en diciembre = preparación lluvias"
     - Tipo operación: "Taxi necesita frenos más frecuente"
   }
   ```

4. **Validación de coherencia**:
   ```typescript
   async validateCoherence(enrichedCategory: EnrichedCategory, expense: Expense): Promise<CoherenceValidation> {
     // Verificación de lógica de negocio
     - Verifica categoría sea apropiada para tipo de vehículo
     - Detecta inconsistencias temporales ("cambio aceite ayer y hoy")
     - Valida precios típicos para categoría
     - Alerta patrones inusuales ("5to cambio filtro este mes")
     - Sugiere verificación manual si confidence < umbral
     - Identifica posibles errores de clasificación
   }
   ```

5. **Sugerencias inteligentes**:
   ```typescript
   async generateSmartSuggestions(validatedCategory: CoherenceValidation): Promise<SmartSuggestions> {
     // Sugerencias proactivas basadas en clasificación
     - Items relacionados que podrían necesitar atención
     - Próximos mantenimientos sugeridos basados en este gasto
     - Oportunidades de bundling para minimizar downtime
     - Alertas de timing optimal para trabajos relacionados
     - Recomendaciones de inspección preventiva
   }
   ```

---

## 8. **FraudDetectionService** - Anomaly Detection

### **Funcionalidad Principal**
- **Propósito**: Detectar gastos sospechosos y prevenir fraude en tiempo real
- **Tecnología**: Machine Learning + Pattern Recognition + Statistical Analysis
- **Performance**: <2 segundos para analizar gasto completo
- **Accuracy**: 89% detección fraude real, 5% falsos positivos

### **Interface del Servicio**
```typescript
class FraudDetectionService {
  async analyzeExpenseForFraud(expense: Expense, context: FraudContext): Promise<FraudAssessment>;
  async updateFraudPatterns(confirmedFraud: FraudCase[]): Promise<void>;
  async getEmployeeRiskProfile(employeeId: string): Promise<RiskProfile>;
  async generateFraudReport(period: DateRange): Promise<FraudReport>;
}

interface FraudContext {
  employeeHistory: EmployeeExpenseHistory;
  vehicleLocation: GPSData;
  recentActivity: RecentActivity[];
  marketPrices: MarketPriceData;
  supplierDatabase: SupplierInfo[];
}

interface FraudAssessment {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedAnomalies: Anomaly[];
  recommendedAction: 'approve' | 'review' | 'investigate' | 'block';
  confidence: number;
  similarCases: SimilarCase[];
  evidence: Evidence[];
}
```

#### **¿Qué hace exactamente FraudDetectionService?**

1. **Análisis de anomalías de precio**:
   ```typescript
   async analyzePriceAnomalies(expense: Expense, marketData: MarketPriceData): Promise<PriceAnomalyResult> {
     // Detección de precios sospechosos
     - Compara vs precios históricos propios (mismo item, mismo proveedor)
     - Valida vs precios de mercado actuales en la región
     - Detecta inflaciones anómalas (>30% diferencia sin justificación)
     - Identifica patrones de precios "redondos" sospechosos ($100k exactos)
     - Considera fluctuaciones estacionales y de mercado normales
     - Detecta precios inconsistentes entre items relacionados
     - Alerta sobre descuentos o incrementos inusuales
   }
   ```

2. **Análisis de comportamiento de proveedores**:
   ```typescript
   async analyzeSupplierBehavior(expense: Expense, supplierHistory: SupplierHistory): Promise<SupplierRiskResult> {
     // Evaluación de riesgo por proveedor
     - Evalúa historial y confiabilidad del proveedor
     - Detecta proveedores nuevos con gastos desproporcionadamente altos
     - Identifica frecuencia anómala de uso del mismo proveedor
     - Valida ubicación del proveedor vs operación normal del vehículo
     - Detecta proveedores con patrones de facturación sospechosos
     - Identifica "proveedores fantasma" o con datos inconsistentes
     - Analiza red de conexiones entre empleados y proveedores
   }
   ```

3. **Análisis temporal y geográfico**:
   ```typescript
   async analyzeTemporalAndGeoPatterns(expense: Expense, context: LocationTimeContext): Promise<PatternAnalysisResult> {
     // Detección de patrones sospechosos de tiempo y ubicación
     - Detecta gastos registrados fuera de horario laboral sin justificación
     - Identifica frecuencia inusual de compras (múltiples en mismo día)
     - Evalúa timing vs necesidad real (mantenimiento muy temprano/tardío)
     - Detecta patrones de "fin de mes" para agotar presupuestos
     - Valida coherencia geográfica (vehículo estaba donde dice la factura)
     - Identifica desviaciones inusuales de rutas normales de operación
     - Detecta actividad en ubicaciones atípicas sin explicación
   }
   ```

4. **Análisis de comportamiento de empleados**:
   ```typescript
   async analyzeEmployeeBehavior(expense: Expense, employeeProfile: EmployeeProfile): Promise<BehaviorAnalysisResult> {
     // Detección de comportamientos anómalos de empleados
     - Compara patrón de gastos vs histórico personal del empleado
     - Detecta spikes súbitos en frecuencia o monto de gastos
     - Identifica desviaciones del rol y responsabilidades asignadas
     - Evalúa coherencia con autorización y límites establecidos
     - Detecta patrones de timing sospechosos (fines de semana, feriados)
     - Identifica posibles colusión con proveedores específicos
     - Analiza consistencia en calidad de documentación de respaldo
   }
   ```

5. **Cross-validation inteligente**:
   ```typescript
   async performCrossValidation(expense: Expense, multipleDataSources: DataSources): Promise<CrossValidationResult> {
     // Validación cruzada de múltiples fuentes de datos
     - Verifica ubicación real del vehículo vs ubicación de compra
     - Valida necesidad del gasto vs historial de mantenimiento
     - Detecta duplicaciones parciales o completas de gastos
     - Evalúa coherencia con órdenes de trabajo abiertas
     - Verifica autorizaciones previas y límites de gasto
     - Contrasta con presupuestos aprobados y disponibilidad
     - Valida timing vs cronogramas de mantenimiento establecidos
   }
   ```

6. **Learning y adaptación**:
   ```typescript
   async adaptAndLearn(confirmedCases: ConfirmedFraudCases, falsePositives: FalsePositives): Promise<void> {
     // Mejora continua del sistema de detección
     - Actualiza modelos con casos confirmados de fraude
     - Reduce peso de indicadores que generan falsos positivos
     - Ajusta umbrales basado en feedback de usuarios
     - Incorpora nuevos patrones de fraude descubiertos
     - Personaliza detección por perfil de empresa/industria
     - Mejora accuracy balanceando detección vs usabilidad
   }
   ```

---

## 9. **PriceOptimizationService** - Market Intelligence

### **Funcionalidad Principal**
- **Propósito**: Optimizar costos automáticamente mediante inteligencia de mercado
- **Tecnología**: Market Analysis + Recommendation Engine + Price Monitoring
- **Performance**: <3 segundos para encontrar alternativas
- **Accuracy**: 78% de recomendaciones resultan en ahorros reales

### **Interface del Servicio**
```typescript
class PriceOptimizationService {
  async findBetterPrices(item: ItemRequest): Promise<PriceOptimization>;
  async monitorMarketPrices(items: string[]): Promise<PriceMonitoringResult>;
  async negotiateWithSupplier(supplier: Supplier, volume: PurchaseVolume): Promise<NegotiationSuggestion>;
  async optimizePurchaseTiming(plannedPurchases: Purchase[]): Promise<TimingOptimization>;
}

interface ItemRequest {
  description: string;
  partNumber?: string;
  brand?: string;
  currentPrice: number;
  currentSupplier: string;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'flexible';
  location: GPSCoordinate;
  quantity: number;
}

interface PriceOptimization {
  potentialSavings: number;
  alternativeSuppliers: AlternativeSupplier[];
  bulkOpportunities: BulkOpportunity[];
  timingRecommendations: TimingRecommendation[];
  negotiationOpportunities: NegotiationOpportunity[];
  totalOptimizedCost: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}
```

#### **¿Qué hace exactamente PriceOptimizationService?**

1. **Market scanning inteligente**:
   ```typescript
   async scanMarketPrices(item: ItemRequest): Promise<MarketScanResult> {
     // Búsqueda exhaustiva de precios en el mercado
     - Consulta base de datos de proveedores conocidos y confiables
     - Busca en marketplaces online (MercadoLibre, Linio, etc.)
     - Accede a catálogos de distribuidores automotrices
     - Considera precios históricos y tendencias temporales
     - Evalúa disponibilidad real y tiempos de entrega
     - Verifica calidad y especificaciones técnicas equivalentes
     - Incluye garantías y términos de servicio en comparación
   }
   ```

2. **Cálculo de ahorros reales**:
   ```typescript
   async calculateRealSavings(marketScan: MarketScanResult, item: ItemRequest): Promise<SavingsCalculation> {
     // Análisis integral de costos para ahorros verdaderos
     - Incluye costos de transporte y envío en cálculo final
     - Considera tiempo de entrega vs urgencia de la necesidad
     - Evalúa costo de oportunidad del downtime del vehículo
     - Factoriza confiabilidad del proveedor alternativo
     - Incluye costos de setup para proveedores nuevos
     - Calcula ROI total de cambiar de proveedor a largo plazo
     - Considera términos de pago y cash flow impact
   }
   ```

3. **Recomendaciones inteligentes**:
   ```typescript
   async generateSmartRecommendations(savingsCalculation: SavingsCalculation): Promise<SmartRecommendations> {
     // Sugerencias accionables y priorizadas
     - Identifica alternativas con mejor relación precio/calidad
     - Sugiere oportunidades de compra en bulk para descuentos
     - Recomienda timing optimal basado en ciclos de precios
     - Propone estrategias de negociación con proveedores actuales
     - Identifica items donde calidad premium no justifica sobreprecio
     - Sugiere diversificación de proveedores para mejor poder de negociación
   }
   ```

4. **Análisis de oportunidades de bulk**:
   ```typescript
   async identifyBulkOpportunities(item: ItemRequest, fleetData: FleetData): Promise<BulkOpportunityAnalysis> {
     // Identificación de economías de escala
     - Analiza consumo histórico del item en toda la flota
     - Identifica otros vehículos que necesitarán el mismo item pronto
     - Calcula descuentos potenciales por volumen
     - Considera costos de almacenamiento vs ahorros de bulk
     - Evalúa riesgo de obsolescencia de inventory
     - Sugiere timing para maximizar participación en bulk purchase
   }
   ```

5. **Optimización temporal**:
   ```typescript
   async optimizePurchaseTiming(purchases: Purchase[], marketTrends: MarketTrends): Promise<TimingOptimization> {
     // Estrategia temporal para maximizar ahorros
     - Identifica patrones estacionales de precios (neumáticos baratos en enero)
     - Detecta ciclos de descuentos de proveedores específicos
     - Sugiere diferir compras no urgentes para mejor pricing
     - Identifica ventanas de oportunidad para negotiation
     - Considera factores macroeconómicos (inflación, tipo de cambio)
     - Optimiza cash flow diferendo compras inteligentemente
   }
   ```

6. **Learning y mejora continua**:
   ```typescript
   async learnAndImprove(recommendations: Recommendations, outcomes: PurchaseOutcomes): Promise<void> {
     // Aprendizaje de decisiones exitosas y fallidas
     - Aprende de decisiones exitosas del usuario para personalizar
     - Ajusta recomendaciones basado en preferencias específicas
     - Mejora accuracy de predicciones de ahorro
     - Optimiza balance entre precio, calidad y conveniencia
     - Refina algoritmos de timing basado en resultados reales
     - Actualiza database de proveedores con performance real
   }
   ```

---

## 10. **PredictiveMaintenanceService** - Predictive Analytics

### **Funcionalidad Principal**
- **Propósito**: Predecir mantenimientos futuros y optimizar cronogramas
- **Tecnología**: Predictive Analytics + Machine Learning + Domain Expertise
- **Performance**: <5 segundos para generar predicciones completas
- **Accuracy**: 84% accuracy en predicciones a 3 meses, 92% en identificación de urgencias

### **Interface del Servicio**
```typescript
class PredictiveMaintenanceService {
  async predictNextMaintenance(vehicleId: string): Promise<MaintenancePrediction>;
  async optimizeMaintenanceSchedule(vehicleIds: string[]): Promise<OptimizedSchedule>;
  async detectPreFailureSignals(expense: Expense): Promise<PreFailureAnalysis>;
  async updatePredictionsWithRealData(maintenance: CompletedMaintenance): Promise<void>;
}

interface MaintenancePrediction {
  vehicleId: string;
  predictions: ComponentPrediction[];
  overallRiskScore: number;
  recommendedActions: RecommendedAction[];
  costProjections: CostProjection[];
  timingOptimizations: TimingOptimization[];
  confidence: number;
  dataQuality: number;
}

interface ComponentPrediction {
  component: string;
  failureProbability: number;
  estimatedFailureDate: Date;
  confidenceInterval: DateRange;
  costIfPreventive: number;
  costIfReactive: number;
  recommendedAction: 'monitor' | 'inspect' | 'schedule' | 'immediate';
}
```

#### **¿Qué hace exactamente PredictiveMaintenanceService?**

1. **Análisis de patrones históricos**:
   ```typescript
   async analyzeHistoricalPatterns(vehicleId: string): Promise<HistoricalPatternAnalysis> {
     // Análisis profundo del comportamiento histórico del vehículo
     - Evalúa historial completo de mantenimientos y reparaciones
     - Identifica ciclos reales vs ideales de mantenimiento
     - Detecta aceleración o desaceleración de deterioro
     - Considera patrones estacionales y de uso específicos
     - Analiza correlaciones entre diferentes sistemas/componentes
     - Identifica "signature patterns" de failure modes específicos
     - Compara con baseline de vehículos similares
   }
   ```

2. **Predicción inteligente multi-componente**:
   ```typescript
   async generateComponentPredictions(patterns: HistoricalPatternAnalysis, currentState: VehicleState): Promise<ComponentPredictions> {
     // Predicciones específicas por sistema/componente
     - Calcula probabilidad de falla por cada componente crítico
     - Estima timing optimal para mantenimientos preventivos
     - Considera interdependencias entre sistemas (motor → transmisión)
     - Optimiza balance entre costo vs riesgo de falla
     - Incorpora wear patterns específicos del tipo de operación
     - Ajusta por condiciones ambientales y uso real
     - Detecta cascading failures potenciales
   }
   ```

3. **Optimización de bundling**:
   ```typescript
   async optimizeMaintenanceBundling(predictions: ComponentPredictions): Promise<BundlingOptimization> {
     // Optimización de trabajos simultáneos
     - Identifica mantenimientos que se pueden combinar eficientemente
     - Optimiza visitas al taller para minimizar downtime total
     - Sugiere timing para aprovechar oportunidades de bundling
     - Considera accesibilidad de componentes para trabajos simultáneos
     - Minimiza costos totales de mano de obra especializada
     - Optimiza uso de herramientas y equipos especializados
   }
   ```

4. **Alertas proactivas inteligentes**:
   ```typescript
   async generateProactiveAlerts(predictions: ComponentPredictions, businessContext: BusinessContext): Promise<ProactiveAlerts> {
     // Sistema de alertas tempranas graduales
     - Notifica ANTES que problemas se vuelvan urgentes/costosos
     - Sugiere preparación de repuestos con lead time adecuado
     - Recomienda booking de citas en talleres especializados
     - Alerta sobre componentes próximos a falla con sufficient warning
     - Propone inspecciones preventivas en timing optimal
     - Considera calendario operacional para timing de maintenance
   }
   ```

5. **Análisis de señales de pre-falla**:
   ```typescript
   async analyzePreFailureSignals(expense: Expense, vehicleHistory: VehicleHistory): Promise<PreFailureSignalAnalysis> {
     // Detección temprana basada en gastos actuales
     - Detecta si gasto actual indica deterioro acelerado
     - Identifica "warning signs" en patrones de gastos recientes
     - Correlaciona tipos de reparación con potential upcoming failures
     - Detecta frequency spikes que indican wear acelerado
     - Identifica maintenance deferral que puede causar problemas mayores
     - Sugiere inspecciones adicionales basadas en early warning signs
   }
   ```

6. **Optimización de ROI de mantenimiento**:
   ```typescript
   async optimizeMaintenanceROI(predictions: ComponentPredictions, costData: CostData): Promise<ROIOptimization> {
     // Maximización del retorno de inversión en mantenimiento
     - Calcula ROI de preventive vs reactive maintenance por componente
     - Identifica sweet spot de timing para maximize cost-benefit ratio
     - Proyecta impact en valor residual del vehículo
     - Optimiza strategy mix entre preventive, predictive y reactive
     - Considera opportunity cost de downtime en cálculos ROI
     - Sugiere threshold points para replacement vs continued maintenance
   }
   ```

---

# 🔄 FLUJO DE INTEGRACIÓN ENTRE COMPONENTES

## Flujo Completo de Registro de Gasto con Todos los Servicios

### **Secuencia Detallada (Lo que experimenta el usuario)**
```typescript
// TIMELINE: 15 segundos total, 2 interacciones del usuario

// T+0s: Usuario abre app
1. QuickExpenseEntry se renderiza
   - SmartCameraCapture se auto-inicializa
   - GPS location se captura en background

// T+2s: Usuario toma foto del recibo
2. SmartCameraCapture.onPhotoCapture()
   - Foto se procesa localmente (optimización)
   - OCRIntelligenceService.analyzeReceipt() starts en background
   - UI muestra "Leyendo recibo..." con spinner

// T+5s: OCR completa extracción
3. OCRResult disponible
   - SmartExpenseInput se auto-completa con datos OCR
   - ExpenseCategorizationService.categorizeExpense() ejecuta en paralelo
   - SmartVehicleSelector recibe sugerencias de IA

// T+8s: Categorización completa
4. CategoryResult disponible
   - FraudDetectionService.analyzeExpenseForFraud() ejecuta
   - PriceOptimizationService.findBetterPrices() ejecuta en paralelo
   - SmartVehicleSelector muestra sugerencia con 95% confidence

// T+12s: Usuario confirma vehículo sugerido (1 tap)
5. Validaciones finales completan
   - FraudAssessment: "Low risk, auto-approve"
   - PriceOptimization: "6k savings available at López"
   - OneClickSave habilitado con preview

// T+15s: Usuario toca "Guardar" (1 tap)
6. OneClickSave.onSave() ejecuta
   - Datos se guardan localmente (optimistic UI)
   - Workflow de aprobación se dispara automáticamente
   - PredictiveMaintenanceService actualiza próximos mantenimientos
   - Usuario ve confirmación: "✅ Guardado + $6k ahorro disponible"

TOTAL USUARIO: 15 segundos, 2 taps, 0 typing
```

### **Secuencia Backend (Lo que ejecuta IA invisiblemente)**
```typescript
// BACKEND PIPELINE: 47 operaciones automáticas en paralelo

// Fase 1: Captura y procesamiento (T+0 a T+5s)
1. OCRIntelligenceService.preprocessImage()
2. OCRIntelligenceService.extractText() - múltiples engines
3. OCRIntelligenceService.parseStructuredData()
4. OCRIntelligenceService.validateAndEnrich()
5. GPS location capture y geocoding
6. Vehicle proximity calculation

// Fase 2: Análisis inteligente (T+5s a T+10s)
7. ExpenseCategorizationService.analyzeSemantics()
8. ExpenseCategorizationService.categorizeMultiLevel()
9. ExpenseCategorizationService.enrichWithContext()
10. ExpenseCategorizationService.validateCoherence()
11. FraudDetectionService.analyzePriceAnomalies()
12. FraudDetectionService.analyzeSupplierBehavior()
13. FraudDetectionService.analyzeTemporalAndGeoPatterns()
14. FraudDetectionService.analyzeEmployeeBehavior()
15. FraudDetectionService.performCrossValidation()

// Fase 3: Optimización y sugerencias (T+8s a T+12s)
16. PriceOptimizationService.scanMarketPrices()
17. PriceOptimizationService.calculateRealSavings()
18. PriceOptimizationService.generateSmartRecommendations()
19. PriceOptimizationService.identifyBulkOpportunities()
20. Vehicle inference basado en ubicación + historial
21. Vehicle confidence scoring
22. Approval routing calculation

// Fase 4: Guardado y workflow (T+12s a T+15s)
23. Data validation final
24. Local storage optimistic save
25. Database transaction inicio
26. Audit log creation
27. Approval workflow trigger
28. Notification dispatch logic
29. Budget impact calculation
30. KPI updates

// Fase 5: Background processing (T+15s+)
31. PredictiveMaintenanceService.analyzePreFailureSignals()
32. PredictiveMaintenanceService.updatePredictionsWithRealData()
33. MaintenanceSchedule updates
34. Analytics pipeline updates
35. Dashboard real-time updates
36. Learning models feedback
37. Market price database updates
38. Supplier performance tracking
39. Employee pattern analysis updates
40. Fleet benchmarking updates
41. Seasonal pattern analysis
42. Cash flow projections updates
43. Integration syncs (accounting systems)
44. Backup and replication
45. Performance metrics collection
46. Error monitoring and alerting
47. System health checks

TOTAL IA: 47 operaciones inteligentes, usuario ve solo el resultado final
```

## Estados de Loading y Feedback del Usuario

### **Estados Inteligentes por Componente**
```typescript
// Estados granulares que informan progreso sin agobiar

interface ComponentLoadingState {
  // Estados básicos
  idle: boolean;
  loading: boolean;
  success: boolean;
  error: string | null;

  // Estados específicos IA
  aiProcessing: boolean;
  aiProgress: number; // 0-100
  aiConfidence: number; // 0-100
  aiStage: 'ocr' | 'categorizing' | 'validating' | 'optimizing';

  // Feedback específico
  userFeedback: string; // "Leyendo recibo...", "✅ $50k detectado"
  nextAction?: string; // "Confirma vehículo", "Revisa categoría"
}

// Progresión de feedback por componente:
SmartCameraCapture: "Capturando..." → "Procesando imagen..." → "✅ Recibo leído"
SmartExpenseInput: "Clasificando gasto..." → "Validando precio..." → "✅ $50k - Filtros de aceite"
SmartVehicleSelector: "Analizando ubicación..." → "✅ Sugerimos ABC-123 (95% seguro)"
OneClickSave: "Validando datos..." → "Guardando..." → "✅ Guardado + $6k ahorro disponible"
```

### **Error Handling y Recovery**
```typescript
// Manejo graceful de errores con recovery automático

interface ErrorRecoveryStrategy {
  // OCR falló
  ocrError: {
    strategy: 'retry_enhanced' | 'manual_entry' | 'voice_input';
    fallback: 'Permite entrada manual con sugerencias IA';
    userMessage: 'No pudimos leer el recibo. ¿Puedes escribir el monto?';
  };

  // Categorización incierta
  lowConfidenceCategory: {
    strategy: 'show_alternatives' | 'manual_selection';
    fallback: 'Muestra 3 opciones más probables para que usuario seleccione';
    userMessage: 'No estamos seguros de la categoría. ¿Es Motor, Frenos o Filtros?';
  };

  // Precio sospechoso
  fraudAlert: {
    strategy: 'require_confirmation' | 'request_justification';
    fallback: 'Permite continuar con justificación obligatoria';
    userMessage: 'Este precio parece alto. ¿Puedes confirmar que es correcto?';
  };

  // Network error
  networkError: {
    strategy: 'offline_mode' | 'retry_with_backoff';
    fallback: 'Guarda localmente, sincroniza cuando regrese conexión';
    userMessage: 'Sin conexión. Guardado localmente, se sincronizará después.';
  };
}
```

---

# 📁 ESTRUCTURA DE CARPETAS Y ARCHIVOS

## Frontend Structure
```
src/
├── components/
│   ├── financial/
│   │   ├── QuickExpenseEntry/
│   │   │   ├── index.tsx                    // Componente principal
│   │   │   ├── SmartCameraCapture.tsx       // Captura + OCR
│   │   │   ├── SmartVehicleSelector.tsx     // Selección inteligente
│   │   │   ├── SmartExpenseInput.tsx        // Input inteligente
│   │   │   ├── OneClickSave.tsx             // Guardado optimizado
│   │   │   └── hooks/
│   │   │       ├── useOCRProcessing.ts      // Hook para OCR
│   │   │       ├── useExpenseValidation.ts  // Hook para validación
│   │   │       └── useAIInsights.ts         // Hook para insights IA
│   │   │
│   │   ├── FinancialDashboard/
│   │   │   ├── index.tsx
│   │   │   ├── FinancialKPICards.tsx        // KPIs principales
│   │   │   ├── SmartExpenseList.tsx         // Lista inteligente
│   │   │   ├── AIInsightsPanel.tsx          // Panel de insights
│   │   │   └── hooks/
│   │   │       ├── useFinancialKPIs.ts      // Hook para KPIs
│   │   │       ├── useRealTimeUpdates.ts    // Hook para updates
│   │   │       └── useAIInsights.ts         // Hook para insights
│   │   │
│   │   ├── ApprovalWorkflow/
│   │   │   ├── index.tsx
│   │   │   ├── SmartApprovalCard.tsx        // Tarjetas de aprobación
│   │   │   ├── ApprovalTimeline.tsx         // Timeline de proceso
│   │   │   ├── BulkApprovalInterface.tsx    // Aprobaciones bulk
│   │   │   └── hooks/
│   │   │       ├── useApprovalLogic.ts      // Hook para lógica
│   │   │       ├── useBulkActions.ts        // Hook para bulk
│   │   │       └── useApprovalTracking.ts   // Hook para tracking
│   │   │
│   │   ├── FraudDetection/
│   │   │   ├── index.tsx
│   │   │   ├── FraudAlertCard.tsx           // Alertas de fraude
│   │   │   ├── AnomalyVisualization.tsx     // Visualización anomalías
│   │   │   └── hooks/
│   │   │       ├── useFraudDetection.ts     // Hook para detección
│   │   │       └── useFraudReporting.ts     // Hook para reportes
│   │   │
│   │   └── VehicleFinancial/
│   │       ├── index.tsx
│   │       ├── VehicleCostSummary.tsx       // Resumen costos
│   │       ├── MaintenanceROI.tsx           // ROI mantenimiento
│   │       ├── PredictiveCostAnalysis.tsx   // Análisis predictivo
│   │       └── hooks/
│   │           ├── useVehicleFinancials.ts  // Hook para financials
│   │           ├── usePredictiveAnalysis.ts // Hook para predicciones
│   │           └── useROICalculations.ts    // Hook para ROI
│   │
│   └── shared/
│       ├── LoadingStates/
│       ├── ErrorBoundaries/
│       ├── AIFeedback/
│       └── ConfidenceIndicators/
│
├── services/
│   ├── ai/
│   │   ├── ocrIntelligence.service.ts       // Servicio OCR
│   │   ├── expenseCategorization.service.ts // Servicio categorización
│   │   ├── fraudDetection.service.ts        // Servicio fraude
│   │   ├── priceOptimization.service.ts     // Servicio optimización
│   │   ├── predictiveMaintenance.service.ts // Servicio predictivo
│   │   └── aiCoordinator.service.ts         // Coordinador de servicios IA
│   │
│   ├── api/
│   │   ├── expenses.service.ts              // API expenses
│   │   ├── workOrders.service.ts            // API work orders
│   │   ├── approvals.service.ts             // API approvals
│   │   └── analytics.service.ts             // API analytics
│   │
│   └── storage/
│       ├── localCache.service.ts            // Cache local
│       ├── offlineSync.service.ts           // Sync offline
│       └── dataSync.service.ts              // Sincronización
│
├── hooks/
│   ├── financial/
│   │   ├── useQuickExpenseEntry.ts          // Hook principal
│   │   ├── useFinancialDashboard.ts         // Hook dashboard
│   │   ├── useApprovalWorkflow.ts           // Hook aprobaciones
│   │   └── useFraudDetection.ts             // Hook fraude
│   │
│   └── ai/
│       ├── useOCRProcessing.ts              // Hook OCR
│       ├── useAIValidation.ts               // Hook validación IA
│       ├── useSmartSuggestions.ts           // Hook sugerencias
│       └── usePredictiveInsights.ts         // Hook insights predictivos
│
├── types/
│   ├── financial.types.ts                   // Types financieros
│   ├── ai.types.ts                          // Types IA
│   ├── approval.types.ts                    // Types aprobaciones
│   └── fraud.types.ts                       // Types fraude
│
└── utils/
    ├── ai/
    │   ├── confidence.utils.ts              // Utils confidence
    │   ├── validation.utils.ts              // Utils validación
    │   └── optimization.utils.ts            // Utils optimización
    │
    └── financial/
        ├── calculations.utils.ts            // Utils cálculos
        ├── formatting.utils.ts              // Utils formato
        └── export.utils.ts                  // Utils export
```

## Backend Structure
```
backend/
├── src/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── ocr/
│   │   │   │   ├── OCRIntelligenceService.ts
│   │   │   │   ├── imagePreprocessor.ts
│   │   │   │   ├── textExtractor.ts
│   │   │   │   └── dataParser.ts
│   │   │   │
│   │   │   ├── nlp/
│   │   │   │   ├── ExpenseCategorizationService.ts
│   │   │   │   ├── semanticAnalyzer.ts
│   │   │   │   ├── categoryClassifier.ts
│   │   │   │   └── contextEnricher.ts
│   │   │   │
│   │   │   ├── fraud/
│   │   │   │   ├── FraudDetectionService.ts
│   │   │   │   ├── anomalyDetector.ts
│   │   │   │   ├── patternAnalyzer.ts
│   │   │   │   └── riskScorer.ts
│   │   │   │
│   │   │   ├── pricing/
│   │   │   │   ├── PriceOptimizationService.ts
│   │   │   │   ├── marketScanner.ts
│   │   │   │   ├── savingsCalculator.ts
│   │   │   │   └── recommendationEngine.ts
│   │   │   │
│   │   │   └── predictive/
│   │   │       ├── PredictiveMaintenanceService.ts
│   │   │       ├── patternAnalyzer.ts
│   │   │       ├── failurePrediction.ts
│   │   │       └── optimizationEngine.ts
│   │   │
│   │   ├── core/
│   │   │   ├── expenses.service.ts
│   │   │   ├── workOrders.service.ts
│   │   │   ├── approvals.service.ts
│   │   │   └── notifications.service.ts
│   │   │
│   │   └── integrations/
│   │       ├── whatsapp.service.ts
│   │       ├── email.service.ts
│   │       └── accounting.service.ts
│   │
│   ├── controllers/
│   │   ├── financial/
│   │   │   ├── expensesController.ts
│   │   │   ├── workOrdersController.ts
│   │   │   ├── approvalsController.ts
│   │   │   └── analyticsController.ts
│   │   │
│   │   └── ai/
│   │       ├── ocrController.ts
│   │       ├── categorizationController.ts
│   │       ├── fraudController.ts
│   │       └── predictiveController.ts
│   │
│   ├── middleware/
│   │   ├── aiValidation.middleware.ts
│   │   ├── fraudDetection.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   ├── models/
│   │   ├── financial/
│   │   │   ├── Expense.model.ts
│   │   │   ├── WorkOrder.model.ts
│   │   │   └── Approval.model.ts
│   │   │
│   │   └── ai/
│   │       ├── OCRResult.model.ts
│   │       ├── CategoryResult.model.ts
│   │       └── FraudAssessment.model.ts
│   │
│   ├── routes/
│   │   ├── api/
│   │   │   ├── expenses.routes.ts
│   │   │   ├── workOrders.routes.ts
│   │   │   ├── approvals.routes.ts
│   │   │   └── ai.routes.ts
│   │   │
│   │   └── webhooks/
│   │       ├── whatsapp.routes.ts
│   │       └── accounting.routes.ts
│   │
│   └── utils/
│       ├── ai/
│       │   ├── confidence.utils.ts
│       │   ├── validation.utils.ts
│       │   └── learning.utils.ts
│       │
│       ├── financial/
│       │   ├── calculations.utils.ts
│       │   ├── approvals.utils.ts
│       │   └── reporting.utils.ts
│       │
│       └── security/
│           ├── encryption.utils.ts
│           ├── audit.utils.ts
│           └── compliance.utils.ts
│
├── config/
│   ├── ai.config.ts                         // Configuración IA
│   ├── database.config.ts                   // Config DB
│   └── integrations.config.ts               // Config integraciones
│
├── tests/
│   ├── ai/
│   │   ├── ocr.test.ts
│   │   ├── categorization.test.ts
│   │   ├── fraud.test.ts
│   │   └── predictive.test.ts
│   │
│   ├── financial/
│   │   ├── expenses.test.ts
│   │   ├── workOrders.test.ts
│   │   └── approvals.test.ts
│   │
│   └── integration/
│       ├── ai-pipeline.test.ts
│       ├── end-to-end.test.ts
│       └── performance.test.ts
│
└── docs/
    ├── ai/
    │   ├── ocr-accuracy.md
    │   ├── fraud-detection.md
    │   └── predictive-models.md
    │
    └── api/
        ├── expenses-api.md
        ├── approvals-api.md
        └── ai-endpoints.md
```

---

*Documento completo con especificación detallada de todos los componentes del sistema IA-First de Fleet Care*
*Generado durante sesión del 23 de Septiembre 2025*
*Contiene arquitectura completa, funcionalidades específicas, interfaces, y estructura de archivos*