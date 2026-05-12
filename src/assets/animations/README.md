# Animaciones Lottie de éxito

Esta carpeta contiene las animaciones Lottie (JSON) que se reproducen al
registrar exitosamente un alumno. **Es opcional** — si no hay archivos
aquí, el sistema usa emojis animados grandes como fallback automático.

## Cómo agregar animaciones

1. Ve a [LottieFiles](https://lottiefiles.com) (gratis, no requiere cuenta).
2. Busca animaciones con licencia gratuita (filtro "Free"). Sugerencias por tema:

   | Archivo esperado | Términos de búsqueda recomendados |
   |---|---|
   | `book.json`       | "open book", "book reading", "library book" |
   | `thumbsup.json`   | "thumbs up", "like animation", "approval" |
   | `trophy.json`     | "trophy", "winner award", "champion" |
   | `graduation.json` | "graduation cap", "graduate", "student success" |
   | `star.json`       | "star burst", "shooting star", "five stars" |
   | `party.json`      | "party popper", "confetti celebration", "celebration" |
   | `check.json`      | "success checkmark", "check animation", "tick" |

3. Descarga el JSON (botón "Lottie JSON" → "Download").
4. **Renómbralo** según la tabla y déjalo en esta carpeta.
5. **Edita `manifest.json`** y agrega el ID del tema al array `available`.
   Ejemplo: si descargaste `book.json`, el manifest queda así:
   ```json
   { "available": ["book"] }
   ```
   Si tienes book + thumbsup + cofre:
   ```json
   { "available": ["book", "thumbsup", "cofre"] }
   ```
6. Recompila la app (`npx ng build` o `npx ng serve`).

> **¿Por qué el manifest?** Sin él, el componente probaría 7 archivos en
> consola y mostraría 404s ruidosos cuando no están todos descargados.
> Con el manifest, solo intenta cargar los que están disponibles → consola
> limpia siempre.

## Cómo funciona

El componente `SuccessAnimationComponent` selecciona aleatoriamente uno
de los siete temas. Para cada tema:

- Si existe el JSON correspondiente → reproduce la animación Lottie.
- Si NO existe (404) → fallback automático al emoji gigante con CSS.

El runtime de Lottie (`lottie-web`) se carga lazy: solo se descarga
cuando aparece el primer `<ng-lottie>` en pantalla, y queda cacheado por
el service worker para usos offline posteriores.

## Recomendaciones de calidad

- **Tamaño:** mantén cada JSON debajo de 100 KB para no inflar el bundle.
- **Duración:** ideal 1.2–2 s. La pantalla de éxito dura 5 s por default
  (configurable en `/configuracion`), así que la animación debe terminar
  antes de que el usuario lea el texto.
- **Estilo:** la app es dark cyan/navy. Busca animaciones con paleta
  azul/cyan/blanco/dorado para que combinen visualmente.
- **Fondo:** elige Lotties con fondo transparente (la mayoría lo son).
