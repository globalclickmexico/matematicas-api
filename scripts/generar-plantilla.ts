/**
 * Genera la plantilla Excel para carga masiva de usuarios.
 * Uso: npm run plantilla
 * Salida: plantilla-usuarios.xlsx (en la raíz del proyecto)
 */
import * as XLSX from 'xlsx';
import path from 'path';

/* ── Columnas de la plantilla ────────────────────────────── */
const HEADERS = [
  'nombreCompleto',   // Requerido  — ej: "Juan Carlos"
  'apellidos',        // Requerido  — ej: "López Martínez"
  'correo',           // Requerido  — ej: "juan.lopez@ejemplo.mx"
  'curp',             // Opcional   — 18 caracteres
  'matricula',        // Requerido  — Usado como username y contraseña inicial
  'numeroTelefono',   // Opcional   — 10 dígitos sin espacios
  'plantel',          // Opcional   — ej: "Plantel Norte"
  'fechaExpiracion',  // Opcional   — Formato: DD/MM/YYYY (ej: 31/12/2025)
  'idRol',            // Opcional   — 1=alumno | 2=profesor | 3=admin  (default: 1)
  'idRuta',           // Opcional   — ID de la ruta de aprendizaje       (default: 1)
  'esConvenio',       // Opcional   — 0=No | 1=Sí                       (default: 0)
];

/* ── Filas de ejemplo ────────────────────────────────────── */
const EJEMPLOS = [
  ['Juan Carlos',   'López Martínez',   'juan.lopez@ejemplo.mx',   'LOMJ010101HDFXXX01', 'A2025001', 5512345678, 'Plantel Centro',  '31/12/2025', 1, 1, 0],
  ['María Elena',   'García Ruiz',      'maria.garcia@ejemplo.mx', 'GARM800101MDFXXX01', 'A2025002', 5587654321, 'Plantel Norte',   '31/12/2025', 1, 1, 0],
  ['Roberto',       'Sánchez Cruz',     'roberto.sanchez@ej.mx',   'SACR750101HDFXXX01', 'A2025003', 5599887766, 'Plantel Sur',     '31/12/2025', 1, 1, 0],
  ['Ana Sofía',     'Mendoza Torres',   'ana.mendoza@ejemplo.mx',  '',                   'A2025004', '',         'Plantel Oriente', '31/12/2025', 1, 1, 0],
  ['Carlos',        'Ramírez Vega',     'carlos.ramirez@ej.mx',    'RAVC900215HDFXXX01', 'A2025005', 5556781234, 'Plantel Centro',  '31/12/2025', 1, 1, 1],
];

/* ── Notas de instrucciones ──────────────────────────────── */
const INSTRUCCIONES = [
  ['INSTRUCCIONES DE LLENADO'],
  [''],
  ['COLUMNAS REQUERIDAS: nombreCompleto, apellidos, correo, matricula'],
  ['COLUMNAS OPCIONALES: Las demás pueden dejarse vacías'],
  [''],
  ['FORMATO DE FECHA: DD/MM/YYYY  —  ejemplo: 31/12/2025'],
  ['Si no se indica fechaExpiracion, se asigna automáticamente 1 año desde hoy'],
  [''],
  ['USERNAME GENERADO: Se usa la matrícula en minúsculas como nombreUsuario'],
  ['CONTRASEÑA GENERADA: Se usa la matrícula como contraseña inicial'],
  ['El alumno deberá cambiarla en su primer inicio de sesión'],
  [''],
  ['idRol → 1 = alumno  |  2 = profesor  |  3 = admin   (default: 1)'],
  ['idRuta → Ver la tabla rutas_aprendizaje de la BD para los IDs disponibles'],
  ['esConvenio → 0 = No es convenio  |  1 = Es convenio  (default: 0)'],
  [''],
  ['NO modificar los nombres de las columnas en la fila 1 de la hoja "Usuarios"'],
];

function generarPlantilla() {
  const wb = XLSX.utils.book_new();

  /* ── Hoja 1: Usuarios (datos a llenar) ─────────────────── */
  const wsData = [HEADERS, ...EJEMPLOS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  /* Ancho de columnas */
  ws['!cols'] = [
    { wch: 20 }, // nombreCompleto
    { wch: 22 }, // apellidos
    { wch: 28 }, // correo
    { wch: 20 }, // curp
    { wch: 12 }, // matricula
    { wch: 14 }, // numeroTelefono
    { wch: 18 }, // plantel
    { wch: 14 }, // fechaExpiracion
    { wch: 8  }, // idRol
    { wch: 8  }, // idRuta
    { wch: 10 }, // esConvenio
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

  /* ── Hoja 2: Instrucciones ──────────────────────────────── */
  const wsInst = XLSX.utils.aoa_to_sheet(INSTRUCCIONES);
  wsInst['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  /* ── Guardar ─────────────────────────────────────────────── */
  const outputPath = path.join(process.cwd(), 'plantilla-usuarios.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log('\n✓ Plantilla generada correctamente');
  console.log(`  Archivo: ${outputPath}`);
  console.log('\n  Columnas incluidas:');
  HEADERS.forEach((h, i) => {
    const req = ['nombreCompleto','apellidos','correo','matricula'].includes(h);
    console.log(`    ${i + 1}. ${h.padEnd(18)} ${req ? '(requerido)' : '(opcional)'}`);
  });
  console.log('\n  Se incluyen 5 filas de ejemplo que puedes borrar.\n');
}

generarPlantilla();
