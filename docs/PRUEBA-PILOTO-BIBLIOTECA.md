# Prueba piloto en la biblioteca

> **Estado: NO REALIZADA.** Este documento es un requisito de validación
> institucional, no un reporte. Lo que se verificó con código (pruebas
> unitarias, E2E, accesibilidad, cabeceras de seguridad) está en
> `docs/HARDENING-2026-10.md`. Lo de aquí **solo** se puede comprobar con el
> equipo físico, las credenciales reales y el personal de la biblioteca.
> Stenbrary no debe operar con datos reales de alumnos hasta completar y
> firmar la sección 9.

Cada punto se marca con fecha, quién lo verificó y el resultado. Un punto
fallido se anota con su causa y se repite tras corregirlo.

## 0. Antes de empezar

- [ ] Autorización por escrito de la institución para usar el sistema y
      tratar los datos de los alumnos (finalidad, responsables, conservación).
- [ ] Aviso de privacidad visible para los alumnos en la entrada.
- [ ] Equipo de la entrada con cuenta de Windows **propia** del servicio,
      contraseña, bloqueo automático de pantalla y sin otros usuarios.
- [ ] Perfil de navegador dedicado (Chrome o Edge actualizados), sin
      sincronización de cuenta personal y sin extensiones.
- [ ] Stenbrary instalado como aplicación (PWA) desde `https://stenbrary.pages.dev`
      y versión anotada (Novedades): ______.
- [ ] Hora del equipo verificada (Configuración → Avanzado → Hora del sistema).
- [ ] PIN cambiado del de fábrica y código de recuperación anotado en papel,
      guardado por la coordinación.

## 1. Lectura de credenciales reales (autorizada)

- [ ] Modelo de lector USB anotado: ______.
- [ ] 20 credenciales reales distintas, leídas una tras otra: cada una
      encuentra al alumno correcto o abre el registro de alumno nuevo.
- [ ] Credencial con prefijo `a` y sin prefijo: se reconoce la misma matrícula.
- [ ] Lectura con el diálogo de PIN abierto: no cuenta como intento.
- [ ] Fila de 5 alumnos seguidos sin tocar la pantalla: ningún registro
      cruzado (el Enter de uno no registra al anterior).
- [ ] Un código que no es credencial (ISBN de un libro): se ignora.
- [ ] Cámara como respaldo (si se usará): lee la credencial con la luz real
      de la entrada.

## 2. Una jornada completa

- [ ] Apertura a cierre con el horario real configurado; entradas y salidas.
- [ ] Aforo configurado y probado al límite (si aplica).
- [ ] Modo quiosco toda la jornada: salir con pulsación larga + PIN funciona.
- [ ] Cierre automático de las entradas sin salida al final del día.
- [ ] Al día siguiente: Resumen, Registros y Estadísticas cuadran con un
      conteo manual en papel de una franja de una hora.

## 3. Caída de internet

- [ ] Desconectar la red a media jornada (cable o Wi-Fi): el registro sigue
      sin interrupciones.
- [ ] Cerrar y volver a abrir la aplicación sin internet: abre y registra.
- [ ] Reconectar: no se pierde ni duplica ninguna visita.
- [ ] Reiniciar el equipo sin internet: la aplicación abre.

## 4. Respaldos entre dos equipos (entrada y oficina)

- [ ] Nombres de equipo configurados ("Puerta", "Oficina").
- [ ] Respaldo de la entrada → combinar en la oficina: las cifras de la
      oficina suman las de la entrada.
- [ ] Combinar el **mismo** respaldo dos veces: nada se duplica.
- [ ] Borrar una visita basura en la entrada → respaldo → combinar en la
      oficina: la visita desaparece también allá y no revive con un respaldo viejo.
- [ ] Corregir un alumno en la oficina y combinar un respaldo viejo de la
      entrada: se conserva la corrección.
- [ ] Un archivo que no es respaldo (o uno dañado a mano): se rechaza con el
      motivo y no cambia nada.

## 5. Restauración de datos

- [ ] "Reemplazar todo" con el respaldo del día anterior: se descarga antes
      la copia `antes-de-reemplazar`, y las cifras quedan como en ese respaldo.
- [ ] Volver al estado previo con la copia `antes-de-reemplazar`.
- [ ] Restaurar en un equipo **nuevo** (otro perfil o navegador) con el
      último respaldo: mismas cifras.

## 6. Pérdida del navegador (simulacro)

- [ ] Procedimiento escrito y entendido por el personal: dónde se guardan
      los respaldos, cada cuánto, quién los descarga, cuántos se conservan.
- [ ] Simulacro: perfil del navegador borrado → reinstalar la PWA →
      restaurar el último respaldo → seguir operando. Tiempo total: ______.
- [ ] Recordatorio de respaldo configurado con la frecuencia acordada.

## 7. Importación del padrón real

- [ ] Archivo oficial de inscritos: columnas detectadas bien, carreras
      emparejadas con el catálogo, errores de la vista previa revisados.
- [ ] Importado completo; conteo de alumnos = conteo del archivo − filas
      con errores.

## 8. Revisión con coordinación y personal

- [ ] Recorrido guiado con quien atenderá la entrada (sin intervención del
      desarrollador durante una hora).
- [ ] Coordinación revisa Estadísticas, reportes PDF/Excel y constancias con
      datos de la jornada piloto.
- [ ] Observaciones registradas y priorizadas: ______.
- [ ] Prueba con lector de pantalla o teclado si algún usuario lo requiere.

## 9. Aceptación

Con todos los puntos anteriores verificados (o con las excepciones anotadas
y aceptadas), los responsables autorizan operar con usuarios reales.

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Coordinación de la biblioteca | | | |
| Responsable de datos personales de la institución | | | |
| Responsable técnico (desarrollador) | | | |

Excepciones aceptadas: ______
