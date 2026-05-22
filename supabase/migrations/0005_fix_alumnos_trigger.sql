-- ============================================================
-- 0005_fix_alumnos_trigger.sql
-- Stenbrary — Fase 2.1 (Fix trigger erróneo en alumnos)
--
-- BUG ORIGEN (en 0003_data_tables.sql):
-- Adjunté el trigger genérico `trg_alumnos_updated_at` que llama a
-- `set_updated_at()` (definido en 0001). Esa función hace
-- `new.updated_at := now()`, pero la tabla `alumnos` no tiene columna
-- `updated_at` — usa `fecha_actualizacion` (para alinear con el
-- modelo TypeScript del local). Al hacer UPDATE/UPSERT, Postgres tira
-- 42703 "record 'new' has no field 'updated_at'".
--
-- FIX: dropear el trigger genérico. El trigger específico
-- `trg_alumnos_fecha_act` (también de 0003) ya hace lo correcto:
-- `new.fecha_actualizacion := now()`.
--
-- Lección: cuando una tabla diverge en nombres de columna, no aplicar
-- triggers genéricos que asumen el nombre estándar.
-- ============================================================

drop trigger if exists trg_alumnos_updated_at on public.alumnos;

-- ============================================================
-- FIN — 0005_fix_alumnos_trigger.sql
-- ============================================================
