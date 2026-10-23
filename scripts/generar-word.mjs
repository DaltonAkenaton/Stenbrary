// ╔══════════════════════════════════════════════════════════════════╗
// ║  scripts/generar-word.mjs                                         ║
// ║  Convierte las guías de docs/guias/*.md a Word (.docx)            ║
// ║                                                                    ║
// ║  Las guías se escriben en Markdown (una sola fuente, versionada)  ║
// ║  y se entregan en Word al coordinador. Solo entiende el Markdown  ║
// ║  que usan las guías: títulos #/##/###, párrafos, **negrita**,     ║
// ║  *cursiva*, `código`, listas (-, 1., - [ ]), tablas, citas (>) y  ║
// ║  separadores (---).                                               ║
// ║                                                                    ║
// ║  Uso: node scripts/generar-word.mjs   → docs/guias/word/*.docx    ║
// ╚══════════════════════════════════════════════════════════════════╝
import fs from 'node:fs';
import path from 'node:path';
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const ORIGEN = path.join(RAIZ, 'docs', 'guias');
const DESTINO = path.join(ORIGEN, 'word');

// Paleta del sistema, oscurecida para papel.
const NAVY = '0B2545';
const ACENTO = '007C89';
const GRIS = '5A6472';
const BORDE = 'C9D3DD';
const FONDO_TABLA = 'E8F1F5';

// Carta, márgenes de 2.5 cm. 1 cm ≈ 567 DXA.
const ANCHO_PAGINA = 12240;
const MARGEN = 1418;
const ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN;

/** **negrita**, *cursiva* y `código` → TextRuns. */
function enLinea(texto, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index > ultimo) runs.push(new TextRun({ ...base, text: texto.slice(ultimo, m.index) }));
    const t = m[0];
    if (t.startsWith('**')) runs.push(new TextRun({ ...base, text: t.slice(2, -2), bold: true }));
    else if (t.startsWith('`')) runs.push(new TextRun({ ...base, text: t.slice(1, -1), font: 'Consolas' }));
    else runs.push(new TextRun({ ...base, text: t.slice(1, -1), italics: true }));
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) runs.push(new TextRun({ ...base, text: texto.slice(ultimo) }));
  return runs;
}

const celdas = linea => linea.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

function tabla(filas) {
  const [encabezado, , ...cuerpo] = filas.map(celdas);
  const n = encabezado.length;
  // La primera columna suele ser corta ("Semana", "#"): un poco más angosta.
  const primera = n > 2 ? Math.round(ANCHO_UTIL * 0.26) : Math.round(ANCHO_UTIL * 0.34);
  const resto = Math.floor((ANCHO_UTIL - primera) / (n - 1));
  const anchos = [primera, ...Array(n - 1).fill(resto)];
  anchos[n - 1] += ANCHO_UTIL - anchos.reduce((a, b) => a + b, 0);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: BORDE };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const celda = (texto, i, cabecera) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    borders: bordes,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: cabecera ? { type: ShadingType.CLEAR, fill: FONDO_TABLA, color: 'auto' } : undefined,
    children: [new Paragraph({ spacing: { after: 0 }, children: enLinea(texto, cabecera ? { bold: true, color: NAVY } : {}) })],
  });
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: encabezado.map((t, i) => celda(t, i, true)) }),
      ...cuerpo.map(f => new TableRow({ children: f.map((t, i) => celda(t, i, false)) })),
    ],
  });
}

function convertir(md) {
  const lineas = md.replace(/\r\n/g, '\n').split('\n');
  const bloques = [];
  let titulo = 'Stenbrary';
  let numeracion = 0;      // cada lista numerada reinicia en 1
  let enNumerada = false;

  /** Renglones siguientes con sangría que continúan un punto de lista. */
  const continuar = (i, texto) => {
    while (i + 1 < lineas.length && /^\s{2,}\S/.test(lineas[i + 1]) && !/^\s*(-|\d+\.)\s/.test(lineas[i + 1])) {
      texto += ' ' + lineas[++i].trim();
    }
    return [i, texto];
  };

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const t = l.trim();
    if (!/^\d+\.\s/.test(t) && !/^\s{2,}\S/.test(l)) enNumerada = false;
    if (!t) continue;

    if (t.startsWith('|')) {
      const filas = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) filas.push(lineas[i++]);
      i--;
      bloques.push(tabla(filas));
      bloques.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }
    if (t === '---') {
      bloques.push(new Paragraph({
        spacing: { before: 120, after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDE, space: 1 } },
        children: [],
      }));
      continue;
    }
    if (t.startsWith('# ')) {
      titulo = t.slice(2).replace(/^Stenbrary\s*—\s*/, '');
      bloques.push(new Paragraph({ heading: HeadingLevel.TITLE, children: enLinea(t.slice(2)) }));
      continue;
    }
    if (t.startsWith('## ')) { bloques.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: enLinea(t.slice(3)) })); continue; }
    if (t.startsWith('### ')) { bloques.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: enLinea(t.slice(4)) })); continue; }
    if (t.startsWith('> ')) {
      // La cita ocupa varios renglones en el Markdown: va en un solo párrafo
      // (si no, una **negrita** partida entre renglones salía con los asteriscos).
      let texto = t.slice(2);
      while (i + 1 < lineas.length && lineas[i + 1].trim().startsWith('>')) {
        texto += ' ' + lineas[++i].trim().replace(/^>\s?/, '');
      }
      bloques.push(new Paragraph({
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACENTO, space: 8 } },
        children: enLinea(texto, { color: GRIS }),
      }));
      continue;
    }
    const check = t.match(/^- \[( |x)\] (.*)$/);
    if (check) {
      [i, check[2]] = continuar(i, check[2]);
      bloques.push(new Paragraph({
        indent: { left: 360, hanging: 360 },
        spacing: { after: 80 },
        children: [new TextRun({ text: check[1] === 'x' ? '☑  ' : '☐  ', font: 'Segoe UI Symbol' }), ...enLinea(check[2])],
      }));
      continue;
    }
    if (/^\s*- /.test(l)) {
      const nivel = Math.min(1, Math.floor(l.search(/\S/) / 2));
      let texto;
      [i, texto] = continuar(i, t.slice(2));
      bloques.push(new Paragraph({ numbering: { reference: 'vinetas', level: nivel }, children: enLinea(texto) }));
      continue;
    }
    const num = t.match(/^\d+\.\s(.*)$/);
    if (num && l.search(/\S/) < 2) {
      if (!enNumerada) { numeracion++; enNumerada = true; }
      let texto;
      [i, texto] = continuar(i, num[1]);
      bloques.push(new Paragraph({ numbering: { reference: 'numeros', level: 0, instance: numeracion }, children: enLinea(texto) }));
      continue;
    }
    // Párrafo: junta las líneas seguidas (el Markdown corta a 80 columnas).
    const partes = [t];
    while (i + 1 < lineas.length && lineas[i + 1].trim() && !/^(#|\||-|>|\d+\.\s|---)/.test(lineas[i + 1].trim())) {
      partes.push(lineas[++i].trim());
    }
    const texto = partes.join(' ');
    bloques.push(new Paragraph({ children: enLinea(texto) }));
  }
  return { titulo, bloques };
}

/** `escala`: la hoja de la entrada se pega junto a la PC y se lee de lejos. */
function documento({ titulo, bloques }, escala = 1) {
  const t = n => Math.round(n * escala);
  return new Document({
    creator: 'Stenbrary',
    title: titulo,
    styles: {
      default: { document: { run: { font: 'Calibri', size: t(22) }, paragraph: { spacing: { after: 140, line: 276 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: t(40), bold: true, color: NAVY, font: 'Calibri' }, paragraph: { spacing: { after: 120 } } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: t(28), bold: true, color: NAVY, font: 'Calibri' },
          paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0, keepNext: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: t(24), bold: true, color: ACENTO, font: 'Calibri' },
          paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1, keepNext: true } },
      ],
    },
    numbering: {
      config: [
        { reference: 'vinetas', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
        ] },
        { reference: 'numeros', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
        ] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: ANCHO_PAGINA, height: 15840 }, margin: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN } } },
      headers: { default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Stenbrary', bold: true, color: ACENTO, size: 18 }), new TextRun({ text: `  ·  ${titulo}`, color: GRIS, size: 18 })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], color: GRIS, size: 18 })],
      })] }) },
      children: bloques,
    }],
  });
}

fs.mkdirSync(DESTINO, { recursive: true });
const archivos = fs.readdirSync(ORIGEN).filter(f => f.endsWith('.md')).sort();
for (const f of archivos) {
  const doc = documento(convertir(fs.readFileSync(path.join(ORIGEN, f), 'utf8')), f.includes('hoja-entrada') ? 1.45 : 1);
  const salida = path.join(DESTINO, f.replace(/\.md$/, '.docx'));
  try {
    fs.writeFileSync(salida, await Packer.toBuffer(doc));
    console.log('✓', path.relative(RAIZ, salida));
  } catch (e) {
    // Abierto en Word: se avisa y se siguen los demás.
    if (e.code !== 'EBUSY') throw e;
    console.log('✗', path.relative(RAIZ, salida), '— está abierto en Word: ciérralo y vuelve a correr esto');
  }
}
