// ╔══════════════════════════════════════════════════════╗
// ║  matricula.utils.ts                                  ║
// ║  Stenbrary v3.6.2 — Validación de matrícula UAT      ║
// ║                                                      ║
// ║  Formato detectado: [a]NNNNNNNNNN                    ║
// ║  - Prefijo 'a' o 'A' opcional (indica "alumno")      ║
// ║  - Parte numérica: 7-12 dígitos                      ║
// ║  - Ejemplo: a2299990001 o 2299990001                  ║
// ║                                                      ║
// ║  UBICACIÓN: src/app/core/utils/matricula.utils.ts     ║
// ║                                                      ║
// ║  NOTA: Si en el futuro se conoce el formato exacto,   ║
// ║  ajustar MATRICULA_CONFIG y las funciones se          ║
// ║  actualizan automáticamente.                          ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Configuración centralizada del formato de matrícula.
 * Modificar estos valores cuando se conozca el formato exacto.
 */
export const MATRICULA_CONFIG = {
  /** Longitud mínima de la parte numérica */
  minDigitos: 7,

  /** Longitud máxima de la parte numérica */
  maxDigitos: 12,

  /** Prefijos válidos (letra antes de los números). Vacío = sin prefijo. */
  prefijosValidos: ['a', 'A'],

  /** Si es true, acepta matrículas sin prefijo (solo números) */
  permitirSinPrefijo: true,

  /** Matrícula para invitados (excluida de validación) */
  matriculaInvitado: 'INVITADO',
};

/**
 * Resultado de la validación de matrícula.
 */
export interface ValidacionMatricula {
  /** Si la matrícula es válida */
  valida: boolean;

  /** La matrícula limpia (sin prefijo, solo números) */
  matriculaLimpia: string;

  /** El prefijo detectado (si existe) */
  prefijo: string;

  /** Mensaje de error (si no es válida) */
  error: string;
}

/**
 * Valida y normaliza una matrícula.
 *
 * Acepta:
 *   - "2299990001"    → válida (solo números)
 *   - "a2299990001"   → válida (prefijo + números, limpia a "2299990001")
 *   - "A2299990001"   → válida (prefijo mayúscula)
 *   - "INVITADO"      → válida (invitado)
 *
 * Rechaza:
 *   - "123"           → muy corta
 *   - "abc123"        → prefijo no reconocido
 *   - ""              → vacía
 *   - "12345678901234" → muy larga
 */
export function validarMatricula(valor: string): ValidacionMatricula {
  const texto = (valor || '').trim();

  // Caso vacío
  if (!texto) {
    return { valida: false, matriculaLimpia: '', prefijo: '', error: 'La matrícula es requerida' };
  }

  // Caso invitado
  if (texto.toUpperCase() === MATRICULA_CONFIG.matriculaInvitado) {
    return { valida: true, matriculaLimpia: MATRICULA_CONFIG.matriculaInvitado, prefijo: '', error: '' };
  }

  // Detectar prefijo
  let prefijo = '';
  let parteNumerica = texto;

  const primeraLetra = texto.charAt(0);
  if (MATRICULA_CONFIG.prefijosValidos.includes(primeraLetra)) {
    prefijo = primeraLetra;
    parteNumerica = texto.substring(1);
  }

  // Validar que la parte numérica sea solo dígitos
  if (!/^\d+$/.test(parteNumerica)) {
    // Si no tiene prefijo válido y no es numérica
    if (!prefijo && /^[a-zA-Z]/.test(texto)) {
      return {
        valida: false,
        matriculaLimpia: '',
        prefijo: '',
        error: 'Formato no reconocido. La matrícula debe ser numérica o iniciar con "a"',
      };
    }
    return {
      valida: false,
      matriculaLimpia: '',
      prefijo,
      error: 'La matrícula debe contener solo números (opcionalmente precedidos por "a")',
    };
  }

  // Validar longitud de la parte numérica
  if (parteNumerica.length < MATRICULA_CONFIG.minDigitos) {
    return {
      valida: false,
      matriculaLimpia: parteNumerica,
      prefijo,
      error: `La matrícula debe tener al menos ${MATRICULA_CONFIG.minDigitos} dígitos`,
    };
  }

  if (parteNumerica.length > MATRICULA_CONFIG.maxDigitos) {
    return {
      valida: false,
      matriculaLimpia: parteNumerica,
      prefijo,
      error: `La matrícula no debe exceder ${MATRICULA_CONFIG.maxDigitos} dígitos`,
    };
  }

  // Sin prefijo pero empieza con número → verificar si se permite
  if (!prefijo && !MATRICULA_CONFIG.permitirSinPrefijo) {
    return {
      valida: false,
      matriculaLimpia: parteNumerica,
      prefijo: '',
      error: 'La matrícula debe iniciar con la letra "a"',
    };
  }

  // Válida
  return {
    valida: true,
    matriculaLimpia: parteNumerica,
    prefijo,
    error: '',
  };
}

/**
 * Validación rápida para el scanner (solo números, sin prefijo).
 * El código de barras de la credencial UAT contiene solo la parte numérica.
 *
 * Esta función es más permisiva que validarMatricula() porque el scanner
 * necesita aceptar rápido sin preguntar por prefijos.
 */
export function esMatriculaValidaScanner(texto: string): boolean {
  if (!texto) return false;
  const limpio = texto.trim();
  // Tope de dígitos (v3.57.2): sin él, el código de barras de un libro
  // (ISBN, 13 dígitos) pasaba por matrícula y abría el registro de alumno.
  return /^\d+$/.test(limpio)
    && limpio.length >= MATRICULA_CONFIG.minDigitos
    && limpio.length <= MATRICULA_CONFIG.maxDigitos;
}

/**
 * Normaliza la matrícula ingresada manualmente.
 * Remueve prefijo "a/A" si existe y retorna solo la parte numérica.
 *
 * "a2299990001" → "2299990001"
 * "2299990001"  → "2299990001"
 * "A2299990001" → "2299990001"
 */
export function normalizarMatricula(valor: string): string {
  const texto = (valor || '').trim();

  if (MATRICULA_CONFIG.prefijosValidos.includes(texto.charAt(0))) {
    return texto.substring(1);
  }

  return texto;
}