-- ============================================================
-- CursoMATE — Inserción de insignias por sección
-- Ejecutar:
--   mysql -u root -p clickplus_matematicas_qa < sql/insignias.sql
--
-- idSeccion se resuelve con subquery por nombre de sección.
-- Si la sección no existe, el INSERT se omite sin error.
-- Idempotente: usa INSERT IGNORE + índice único en (idSeccion).
-- ============================================================

USE `clickplus_matematicas_qa`;

-- ── 1. Números reales ──────────────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Explorador del Conjunto ℝ',
  'Completaste todas las lecciones de Números Reales. ¡Dominas la base de las matemáticas!',
  s.idSeccion,
  'bronce'
FROM secciones s
WHERE s.nombre = 'Números reales'
LIMIT 1;

-- ── 2. Álgebra básica ──────────────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Algebrista Iniciado',
  'Superaste Álgebra Básica. Expresiones, variables y operaciones ya son tus aliados.',
  s.idSeccion,
  'bronce'
FROM secciones s
WHERE s.nombre = 'Álgebra básica'
LIMIT 1;

-- ── 3. Ecuaciones ──────────────────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Resolvedor de Ecuaciones',
  'Conquistaste la sección de Ecuaciones. Sabes despejar la incógnita con precisión.',
  s.idSeccion,
  'plata'
FROM secciones s
WHERE s.nombre = 'Ecuaciones'
LIMIT 1;

-- ── 4. Funciones y variación ───────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Maestro de Funciones',
  'Completaste Funciones y Variación. Comprendes cómo cambian las magnitudes entre sí.',
  s.idSeccion,
  'plata'
FROM secciones s
WHERE s.nombre = 'Funciones y variación'
LIMIT 1;

-- ── 5. Figuras y cuerpos geométricos ───────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Arquitecto Geométrico',
  'Dominaste Figuras y Cuerpos Geométricos. El espacio 2D y 3D ya no tiene secretos.',
  s.idSeccion,
  'oro'
FROM secciones s
WHERE s.nombre = 'Figuras y cuerpos geométricos'
LIMIT 1;

-- ── 6. Relaciones Geométricas Clave ────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Teórico de la Geometría',
  'Superaste Relaciones Geométricas Clave. Ángulos, proporciones y teoremas bajo control.',
  s.idSeccion,
  'oro'
FROM secciones s
WHERE s.nombre = 'Relaciones Geométricas Clave'
LIMIT 1;

-- ── 7. Análisis de Datos ───────────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  'Analísta',
  'Superaste la sección de Análisis de Datos. Interpretas tablas y gráficas con claridad.',
  s.idSeccion,
  'diamante'
FROM secciones s
WHERE s.nombre = 'Análisis de Datos'
LIMIT 1;

-- ── 8. Probabilidad ────────────────────────────────────────
INSERT INTO insignias (nombre, descripcion, idSeccion, valor)
SELECT
  '¿Qué probabilidad hay?',
  'Completaste la sección Probabilidad. Interpretas gráficas y calculas el azar.',
  s.idSeccion,
  'diamante'
FROM secciones s
WHERE s.nombre = 'Probabilidad'
LIMIT 1;

-- ── Verificación ───────────────────────────────────────────
SELECT
  i.idInsignia,
  i.nombre,
  i.valor,
  s.nombre AS seccion
FROM insignias i
JOIN secciones s ON s.idSeccion = i.idSeccion
ORDER BY i.idInsignia;
