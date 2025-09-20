# Propuesta para Dashboard de Super Administrador

Este documento detalla la visión, componentes y métricas para el dashboard de Super Administrador, el centro de control para los operadores de Fleet Care SaaS.

---

## 1. Visión y Objetivos Estratégicos

El Dashboard de Super Administrador no es solo un panel de monitoreo, es el cerebro del negocio. Su propósito es transformar la gestión de reactiva a proactiva, utilizando los datos de todos los tenants para tomar decisiones informadas. 

Los objetivos clave son:

*   **Monitoreo de Salud del Ecosistema:** Saber en tiempo real el estado de cada tenant y de la plataforma en general.
*   **Soporte Proactivo al Cliente:** Anticiparse a los problemas de los clientes antes de que ellos mismos los noten, reforzando la relación y reduciendo la tasa de abandono (churn).
*   **Inteligencia de Negocio:** Entender cómo los clientes usan el producto para guiar el desarrollo futuro.
*   **Identificación de Oportunidades de Venta (Upselling):** Usar datos de uso para ofrecer a los clientes planes superiores, servicios adicionales o configuraciones personalizadas que aporten más valor.

---

## 2. Componentes y Métricas Clave del Dashboard

El dashboard se compondrá de varios widgets o secciones especializadas:

### 2.1. Vista General de Tenants ("Health Check")

Una tabla principal que muestra el estado de todos los clientes de un vistazo.

*   **Métricas por Tenant:**
    *   **Nombre del Tenant**
    *   **Plan / Estado de Suscripción:** 🟢 ACTIVO, 🟡 EN PRUEBA (TRIAL), 🔴 PAGO VENCIDO.
    *   **Nº de Vehículos Activos:** Para monitorear el uso.
    *   **Nº de Usuarios Activos:** Indica qué tan integrado está el sistema en su equipo.
    *   **Fecha de Último Acceso:** Un tenant que no ha ingresado en semanas es una señal de alerta.
    *   **Estado del Onboarding:** ✅ COMPLETADO / ⏳ EN PROGRESO.

### 2.2. Monitor de Uso y Adopción de Features

Esta sección nos dice qué partes del producto son más valiosas para nuestros clientes.

*   **Métricas Clave (agregadas y por tenant):**
    *   **Volumen de Actividad:** Nº de Órdenes de Trabajo creadas, Checklists completados, Registros de Odómetro por semana/mes.
    *   **Tasa de Adopción de Features Premium:** Porcentaje de tenants que utilizan activamente funcionalidades clave como el OCR de facturas, la auditoría de compras o los reportes avanzados.
    *   **Usuarios Activos Diarios/Mensuales (DAU/MAU):** La métrica clásica para medir el "enganche" (engagement) con la plataforma.

### 2.3. Monitor de "Salud" del Mantenimiento (Proactividad)

Aquí es donde nos adelantamos a los problemas de nuestros clientes.

*   **Métricas a Vigilar:**
    *   **Índice de Cumplimiento Promedio:** La métrica "Ideal vs. Real" que definimos. Un tenant con un índice bajo (ej. < 60%) probablemente está teniendo problemas operativos y es un candidato para que lo contactemos y ofrezcamos ayuda.
    *   **Alertas de Mantenimiento Críticas Activas:** Un listado de tenants con la mayor cantidad de mantenimientos vencidos. 
    *   **Tiempo Medio de Cierre de Órdenes de Trabajo:** ¿Cuánto tardan los clientes en solucionar los problemas reportados? Tiempos largos pueden indicar falta de recursos o de uso de la plataforma.

### 2.4. Identificador de Oportunidades de Negocio

Este es el motor de crecimiento. Usa los datos para encontrar oportunidades de venta.

*   **Señales a Rastrear:**
    *   **Proximidad al Límite del Plan:** Un widget que alerte: "El Tenant X está usando 95 de sus 100 vehículos disponibles". Es el momento perfecto para contactarlo y ofrecerle un plan superior.
    *   **Uso Intensivo de Features Específicas:** Si un cliente usa masivamente una función, se le puede ofrecer un paquete de "analítica avanzada" o un servicio de consultoría sobre esa área.
    *   **Bajo Rendimiento Operativo:** Un cliente con un bajo "Índice de Cumplimiento" es una oportunidad para venderle un **servicio de configuración y acompañamiento personalizado** para ayudarle a optimizar sus procesos.

---

## 3. Arquitectura y Acceso

*   **Dominio de Acceso:** Este dashboard debe vivir en un subdominio separado y seguro, por ejemplo: `admin.fleetcaresaas.com`.
*   **Autorización Estricta:** El acceso estará rigurosamente limitado a los usuarios con el rol `SUPER_ADMIN`. El middleware de la aplicación debe ser el encargado de validar este rol en cada petición a este subdominio.
