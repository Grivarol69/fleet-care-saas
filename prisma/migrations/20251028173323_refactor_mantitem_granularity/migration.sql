-- =====================================================
-- REFACTORING: MantItem Granularity for Multi-Currency
-- =====================================================
-- Objetivo: Separar datos universales de datos volátiles (precios/moneda)
--
-- Cambios:
-- 1. MantItem: Eliminar campos volátiles (ahora son universales puros)
-- 2. PackageItem: Agregar estimatedTime, renombrar notes ’ technicalNotes
-- 3. VehicleProgramItem: Agregar localNotes para info específica del país
--
-- Migración de datos:
-- - estimatedTime: MantItem ’ PackageItem (universal por tipo de máquina)
-- - technicalNotes: MantItem ’ PackageItem (procedimiento universal)
-- - estimatedCost: Se mantiene en VehicleProgramItem (ya existe, volátil)
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Agregar nuevas columnas
-- =====================================================

-- PackageItem: Agregar estimatedTime (universal por tipo de máquina)
ALTER TABLE "PackageItem"
ADD COLUMN IF NOT EXISTS "estimatedTime" DECIMAL(5,2);

-- PackageItem: Agregar technicalNotes temporal (renombraremos notes después)
ALTER TABLE "PackageItem"
ADD COLUMN IF NOT EXISTS "technicalNotes" TEXT;

-- VehicleProgramItem: Agregar localNotes (info específica del país/tenant)
ALTER TABLE "VehicleProgramItem"
ADD COLUMN IF NOT EXISTS "localNotes" TEXT;

-- =====================================================
-- PASO 2: Migrar datos de MantItem ’ PackageItem
-- =====================================================

-- Migrar estimatedTime: MantItem ’ PackageItem
-- Estrategia: Usar el tiempo del MantItem como base para cada PackageItem
UPDATE "PackageItem" pi
SET "estimatedTime" = mi."estimatedTime"
FROM "MantItem" mi
WHERE pi."mantItemId" = mi.id
  AND pi."estimatedTime" IS NULL;

-- Migrar technicalNotes: MantItem ’ PackageItem
-- Combinar notes existente de PackageItem con technicalNotes de MantItem
UPDATE "PackageItem" pi
SET "technicalNotes" = CASE
  -- Si PackageItem ya tiene notes, combinarlas con technicalNotes de MantItem
  WHEN pi."notes" IS NOT NULL AND pi."notes" != '' AND mi."technicalNotes" IS NOT NULL THEN
    pi."notes" || E'\n\n--- Notas técnicas del procedimiento ---\n' || mi."technicalNotes"
  -- Si solo existe notes en PackageItem, usar eso
  WHEN pi."notes" IS NOT NULL AND pi."notes" != '' THEN
    pi."notes"
  -- Si solo existen technicalNotes en MantItem, usar eso
  WHEN mi."technicalNotes" IS NOT NULL THEN
    mi."technicalNotes"
  -- Si ninguno existe, dejar NULL
  ELSE NULL
END
FROM "MantItem" mi
WHERE pi."mantItemId" = mi.id;

-- =====================================================
-- PASO 3: Eliminar columna antigua y renombrar
-- =====================================================

-- PackageItem: Eliminar la columna notes antigua (ya migrada a technicalNotes)
ALTER TABLE "PackageItem"
DROP COLUMN IF EXISTS "notes";

-- PackageItem: Eliminar estimatedCost (los costos son volátiles, van en VehicleProgramItem)
ALTER TABLE "PackageItem"
DROP COLUMN IF EXISTS "estimatedCost";

-- =====================================================
-- PASO 4: Limpiar MantItem (convertir en "biblia" universal)
-- =====================================================

-- MantItem: Eliminar estimatedTime (ahora en PackageItem)
ALTER TABLE "MantItem"
DROP COLUMN IF EXISTS "estimatedTime";

-- MantItem: Eliminar estimatedCost (ahora en VehicleProgramItem)
ALTER TABLE "MantItem"
DROP COLUMN IF EXISTS "estimatedCost";

-- MantItem: Eliminar technicalNotes (ahora en PackageItem)
ALTER TABLE "MantItem"
DROP COLUMN IF EXISTS "technicalNotes";

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================
-- Ejecutar estas queries manualmente para verificar:
--
-- 1. Verificar que MantItem ya no tiene campos volátiles:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'MantItem'
--    AND column_name IN ('estimatedTime', 'estimatedCost', 'technicalNotes');
--    -- Debe retornar 0 filas
--
-- 2. Verificar que PackageItem tiene los nuevos campos:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'PackageItem'
--    AND column_name IN ('estimatedTime', 'technicalNotes');
--    -- Debe retornar 2 filas
--
-- 3. Verificar migración de datos (sample):
--    SELECT id, "estimatedTime", "technicalNotes"
--    FROM "PackageItem" LIMIT 5;
--
-- 4. Verificar VehicleProgramItem tiene localNotes:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'VehicleProgramItem'
--    AND column_name = 'localNotes';
--    -- Debe retornar 1 fila
-- =====================================================
