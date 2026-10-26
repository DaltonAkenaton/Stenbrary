# Dependencias incluidas en el repositorio

## SheetJS Community Edition (`xlsx-0.20.3.tgz`)

| | |
|---|---|
| Versión | 0.20.3 (la más reciente de la Community Edition) |
| Origen oficial | <https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz> |
| SHA-256 | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |
| Licencia | Apache-2.0 (texto completo en `package/LICENSE` dentro del archivo) |

**Por qué está aquí y no en npm.** SheetJS dejó de publicar en el registro de
npm en la versión 0.18.5, que tiene dos vulnerabilidades conocidas al **leer**
archivos, justo lo que hace la importación del padrón de alumnos:

- CVE-2023-30533: contaminación de prototipo, corregida en 0.19.3.
- CVE-2024-22363: ReDoS, corregida en 0.20.2.

Las versiones corregidas solo se distribuyen desde el CDN oficial de SheetJS,
que recomienda incluir el paquete en el repositorio ("vendoring"). Así
`npm ci` es reproducible y no depende de que el CDN responda: `package.json`
apunta a `file:vendor/xlsx-0.20.3.tgz` y `package-lock.json` fija su hash de
integridad. La aplicación no carga nada del CDN mientras se ejecuta: la
biblioteca va dentro del build, así que sigue funcionando sin conexión.

**Para actualizar:** descargar el `.tgz` de la versión nueva desde
`cdn.sheetjs.com`, comprobar su SHA-256 contra el publicado, revisar
<https://cdn.sheetjs.com/advisories/>, reemplazar el archivo, ejecutar
`npm install ./vendor/xlsx-X.Y.Z.tgz` y actualizar esta tabla.
