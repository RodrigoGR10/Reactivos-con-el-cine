# Reactivos con el Cine

Aplicación web para explorar la cartelera de cine en Chile, comparar horarios y consultar precios entre distintas cadenas. Permite guardar películas en seguimiento y cines habituales mediante una cuenta de usuario.

**Aplicación desplegada:** [https://fullstack.dcc.uchile.cl:7059/](https://fullstack.dcc.uchile.cl:7059/)

---

## 1. Tecnologías

- **Frontend:** React 19, TypeScript, Vite, React Router, Axios y CSS adaptable.
- **Backend:** Node.js, TypeScript, Express 5 y PostgreSQL.
- **Acceso a datos:** `pg`, mediante un pool de conexiones.
- **Autenticación:** JWT en cookie `httpOnly`, protección CSRF y contraseñas con hash bcrypt.
- **Catálogo:** scrapers de Cinemark, Cineplanet, Muvix y Cine Star.
- **Metadatos:** integración opcional con TMDB.
- **Entorno local:** Nix, PostgreSQL y `direnv`.

El repositorio separa el frontend y el backend en sus respectivas carpetas.

## 2. Requisitos previos

- Git.
- Node.js 24 o superior.
- npm.
- pnpm (opcional).
- Nix con soporte para flakes.
- direnv y nix-direnv.
- Conexión a Internet para ejecutar los scrapers y consultar recursos externos.

Sistemas contemplados por el entorno Nix: macOS (Intel y Apple Silicon) y Linux (x86_64 y ARM64). En Windows se recomienda utilizar WSL2 con Debian o Ubuntu.

## 3. Preparación del entorno local

### 3.1. Instalar Nix

En macOS se puede utilizar el instalador gráfico de Determinate Systems o ejecutar:

```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

En Debian o Ubuntu:

```bash
sudo apt update
sudo apt install -y curl

curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

En WSL2 sin systemd, puede ser necesario agregar `linux --init none` al comando de instalación.

Cierra y vuelve a abrir la terminal. Comprueba la instalación:

```bash
nix --version
```

El instalador recomendado activa flakes. Si se instaló Nix mediante otro método y aparece un error sobre características experimentales, agrega a `~/.config/nix/nix.conf`:

```text
experimental-features = nix-command flakes
```

### 3.2. Instalar direnv y nix-direnv

```bash
nix profile add nixpkgs#direnv nixpkgs#nix-direnv
```

Conecta nix-direnv con direnv:

```bash
mkdir -p ~/.config/direnv

echo 'source $HOME/.nix-profile/share/nix-direnv/direnvrc' >> ~/.config/direnv/direnvrc
```

### 3.3. Conectar direnv al shell

En macOS, que normalmente utiliza zsh:

```bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
```

En Debian o Ubuntu, que normalmente utiliza bash:

```bash
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
```

Abre una terminal nueva para aplicar los cambios.

### 3.4. Activar el entorno del proyecto

En la raíz del repositorio existen:

- `flake.nix`: define el entorno de PostgreSQL.
- `flake.lock`: fija las versiones de las dependencias de Nix.
- `.envrc`: contiene `use flake`.

Entra al proyecto y autoriza direnv:

```bash
cd Reactivos-con-el-cine
direnv allow
```

La primera activación descarga PostgreSQL y puede tardar unos minutos.

El `shellHook` de Nix prepara el directorio `.pgdata/`, configura PostgreSQL para el puerto `5433` y levanta el servidor si no está activo. Al entrar nuevamente al proyecto, direnv activa el entorno automáticamente.

También se puede activar manualmente, sin direnv:

```bash
nix develop
```

**Importante:** salir de la carpeta no apaga PostgreSQL. El servidor permanece activo hasta que se detenga explícitamente.

### 3.5. Crear la base de datos por primera vez

Con el entorno activado:

```bash
createdb -h localhost -p 5433 -U postgres cine
```

La conexión local utilizada por el backend es:

```text
postgresql://postgres@localhost:5433/cine
```

El entorno local configurado por Nix utiliza autenticación `trust`, sin contraseña. El servidor está limitado a conexiones locales, pero cualquier proceso de la máquina puede conectarse sin credenciales.

**Esta configuración es exclusivamente para desarrollo local. No debe trasladarse a un servidor de producción.**

### 3.6. Inicializar el esquema

Solo cuando se crea una base de datos nueva y todavía no tiene las tablas del proyecto, ejecuta desde la raíz del repositorio:

```bash
psql -h localhost -p 5433 -U postgres -d cine -f backend/schema.sql
```

Este archivo crea las tablas, relaciones, índices y la vista `horarios_vigentes` que utiliza el backend.

No es necesario ejecutarlo cada vez que se inicia el proyecto. Tampoco debe asumirse que volver a ejecutarlo actualiza automáticamente una estructura existente: `CREATE TABLE IF NOT EXISTS` no modifica columnas de tablas ya creadas.

## 4. Variables de entorno

El backend lee sus variables desde `backend/.env`.

Crea el archivo a partir de la plantilla:

```bash
cp backend/.env.example backend/.env
```

Configura las variables de acuerdo con tu entorno:

```dotenv
NODE_ENV=development
HOST=localhost
PORT=3001
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://postgres@localhost:5433/cine
DATABASE_SCHEMA=public

JWT_SECRET=

TMDB_API_KEY=
```

Genera un secreto para JWT:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `JWT_SECRET`.

| Variable          | Uso                                                           |
| ----------------- | ------------------------------------------------------------- |
| `NODE_ENV`        | Entorno de ejecución. Para desarrollo local, `development`.   |
| `HOST`            | Dirección donde escucha Express. Por defecto, `localhost`.    |
| `PORT`            | Puerto del backend. Por defecto, `3001`.                      |
| `FRONTEND_URL`    | Origen permitido por CORS. En local, `http://localhost:5173`. |
| `DATABASE_URL`    | Cadena de conexión PostgreSQL.                                |
| `DATABASE_SCHEMA` | Esquema PostgreSQL utilizado. Por defecto, `public`.          |
| `JWT_SECRET`      | Secreto obligatorio para firmar los tokens de sesión.         |
| `TMDB_API_KEY`    | Opcional. Clave API v3 para consultar metadatos de TMDB.      |

No subas `backend/.env` ni credenciales al repositorio.

## 5. Instalación y ejecución

El frontend y el backend tienen sus propias dependencias y archivos de configuración. Ejecuta la instalación dentro de cada carpeta.

### 5.1. Backend

Desde la raíz:

```bash

# Opción A: npm
cd backend
npm install
npm run dev

# Opción B: pnpm
cd backend
pnpm install
pnpm run dev

```

El backend queda disponible en:

```text
http://localhost:3001
```

La API utiliza el prefijo `/api`.

### 5.2. Frontend

En otra terminal:

```bash
cd frontend

# Opción A: npm
cd backend
npm install
npm run dev

# Opción B: npm
cd backend
pnpm install
pnpm run dev

```

Abre:

[http://localhost:5173/](http://localhost:5173/)

Vite reenvía las solicitudes `/api` al backend en `localhost:3001`. Por eso, en el entorno local no es necesario definir `VITE_API_URL`.

### 5.3. Compilación

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm run build
```

El frontend genera su compilación de producción mediante Vite. El backend compila TypeScript a `backend/out/`.

## 6. Arquitectura de datos y sincronización

La base PostgreSQL es la fuente de datos que consume el backend. Los scrapers obtienen información desde las cadenas de cine y la preparan para incorporarla al catálogo.

El flujo general es:

1. Consultar una cadena de cine.
2. Extraer cines, películas, horarios e incidencias.
3. Validar la estructura de los datos obtenidos.
4. Guardar el resultado de extracción como JSON.
5. Cuando se ejecuta una sincronización, importar los registros a PostgreSQL.
6. Actualizar los registros existentes, insertar los nuevos y limpiar selectivamente horarios obsoletos cuando la extracción es completa.
7. Consultar el catálogo y los horarios desde la API.

La importación utiliza transacciones para mantener la consistencia de los cambios. Las relaciones entre películas, cines, fuentes, horarios y tarifas se resuelven durante el proceso.

### 6.1. Diferencia entre extracción y sincronización

| Operación       | Qué hace                                                  | ¿Modifica PostgreSQL? |
| --------------- | --------------------------------------------------------- | --------------------- |
| `scrape:*`      | Extrae datos y guarda un JSON en `backend/data/scrapes/`. | No.                   |
| `sync:*`        | Extrae datos y los importa a PostgreSQL.                  | Sí.                   |
| `import:scrape` | Importa un JSON generado previamente.                     | Sí.                   |

Una extracción parcial se puede importar, pero no se considera completa y no ejecuta la limpieza de horarios anteriores. Esto evita borrar horarios válidos por una extracción incompleta.

### 6.2. Sincronizar las cadenas de cine

Desde `backend/`, ejecuta:

```bash
npm run sync:cinemark
npm run sync:cineplanet
npm run sync:muvix
npm run sync:cinestar
```

Conviene ejecutarlos secuencialmente para facilitar el diagnóstico y poder identificar qué cadena produjo un problema.

Cada comando utiliza por defecto la fecha actual en Chile y consulta los próximos siete días.

### 6.3. Extraer datos sin importarlos

Si se necesita inspeccionar una extracción antes de modificar la base:

```bash
npm run scrape:cinemark
npm run scrape:cineplanet
npm run scrape:muvix
npm run scrape:cinestar
```

Los archivos JSON se guardan en:

```text
backend/data/scrapes/
```

La extracción no actualiza PostgreSQL.

### 6.4. Importar una extracción existente

Para importar un JSON generado anteriormente:

```bash
npm run import:scrape -- data/scrapes/ARCHIVO.json
```

Reemplaza `ARCHIVO.json` por el nombre real del archivo.

El proceso valida el JSON antes de importarlo. Si la extracción es parcial, importa sus registros, pero omite la limpieza de horarios anteriores.

## 7. Mantenimiento del catálogo

Los siguientes comandos permiten corregir y enriquecer los datos existentes. Es importante distinguir los diagnósticos de las operaciones que escriben en PostgreSQL.

### 7.1. Normalización de géneros

Cuando se incorporan películas nuevas, pueden aparecer variantes de un mismo género, por ejemplo `horror` y `terror`.

Primero ejecuta el diagnóstico:

```bash
node src/scripts/normalizar-generos.ts
```

El comando muestra qué valores cambiarían, pero no modifica la base.

Para guardar los cambios:

```bash
node src/scripts/normalizar-generos.ts --write
```

Si aparecen variantes que no deberían unificarse automáticamente, revisa los alias en:

```text
backend/src/utils/generos.ts
```

### 7.2. Normalización de comunas

El mismo criterio se aplica a las comunas de los cines.

Diagnóstico:

```bash
node src/scripts/normalizar-comunas.ts
```

Aplicar cambios:

```bash
node src/scripts/normalizar-comunas.ts --write
```

Los alias se mantienen en:

```text
backend/src/utils/comunas.ts
```

El diagnóstico también muestra valores que no corresponden a comunas oficiales y variantes que todavía no se han unificado.

### 7.3. Diagnóstico de películas duplicadas

El catálogo puede contener películas repetidas provenientes de distintas cadenas.

Desde `backend/`, ejecuta:

```bash
node src/scraper/cli.ts --deduplicar
```

Este modo detecta grupos de películas que podrían fusionarse y muestra cuál sería la película canónica. No aplica cambios.

Para ejecutar la fusión:

```bash
node src/scraper/cli.ts --deduplicar --apply
```

**Precaución:** el modo `--apply` modifica el catálogo y sus relaciones. Antes de utilizarlo, revisa el diagnóstico y realiza un respaldo de la base.

### 7.4. Sincronización de metadatos con TMDB

La integración con TMDB permite completar metadatos de películas que todavía no tienen un `tmdb_id`.

Requiere configurar `TMDB_API_KEY` en `backend/.env`.

Primero ejecuta el diagnóstico:

```bash
npm run sync:tmdb -- --dry-run
```

Este modo:

- Revisa las películas pendientes.
- Evalúa posibles coincidencias con TMDB.
- Detecta conflictos.
- Genera un reporte HTML.
- No modifica los registros de PostgreSQL.

El reporte se guarda en:

```text
backend/reports/
```

Después de revisar el reporte, si las coincidencias son correctas, se pueden aplicar las actualizaciones:

```bash
npm run sync:tmdb -- --apply
```

El modo `--apply` actualiza únicamente las coincidencias consideradas seguras y no resuelve automáticamente los conflictos manuales.

Las resoluciones manuales se mantienen en:

```text
backend/src/scraper/resoluciones-tmdb.ts
```

Después de modificar ese archivo, vuelve a ejecutar el diagnóstico para revisar el resultado antes de aplicar cambios.

## 8. Mantenimiento y diagnóstico de PostgreSQL

PostgreSQL almacena el catálogo, las fuentes, los horarios, las tarifas y los datos de usuarios. Por eso, antes de ejecutar operaciones que fusionen o modifiquen grandes cantidades de registros, conviene revisar el estado de la base y generar un respaldo.

### 8.1. Comprobar el estado del servidor

Con el entorno Nix activado:

```bash
pg_ctl status
```

Para detener PostgreSQL:

```bash
pg_ctl -D .pgdata stop -m fast
```

Al volver a entrar al entorno del proyecto, el `shellHook` puede levantarlo nuevamente.

Para revisar el registro del servidor:

```bash
tail -f .pgdata/log
```

Si PostgreSQL no inicia, revisa primero ese archivo. Una causa frecuente es que otro servidor PostgreSQL esté utilizando el puerto configurado.

### 8.2. Conectarse a la base

```bash
psql -h localhost -p 5433 -U postgres -d cine
```

Comandos útiles dentro de `psql`:

```sql
\dt
```

Lista las tablas.

```sql
\d peliculas
```

Muestra la estructura de la tabla de películas.

```sql
\d horarios
```

Muestra la estructura de los horarios.

```sql
\dv
```

Lista las vistas.

```sql
\q
```

Cierra la sesión.

### 8.3. Consultas de diagnóstico

Cantidad de registros por tabla:

```sql
SELECT 'peliculas' AS tabla, COUNT(*) FROM peliculas
UNION ALL
SELECT 'cines', COUNT(*) FROM cines
UNION ALL
SELECT 'pelicula_fuentes', COUNT(*) FROM pelicula_fuentes
UNION ALL
SELECT 'horarios', COUNT(*) FROM horarios
UNION ALL
SELECT 'tarifas', COUNT(*) FROM tarifas
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'favoritos_peliculas', COUNT(*) FROM favoritos_peliculas
UNION ALL
SELECT 'favoritos_cines', COUNT(*) FROM favoritos_cines;
```

Revisar las cadenas de cine registradas:

```sql
SELECT origen, COUNT(*) AS cantidad
FROM horarios
GROUP BY origen
ORDER BY origen;
```

Revisar los horarios por fecha:

```sql
SELECT fecha, COUNT(*) AS cantidad
FROM horarios
GROUP BY fecha
ORDER BY fecha;
```

Revisar cuántos horarios están agotados:

```sql
SELECT agotada, COUNT(*) AS cantidad
FROM horarios
GROUP BY agotada;
```

Revisar el estado de las fuentes de estreno:

```sql
SELECT estado_estreno, COUNT(*) AS cantidad
FROM pelicula_fuentes
GROUP BY estado_estreno
ORDER BY estado_estreno;
```

Estas consultas son de solo lectura y sirven para detectar rápidamente si una sincronización dejó datos inesperados.

### 8.4. Respaldar la base de datos

Antes de ejecutar operaciones destructivas o de fusión, genera un respaldo:

```bash
pg_dump -h localhost -p 5433 -U postgres -d cine -Fc -f backup-cine.dump
```

El archivo `backup-cine.dump` contiene un respaldo en formato personalizado de PostgreSQL.

Guárdalo fuera de `.pgdata/` y no lo subas al repositorio si contiene datos personales.

### 8.5. Restaurar un respaldo

Para restaurar el respaldo en una base nueva, crea primero una base de destino:

```bash
createdb -h localhost -p 5433 -U postgres cine_restaurada
```

Después ejecuta:

```bash
pg_restore -h localhost -p 5433 -U postgres -d cine_restaurada backup-cine.dump
```

Comprueba los registros y relaciones antes de reemplazar cualquier base de trabajo.

No restaures sobre una base que contiene información que necesitas conservar sin haber evaluado previamente el impacto.

### 8.6. Reinicializar una base local

Si necesitas comenzar desde cero en desarrollo, detén primero los procesos que utilizan la base y asegúrate de contar con un respaldo si necesitas conservar los datos.

La eliminación de `.pgdata/` destruye el directorio de datos local completo. No es una operación de mantenimiento rutinaria y no debe utilizarse como primera solución ante errores de conexión.

Para una base nueva, vuelve a activar el entorno, crea la base con `createdb` y ejecuta `backend/schema.sql`.

## 9. Catálogo de comandos

Todos los comandos de esta sección se ejecutan desde `backend/`, salvo que se indique lo contrario.

| Comando                                              | Función                               | Efecto sobre PostgreSQL                                      |
| ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                                        | Inicia el backend en modo desarrollo. | Lectura y escritura según las solicitudes.                   |
| `npm run build`                                      | Compila TypeScript.                   | Ninguno.                                                     |
| `npm run scrape:cinemark`                            | Extrae Cinemark y guarda JSON.        | Ninguno.                                                     |
| `npm run scrape:cineplanet`                          | Extrae Cineplanet y guarda JSON.      | Ninguno.                                                     |
| `npm run scrape:muvix`                               | Extrae Muvix y guarda JSON.           | Ninguno.                                                     |
| `npm run scrape:cinestar`                            | Extrae Cine Star y guarda JSON.       | Ninguno.                                                     |
| `npm run sync:cinemark`                              | Extrae e importa Cinemark.            | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:cineplanet`                            | Extrae e importa Cineplanet.          | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:muvix`                                 | Extrae e importa Muvix.               | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:cinestar`                              | Extrae e importa Cine Star.           | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run import:scrape -- data/scrapes/ARCHIVO.json` | Importa un JSON existente.            | Inserta y actualiza datos.                                   |
| `npm run sync:tmdb -- --dry-run`                     | Diagnostica coincidencias TMDB.       | Ninguno.                                                     |
| `npm run sync:tmdb -- --apply`                       | Aplica coincidencias TMDB seguras.    | Actualiza metadatos.                                         |
| `node src/scraper/cli.ts --deduplicar`               | Diagnostica duplicados.               | Ninguno.                                                     |
| `node src/scraper/cli.ts --deduplicar --apply`       | Fusiona duplicados.                   | Modifica películas y relaciones.                             |
| `node src/scripts/normalizar-generos.ts`             | Diagnostica géneros.                  | Ninguno.                                                     |
| `node src/scripts/normalizar-generos.ts --write`     | Normaliza géneros.                    | Actualiza películas.                                         |
| `node src/scripts/normalizar-comunas.ts`             | Diagnostica comunas.                  | Ninguno.                                                     |
| `node src/scripts/normalizar-comunas.ts --write`     | Normaliza comunas.                    | Actualiza cines.                                             |

### 9.1. Opciones de los scrapers

Los comandos de extracción y sincronización aceptan opciones adicionales:

```bash
npm run scrape:cinemark -- --desde=2026-10-28 --dias=7
```

Opciones disponibles en el CLI:

| Opción                | Función                                      |
| --------------------- | -------------------------------------------- |
| `--desde=YYYY-MM-DD`  | Fecha inicial de la extracción.              |
| `--dias=N`            | Cantidad de días a consultar.                |
| `--dias=todos`        | Consulta sin límite de días.                 |
| `--cine=ID`           | Limita la extracción a un cine seleccionado. |
| `--limite-por-cine=N` | Limita la cantidad de resultados por cine.   |
| `--output=RUTA`       | Define la ruta del JSON generado.            |

Para sincronizar, se puede utilizar el mismo conjunto de opciones:

```bash
npm run sync:cinemark -- --desde=2026-10-28 --dias=7
```

Los parámetros de fecha y cantidad de días permiten acotar la extracción. Antes de realizar sincronizaciones extensas, es preferible comenzar con un período acotado y revisar el resultado.

## 10. Vistas de la aplicación

| Ruta             | Vista                                                               |
| ---------------- | ------------------------------------------------------------------- |
| `/`              | Cartelera, búsqueda y filtros por género, clasificación y duración. |
| `/peliculas/:id` | Detalle de película, funciones, cines, fechas, formatos y precios.  |
| `/cines`         | Directorio de cines, búsqueda y filtros.                            |
| `/cines/:id`     | Detalle de cine y horarios disponibles.                             |
| `/login`         | Inicio de sesión y registro.                                        |
| `/perfil`        | Perfil, películas favoritas y cines favoritos.                      |

## 11. Endpoints principales

Todas las rutas comienzan con `/api`.

Las rutas privadas requieren la cookie de sesión JWT y la cabecera `X-CSRF-Token`. El token CSRF se almacena en `localStorage`; el JWT permanece en una cookie `httpOnly`.

| Método | Ruta                                       | Protección | Uso                                                      |
| ------ | ------------------------------------------ | ---------- | -------------------------------------------------------- |
| `GET`  | `/api/peliculas`                           | Pública    | Lista películas.                                         |
| `GET`  | `/api/peliculas?cartelera=true`            | Pública    | Lista películas con horarios vigentes no agotados.       |
| `GET`  | `/api/peliculas/:id`                       | Pública    | Obtiene una película.                                    |
| `GET`  | `/api/cines`                               | Pública    | Lista cines.                                             |
| `GET`  | `/api/cines/:id`                           | Pública    | Obtiene un cine.                                         |
| `GET`  | `/api/funciones/horarios`                  | Pública    | Lista horarios; requiere `peliculaId`, `cineId` o ambos. |
| `GET`  | `/api/funciones/precios`                   | Pública    | Consulta precios por película, cine y fecha.             |
| `POST` | `/api/auth/register`                       | Pública    | Registra un usuario.                                     |
| `POST` | `/api/auth/login`                          | Pública    | Inicia sesión.                                           |
| `POST` | `/api/auth/logout`                         | JWT + CSRF | Cierra la sesión.                                        |
| `GET`  | `/api/auth/me`                             | JWT + CSRF | Verifica la sesión actual.                               |
| `GET`  | `/api/perfil/favoritos`                    | JWT + CSRF | Obtiene películas y cines favoritos.                     |
| `POST` | `/api/perfil/favoritos/peliculas/:movieId` | JWT + CSRF | Agrega o quita una película favorita.                    |
| `POST` | `/api/perfil/favoritos/cines/:cinemaId`    | JWT + CSRF | Agrega o quita un cine favorito.                         |

## 12. Problemas frecuentes

| Problema                                       | Posible causa y solución                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `direnv: error .envrc is blocked`              | Ejecuta `direnv allow` en la raíz del proyecto.                                                                          |
| Al entrar a la carpeta no se activa PostgreSQL | Comprueba que direnv esté conectado al shell y que hayas autorizado `.envrc`.                                            |
| PostgreSQL no inicia                           | Revisa `.pgdata/log` y comprueba si otro servidor está utilizando el puerto `5433`.                                      |
| No se puede conectar desde el backend          | Comprueba que PostgreSQL esté activo y que `DATABASE_URL` apunte al puerto y base correctos.                             |
| Error de autenticación JWT                     | Comprueba que `JWT_SECRET` esté configurado en `backend/.env`.                                                           |
| Error de CORS                                  | Comprueba que `FRONTEND_URL` coincida con el origen del frontend.                                                        |
| No aparecen horarios                           | Comprueba que la sincronización de la cadena haya terminado correctamente y que existan horarios vigentes en PostgreSQL. |
| No aparecen precios                            | Comprueba que existan horarios para la fecha y que la consulta de precios haya terminado.                                |
| Hay géneros duplicados                         | Ejecuta primero el diagnóstico de `normalizar-generos.ts` y revisa sus alias.                                            |
| Hay comunas duplicadas                         | Ejecuta primero el diagnóstico de `normalizar-comunas.ts` y revisa sus alias.                                            |
| Hay películas repetidas                        | Ejecuta el diagnóstico de deduplicación y revisa los grupos antes de aplicar.                                            |
| TMDB no encuentra películas                    | Revisa `TMDB_API_KEY`, las resoluciones manuales y el reporte HTML generado.                                             |

## 13. Archivos locales y datos sensibles

Los siguientes archivos y directorios son locales y no deben subirse al repositorio:

```text
backend/.env
.direnv/
.pgdata/
```

Los respaldos de PostgreSQL, los JSON de extracción y los reportes pueden contener información operativa o datos que no corresponde publicar. Revisa su contenido antes de compartirlos.

## 14. Integrantes

- Cristóbal Aravena
- Giorgio Bravo
- Rodrigo Guerrero
- Tomás Raggio
