// Genera e2e/fixtures/padron-casos.xlsx: un padrón con encabezados de otro
// sistema escolar y los casos que rompían la importación (2026-10-17).
// Uso: node e2e/fixtures/crear-padron.cjs
const path = require('path');
const XLSX = require('xlsx');

const filas = [
  ['Cuenta', 'Nombre(s)', 'Primer apellido', 'Segundo apellido', 'Programa educativo', 'Grado', 'Grupo', 'Turno'],
  ['2300200001', 'ROSA ELENA', 'VALDEZ', 'CANO', 'contador público', '4°', 'a', 'M'],     // mayúsculas, carrera en minúsculas, "4°", turno abreviado
  ['a2300200002', 'Iván', 'De la Garza', '', 'Licenciatura en Derecho', 6, 'B', 'Vespertino'], // prefijo "a", sin materno
  ['2300200001', 'Repetida', 'Mismo', 'Archivo', 'Contador Público', 2, 'C', 'Mixto'],   // repetida en el archivo
  ['12345', 'Corta', 'Matrícula', 'Inválida', 'Contador Público', 3, 'A', 'Matutino'],    // matrícula inválida
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), 'Padrón');
XLSX.writeFile(wb, path.join(__dirname, 'padron-casos.xlsx'));
console.log('ok');
