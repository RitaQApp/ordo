# ordo · Apartado 4.2 con almacenamiento CENTRAL

Este ZIP corrige el prototipo 4.2: no existe fallback a `localStorage`, `sessionStorage`, IndexedDB ni ficheros locales. Los registros, revisiones, asignaciones y eventos se mantienen únicamente en **Cloudflare D1**. La memoria RAM del navegador conserva un token temporal durante la sesión; al recargar se solicita acceso de nuevo. El PDF se genera para imprimir, sin crear copias persistentes en el navegador.

## Contenido del ZIP

- `js/partes_interesadas.js`: sustitución completa del JavaScript del 4.2 en el repositorio `RitaQApp/ordo` (ya enlazado por `sistema.html` en el ZIP anterior).
- `cloudflare/worker.js`: API del 4.2 que comprueba las autorizaciones en el servidor.
- `cloudflare/schema.sql`: tablas D1 de paquetes, instantáneas de revisiones y eventos de permisos.
- `cloudflare/wrangler.jsonc`: plantilla para desplegar Worker y D1.

**Ningún archivo `sistema.html`, `sistema.js`, `gestion_usuarios.js`, `capitulo4.js`, CSS o fuente se reemplaza con este parche.** Instalar el fichero JS presupone que el ZIP 4.2 anterior ya está instalado, porque ese ZIP añadió la referencia a `js/partes_interesadas.js`.

## Despliegue requerido (no realizado)

Para funcionar es imprescindible activar en la cuenta Cloudflare un Worker con una base D1. El repositorio de GitHub Pages por sí solo no puede realizar escrituras seguras.

1. Crear base de datos D1 `ordo` en Cloudflare, por panel o CLI `npx wrangler d1 create ordo`.
2. Copiar el identificador real de la nueva base a `cloudflare/wrangler.jsonc` en `database_id` (no usar el literal `SUSTITUIR...`).
3. Desde `cloudflare/`, ejecutar `npx wrangler d1 execute ordo --remote --file=./schema.sql` (primero se puede ejecutar con `--local` para pruebas aisladas).
4. Configurar en el Worker los secretos `SESSION_SECRET`, `PASSWORD_CALIDAD`, `PASSWORD_SERVICIOS`, `PASSWORD_BIBLIOTECA`, `PASSWORD_EDITORIAL`, `PASSWORD_ACOMPANAMIENTO` y `PASSWORD_COLEGIO_MAYOR`. No guardarlos nunca en el repositorio. En el directorio `cloudflare/`: `npx wrangler secret put SESSION_SECRET`, repetir para cada `PASSWORD_...`. Utilizar un secreto aleatorio largo para `SESSION_SECRET` y contraseñas fuertes y distintas por departamento. La contraseña temporal habitual de pruebas no se incluye ni se incrusta en el código.
5. Desplegar desde `cloudflare/` con `npx wrangler deploy`. Apuntar el dominio real del Worker (por ejemplo, `https://ordo-api.SUBDOMINIO.workers.dev`).
6. Sustituir la constante `API_URL` de `js/partes_interesadas.js` por ese origen HTTPS real, y publicar solamente el archivo actualizado en GitHub Pages.
7. Abrir 4.2 en dos dispositivos distintos con credenciales de Calidad y Biblioteca. Crear, asignar y aprobar un paquete en Calidad; comprobar su aparición en Biblioteca. Probar histórico, visibilidad, impresión y cierre/reapertura de navegador.

Si falta la configuración o falla la red, la pantalla muestra un error. **No guarda datos como alternativa en el ordenador.**

## Seguridad y alcance

- El servidor verifica cada lectura, alta, edición, cambio de visibilidad, asignación y consulta de histórico. Los visores auxiliares solo leen paquetes generales y compartidos del departamento elegido.
- La interfaz existente de entrada a ordo y la gestión de usuarios del botón 3 son heredadas y todavía **NO** están integradas con este nuevo sistema de autenticación central. Por eso el 4.2 pide un acceso específico. Más adelante debe unificarse la autenticación para toda la aplicación, sin almacenar credenciales en el navegador.
- Los módulos 4.1, 4.3 y 4.4 anteriores conservan sus mecanismos previos. **No deben darse por migrados a D1 ni utilizarse para información institucional real** mientras dependan de almacenamiento local. Este paquete migra únicamente el 4.2.
- El paquete no importa datos existentes del prototipo local. Evitamos copiar automáticamente registros no aprobados a una base institucional.
- El esquema almacena solo códigos de departamento, no identidades personales.
- Para producción hay que configurar límites de intentos de acceso (por ejemplo Cloudflare WAF / Rate Limiting), copias de seguridad D1, recuperación ante incidentes y administración central del ciclo de credenciales.
