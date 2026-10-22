// ╔══════════════════════════════════════════════════════════════════╗
// ║  Datos de verificación agosto–septiembre 2026                     ║
// ║                                                                    ║
// ║  Genera, SIN pasar por el código de la app:                       ║
// ║   - verificacion/respaldo-ago-sep-2026.json  → se carga con         ║
// ║     Configuración → Respaldo → Reemplazar                          ║
// ║   - verificacion/visitas-ago-sep-2026.xlsx   → para contar a mano   ║
// ║   - verificacion/respuestas-ago-sep-2026.xlsx → cifras esperadas    ║
// ║                                                                    ║
// ║  Es determinista (semilla fija): correrlo dos veces da lo mismo.  ║
// ║  Las respuestas se calculan aquí con las definiciones P1–P8 de    ║
// ║  docs/AUDITORIA-2026-10.md, sin importar nada de src/.            ║
// ║                                                                    ║
// ║  Uso: node e2e/fixtures/crear-verificacion.cjs                     ║
// ╚══════════════════════════════════════════════════════════════════╝
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SALIDA = path.join(__dirname, 'verificacion');
fs.mkdirSync(SALIDA, { recursive: true });

// ── Aleatorio con semilla ────────────────────────────────────────────
let semilla = +(process.env.SEMILLA || 2);
function azar() {
  semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
function elegirPeso(pares) {
  const total = pares.reduce((s, [, p]) => s + p, 0);
  let x = azar() * total;
  for (const [v, p] of pares) { if ((x -= p) < 0) return v; }
  return pares[pares.length - 1][0];
}

// ── Fechas: agosto y septiembre en Nuevo Laredo son UTC−5 (verano) ──
const pad = n => String(n).padStart(2, '0');
const iso = (dia, h, m) => `${dia}T${pad(h)}:${pad(m)}:00-05:00`;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function diaSemana(dia) { return new Date(dia + 'T12:00:00Z').getUTCDay(); }
function sumarMin(dia, h, m, min) {
  const t = Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10), h, m) + min * 60000;
  const d = new Date(t);
  return { dia: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, h: d.getUTCHours(), m: d.getUTCMinutes() };
}

// Horario de la biblioteca: L–V 7:00–20:00, sábado 7:00–14:00, domingo cerrado.
const CIERRE = { 1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 14 };

// ── Catálogo ─────────────────────────────────────────────────────────
const MOTIVOS = [
  { id: 'm-estudiar', nombre: 'Estudiar', icono: 'menu_book', orden: 1, activo: true },
  { id: 'm-libro', nombre: 'Pedir libro', icono: 'book', orden: 2, activo: true },
  { id: 'm-trabajo', nombre: 'Trabajo escolar', icono: 'assignment', orden: 3, activo: true },
  { id: 'm-investigacion', nombre: 'Investigación', icono: 'search', orden: 4, activo: true },
  { id: 'm-otro', nombre: 'Otro', icono: 'more_horiz', orden: 5, activo: true },
];
const motivoPorId = Object.fromEntries(MOTIVOS.map(m => [m.id, m]));

const TI = 'Licenciatura en Tecnologías de la Información';
const DER = 'Licenciatura en Derecho';
const CP = 'Contador Público';
const ENF = 'Licenciatura en Enfermería';

// 25 alumnos. `peso` = qué tan seguido viene (0 = nunca).
const ALUMNOS_BASE = [
  // matrícula, nombre, paterno, materno, carrera, grado, grupo, turno, peso
  ['2300100001', 'Valeria', 'Garza', 'Treviño', TI, 7, 'A', 'Matutino', 12],   // la más constante
  ['2300100002', 'Diego', 'Martínez', 'Salinas', TI, 7, 'A', 'Matutino', 7],
  ['2300100003', 'Fernanda', 'López', 'Cantú', TI, 5, 'B', 'Vespertino', 6],
  ['2300100004', 'Andrés', 'Hernández', '', TI, 5, 'B', 'Vespertino', 5],     // sin materno
  ['2300100005', 'Sofía', 'Ramírez', 'Peña', TI, 3, 'A', 'Matutino', 4],
  ['2300100006', 'Emiliano', 'Torres', 'Villarreal', TI, 3, 'C', 'Mixto', 3],
  ['2300100007', 'Camila', 'Flores', 'Guerra', TI, 1, 'A', 'Matutino', 2],
  ['2300100008', 'Mateo', 'Rodríguez', 'Leal', TI, 1, 'B', 'Vespertino', 0],   // nunca vino
  ['2300200001', 'Regina', 'González', 'Ochoa', DER, 9, 'A', 'Matutino', 8],
  ['2300200002', 'Santiago', 'Pérez', 'Elizondo', DER, 9, 'A', 'Matutino', 5],
  ['2300200003', 'Ximena', 'Sánchez', 'Tamez', DER, 6, 'B', 'Vespertino', 4],
  ['2300200004', 'Leonardo', 'Cruz', 'Benavides', DER, 6, 'B', 'Vespertino', 3],
  ['2300200005', 'Daniela', 'Morales', 'Zamora', DER, 4, 'A', 'Mixto', 2],
  ['2300200006', 'Sebastián', 'Reyes', 'Lozano', DER, 2, 'C', 'Matutino', 1],
  ['2300300001', 'Mariana', 'Jiménez', 'Cavazos', CP, 8, 'A', 'Matutino', 6],
  ['2300300002', 'Gael', 'Díaz', 'Montemayor', CP, 8, 'A', 'Matutino', 4],
  ['2300300003', 'Paola', 'Vázquez', 'Rocha', CP, 6, 'B', 'Vespertino', 4],
  ['2300300004', 'Rodrigo', 'Castillo', 'Ayala', CP, 4, 'A', 'Vespertino', 2],
  ['2300300005', 'Andrea', 'Ruiz', 'Barrera', CP, 2, 'B', 'Matutino', 1],
  ['2300300006', 'Jorge', 'Mendoza', 'Olivares', CP, 2, 'C', 'Mixto', 0],      // nunca vino
  ['2300400001', 'Natalia', 'Aguilar', 'Saldaña', ENF, 7, 'A', 'Matutino', 5],
  ['2300400002', 'Iker', 'Ortiz', 'Guajardo', ENF, 7, 'A', 'Matutino', 3],
  ['2300400003', 'Renata', 'Chávez', 'Medina', ENF, 5, 'B', 'Vespertino', 3],
  ['2300400004', 'Bruno', 'Ramos', 'Esparza', ENF, 3, 'A', 'Mixto', 2],
  ['2300400005', 'Lucía', 'Herrera', 'Cárdenas', ENF, 1, 'B', 'Matutino', 1],
];
const ALUMNOS = ALUMNOS_BASE.map(([matricula, nombre, ap, am, carrera, grado, grupo, turno, peso], i) => ({
  alumno: {
    id: `ver-al-${pad(i + 1)}`, matricula, nombre, apellidoPaterno: ap, apellidoMaterno: am,
    carrera, grado, grupo, turno, activo: true,
    fechaRegistro: '2026-07-01T09:00:00-05:00', datosExtra: {},
  },
  peso,
}));
const porMatricula = Object.fromEntries(ALUMNOS.map(a => [a.alumno.matricula, a.alumno]));
const nombreCompleto = a => [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');

// ── Visitas ─────────────────────────────────────────────────────────
const visitas = []; // { dia, h, m, alumno|null, visitante, motivos[], salida: {tipo, dia,h,m}|null, nota }

function motivosAlAzar() {
  const principal = elegirPeso([['m-estudiar', 45], ['m-trabajo', 25], ['m-libro', 15], ['m-investigacion', 10], ['m-otro', 5]]);
  const lista = [principal];
  if (azar() < 0.25) {
    const extra = elegirPeso([['m-libro', 3], ['m-investigacion', 2], ['m-trabajo', 2], ['m-estudiar', 2]]);
    if (extra !== principal) lista.push(extra);
  }
  return lista;
}
// Pico de 12 a 13; poca gente a primera hora y a última.
function horaAlAzar(dow) {
  if (dow === 6) return elegirPeso([[8, 2], [9, 3], [10, 4], [11, 3], [12, 2]]);
  return elegirPeso([[7, 1], [8, 3], [9, 4], [10, 5], [11, 6], [12, 9], [13, 7], [14, 4], [15, 4], [16, 4], [17, 3], [18, 2]]);
}

const fechas = [];
for (let t = Date.UTC(2026, 7, 1); t <= Date.UTC(2026, 8, 30); t += 86400000) {
  const d = new Date(t);
  fechas.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
}

for (const dia of fechas) {
  const dow = diaSemana(dia);
  if (dow === 0 || dia === '2026-09-16') continue;       // domingo y festivo: cerrado
  const verano = dia < '2026-08-17';                      // periodo de verano: poca gente
  let cantidad;
  if (dow === 6) cantidad = verano ? 1 : entre(1, 2);
  else if (verano) cantidad = entre(1, 3);
  else cantidad = { 1: 5, 2: 7, 3: 5, 4: 5, 5: 3 }[dow] + entre(-1, 1); // martes = el día fuerte

  const usados = new Set();
  for (let k = 0; k < cantidad; k++) {
    const esVisitante = azar() < 0.06;
    let alumno = null;
    if (!esVisitante) {
      // Nadie viene dos veces el mismo día en la parte "normal".
      for (let intento = 0; intento < 20; intento++) {
        const a = elegirPeso(ALUMNOS.filter(x => x.peso > 0).map(x => [x.alumno, x.peso]));
        if (!usados.has(a.matricula)) { alumno = a; break; }
      }
      if (!alumno) continue;
      usados.add(alumno.matricula);
    }
    const h = horaAlAzar(dow);
    const m = entre(0, 59);
    const dur = elegirPeso([[entre(15, 45), 4], [entre(46, 120), 5], [entre(121, 200), 2]]);
    let fin = sumarMin(dia, h, m, dur);
    const cierre = CIERRE[dow];
    if (fin.dia !== dia || fin.h * 60 + fin.m > cierre * 60) fin = { dia, h: cierre, m: 0 };

    // ~5 % la salida la puso el sistema al cierre; ~2 % se quedó sin salida.
    const r = azar();
    let salida;
    if (r < 0.05) salida = { tipo: 'estimada', dia, h: cierre, m: 0 };
    else if (r < 0.07) salida = null;
    else salida = { tipo: 'real', ...fin };
    visitas.push({ dia, h, m, alumno, visitante: esVisitante ? 'Visitante' : null, motivos: motivosAlAzar(), salida, nota: '' });
  }
}

// ── Casos especiales (marcados en la columna "Caso especial") ───────
const A = m => porMatricula[m];
const especiales = [
  // Entradas y salidas en los bordes del horario
  { dia: '2026-08-24', h: 6, m: 59, alumno: A('2300100002'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-08-24', h: 8, m: 30 }, nota: 'Entró 1 minuto ANTES de abrir (6:59). Cuenta en la hora 6.' },
  { dia: '2026-08-25', h: 7, m: 0, alumno: A('2300200001'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-08-25', h: 7, m: 20 }, nota: 'Entró justo al abrir (7:00 en punto).' },
  { dia: '2026-08-26', h: 18, m: 30, alumno: A('2300300001'), motivos: ['m-trabajo'], salida: { tipo: 'real', dia: '2026-08-26', h: 20, m: 0 }, nota: 'Salió justo a la hora de cierre (20:00), salida real.' },
  { dia: '2026-08-27', h: 18, m: 45, alumno: A('2300100003'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-08-27', h: 20, m: 1 }, nota: 'Salió 1 minuto DESPUÉS del cierre (20:01), salida real.' },
  { dia: '2026-08-28', h: 19, m: 59, alumno: A('2300400001'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-08-28', h: 20, m: 5 }, nota: 'Entró 1 minuto antes de cerrar (19:59). Cuenta en la hora 19.' },
  { dia: '2026-08-31', h: 19, m: 50, alumno: A('2300200002'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-09-01', h: 7, m: 5 }, nota: 'Último día de agosto; la salida se marcó al día siguiente (1-sep 7:05). La visita es de AGOSTO; duración 675 min (real).' },
  { dia: '2026-09-01', h: 7, m: 0, alumno: A('2300100005'), motivos: ['m-trabajo'], salida: { tipo: 'real', dia: '2026-09-01', h: 9, m: 0 }, nota: 'Primer minuto de septiembre con la biblioteca abierta (7:00).' },
  { dia: '2026-09-05', h: 13, m: 59, alumno: A('2300300003'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-09-05', h: 14, m: 0 }, nota: 'Sábado: entró 1 minuto antes de cerrar (13:59) y salió al cierre (14:00).' },
  { dia: '2026-09-12', h: 14, m: 5, alumno: A('2300200003'), motivos: ['m-otro'], salida: { tipo: 'real', dia: '2026-09-12', h: 14, m: 25 }, nota: 'Sábado: entró DESPUÉS del cierre (14:05). Solo posible con el horario en «advertir».' },
  { dia: '2026-09-06', h: 10, m: 0, alumno: A('2300400002'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-09-06', h: 11, m: 0 }, nota: 'DOMINGO (cerrado). Cuenta como visita y como día con actividad.' },
  { dia: '2026-09-16', h: 10, m: 0, alumno: A('2300100001'), motivos: ['m-investigacion'], salida: { tipo: 'real', dia: '2026-09-16', h: 10, m: 40 }, nota: 'Día festivo (16 de septiembre). Cuenta como visita y como día con actividad.' },
  // Bordes de hora para el mapa de calor
  { dia: '2026-09-08', h: 12, m: 59, alumno: A('2300100004'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-09-08', h: 13, m: 30 }, nota: 'Entró a las 12:59 → cuenta en la hora 12, no en la 13.' },
  { dia: '2026-09-08', h: 13, m: 0, alumno: A('2300200004'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-09-08', h: 13, m: 45 }, nota: 'Entró a las 13:00 → cuenta en la hora 13.' },
  // Duraciones raras
  { dia: '2026-09-09', h: 11, m: 10, alumno: A('2300300002'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-09-09', h: 11, m: 10 }, nota: 'Estancia de 0 minutos (entró y salió el mismo minuto). NO entra en el promedio de estancia.' },
  { dia: '2026-09-10', h: 7, m: 5, alumno: A('2300100001'), motivos: ['m-estudiar', 'm-investigacion'], salida: { tipo: 'real', dia: '2026-09-10', h: 13, m: 5 }, nota: 'Estancia larga real: 6 horas (360 min).' },
  // Repetidos
  { dia: '2026-09-15', h: 10, m: 0, alumno: A('2300200001'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-09-15', h: 10, m: 5 }, nota: 'Misma alumna 2 veces en 10 min (1 de 2). Son 2 visitas.' },
  { dia: '2026-09-15', h: 10, m: 10, alumno: A('2300200001'), motivos: ['m-estudiar'], salida: { tipo: 'real', dia: '2026-09-15', h: 11, m: 30 }, nota: 'Misma alumna 2 veces en 10 min (2 de 2). Son 2 visitas.' },
  // Varias actividades
  { dia: '2026-09-17', h: 16, m: 0, alumno: A('2300400003'), motivos: ['m-estudiar', 'm-libro', 'm-trabajo'], salida: { tipo: 'real', dia: '2026-09-17', h: 17, m: 30 }, nota: 'Una visita con 3 actividades: suma 1 a cada una.' },
  { dia: '2026-09-18', h: 11, m: 0, alumno: null, visitante: 'Laura Visitante', motivos: ['m-investigacion', 'm-libro', 'm-otro'], salida: { tipo: 'real', dia: '2026-09-18', h: 12, m: 0 }, nota: 'Visitante con 3 actividades. Cuenta en total y actividades, NO en carreras ni turnos.' },
  // Salidas puestas por el sistema y entradas sin salida
  { dia: '2026-09-22', h: 15, m: 0, alumno: A('2300100002'), motivos: ['m-trabajo'], salida: { tipo: 'estimada', dia: '2026-09-22', h: 20, m: 0 }, nota: 'Salida puesta por el sistema al cierre. Cuenta como visita, NO en el promedio de estancia.' },
  { dia: '2026-09-23', h: 9, m: 0, alumno: A('2300300001'), motivos: ['m-estudiar'], salida: null, nota: 'Entrada sin salida. Cuenta como visita, NO en el promedio de estancia.' },
  // Una alumna que solo vino en agosto (verano)
  { dia: '2026-08-05', h: 10, m: 0, alumno: A('2300200006'), motivos: ['m-libro'], salida: { tipo: 'real', dia: '2026-08-05', h: 10, m: 30 }, nota: 'Visita en periodo de VERANO (antes del 17-ago).' },
];
for (const e of especiales) visitas.push({ visitante: null, ...e });

visitas.sort((a, b) => (a.dia + pad(a.h) + pad(a.m)).localeCompare(b.dia + pad(b.h) + pad(b.m)));

// ── A registros de la app ───────────────────────────────────────────
const registros = visitas.map((v, i) => {
  const id = `ver-${String(i + 1).padStart(3, '0')}`;
  v.id = id;
  const ids = v.motivos;
  const reg = {
    id,
    alumnoId: v.alumno ? v.alumno.id : `invitado-ver-${i + 1}`,
    matricula: v.alumno ? v.alumno.matricula : 'INVITADO',
    nombreCompleto: v.alumno ? nombreCompleto(v.alumno) : v.visitante,
    carrera: v.alumno ? v.alumno.carrera : 'Visitante',
    motivoId: ids[0],
    motivoNombre: motivoPorId[ids[0]].nombre,
    motivoIds: ids,
    motivoNombres: ids.map(x => motivoPorId[x].nombre),
    fechaHora: iso(v.dia, v.h, v.m),
    dispositivo: 'Puerta',
    sincronizado: false,
    ...(v.alumno ? { turno: v.alumno.turno } : {}),
  };
  if (v.salida) {
    reg.horaSalida = iso(v.salida.dia, v.salida.h, v.salida.m);
    v.duracion = Math.round((new Date(reg.horaSalida) - new Date(reg.fechaHora)) / 60000);
    reg.duracionMinutos = v.duracion;
    if (v.salida.tipo === 'estimada') reg.salidaEstimada = true;
  }
  return reg;
});

const respaldo = {
  meta: {
    version: '3.57.2', fecha: '2026-10-01T09:00:00-05:00', app: 'Stenbrary',
    totalAlumnos: ALUMNOS.length, totalRegistros: registros.length, totalMotivos: MOTIVOS.length,
    equipo: 'Verificación ago–sep',
  },
  alumnos: ALUMNOS.map(a => a.alumno),
  registros,
  motivos: MOTIVOS.map(m => ({ ...m, fechaCreacion: '2026-07-01T09:00:00-05:00' })),
};
fs.writeFileSync(path.join(SALIDA, 'respaldo-ago-sep-2026.json'), JSON.stringify(respaldo, null, 2));

// ── Excel para contar a mano ────────────────────────────────────────
const MESES = { '08': 'Agosto', '09': 'Septiembre' };
const hhmm = (h, m) => `${pad(h)}:${pad(m)}`;
const filaVisita = (v, i) => {
  const a = v.alumno;
  const fila = {
    '#': i + 1,
    'Fecha': v.dia,
    'Mes': MESES[v.dia.slice(5, 7)],
    'Día': DIAS[diaSemana(v.dia)],
    'Periodo': v.dia < '2026-08-17' ? 'Verano 2026' : 'Otoño 2026',
    'Hora entrada': hhmm(v.h, v.m),
    'Hora (0–23)': v.h,
    'Fecha salida': v.salida ? v.salida.dia : '',
    'Hora salida': v.salida ? hhmm(v.salida.h, v.salida.m) : '',
    'Tipo de salida': v.salida ? (v.salida.tipo === 'real' ? 'Real' : 'Puesta por el sistema') : 'Sin salida',
    'Duración (min)': v.salida ? v.duracion : '',
    'Entra en promedio de estancia': v.salida && v.salida.tipo === 'real' && v.duracion > 0 ? 'Sí' : 'No',
    'Tipo': a ? 'Alumno' : 'Visitante',
    'Matrícula': a ? a.matricula : 'INVITADO',
    'Nombre': a ? nombreCompleto(a) : v.visitante,
    'Carrera': a ? a.carrera : 'Visitante',
    'Grado': a ? a.grado : '',
    'Grupo': a ? a.grupo : '',
    'Turno': a ? a.turno : '',
    'Actividades': v.motivos.map(x => motivoPorId[x].nombre).join(', '),
    'N.º actividades': v.motivos.length,
  };
  for (const m of MOTIVOS) fila[m.nombre] = v.motivos.includes(m.id) ? 1 : 0;
  fila['Caso especial'] = v.nota;
  return fila;
};
const hojaVisitas = visitas.map(filaVisita);
const hojaAlumnos = ALUMNOS.map(({ alumno: a }) => ({
  'Matrícula': a.matricula, 'Nombre': a.nombre, 'Apellido paterno': a.apellidoPaterno,
  'Apellido materno': a.apellidoMaterno, 'Carrera': a.carrera, 'Grado': a.grado, 'Grupo': a.grupo, 'Turno': a.turno,
  'Visitas ago–sep': visitas.filter(v => v.alumno && v.alumno.matricula === a.matricula).length,
}));

const PREGUNTAS = [
  ['1', '¿Cuántas visitas hubo en total (agosto + septiembre)?'],
  ['2', '¿Cuántas en agosto y cuántas en septiembre?'],
  ['3', '¿Cuántas fueron de visitantes?'],
  ['4', '¿Cuántos alumnos distintos vinieron (sin visitantes)? ¿Cuántos alumnos registrados nunca vinieron?'],
  ['5', '¿En cuántos días distintos hubo visitas? ¿Cuál es el promedio de visitas por día (visitas ÷ esos días)?'],
  ['6', 'Visitas por carrera (sin visitantes).'],
  ['7', 'Visitas por turno (sin visitantes).'],
  ['8', 'Visitas que incluyeron cada actividad (una visita con 3 actividades suma 1 a cada una).'],
  ['9', 'Visitas por día de la semana, y el día más concurrido EN PROMEDIO (visitas de ese día ÷ cuántos de esos días tuvieron visitas).'],
  ['10', 'Visitas por hora de entrada (columna "Hora (0–23)"). Y la franja día + hora con más visitas (lo que el sistema llama "Hora pico", p. ej. "Lunes 13:00").'],
  ['11', 'Tiempo promedio de estancia: suma de "Duración (min)" de las filas con "Entra en promedio" = Sí, entre cuántas son.'],
  ['12', '¿Cuántas salidas puso el sistema y cuántas visitas quedaron sin salida?'],
  ['13', 'Top 5 de alumnos con más visitas.'],
  ['14', '¿Cuántas visitas hubo en el periodo Verano 2026 (hasta el 16-ago) y cuántas en Otoño 2026?'],
  ['15', 'Septiembre contra agosto: ¿subió o bajó, y en qué porcentaje? OJO: el sistema compara septiembre contra los 30 días anteriores (2 al 31 de agosto), no contra agosto completo.'],
  ['16', 'Martes 8 de septiembre: ¿cuántas visitas en la hora 12 y en la hora 13?'],
];
const hojaPreguntas = PREGUNTAS.map(([n, p]) => ({ 'N.º': n, 'Pregunta': p, 'Tu respuesta': '', 'Lo que dice el sistema': '', '¿Cuadra?': '' }));
const hojaInstrucciones = [
  ['Datos de verificación — agosto y septiembre 2026'],
  [''],
  ['Cada fila de "Visitas" es una visita. Las filas con texto en "Caso especial" son casos raros a propósito.'],
  ['Para contar actividades usa las columnas Estudiar, Pedir libro, etc. (1 = la visita la incluyó).'],
  ['Para contar por hora usa "Hora (0–23)": 12:59 cuenta en la hora 12.'],
  ['"Entra en promedio de estancia" = Sí solo si la salida es real y duró más de 0 minutos.'],
  ['Los visitantes cuentan en el total y en actividades, NO en carreras, turnos ni alumnos distintos.'],
  [''],
  ['Responde la hoja "Preguntas" con tablas dinámicas y luego compara con el sistema.'],
  ['Las respuestas calculadas están en otro archivo (respuestas-ago-sep-2026.xlsx): ábrelo al final.'],
];

const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(hojaInstrucciones), 'Instrucciones');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaVisitas), 'Visitas');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaAlumnos), 'Alumnos');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(hojaPreguntas), 'Preguntas');
XLSX.writeFile(libro, path.join(SALIDA, 'visitas-ago-sep-2026.xlsx'));

// ── Respuestas (definiciones P1–P8) ─────────────────────────────────
function resumen(lista) {
  const alumnosV = lista.filter(v => v.alumno);
  const contar = (arr, f) => arr.reduce((acc, v) => { const k = f(v); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const dias = new Set(lista.map(v => v.dia));
  const medidas = lista.filter(v => v.salida && v.salida.tipo === 'real' && v.duracion > 0);
  const totalMin = medidas.reduce((s, v) => s + v.duracion, 0);
  const porDiaSemana = contar(lista, v => diaSemana(v.dia));
  const diasPorTipo = {};
  for (const d of dias) diasPorTipo[diaSemana(d)] = (diasPorTipo[diaSemana(d)] || 0) + 1;
  const promDia = Object.keys(porDiaSemana).map(k => [+k, porDiaSemana[k] / diasPorTipo[k]]).sort((a, b) => b[1] - a[1]);
  const actividades = {};
  for (const v of lista) for (const m of new Set(v.motivos)) actividades[motivoPorId[m].nombre] = (actividades[motivoPorId[m].nombre] || 0) + 1;
  return {
    total: lista.length,
    visitantes: lista.length - alumnosV.length,
    alumnosDistintos: new Set(alumnosV.map(v => v.alumno.matricula)).size,
    dias: dias.size,
    promedioDia: dias.size ? +(lista.length / dias.size).toFixed(1) : 0,
    carreras: contar(alumnosV, v => v.alumno.carrera),
    turnos: contar(alumnosV, v => v.alumno.turno),
    actividades,
    porDiaSemana: Object.fromEntries(Object.entries(porDiaSemana).map(([k, n]) => [DIAS[k], `${n} visitas en ${diasPorTipo[k]} días = ${(n / diasPorTipo[k]).toFixed(2)}`])),
    diaMasConcurrido: promDia.length ? DIAS[promDia[0][0]] : '—',
    porHora: contar(lista, v => v.h),
    promedioEstancia: medidas.length ? Math.round(totalMin / medidas.length) : 0,
    medidas: medidas.length, totalMin,
    estimadas: lista.filter(v => v.salida && v.salida.tipo === 'estimada').length,
    sinSalida: lista.filter(v => !v.salida).length,
    franjaPico: (() => {
      const f = contar(lista, v => `${diaSemana(v.dia)}-${v.h}`);
      const max = Math.max(...Object.values(f));
      return Object.entries(f).filter(([, n]) => n === max)
        .map(([k]) => `${DIAS[k.split('-')[0]]} ${pad(k.split('-')[1])}:00`).join(', ') + ` (${max} visitas)`;
    })(),
    top: Object.entries(contar(alumnosV, v => nombreCompleto(v.alumno))).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}
const ago = visitas.filter(v => v.dia.startsWith('2026-08'));
const sep = visitas.filter(v => v.dia.startsWith('2026-09'));
const R = { 'Ago + Sep': resumen(visitas), 'Agosto': resumen(ago), 'Septiembre': resumen(sep) };
const nunca = ALUMNOS.filter(a => !visitas.some(v => v.alumno && v.alumno.matricula === a.alumno.matricula)).length;
const fmt = o => Object.entries(o).sort((a, b) => (typeof b[1] === 'number' ? b[1] - a[1] : 0)).map(([k, n]) => `${k}: ${n}`).join(' · ');
const hora = o => Object.entries(o).sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k} h: ${n}`).join(' · ');
const filasResp = [];
for (const [periodo, r] of Object.entries(R)) {
  filasResp.push(
    [periodo, '1–2 Total de visitas', r.total],
    [periodo, '3 Visitantes', r.visitantes],
    [periodo, '4 Alumnos distintos', r.alumnosDistintos],
    [periodo, '5 Días con visitas', r.dias],
    [periodo, '5 Promedio por día', r.promedioDia],
    [periodo, '6 Por carrera', fmt(r.carreras)],
    [periodo, '7 Por turno', fmt(r.turnos)],
    [periodo, '8 Por actividad', fmt(r.actividades)],
    [periodo, '9 Por día de la semana', Object.entries(r.porDiaSemana).map(([k, t]) => `${k}: ${t}`).join(' · ')],
    [periodo, '9 Día más concurrido (en promedio)', r.diaMasConcurrido],
    [periodo, '10 Por hora de entrada', hora(r.porHora)],
    [periodo, '11 Estancia promedio (min)', `${r.promedioEstancia} (= ${r.totalMin} min ÷ ${r.medidas} visitas)`],
    [periodo, '12 Salidas puestas por el sistema', r.estimadas],
    [periodo, '12 Sin salida', r.sinSalida],
    [periodo, '10 Franja día + hora con más visitas', r.franjaPico],
  );
  if (periodo === 'Ago + Sep') filasResp.push([periodo, '13 Top 5', r.top.map(([n, c]) => `${n} (${c})`).join(' · ')]);
}
filasResp.push(
  ['Ago + Sep', '4 Alumnos que nunca vinieron', nunca],
  ['Ago + Sep', '14 Verano 2026 (1–16 ago)', visitas.filter(v => v.dia < '2026-08-17').length],
  ['Ago + Sep', '14 Otoño 2026 (desde 17 ago)', visitas.filter(v => v.dia >= '2026-08-17').length],
  ['Ago + Sep', '15 Septiembre contra agosto completo', `${sep.length} contra ${ago.length} = ${((sep.length - ago.length) / ago.length * 100).toFixed(1)} %`],
  ['Ago + Sep', '15 Septiembre contra 2–31 ago (lo que compara el sistema)', (() => { const n = ago.filter(v => v.dia >= '2026-08-02').length; return `${sep.length} contra ${n} = ${((sep.length - n) / n * 100).toFixed(1)} %`; })()],
  ['Ago + Sep', '16 Martes 8-sep, hora 12 / hora 13', `${visitas.filter(v => v.dia === '2026-09-08' && v.h === 12).length} / ${visitas.filter(v => v.dia === '2026-09-08' && v.h === 13).length}`],
);
const libroR = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libroR, XLSX.utils.aoa_to_sheet([['Periodo', 'Pregunta', 'Respuesta'], ...filasResp]), 'Respuestas');
XLSX.writeFile(libroR, path.join(SALIDA, 'respuestas-ago-sep-2026.xlsx'));

console.log(`Visitas: ${visitas.length} (agosto ${ago.length}, septiembre ${sep.length}); alumnos ${ALUMNOS.length}; especiales ${especiales.length}`);
console.log(JSON.stringify(R['Ago + Sep'], null, 1).slice(0, 1500));
if (process.env.SEMILLA_DEBUG) {
  const conteo = {};
  for (const v of visitas) if (v.alumno) conteo[v.alumno.matricula] = (conteo[v.alumno.matricula] || 0) + 1;
  console.log('TOP7', Object.values(conteo).sort((a, b) => b - a).slice(0, 7).join(','));
}
