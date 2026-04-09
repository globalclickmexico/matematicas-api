-- ============================================================
-- CursoMATE — Seed de datos de prueba
-- Ejecutar DESPUÉS del schema:
--   mysql -u root -p clickplus_matematicas_qa < sql/seed.sql
--
-- Las fechas se almacenan como Unix timestamps (INT 11)
-- Timestamp usado en el seed: 1735689600 = 2025-01-01 00:00:00 UTC
-- Expiración demo:            1767225600 = 2026-01-01 00:00:00 UTC
-- ============================================================

USE `clickplus_matematicas_qa`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `insignias_obtenidas`;
TRUNCATE TABLE `cursos_finalizados`;
TRUNCATE TABLE `ejes_finalizados`;
TRUNCATE TABLE `secciones_realizadas`;
TRUNCATE TABLE `evaluaciones_leccion`;
TRUNCATE TABLE `evaluaciones_seccion`;
TRUNCATE TABLE `lecciones_vistas`;
TRUNCATE TABLE `preguntas`;
TRUNCATE TABLE `insignias`;
TRUNCATE TABLE `credenciales`;
TRUNCATE TABLE `usuarios`;
TRUNCATE TABLE `rutas_aprendizaje`;
TRUNCATE TABLE `lecciones`;
TRUNCATE TABLE `secciones`;
TRUNCATE TABLE `ejes`;
TRUNCATE TABLE `cursos`;
TRUNCATE TABLE `roles`;
TRUNCATE TABLE `perfiles`;
SET FOREIGN_KEY_CHECKS = 1;

-- ── Roles ─────────────────────────────────────────────────────
INSERT INTO `roles` (`idRol`, `nombre`, `descripcion`, `estatus`) VALUES
  (1, 'alumno',    'Alumno del curso de regularización', 1),
  (2, 'profesor',  'Profesor con acceso a reportes',     1),
  (3, 'admin',     'Administrador del sistema',          1);

-- ── Curso ─────────────────────────────────────────────────────
INSERT INTO `cursos` (`idCurso`, `nombre`, `codigoCurso`, `portada`, `cantidadEjes`, `estatus`) VALUES
  (1, 'Regularización Matemática', 'REGU01', '/portadas/regulamate.jpg', 3, 1);

-- ── Ejes ─────────────────────────────────────────────────────
INSERT INTO ejes (idCurso, codigoEje, nombre, descripcion, estatus, cantidadSecciones) VALUES (1, 'EJE01', 'Números y Álgebra', 'Domina los fundamentos numéricos y el lenguaje algebraico.', 1, 4);
INSERT INTO ejes (idCurso, codigoEje, nombre, descripcion, estatus, cantidadSecciones) VALUES (1, 'EJE02', 'Geometría y Medición', 'Explora figuras geométricas, áreas, perímetros y cuerpos en el espacio.', 1, 2);
INSERT INTO ejes (idCurso, codigoEje, nombre, descripcion, estatus, cantidadSecciones) VALUES (1, 'EJE03', 'Estadística y Probabilidad', 'Analiza datos y determina la probabilidad de eventos.', 1, 2);


-- ── Secciones ─────────────────────────────────────────────────
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (1, 'Números Reales', 'REGU0101', 1, 1, 7);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (1, 'Álgebra Básica (El lenguaje matemático)', 'REGU0102', 2, 1, 7);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (1, 'Ecuaciones', 'REGU0103', 3, 1, 7);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (1, 'Funciones y Variación', 'REGU0104', 4, 1, 4);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (2, 'Figuras y Cuerpos Geométricos', 'REGU0201', 1, 1, 4);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (2, 'Relaciones Geométricas Clave', 'REGU0202', 2, 1, 4);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (3, 'Análisis de Datos', 'REGU0301', 1, 1, 6);
INSERT INTO secciones (idEje, nombre, codigoSeccion, nivel, estatus, cantidadLecciones) VALUES (3, 'Probabilidad', 'REGU0302', 2, 1, 5);


-- ── Lecciones ─────────────────────────────────────────────────
-- codigoLeccion se usa en el backend para construir las URLs:
--   introUrl:      https://dominio.com/intro/{codigoLeccion}
--   actividadUrl:  https://dominio.com/actividad/{codigoLeccion}
--   pdfUrl:        https://dominio.com/pdf/{codigoLeccion}
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Definición y ubicación del los números Reales', 'REGU010101');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Números fraccionarios, fracciones mixtas, propias e impropias', 'REGU010102');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Operaciones básicas (1)', 'REGU010103');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Operaciones básicas (2)', 'REGU010104');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Jerarquía de operaciones con números enteros, fracciones y decimales (positivos y negativos).', 'REGU010105');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Notación científica: Operaciones y conversión para cantidades muy grandes o pequeñas.', 'REGU010106');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (1, 'Potencias con exponente entero y la raíz cuadrada.', 'REGU010107');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Traducir situaciones del lenguaje común a expresiones algebraicas.', 'REGU010201');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Leyes de los exponentes (multiplicación, división y potencia de una potencia).', 'REGU010202');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Operaciones algebraicas (suma, resta, multiplicación y división)', 'REGU010203');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Productos notables (binomio al cuadrado, binomio al cubo)', 'REGU010204');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Binomios conjugados y término común', 'REGU010205');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Factorización simple.', 'REGU010206');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (2, 'Factorización de productos notables', 'REGU010207');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Lineales: Resolución de ecuaciones lineales y problemas que se modelan con ellas.', 'REGU010301');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Sistemas de Ecuaciones 2x2: Método de Sustitución', 'REGU010302');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Sistemas de Ecuaciones 2x2: Método de igualación', 'REGU010303');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Sistemas de Ecuaciones 2x2: Método de reducción (suma o resta)', 'REGU010304');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Sistemas de Ecuaciones 2x2: Método gráfico', 'REGU010305');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Cuadráticas: Resolución de ecuaciones de segundo grado completas usando la Fórmula General.', 'REGU010306');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (3, 'Solución de ecuaciones incompletas y por factorización', 'REGU010307');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (4, 'Relaciones de proporcionalidad directa e inversa.', 'REGU010401');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (4, 'Funciones lineales: Interpretación de la pendiente y la ordenada al origen en un contexto real.', 'REGU010402');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (4, 'Guardar', 'REGU010403');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (4, 'Análisis de la variación cuadrática: Tabulación y graficación de parábolas.', 'REGU010404');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (5, 'Propiedades de polígonos regulares (ángulos interiores, exteriores y centrales).', 'REGU020101');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (5, 'Criterios de congruencia y semejanza de triángulos (LAL, LLL, ALA).', 'REGU020102');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (5, 'Cálculo de perímetros y áreas (incluyendo el círculo y regiones compuestas).', 'REGU020103');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (5, 'Volumen de prismas (rectos y oblicuos), cilindros y pirámides.', 'REGU020104');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (6, 'Teorema de Pitágoras: Explicación Teorica.', 'REGU020201');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (6, 'Aplicación en resolución de problemas prácticos en triángulos rectángulos', 'REGU020202');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (6, 'Trigonometría Básica: explicación teórica', 'REGU020203');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (6, 'Uso de las razones trigonométricas (seno, coseno y tangente) para calcular distancias y ángulos.', 'REGU020204');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Recolección y registro de datos.', 'REGU030101');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Construcción de gráficas Barras, histograma y polígonos', 'REGU030102');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Lectura e interpretación de gráficas (barras, circulares, histogramas y polígonos de frecuencia).', 'REGU030103');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Medidas de tendencia central: Media (promedio), Mediana y Moda, explicación teórica', 'REGU030104');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Medidas de tendencia central cálculo', 'REGU030105');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (7, 'Medidas de dispersión básicas: Rango y desviación media.', 'REGU030106');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (8, 'Espacio muestral y eventos.', 'REGU030201');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (8, 'Probabilidad teórica vs. Probabilidad frecuencial.', 'REGU030202');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (8, 'Cálculo de probabilidad de eventos simples, mutuamente excluyentes y eventos independientes (regla del producto).', 'REGU030203');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (8, 'Noción de azar y determinismo.', 'REGU030204');
INSERT INTO lecciones (idSeccion, nombre, codigoLeccion) VALUES (8, 'Cálculo de probabilidad clásica (Regla de Laplace)', 'REGU030205');


-- ── Rutas de aprendizaje ──────────────────────────────────────
-- lecciones: JSON array de idLeccion en el orden en que deben cursarse
INSERT INTO `rutas_aprendizaje` (`idRuta`, `idCurso`, `nombre`, `descripcion`, `lecciones`, `estatus`) VALUES
  (1, 1, 'Ruta Estándar',
   'Ruta completa del curso de regularización matemática en orden progresivo.',
   '[1, 2, 3, 4, 5, 6, 7]', 1),
  (2, 1, 'Ruta Algebra',
   'Ruta enfocada en números y álgebra.',
   '[1, 2, 3]', 1),
  (3, 1, 'Ruta Geometría',
   'Ruta enfocada en geometría y medición.',
   '[4, 5]', 1);

-- ── Perfiles ──────────────────────────────────────────────────
INSERT INTO `perfiles`
  (`idPerfil`, `nombreCompleto`, `apellidos`, `correo`, `curp`, `matricula`,
   `numeroTelefono`, `fechaRegistro`, `fechaExpiracion`, `plantel`) VALUES
  (1, 'Juan Carlos',   'López Martínez',   'alumno@cursomate.mx',
   'LOMJ010101HDFXXX01', 'A2025001', 5512345678, 1735689600, 1837454588,
   'Plantel Centro'),
  (2, 'María Elena',   'García Ruiz',      'profesor@cursomate.mx',
   'GARM800101MDFXXX01', 'P2025001', 5587654321, 1735689600, 1837454588,
   'Plantel Norte'),
  (3, 'Roberto',       'Sánchez Cruz',     'admin@cursomate.mx',
   'SACR750101HDFXXX01', 'ADM2025001', 5599887766, 1735689600, 1837454588,
   'Administración Central');

-- ── Usuarios ──────────────────────────────────────────────────
INSERT INTO `usuarios` (`idUsuario`, `idPerfil`, `idRol`, `idRuta`, `estatus`, `esConvenio`) VALUES
  (1, 1, 1, 1, 1, 0),   -- alumno  → ruta estándar
  (2, 2, 2, 1, 1, 0),   -- profesor
  (3, 3, 3, 1, 1, 0);   -- admin

-- ── Credenciales ──────────────────────────────────────────────
-- Contraseñas hasheadas con bcrypt cost=10
-- alumno@cursomate.mx  → cursomate24
-- profesor@cursomate.mx → profesor24
-- admin@cursomate.mx   → admin2024
--
-- Para generar hashes reales:
--   node -e "const b=require('bcryptjs');b.hash('cursomate24',10).then(console.log)"
INSERT INTO `credenciales` (`idCredencial`, `idUsuario`, `estatusCredencial`, `nombreUsuario`, `contrasenia`) VALUES
  (1, 1, 1, 'alumno_demo',    '$2a$12$nwiKwLpvHTqeukkJoZ4I6eA8t/xSYuVSuqi3j78xLLwkagFEaOypO'),
  (2, 2, 1, 'profesor_garcia','$2a$12$nwiKwLpvHTqeukkJoZ4I6eA8t/xSYuVSuqi3j78xLLwkagFEaOypO'),
  (3, 3, 1, 'admin_sistema',  '$2a$12$nwiKwLpvHTqeukkJoZ4I6eA8t/xSYuVSuqi3j78xLLwkagFEaOypO');

-- IMPORTANTE: Los hashes de arriba son placeholders.
-- Antes de usar en producción, reemplaza con hashes reales generados así:
--
--   node -e "
--     const b = require('bcryptjs');
--     Promise.all([
--       b.hash('cursomate24', 10),
--       b.hash('profesor24',  10),
--       b.hash('admin2024',   10),
--     ]).then(([h1,h2,h3]) => {
--       console.log('alumno:  ', h1);
--       console.log('profesor:', h2);
--       console.log('admin:   ', h3);
--     });
--   "

-- ── Insignias ─────────────────────────────────────────────────
INSERT INTO `insignias` (`idInsignia`, `nombre`, `descripcion`, `idSeccion`, `valor`) VALUES
  (1, 'Primera lección', 'Completaste tu primera lección',               1, 'bronce'),
  (2, 'Sección completada', 'Completaste la sección de Números Reales',  1, 'plata'),
  (3, 'Algebraico',      'Completaste Expresiones Algebraicas',          2, 'plata'),
  (4, 'Geómetra',        'Completaste la sección de Geometría Plana',    3, 'oro'),
  (5, 'Estadístico',     'Completaste Estadística Descriptiva',          4, 'plata'),
  (6, 'Probabilista',    'Completaste la sección de Probabilidad',       5, 'oro'),
  (7, 'Curso completo',  'Finalizaste el curso de regularización',       1, 'diamante');

-- ── Preguntas ─────────────────────────────────────────────────
-- Formato opcionesRespuesta: [{"id":"a","texto":"..."},{"id":"b","texto":"..."},...]
-- respuestaCorrecta: el campo "id" de la opción correcta ("a","b","c","d")

-- Lección 1 — Clasificación de números reales (seccion 1)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(1, 1, 1,
 '¿A qué conjunto pertenece el número π?',
 'opcion_multiple',
 '[{"id":"a","texto":"Naturales"},{"id":"b","texto":"Racionales"},{"id":"c","texto":"Irracionales"},{"id":"d","texto":"Enteros"}]',
 'c', 1735689600, 1),

(2, 1, 1,
 '¿Cuál de los siguientes NO es un número racional?',
 'opcion_multiple',
 '[{"id":"a","texto":"0.25"},{"id":"b","texto":"−4"},{"id":"c","texto":"1/3"},{"id":"d","texto":"√5"}]',
 'd', 1735689600, 1),

(3, 1, 1,
 '¿Qué conjunto contiene a los enteros?',
 'opcion_multiple',
 '[{"id":"a","texto":"ℕ"},{"id":"b","texto":"ℤ"},{"id":"c","texto":"Solo los naturales"},{"id":"d","texto":"𝕀"}]',
 'b', 1735689600, 1),

(4, 1, 1,
 'El número 0.333... (un tercio) pertenece a:',
 'opcion_multiple',
 '[{"id":"a","texto":"Irracionales"},{"id":"b","texto":"Naturales"},{"id":"c","texto":"Racionales"},{"id":"d","texto":"Ninguno anterior"}]',
 'c', 1735689600, 1);

-- Lección 2 — La recta numérica y valor absoluto (seccion 1)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(5, 1, 2,
 '¿Cuál es el valor de |−15|?',
 'opcion_multiple',
 '[{"id":"a","texto":"−15"},{"id":"b","texto":"15"},{"id":"c","texto":"0"},{"id":"d","texto":"225"}]',
 'b', 1735689600, 1),

(6, 1, 2,
 'Si |x| = 9, ¿cuáles son los posibles valores de x?',
 'opcion_multiple',
 '[{"id":"a","texto":"Solo 9"},{"id":"b","texto":"Solo −9"},{"id":"c","texto":"9 y −9"},{"id":"d","texto":"No tiene solución"}]',
 'c', 1735689600, 1),

(7, 1, 2,
 '¿En qué posición está −6 respecto a +3 en la recta numérica?',
 'opcion_multiple',
 '[{"id":"a","texto":"A la derecha"},{"id":"b","texto":"A la izquierda"},{"id":"c","texto":"En la misma posición"},{"id":"d","texto":"No se puede determinar"}]',
 'b', 1735689600, 1);

-- Lección 3 — Monomios y polinomios (seccion 2)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(8, 2, 3,
 '¿Cuál es el grado de 5x⁴ − 3x² + 7?',
 'opcion_multiple',
 '[{"id":"a","texto":"2"},{"id":"b","texto":"4"},{"id":"c","texto":"5"},{"id":"d","texto":"7"}]',
 'b', 1735689600, 1),

(9, 2, 3,
 '¿Cuántos términos tiene: 2x³ − x + 8?',
 'opcion_multiple',
 '[{"id":"a","texto":"1"},{"id":"b","texto":"2"},{"id":"c","texto":"3"},{"id":"d","texto":"4"}]',
 'c', 1735689600, 1),

(10, 2, 3,
 '¿Cuál es el coeficiente del término x en −7x² + 3x − 1?',
 'opcion_multiple',
 '[{"id":"a","texto":"−7"},{"id":"b","texto":"3"},{"id":"c","texto":"−1"},{"id":"d","texto":"7"}]',
 'b', 1735689600, 1);

-- Lección 4 — Polígonos (seccion 3)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(11, 3, 4,
 '¿Cuánto suma los ángulos interiores de un pentágono?',
 'opcion_multiple',
 '[{"id":"a","texto":"360°"},{"id":"b","texto":"450°"},{"id":"c","texto":"540°"},{"id":"d","texto":"720°"}]',
 'c', 1735689600, 1),

(12, 3, 4,
 'Un polígono regular de 6 lados, ¿cuánto mide cada ángulo interior?',
 'opcion_multiple',
 '[{"id":"a","texto":"108°"},{"id":"b","texto":"120°"},{"id":"c","texto":"135°"},{"id":"d","texto":"140°"}]',
 'b', 1735689600, 1),

(13, 3, 4,
 '¿Cómo se llama un polígono de 8 lados?',
 'opcion_multiple',
 '[{"id":"a","texto":"Heptágono"},{"id":"b","texto":"Nonágono"},{"id":"c","texto":"Decágono"},{"id":"d","texto":"Octágono"}]',
 'd', 1735689600, 1);

-- Lección 5 — Áreas y perímetros (seccion 3)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(14, 3, 5,
 '¿Cuál es el área de un cuadrado con lado de 9 cm?',
 'opcion_multiple',
 '[{"id":"a","texto":"18 cm²"},{"id":"b","texto":"36 cm²"},{"id":"c","texto":"81 cm²"},{"id":"d","texto":"45 cm²"}]',
 'c', 1735689600, 1),

(15, 3, 5,
 'Un triángulo tiene base = 10 cm y altura = 6 cm. ¿Cuál es su área?',
 'opcion_multiple',
 '[{"id":"a","texto":"60 cm²"},{"id":"b","texto":"30 cm²"},{"id":"c","texto":"16 cm²"},{"id":"d","texto":"50 cm²"}]',
 'b', 1735689600, 1),

(16, 3, 5,
 'El perímetro de un rectángulo con lados 5 cm y 8 cm es:',
 'opcion_multiple',
 '[{"id":"a","texto":"13 cm"},{"id":"b","texto":"40 cm"},{"id":"c","texto":"26 cm"},{"id":"d","texto":"20 cm"}]',
 'c', 1735689600, 1);

-- Lección 6 — Variables estadísticas (seccion 4)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(17, 4, 6,
 'El número de libros leídos por mes es una variable:',
 'opcion_multiple',
 '[{"id":"a","texto":"Cual. nominal"},{"id":"b","texto":"Cuant. discreta"},{"id":"c","texto":"Cuant. continua"},{"id":"d","texto":"Cual. ordinal"}]',
 'b', 1735689600, 1),

(18, 4, 6,
 'Calificación de servicio: malo, regular, bueno. Es variable:',
 'opcion_multiple',
 '[{"id":"a","texto":"Cuant. continua"},{"id":"b","texto":"Cuant. discreta"},{"id":"c","texto":"Cual. ordinal"},{"id":"d","texto":"Cual. nominal"}]',
 'c', 1735689600, 1),

(19, 4, 6,
 '¿Qué es la frecuencia relativa?',
 'opcion_multiple',
 '[{"id":"a","texto":"Nº de veces que aparece"},{"id":"b","texto":"La moda del conjunto"},{"id":"c","texto":"Proporción: f ÷ n"},{"id":"d","texto":"La suma acumulada"}]',
 'c', 1735689600, 1);

-- Lección 7 — Probabilidad clásica (seccion 5)
INSERT INTO `preguntas`
  (`idPregunta`,`idSeccion`,`idLeccion`,`pregunta`,`tipoPregunta`,
   `opcionesRespuesta`,`respuestaCorrecta`,`fechaRegistro`,`estatus`) VALUES
(20, 5, 7,
 'Se lanza un dado. ¿Cuál es la probabilidad de obtener un 5?',
 'opcion_multiple',
 '[{"id":"a","texto":"1/5"},{"id":"b","texto":"1/6"},{"id":"c","texto":"5/6"},{"id":"d","texto":"2/6"}]',
 'b', 1735689600, 1),

(21, 5, 7,
 '¿Qué significa que P(A) = 0?',
 'opcion_multiple',
 '[{"id":"a","texto":"El evento es seguro"},{"id":"b","texto":"El evento es posible"},{"id":"c","texto":"El evento es imposible"},{"id":"d","texto":"El evento es probable"}]',
 'c', 1735689600, 1),

(22, 5, 7,
 'En una bolsa hay 3 bolas rojas y 7 azules. P(roja) =',
 'opcion_multiple',
 '[{"id":"a","texto":"7/10"},{"id":"b","texto":"3/7"},{"id":"c","texto":"3/10"},{"id":"d","texto":"1/3"}]',
 'c', 1735689600, 1);

-- ── Progreso de prueba para el alumno demo ────────────────────
-- lecciones_vistas: alumno completó lecciones 1 y 2
INSERT INTO `lecciones_vistas` (`idCurso`, `idLeccion`, `idUsuario`, `fechaRealizacion`) VALUES
  (1, 1, 1, 1735689600),
  (1, 2, 1, 1735776000);

-- secciones_realizadas: alumno completó sección 1
INSERT INTO `secciones_realizadas` (`idUsuario`, `idSeccion`, `fechaRealizado`, `idCurso`) VALUES
  (1, 1, 1735776000, 1);

-- evaluaciones_seccion: calificación de la sección 1 para el alumno
INSERT INTO `evaluaciones_seccion` (`idCurso`, `idEje`, `idSeccion`, `idUsuario`, `calificacion`, `fechaRealizacion`) VALUES
  (1, 1, 1, 1, 85, 1735776000);

-- insignias_obtenidas: el alumno ganó las primeras 2 insignias
INSERT INTO `insignias_obtenidas` (`idInsignia`, `idUsuario`, `fechaObtenida`) VALUES
  (1, 1, 1735689600),
  (2, 1, 1735776000);