# Reactivos con el Cine

Aplicación web para explorar la cartelera de cine en Chile, comparar horarios y consultar precios entre distintas cadenas. Permite guardar películas en seguimiento y cines habituales mediante una cuenta de usuario.

**Aplicación desplegada:** [https://fullstack.dcc.uchile.cl:7059/](https://fullstack.dcc.uchile.cl:7059/)

---

## 1. Tecnologías

- **Frontend:** React 19, TypeScript, Vite, React Router, Axios y CSS adaptable.
- **Backend:** Node.js, TypeScript, Express 5 y PostgreSQL.
- **Acceso a datos:** `pg`, mediante un pool de conexiones.
- **Autenticación:** JWT en cookie `httpOnly`, protección CSRF y contraseñas con hash bcrypt.
- **Catálogo:** scrapers de Cinemark, Cineplanet, Cinépolis, Muvix y Cine Star.
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
npm install
npm run dev

# Opción B: npm
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

### 5.4. Pruebas automatizadas

#### 5.4.1. Backend

El backend utiliza Vitest. La suite combina pruebas unitarias con pruebas de integración que recorren el camino completo `ruta Express -> controlador -> servicio -> PostgreSQL`, sin mocks de base de datos y sin llamadas a los scrapers.

**Preparación (una sola vez)**

Con el entorno de Nix activo (`direnv allow`), crea la base de pruebas separada de la base de desarrollo:

```bash
createdb -h localhost -p 5433 -U postgres cine_test
```

El puerto `5433` lo define el `shellHook` de `flake.nix` mediante `PGPORT`. No es necesario crearlo ni cargar `schema.sql` a mano: el setup global de Vitest aplica el esquema antes de la primera prueba.

**Ejecución**

Desde `backend/`:

```bash
npm test              # ejecuta la suite una vez
npm run test:watch    # modo interactivo
npm run test:coverage # suite + reporte de cobertura
```

El reporte HTML queda en `backend/coverage/`, que está ignorado por Git.

**Qué hacen las pruebas de integración**

- Levantan Express en un puerto efímero y lo consultan con `fetch`, sin `supertest` ni dependencias adicionales.
- Siembran solo los datos que necesita cada caso y limpian las tablas en `beforeEach` con `TRUNCATE ... RESTART IDENTITY CASCADE`.
- Ejecutan un archivo a la vez (`fileParallelism: false`) porque todos comparten la misma base.
- Evitan llamadas externas: los horarios se siembran con precios y butacas vigentes, de modo que `/precios`, `/butacas` y `/detalle-stream` se resuelven contra PostgreSQL.
- Fijan `NODE_ENV=test` y un `JWT_SECRET` exclusivo para pruebas en `vitest.config.ts`.

**Protecciones del entorno de pruebas**

- El setup global **se niega a ejecutarse** si el nombre de la base no termina en `_test`. Esto impide aplicar `schema.sql` o truncar tablas de la base de desarrollo `cine`.
- La base por defecto es `postgresql://postgres@localhost:5433/cine_test`. Para usar otra instancia (por ejemplo, un contenedor en CI), define `TEST_DATABASE_URL`. El setup global y las pruebas usan la misma URL de la configuración de Vitest, aunque tengas exportada una `DATABASE_URL` de desarrollo.
- `schema.sql` debe estar actualizado: el setup no recrea tablas ni modifica columnas existentes, igual que ocurre al inicializar la base de desarrollo.
- Nunca apuntes `TEST_DATABASE_URL` a una base con datos que quieras conservar: los tests truncan sus tablas.

**Cobertura actual**

La cobertura global es baja porque el scraper concentra la mayor parte de las líneas y no se prueba de extremo a extremo. Para evaluar la API conviene mirar la capa sin `scraper/` ni `scripts/`:

| Ámbito                           | Líneas     | Statements | Funciones | Ramas  |
| -------------------------------- | ---------- | ---------- | --------- | ------ |
| Global (`src/**`)                | 27,6 %     | 26,9 %     | 32,7 %    | 29,9 % |
| API sin `scraper/` ni `scripts/` | **78,4 %** | 77,0 %     | 84,6 %    | 74,6 % |
| `controllers`                    | 97,2 %     | 96,8 %     | 100 %     | 93,0 % |
| `utils`                          | 98,3 %     | 96,1 %     | 100 %     | 92,4 % |
| `app`, `db` y `models`           | 82,1 %     | 81,3 %     | 85,2 %    | 84,2 % |
| `services`                       | 52,5 %     | 51,5 %     | 66,7 %    | 50,5 % |
| `scraper`                        | 12,4 %     | 12,2 %     | 14,1 %    | 14,8 % |

Los 18 endpoints de la API tienen al menos una prueba de integración, incluido `GET /api/funciones/detalle-stream` (NDJSON con eventos de precio, butaca y cierre, y fallos parciales).

**Brechas conocidas**

- La ruta de caché vencida de precios y butacas no se ejercita: `services/preciosFunciones/consulta.ts`, `actualizacion.ts`, `carteleras.ts`, `proveedores.ts` y `extraer-tarifas.ts` dependen de scrapers externos. Para cubrirla sin red, conviene probar a nivel de servicio `consultarHorario(horario, tarifasPrecargadas)` y `actualizarHorario(horario, butacas)`, incluyendo el candado y el backoff de error.
- No hay pruebas de concurrencia sobre el candado de precios ni de las ramas de `errorHandler` para JSON malformado o errores 500.
- Los scrapers no se prueban de extremo a extremo: su HTML y sus APIs cambian sin aviso. La lógica de parseo ya tiene pruebas unitarias (`normalize`, `validate`, deduplicación y TMDB); si una cadena se rompe, lo recomendable es agregar un fixture HTML y probar solo el parser, no la descarga. Un smoke test programado contra los sitios reales puede servir como alerta operacional, pero no debe bloquear una PR.
- `isCineId` solo exige un string no vacío de hasta 100 caracteres. Por eso ids como `abc` se consideran válidos y producen `200`/`404` en lugar de `400`, y un `cineId` compuesto solo por espacios también se acepta. Es el comportamiento actual, no una decisión de los tests.

#### 5.4.2. Frontend

Con Node.js 24 y pnpm, ejecuta desde la raíz del repositorio:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm test
pnpm test:watch
```

Vitest reutiliza la configuración de Vite. Las pruebas de componentes usan
jsdom, Testing Library y `user-event`. Cada prueba busca controles por su rol o
etiqueta y verifica el resultado visible de la interacción. Las pruebas
unitarias de lógica pura pueden correr en Node. [Apunte de testing del curso CC5003](https://users.dcc.uchile.cl/~mtoro/cursos/CC5003/apunte/09-testing-frontend.html)

La suite reúne pruebas unitarias y de componentes. Se puede ejecutar sin
levantar Express ni PostgreSQL.

| Segmento                        | Comportamientos cubiertos                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio de sesión                | Correo inválido, inicio exitoso y reintento tras un rechazo.                                                                                              |
| Cuenta y favoritos              | Registro, restauración de sesión, redirección desde rutas protegidas, guardado y eliminación de películas, eliminación y recuperación de cines guardados. |
| Cartelera y cines               | Búsqueda, combinación y limpieza de filtros, resultados vacíos y estados de carga y error del directorio.                                                 |
| Detalle de película y funciones | Selección de fecha, agrupación de horarios, ausencia de funciones y respuestas parciales de precios y butacas.                                            |
| Destacadas y recomendaciones    | Cupos, exclusiones y desempate de destacadas. Consulta por comuna, agrupación de recomendaciones, resultados vacíos y errores del recomendador.           |

#### 5.4.3. Pruebas de extremo a extremo

Playwright ejecuta los recorridos en Chromium, Firefox y WebKit sin ventana. WebKit permite comprobar compatibilidad con el motor de Safari. La prueba del panel móvil usa un viewport de 390 × 844 en los tres motores, con toques en Chromium y WebKit y clics en Firefox. Con **Node.js 24**, instala las dependencias y prepara los navegadores una vez desde la raíz del repositorio:

```bash
npm ci --prefix backend
npm ci --prefix frontend
cd frontend
npx playwright install chromium firefox webkit
```

En Linux, si faltan bibliotecas del sistema compatibles con Playwright, usa `npx playwright install --with-deps chromium firefox webkit`.

Con PostgreSQL en ejecución, crea una base exclusiva para e2e. Por ejemplo, para PostgreSQL local en el puerto 5433:

```bash
createdb -h localhost -p 5433 -U postgres cine_e2e_test
```

La URL predeterminada es `postgresql://postgres@localhost:5433/cine_e2e_test`. Si tu servidor usa otro puerto, usuario o contraseña, define `E2E_DATABASE_URL` con la URL correspondiente antes de lanzar la suite. En PowerShell, por ejemplo, puedes definirla con `$env:E2E_DATABASE_URL = "postgresql://postgres@localhost:5432/cine_e2e_test"`.

La suite aplica `backend/schema.sql` y reinicia los datos al arrancar. La base debe terminar en `_e2e_test` y el usuario de PostgreSQL debe poder aplicar el esquema, incluida la extensión `uuid-ossp`. Playwright inicia Vite y Express en los puertos 4173 y 4301 y los apaga al terminar.

Ejecuta los comandos desde `frontend/`:

```bash
npm run test:e2e                     # resultados en la terminal
npm run test:e2e:html                # genera playwright-report/
npm run test:e2e -- --headed         # muestra la ventana del navegador
npm run test:e2e -- --project=webkit  # ejecuta solo WebKit
```

Con pnpm puedes usar `pnpm test:e2e` y `pnpm test:e2e:html`. La ejecución normal informa en la terminal. El comando explícito de HTML genera `frontend/playwright-report/`, ignorado por Git.

**Cobertura actual**

Los diez casos se ejecutan en cada motor, para un total de **30 ejecuciones**. El navegador usa la API real y PostgreSQL con datos de prueba. Los datos de precios, butacas y fallos de proveedor se preparan en PostgreSQL para que las pruebas funcionen sin consultar los sitios de las cadenas.

| Recorrido         | Comportamiento verificado                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cartelera         | Busca por título sin tilde, aplica un filtro por género y abre el detalle de la película.                                                                                                                                                                       |
| Cines y funciones | Busca un cine, cambia la fecha y muestra precios y butacas recibidos por el stream de la API. En dos pruebas adicionales, conserva el dato disponible y muestra el aviso cuando fallan los precios o las butacas.                                               |
| Cuenta y sesión   | Redirige desde el perfil protegido, registra una cuenta, restaura la sesión al recargar y verifica el cierre de sesión.                                                                                                                                         |
| Favoritos         | Guarda y elimina una película y un cine, y verifica la persistencia al recargar. Si la cookie de sesión caduca antes de guardar, la API devuelve 401, el usuario vuelve al login y la película queda sin guardar al retomar el detalle.                         |
| Recomendador      | Elige comuna, fecha y hora, obtiene una opción elegible y abre su detalle. Una búsqueda nocturna en horario de Santiago encuentra una función de las 00:15 del día siguiente desde un navegador en UTC y verifica el cambio de la etiqueta «Hoy» en el detalle. |
| Filtros móviles   | Abre el panel en un viewport de 390 × 844, aplica un género y navega al resultado.                                                                                                                                                                              |

Las validaciones de formularios, los resultados vacíos y las combinaciones adicionales de filtros se ejercitan en Vitest. Los scrapers y las páginas externas de compra quedan fuera de la suite habitual.

## 6. Mantenimiento y sincronización de cartelera

### 6.1. Mantenimiento y sincronización en un comando

Desde `backend/`, usa el comando de mantenimiento para comprobar que la API responde, consultar la cobertura de horarios vigentes en PostgreSQL y validar la extracción de las cinco cadenas.

```bash
npm run mantenimiento
npm run mantenimiento -- --apply
npm run mantenimiento -- --dry-run --tmdb
npm run mantenimiento -- --apply --tmdb
```

El diagnóstico es el modo predeterminado. Consulta las fuentes en vivo y muestra el resumen en consola sin escribir en PostgreSQL ni generar archivos de resultados. Cinépolis usa un perfil temporal de Chrome durante el diagnóstico.

Con `--apply`, ambas comprobaciones iniciales deben pasar antes de importar. Cada cadena se procesa de forma independiente. Una extracción parcial conserva los horarios anteriores y el comando termina con código distinto de cero si hubo extracciones parciales o fallos, incluso si importó otras cadenas. Al final se vuelve a consultar la cobertura.

La comprobación de la API usa `http://localhost` y el puerto de `PORT` (3001 por defecto). Si el servidor está en otra dirección, configura `MANTENIMIENTO_API_URL` con su URL base.

`--tmdb` requiere `TMDB_API_KEY`. En diagnóstico, evalúa metadatos sobre el catálogo guardado. En aplicación, lo hace después de las importaciones. La fusión de duplicados y la sincronización de pósters y tráileres se ejecutan con sus comandos específicos.

### 6.2. Arquitectura de datos

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

### 6.3. Diferencia entre extracción y sincronización

| Operación       | Qué hace                                                  | ¿Modifica PostgreSQL? |
| --------------- | --------------------------------------------------------- | --------------------- |
| `scrape:*`      | Extrae datos y guarda un JSON en `backend/data/scrapes/`. | No.                   |
| `sync:*`        | Extrae datos y los importa a PostgreSQL.                  | Sí.                   |
| `import:scrape` | Importa un JSON generado previamente.                     | Sí.                   |

Una extracción parcial se puede importar, pero no se considera completa y no ejecuta la limpieza de horarios anteriores. Esto evita borrar horarios válidos por una extracción incompleta.

### 6.4. Sincronizar las cadenas de cine

Desde `backend/`, ejecuta:

```bash
npm run sync:cinemark
npm run sync:cineplanet
npm run sync:cinepolis
npm run sync:muvix
npm run sync:cinestar
```

Conviene ejecutarlos secuencialmente para facilitar el diagnóstico y poder identificar qué cadena produjo un problema.

Cada comando utiliza por defecto la fecha actual en Chile e incluye todas las funciones futuras disponibles (se puede acotar con `--dias=N`).

### 6.5. Extraer datos sin importarlos

Si se necesita inspeccionar una extracción antes de modificar la base:

```bash
npm run scrape:cinemark
npm run scrape:cineplanet
npm run scrape:cinepolis
npm run scrape:muvix
npm run scrape:cinestar
```

Los archivos JSON se guardan en:

```text
backend/data/scrapes/
```

La extracción no actualiza PostgreSQL.

### 6.6. Importar una extracción existente

Para importar un JSON generado anteriormente:

```bash
npm run import:scrape -- data/scrapes/ARCHIVO.json
```

Reemplaza `ARCHIVO.json` por el nombre real del archivo.

El proceso valida el JSON antes de importarlo. Si la extracción es parcial, importa sus registros, pero omite la limpieza de horarios anteriores.

## 7. Mantenimiento del catálogo

Los siguientes comandos permiten corregir y enriquecer los datos existentes. Es importante distinguir los diagnósticos de las operaciones que escriben en PostgreSQL.

### 7.1. Normalización de géneros y comunas

Los comandos `sync:<cadena>` e `import:scrape` normalizan géneros y comunas al guardar datos en PostgreSQL. El JSON de extracción puede conservar variantes de los valores de origen.

Las reglas se mantienen en `backend/src/utils/generos.ts` y `backend/src/utils/comunas.ts`. Los cambios en esas reglas se aplican a los valores que el importador vuelva a guardar.

### 7.2. Diagnóstico de películas duplicadas

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

### 7.3. Sincronización de metadatos con TMDB

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
| `npm test`                                           | Ejecuta la suite de pruebas.          | Ninguno sobre `cine`; usa la base `cine_test`.               |
| `npm run test:watch`                                 | Ejecuta Vitest en modo interactivo.   | Ninguno sobre `cine`; usa la base `cine_test`.               |
| `npm run test:coverage`                              | Ejecuta la suite y mide cobertura.    | Ninguno sobre `cine`; usa la base `cine_test`.               |
| `npm run mantenimiento`                           | Comprueba la API, PostgreSQL y las extracciones. | Ninguno persistente.                              |
| `npm run mantenimiento -- --apply [--tmdb]`        | Ejecuta el mantenimiento y sincroniza la cartelera. | Importa la cartelera y, con `--tmdb`, actualiza metadatos. |
| `npm run scrape:cinemark`                            | Extrae Cinemark y guarda JSON.        | Ninguno.                                                     |
| `npm run scrape:cineplanet`                          | Extrae Cineplanet y guarda JSON.      | Ninguno.                                                     |
| `npm run scrape:muvix`                               | Extrae Muvix y guarda JSON.           | Ninguno.                                                     |
| `npm run scrape:cinestar`                            | Extrae Cine Star y guarda JSON.       | Ninguno.                                                     |
| `npm run scrape:cinepolis`                           | Extrae Cinépolis y guarda JSON.       | Ninguno.                                                     |
| `npm run sync:cinemark`                              | Extrae e importa Cinemark.            | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:cineplanet`                            | Extrae e importa Cineplanet.          | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:cinepolis`                             | Extrae e importa Cinépolis.           | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:muvix`                                 | Extrae e importa Muvix.               | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run sync:cinestar`                              | Extrae e importa Cine Star.           | Inserta y actualiza datos; puede limpiar horarios obsoletos. |
| `npm run import:scrape -- data/scrapes/ARCHIVO.json` | Importa un JSON existente.            | Inserta y actualiza datos.                                   |
| `npm run sync:tmdb -- --dry-run`                     | Diagnostica coincidencias TMDB.       | Ninguno.                                                     |
| `npm run sync:tmdb -- --apply`                       | Aplica coincidencias TMDB seguras.    | Actualiza metadatos.                                         |
| `npm run sync:trailers -- --audit`                  | Revisa los títulos de los tráileres guardados con YouTube y TMDB. | Ninguno. |
| `node src/scraper/cli.ts --deduplicar`               | Diagnostica duplicados.               | Ninguno.                                                     |
| `node src/scraper/cli.ts --deduplicar --apply`       | Fusiona duplicados.                   | Modifica películas y relaciones.                             |

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

### 9.2. Auditoría y sincronización de tráileres

Ejecuta estos comandos desde `backend` con la conexión a PostgreSQL y la clave de TMDB configuradas.

- `npm run sync:trailers -- --audit` revisa todos los enlaces guardados. Muestra el progreso por película y, para los casos que requieren atención, el ID, la URL y los títulos disponibles de TMDB y YouTube. Al final muestra los totales por estado. Es de solo lectura.
- `npm run sync:trailers -- --dry-run` busca candidatos para las películas pendientes y muestra qué versión e idioma elegiría. Es de solo lectura.
- `npm run sync:trailers -- --apply` ejecuta esa búsqueda y guarda los resultados que cumplen las reglas de actualización.

La auditoría compara el título que publica YouTube con los títulos conocidos de la película. Un video titulado «Tráiler oficial» o un título regional ausente de TMDB puede requerir revisión. Los enlaces directos a archivos MP4 de Cinépolis se marcan para revisión manual porque carecen de los metadatos de YouTube.

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
| `GET`  | `/api/funciones/butacas`                   | Pública    | Consulta disponibilidad de butacas por cine y fecha.     |
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
| Hay variantes de un mismo género               | Revisa los alias en `backend/src/utils/generos.ts` y vuelve a sincronizar la fuente que actualiza la película.           |
| Hay variantes de una misma comuna              | Revisa las reglas en `backend/src/utils/comunas.ts` y vuelve a sincronizar la cadena del cine.                           |
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
