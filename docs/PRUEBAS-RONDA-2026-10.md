# Ronda de pruebas — octubre 2026

> Fecha: 2026-10-06 · Versión: v3.44.1 · Después de cerrar la auditoría (`docs/AUDITORIA-2026-10.md`).
> Las partes 1 a 3 se hicieron de forma automatizada (Playwright sobre el **build de producción**,
> zona horaria `America/Matamoros`). La parte 4 la tiene que hacer una persona con el equipo real.

## 1. Cuadre de números — ✅ 32 de 32

Se cargó un conjunto pequeño, de 6 alumnos y 10 visitas, con el "Restaurar respaldo" real, con el reloj
fijo en el miércoles 7 de octubre de 2026 a las 12:00. Cada número se comparó contra un cálculo hecho
a mano. Coincidieron todos, en Estadísticas (Resumen, Personas, Comparar), en el Resumen del inicio,
en Registros y en Inactivos.

Quedó como test permanente: **`e2e/cuadre.spec.ts`** (con el fixture `e2e/fixtures/cuadre.json` y su
generador `crear-cuadre.py`). Si un cambio altera un número, el test falla y dice cuál.

## 2. Volumen y velocidad — ✅

Datos generados con Configuración → Datos de prueba, sobre el build de producción, en el equipo de desarrollo.

| Pantalla | 21 411 registros (1 año) | 50 402 registros (2.5 años) |
|---|---|---|
| Resumen | 0.4–0.6 s | 1.1–1.2 s |
| Estadísticas (30 días) | 0.7–0.8 s | 1.6–1.7 s |
| Estadísticas (cambiar a "Este año" / "Todo") | 0.5 s | 0.7–0.8 s |
| Registros | 0.7 s | 1.8 s |
| Alumnos | 0.3 s | 0.4 s |
| Inactivos | 0.2 s | 0.3 s |
| Diagnóstico → Revisar datos | 0.6 s | 1.7 s |

En una computadora de biblioteca más modesta pueden ser 2–3 veces más. Con 2.5 años de datos sigue
siendo usable. **No se encontraron errores de consola** en ninguna pantalla.

**Exportaciones (21 411 registros):**

| Archivo | Tiempo | Tamaño antes → ahora |
|---|---|---|
| PDF Estadísticas, 30 días | 1.6 s | 5.3 MB → **0.5 MB** |
| PDF Estadísticas, todo el historial | 8 s | 41 MB → **4 MB** |
| PDF Registros, todo | 8 s | 41 MB → **4 MB** |
| Excel Registros, todo | 2–4 s | 21 411 filas, todas las columnas |

## 3. Problemas encontrados en la ronda (corregidos en v3.44.1)

1. **El generador de datos de prueba creaba visitas en el FUTURO.** Para el día de hoy elegía una hora
   al azar entre las 7 y las 22. Mostraba "último registro hace unos segundos", flujo del día hasta las
   21 h a media tarde y proyección y presencia falseadas. Ahora reparte las visitas de hoy hasta la hora
   actual. Verificado: 0 entradas y 0 salidas futuras en 21 411 registros.
2. **Los PDF no se comprimían** (jsPDF no lo hace por omisión). El de todo el historial pesaba 41 MB, más
   que el límite de adjuntos de Gmail (25 MB). Con compresión pesa 4 MB.
3. **Todos los PDF se llamaban igual** ("reporte_personalizado_stenbrary_<hoy>.pdf"), así que dos reportes
   del mismo día se pisaban. Ahora el nombre lleva el período: `reporte_stenbrary_2026-09-07_a_2026-10-06.pdf`.
4. **El Excel de Registros estaba incompleto:** solo el motivo principal, sin salida, duración ni turno.
   Ahora trae todas las actividades de la visita, la salida, la duración (solo si es real) y una columna
   "Salida estimada".
5. "**94.6promedio** por día" (faltaba un espacio), el texto de la tendencia sin datos previos era demasiado
   largo para la tarjeta, y "Comparado contra: del 07-oct al 06-oct" no decía el año.

**Lección para el despliegue:** durante la ronda, el *service worker* y la caché del navegador siguieron
sirviendo el código viejo a un perfil después de recompilar. En producción eso le pasará al coordinador
tras cada actualización: la app ya tiene el aviso "Hay una nueva versión", pero hay que verificarlo en el
primer despliegue real (lista de abajo, punto A3).

## 4. Pruebas que solo puede hacer una persona — ⏳ pendientes

Marca ✅/❌ y anota lo raro. Todo lo demás está cubierto por las pruebas automáticas.

**A. Instalación y actualización**
- [ ] A1. Abrir la app en el navegador del equipo de la biblioteca e instalarla como app (ícono en el escritorio).
- [ ] A2. Cerrar el Wi-Fi: la app abre y registra igual.
- [ ] A3. Tras el próximo despliegue: aparece el aviso de nueva versión y, al aceptarlo, se ve la versión nueva (Novedades).

**B. Escáner con la cámara real** (`PRUEBAS-MANUALES.md` §2)
- [ ] B1. Permiso de cámara: aceptar y rechazar, y que el mensaje sea claro.
- [ ] B2. Credenciales reales de la UAT: leer 10 seguidas y ver cuántas fallan.
- [ ] B3. Con poca luz: probar linterna y zoom, si la cámara los tiene.
- [ ] B4. Escanear la misma credencial dos veces seguidas: debe pedir confirmación de duplicado (con el módulo de salida apagado).
- [ ] B5. Lector USB, si lo hay (§3.4).

**C. Flujo real de entrada y salida** (§7)
- [ ] C1. Con el módulo de salida activo: entrar, salir y ver la duración en Registros.
- [ ] C2. Dejar una entrada abierta más horas que el umbral de cierre automático. En "En Biblioteca" debe aparecer para confirmar, y en Registros la duración debe decir "(estimada)".
- [ ] C3. Diagnóstico → Revisar datos al día siguiente, con una entrada que nadie cerró.

**D. Quiosco en la tablet** (§10)
- [ ] D1. Activar el modo quiosco: solo se ve el flujo de escaneo.
- [ ] D2. Salir con pulsación larga y PIN.

**E. Archivos exportados** (aquí no se pudo renderizar el PDF)
- [ ] E1. Abrir un PDF de Estadísticas: que se lea bien, con las tablas completas y los títulos correctos.
- [ ] E2. Abrir el Excel de Registros en Excel: que salgan bien acentos, fechas y columnas.
- [ ] E3. Imprimir una constancia de un alumno.

**F. Calendario escolar**
- [ ] F1. Configuración → Calendario escolar: cambiar la fecha de un festivo y guardar. En Estadísticas, el botón "Este periodo" debe mostrar el nombre correcto.
