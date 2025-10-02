# Guía de Patrones de Diseño para un SaaS Moderno con React y Next.js

Este documento actualiza las propuestas de patrones de diseño, alineándolas con las prácticas modernas del ecosistema de React (versiones 16.8+), que se basan en **Componentes Funcionales y Hooks**.

El objetivo es aplicar la lógica atemporal de los patrones de diseño clásicos de una manera que sea idiomática, eficiente y mantenible en un stack de frontend moderno.

## El Cambio de Paradigma: De Clases a Funciones y Hooks

Los componentes de clase en React han sido reemplazados por componentes funcionales por varias razones clave:
- **Simplicidad y Legibilidad:** Menos código repetitivo (`boilerplate`), sin la necesidad de entender el comportamiento de `this`.
- **Lógica Reutilizable:** Los **Custom Hooks** permiten extraer y reutilizar lógica con estado entre componentes de una manera mucho más limpia que los Mixins o los Componentes de Orden Superior (HOCs).
- **Mejor Composición:** Los Hooks permiten organizar la lógica dentro de un componente por funcionalidad (ej: un `useEffect` para fetching de datos, otro para suscripciones), en lugar de forzar la separación por métodos de ciclo de vida (`componentDidMount`, `componentDidUpdate`).

---

## 1. Patrón Strategy

**Propósito:** Permitir la selección de un algoritmo o comportamiento en tiempo de ejecución. Ideal para manejar diferentes niveles de suscripción (Free, Pro, Enterprise).

### Implementación Backend
La implementación con clases en el backend sigue siendo una excelente opción. Define una interfaz `SubscriptionStrategy` y clases concretas como `FreeStrategy`, `ProStrategy`, etc.

### Implementación Frontend (Moderna)

En lugar de clases, usamos un **React Context** combinado con un **Custom Hook** para distribuir la "estrategia" de suscripción a través de la aplicación.

1.  **Crear el Contexto y el Proveedor:**

    ```typescript
    // src/contexts/SubscriptionContext.tsx
    import { createContext, useContext, ReactNode } from 'react';

    // Define la forma de tu estrategia
    interface SubscriptionStrategy {
      plan: 'Free' | 'Pro';
      canAccess: (feature: string) => boolean;
    }

    const SubscriptionContext = createContext<SubscriptionStrategy | null>(null);

    export const SubscriptionProvider = ({ children, strategy }: { children: ReactNode; strategy: SubscriptionStrategy }) => {
      return (
        <SubscriptionContext.Provider value={strategy}>
          {children}
        </SubscriptionContext.Provider>
      );
    };

    // Custom Hook para consumir el contexto
    export const useSubscription = () => {
      const context = useContext(SubscriptionContext);
      if (!context) {
        throw new Error('useSubscription debe ser usado dentro de un SubscriptionProvider');
      }
      return context;
    };
    ```

2.  **Usar el Hook en un Componente Funcional:**

    ```tsx
    // src/components/Dashboard.tsx
    import { useSubscription } from '@/contexts/SubscriptionContext';

    const Dashboard = () => {
      const { plan, canAccess } = useSubscription();

      return (
        <div>
          <h1>Bienvenido al Plan {plan}</h1>
          {canAccess('advancedAnalytics') ? (
            <AdvancedAnalytics />
          ) : (
            <p>
              Actualiza al plan Pro para acceder a nuestras analíticas avanzadas.
            </p>
          )}
        </div>
      );
    };
    ```

---

## 2. Patrón Observer

**Propósito:** Establecer una relación de uno a muchos donde, si un objeto (el "sujeto") cambia de estado, todos sus dependientes (los "observadores") son notificados automáticamente.

### Implementación Backend
Perfecto para notificaciones en tiempo real (ej: estado de un vehículo). Usar WebSockets (con librerías como `Socket.IO` o `ws`) es la implementación correcta.

### Implementación Frontend (Moderna)

La suscripción manual a eventos en el frontend se simplifica con el hook `useEffect`. Sin embargo, para el fetching y la sincronización de datos del servidor, el estándar de oro hoy en día son librerías como **TanStack Query (React Query)** o **SWR**.

#### Opción 1: `useEffect` (para suscripciones simples)

```tsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io();

const VehicleStatusTracker = ({ vehicleId }: { vehicleId: string }) => {
  const [status, setStatus] = useState('Conectando...');

  useEffect(() => {
    // Función que se ejecuta cuando el componente se monta o vehicleId cambia
    const handleStatusUpdate = (newStatus: string) => {
      setStatus(newStatus);
    };

    socket.emit('subscribeToVehicle', vehicleId);
    socket.on(`statusUpdate:${vehicleId}`, handleStatusUpdate);

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    return () => {
      socket.off(`statusUpdate:${vehicleId}`, handleStatusUpdate);
      socket.emit('unsubscribeFromVehicle', vehicleId);
    };
  }, [vehicleId]); // El efecto depende de vehicleId

  return <div>Estado del Vehículo {vehicleId}: <strong>{status}</strong></div>;
};
```

#### Opción 2 (Recomendada): Usar TanStack Query

**TanStack Query** abstrae el fetching, cacheo, y la actualización en tiempo real. Actúa como un "observador" del estado de tu servidor.

```tsx
// src/hooks/useVehicle.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Tu cliente de API

export const useVehicle = (vehicleId: string) => {
  return useQuery({
    queryKey: ['vehicle', vehicleId], // Clave única para esta query
    queryFn: async () => api.getVehicle(vehicleId), // Función que hace el fetch
    refetchInterval: 5000, // Opcional: Vuelve a hacer fetch cada 5 segundos
    // También se puede integrar con WebSockets para actualizaciones en tiempo real
  });
};

// En el componente
const VehicleDetails = ({ vehicleId }: { vehicleId: string }) => {
  const { data: vehicle, isLoading, isError } = useVehicle(vehicleId);

  if (isLoading) return <div>Cargando...</div>;
  if (isError) return <div>Error al cargar el vehículo.</div>;

  return (
    <div>
      <h2>{vehicle.name}</h2>
      <p>Estado: {vehicle.status}</p>
    </div>
  );
};
```

---

## 3. Patrón Singleton (Revisado como Estado Global)

**Propósito:** Asegurar que una clase tenga una única instancia y proporcionar un punto de acceso global a ella.

### Crítica en el Frontend
Este patrón es a menudo un **anti-patrón en React**. Oculta dependencias, dificulta las pruebas y va en contra del flujo de datos unidireccional.

### Alternativas Modernas

#### Opción 1: React Context (para estado simple y de baja frecuencia)

Ideal para temas (claro/oscuro), información de usuario autenticado, o configuraciones que no cambian constantemente.

```tsx
// Ya vimos un ejemplo con SubscriptionContext. Es la misma idea.
```

#### Opción 2: Librerías de Estado Global (para estado complejo)

Para estado que es más complejo o se actualiza con frecuencia, **Zustand** es una solución ligera, potente y moderna.

1.  **Crear un "Store":**

    ```typescript
    // src/stores/useConfigStore.ts
    import { create } from 'zustand';

    interface ConfigState {
      theme: 'light' | 'dark';
      toggleTheme: () => void;
    }

    export const useConfigStore = create<ConfigState>((set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
      })),
    }));
    ```

2.  **Usar el Hook en cualquier componente:**

    ```tsx
    // src/components/ThemeToggler.tsx
    import { useConfigStore } from '@/stores/useConfigStore';

    const ThemeToggler = () => {
      const { theme, toggleTheme } = useConfigStore();

      return (
        <button onClick={toggleTheme}>
          Cambiar a tema {theme === 'light' ? 'oscuro' : 'claro'}
        </button>
      );
    };
    ```

---

## Conclusión

- **Backend:** Los patrones de diseño clásicos basados en clases siguen siendo extremadamente valiosos.
- **Frontend:** Debemos "traducir" la intención de estos patrones a las herramientas idiomáticas de React:
    - **Strategy/Decorator:** Usar Custom Hooks y Composición de Componentes.
    - **Observer:** Usar `useEffect` para suscripciones manuales o, preferiblemente, **TanStack Query** para sincronizar el estado del servidor.
    - **Singleton:** Reemplazar con **React Context** para estado simple o **Zustand/Jotai** para estado global complejo.
