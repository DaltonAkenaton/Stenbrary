// ╔══════════════════════════════════════════════════════╗
// ║  catalogos.utils.spec.ts                             ║
// ║  Stenbrary v3.57.0 — Catálogos editables             ║
// ╚══════════════════════════════════════════════════════╝

import {
  CatalogoEscolar, agregarCarrera, agregarGrupo, alternarCarrera, buscarCarrera, cambiarRangoGrados,
  carrerasActivas, catalogoInicial, claveCatalogo, combinarCatalogos, gradosDe, normalizarCatalogo,
  aplicarRenombre, opcionesCarrera, quitarGrupo, renombrarCarrera,
} from './catalogos.utils';

function ok(r: ReturnType<typeof agregarCarrera>): CatalogoEscolar {
  if (!r.ok) throw new Error(r.error);
  return r.catalogo;
}

describe('catalogos.utils', () => {
  it('el catálogo de fábrica es el que estaba fijo en el código', () => {
    const c = catalogoInicial();
    expect(c.carreras.length).toBe(8);
    expect(c.carreras.every(x => x.activa && x.id.startsWith('car-'))).toBeTrue();
    expect(new Set(c.carreras.map(x => x.id)).size).toBe(8);
    expect(c.grupos).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(gradosDe(c)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('agregar no permite repetidos aunque cambien acentos o mayúsculas', () => {
    const c = catalogoInicial();
    const r = agregarCarrera(c, '  licenciatura en  derecho ');
    expect(r.ok).toBeFalse();
    const c2 = ok(agregarCarrera(c, 'Ingeniería en Inteligencia Artificial'));
    expect(carrerasActivas(c2)).toContain('Ingeniería en Inteligencia Artificial');
    expect(c.carreras.length).toBe(8);                   // no muta el original
  });

  it('renombrar conserva el id y no choca con otra carrera', () => {
    const c = catalogoInicial();
    const ti = buscarCarrera(c, 'Licenciatura en Tecnologías de la Información')!;
    const c2 = ok(renombrarCarrera(c, ti.id, 'Lic. en Tecnologías de la Información e Inteligencia Artificial'));
    expect(c2.carreras.find(x => x.id === ti.id)!.nombre).toContain('Inteligencia Artificial');
    expect(renombrarCarrera(c, ti.id, 'Licenciatura en Derecho').ok).toBeFalse();
    expect(renombrarCarrera(c, ti.id, 'licenciatura en tecnologias de la informacion').ok).toBeTrue(); // solo acentos
  });

  it('desactivar saca la carrera de las opciones, pero no la de un alumno que ya la tiene', () => {
    const c = catalogoInicial();
    const der = buscarCarrera(c, 'Licenciatura en Derecho')!;
    const c2 = ok(alternarCarrera(c, der.id));
    expect(carrerasActivas(c2)).not.toContain('Licenciatura en Derecho');
    expect(opcionesCarrera(c2, 'Licenciatura en Derecho')).toContain('Licenciatura en Derecho');
    expect(opcionesCarrera(c2, 'Carrera vieja')).toContain('Carrera vieja');
    expect(opcionesCarrera(c2).length).toBe(7);
  });

  it('siempre queda al menos una carrera activa y un grupo', () => {
    let c = catalogoInicial();
    for (const x of c.carreras.slice(1)) c = ok(alternarCarrera(c, x.id));
    expect(alternarCarrera(c, c.carreras[0].id).ok).toBeFalse();
    let g = catalogoInicial();
    for (const x of ['A', 'B', 'C', 'D', 'E']) g = ok(quitarGrupo(g, x));
    expect(quitarGrupo(g, 'F').ok).toBeFalse();
  });

  it('grupos en mayúsculas y sin repetir; grados en rango libre válido', () => {
    const c = ok(agregarGrupo(catalogoInicial(), ' g '));
    expect(c.grupos).toContain('G');
    expect(agregarGrupo(c, 'g').ok).toBeFalse();
    expect(gradosDe(ok(cambiarRangoGrados(c, 1, 10)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(cambiarRangoGrados(c, 5, 3).ok).toBeFalse();
    expect(cambiarRangoGrados(c, 0, 3).ok).toBeFalse();
  });

  it('normalizar tolera basura y repetidos; vacío = catálogo de fábrica', () => {
    expect(normalizarCatalogo(null).carreras.length).toBe(8);
    expect(normalizarCatalogo('x').grupos.length).toBe(6);
    const n = normalizarCatalogo({
      carreras: [{ id: 'a', nombre: 'Uno', activa: false }, { id: 'a', nombre: 'Dos' }, { nombre: 'uno' }, { nombre: 7 }],
      grupos: ['a', 'A', '', 3], gradoMin: 9, gradoMax: 2,
    });
    expect(n.carreras.map(x => x.nombre)).toEqual(['Uno', 'Dos']);
    expect(n.carreras[0].activa).toBeFalse();
    expect(n.carreras[1].id).not.toBe('a');               // ids únicos
    expect(n.grupos).toEqual(['A']);
    expect([n.gradoMin, n.gradoMax]).toEqual([1, 12]);     // rango imposible → el de fábrica
  });

  it('combinar un respaldo solo agrega lo que falta; manda el nombre local', () => {
    const local = catalogoInicial();
    const ti = buscarCarrera(local, 'Licenciatura en Tecnologías de la Información')!;
    let remoto = ok(renombrarCarrera(local, ti.id, 'Otro nombre de TI'));
    remoto = ok(agregarCarrera(remoto, 'Ingeniería Civil'));
    remoto = ok(agregarGrupo(remoto, 'G'));
    const { catalogo, nuevos } = combinarCatalogos(local, remoto);
    expect(nuevos).toBe(2);
    expect(catalogo.carreras.find(x => x.id === ti.id)!.nombre).toBe(ti.nombre);
    expect(carrerasActivas(catalogo)).toContain('Ingeniería Civil');
    expect(catalogo.grupos).toContain('G');
    expect(combinarCatalogos(catalogo, remoto).nuevos).toBe(0);   // idempotente
  });

  it('la clave ignora acentos, mayúsculas y espacios', () => {
    expect(claveCatalogo('  Enfermería  General ')).toBe('enfermeria general');
  });

  it('aplicarRenombre repite una corrección del otro equipo (v3.57.2)', () => {
    const base = catalogoInicial();
    const vieja = base.carreras[0].nombre;
    const r = aplicarRenombre(base, vieja, 'Carrera Corregida');
    expect(buscarCarrera(r, 'Carrera Corregida')?.id).toBe(base.carreras[0].id);
    expect(buscarCarrera(r, vieja)).toBeUndefined();
    // Si aquí ya existe el nombre nuevo, la vieja solo se desactiva.
    const otra = base.carreras[1].nombre;
    const r2 = aplicarRenombre(base, vieja, otra);
    expect(buscarCarrera(r2, vieja)?.activa).toBeFalse();
    // Nada que cambiar: el mismo objeto.
    expect(aplicarRenombre(base, 'No existe', 'X Y Z')).toBe(base);
  });
});
