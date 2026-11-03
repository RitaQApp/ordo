# ordo · 4.2 PARTES INTERESADAS · PAQUETE COMPLETO DE SUSTITUCIÓN

Este ZIP contiene **todos los archivos que se modifican o añaden para el 4.2**. Sustituye los ZIP anteriores del 4.2, no se instalan en cadena.

## Archivos para el repositorio de GitHub Pages (`RitaQApp/ordo`)

Copiar en la **raíz del repositorio** respetando las rutas:

- `sistema.html`: página interior completa con el JavaScript y CSS del editor 4.2 enlazados.
- `js/capitulo4.js`: abre 4.2 en la implementación central; conserva el menú 4.1–4.4 tal como se encontraba.
- `js/partes_interesadas.js`: interfaz de Calidad y servicios, exclusivamente conectada a API.
- `css/partes_interesadas.css`: estilo del editor.

**No sustituir ni borrar otras carpetas**. El paquete no incluye `js/sistema.js`, `js/gestion_usuarios.js`, `css/sistema.css`, `css/capitulo4.css`, logotipos ni fuentes. Esos archivos existentes **son dependencias que deben conservarse**. Sin ellos el resultado no será una instalación completa de ordo.

## Archivos para Cloudflare (BACKEND, no GitHub Pages)

- `cloudflare/worker.js`: API central que autoriza altas, revisiones, asignaciones y consultas.
- `cloudflare/schema.sql`: esquema de Cloudflare D1.
- `cloudflare/wrangler.jsonc`: ejemplo de configuración del Worker.

**No basta subir el ZIP a GitHub**: GitHub Pages no ejecuta Workers ni crea bases de datos. Hay que desplegar Cloudflare D1 y Worker por separado para disponer de altas y consultas compartidas.

### Pasos técnicos de Cloudflare

1. Crear D1 `ordo` con `npx wrangler d1 create ordo` en la cuenta correcta.
2. Poner el `database_id` real en `cloudflare/wrangler.jsonc`, quitando el marcador `SUSTITUIR_POR_ID_REAL_DE_D1`.
3. Desde `cloudflare/`, ejecutar `npx wrangler d1 execute ordo --remote --file=./schema.sql` para crear las tablas.
4. En `cloudflare/` definir secretos mediante `npx wrangler secret put` para: `SESSION_SECRET`, `PASSWORD_CALIDAD`, `PASSWORD_SERVICIOS`, `PASSWORD_BIBLIOTECA`, `PASSWORD_EDITORIAL`, `PASSWORD_ACOMPANAMIENTO`, `PASSWORD_COLEGIO_MAYOR`.
5. Desplegar Worker con `npx wrangler deploy` desde la carpeta `cloudflare/`.
6. Poner URL HTTPS pública y real del Worker en la constante `API_URL` de `js/partes_interesadas.js`, sustituyendo `https://SUSTITUIR_POR_ORIGEN_REAL_DEL_WORKER`.
7. Publicar los archivos de interfaz en GitHub Pages y comprobar 4.2 en Calidad y Biblioteca con credenciales del servicio central. Probar alta, aprobación, asignación, consulta y revisiones.

**Estado actual**: ni la base D1 ni el Worker se han desplegado desde esta entrega, y la dirección API es un marcador. El 4.2 avisará de configuración pendiente hasta conectarlo. No existe modo local ni guardado local alternativo para 4.2.

**IMPORTANTE**: `js/capitulo4.js` heredado todavía usa `localStorage` en los apartados 4.1, 4.3 y 4.4. Este ZIP corrige **solo 4.2**; NO almacenar información institucional real en los otros tres hasta migrarlos también. Además, el botón 3 y la puerta de entrada conservan autenticación previa, independiente de la del 4.2. No se presentan como seguros sin backend.

**Verificación del paquete**: sentencias SQL del alta corregidas (10 columnas/10 parámetros); JavaScript verificado sintácticamente, rutas/archivos ZIP verificados. No se han efectuado pruebas contra Cloudflare real ni navegadores conectados.
