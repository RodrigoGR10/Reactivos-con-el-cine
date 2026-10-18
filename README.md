# Reactivos con el Cine

Aplicación web para explorar la cartelera de cine en Chile, comparar horarios y consultar precios entre distintas cadenas. Permite guardar películas en seguimiento y cines habituales con una cuenta de usuario.

**Aplicación desplegada:** [https://fullstack.dcc.uchile.cl:7059/](https://fullstack.dcc.uchile.cl:7059/)

## Tecnologías utilizadas

- **Frontend:** React 19, TypeScript, Vite, React Router, Axios y CSS adaptable, en `frontend/`.
- **Backend:** Node.js, TypeScript, Express 5, MongoDB y Mongoose, en `backend/`.
- **Autenticación:** JWT en cookie `httpOnly` con `SameSite=strict`, token CSRF y contraseñas almacenadas como hashes con bcrypt.
- **Catálogo:** scrapers de Cinemark, Cineplanet, Muvix y Cine Star, con integración opcional con TMDB.

## Requisitos previos

- Node.js 24 o superior y npm.
- MongoDB local en ejecución o una instancia remota con permisos de lectura y escritura.
- Conexión a Internet para los scrapers y las imágenes.

## Configuración del entorno

Desde la raíz, copia [`backend/.env.example`](./backend/.env.example) a `backend/.env` si todavía no existe.

En PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

En Linux o macOS:

```bash
cp backend/.env.example backend/.env
```

Completa `MONGODB_URI` y `JWT_SECRET`. Para generar el secreto, ejecuta y pega el resultado después de `JWT_SECRET=`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Variable | Configuración |
| :--- | :--- |
| `MONGODB_URI` | Obligatoria. URI de MongoDB; en local: `mongodb://127.0.0.1:27017`. |
| `JWT_SECRET` | Obligatoria. Secreto generado para firmar las sesiones. |
| `MONGODB_NAME` | Nombre de la base; por defecto, `reactivos-cine`. |
| `NODE_ENV` | `development` para ejecutar en local. |
| `HOST` | Dirección del backend; por defecto, `localhost`. |
| `PORT` | Puerto del backend; por defecto, `3001`. |
| `FRONTEND_URL` | Origen del frontend; por defecto, `http://localhost:5173`. |
| `MONGODB_COLLECTION_PREFIX` | Vacío en local. Obligatorio y propio del grupo si se usa la base compartida `fullstack`. |
| `TMDB_API_KEY` | Opcional. Clave API v3 para enriquecer películas con TMDB. |

No subas `.env` ni credenciales al repositorio.

## Instalación y ejecución local

### 1. Backend

Desde la raíz del repositorio:

```bash
cd backend
npm install
npm run dev
```

El backend queda en `http://localhost:3001`; sus endpoints comienzan con `/api`.

### 2. Frontend

En otra terminal, también desde la raíz del repositorio:

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173/](http://localhost:5173/). Vite reenvía `/api` al backend en el puerto `3001`. No se necesita un `.env` del frontend con esta configuración.

Los scripts también se pueden ejecutar con `pnpm run`.

## Carga y sincronización de cartelera

Si la base está vacía o quieres actualizarla, ejecuta las cadenas una por una en otra terminal, desde `backend/`:

```bash
npm run sync:cinemark
npm run sync:cineplanet
npm run sync:muvix
npm run sync:cinestar
```

Los datos se guardan directamente en MongoDB, sin borrar la base previamente. Se consultan 7 días por defecto; agrega `-- --all-dates` para incluir todas las fechas publicadas. Los precios se consultan al abrir el detalle de una película y seleccionar cine y fecha.

Opcionalmente, con `TMDB_API_KEY` configurada, ejecuta `npm run sync:tmdb` para actualizar imágenes y sinopsis y fusionar películas duplicadas. Este comando modifica el catálogo y sus referencias.

## Vistas de la aplicación

| Ruta | Vista |
| :--- | :--- |
| `/` | Cartelera con búsqueda y filtros por género, clasificación y duración. |
| `/peliculas/:id` | Detalle de película, selección de cine y fecha, formatos, precios y enlaces de compra. |
| `/cines` | Directorio con búsqueda, filtros por cadena y comuna y ordenamiento por cercanía. |
| `/cines/:id` | Información del cine y cartelera por fecha y formato. |
| `/login` | Inicio de sesión y registro. |
| `/perfil` | Ruta protegida con datos de la cuenta, películas en seguimiento y cines habituales. |

## Endpoints principales de la API

Todas las rutas comienzan con `/api`. Las privadas requieren la cookie JWT y la cabecera `X-CSRF-Token`; en `localStorage` solo se guarda el token CSRF.

| Método | Ruta | Protección | Uso |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/peliculas` | Pública | Lista películas; `?cartelera=true` filtra las que tienen horarios vigentes. |
| `GET` | `/api/peliculas/:id` | Pública | Obtiene una película por ID. |
| `GET` | `/api/cines` | Pública | Lista los cines. |
| `GET` | `/api/cines/:id` | Pública | Obtiene un cine por ID. |
| `GET` | `/api/funciones` | Pública | Lista funciones vigentes; admite filtros `peliculaId` y `cineId`. |
| `GET` | `/api/funciones/:id` | Pública | Obtiene una función por ID. |
| `GET` | `/api/funciones/horarios` | Pública | Lista horarios vigentes; requiere `peliculaId`, `cineId` o ambos. |
| `GET` | `/api/funciones/precios` | Pública | Consulta precios con caché de hasta 15 minutos; requiere `peliculaId`, `cineId` y `fecha` (`YYYY-MM-DD`). |
| `POST` | `/api/auth/register` | Pública | Registra e inicia sesión con `nombre`, `email` y `contrasena`. |
| `POST` | `/api/auth/login` | Pública | Inicia sesión con `email` y `contrasena`. |
| `POST` | `/api/auth/logout` | JWT + CSRF | Cierra la sesión. |
| `GET` | `/api/auth/me` | JWT + CSRF | Verifica la sesión y devuelve el usuario. |
| `GET` | `/api/perfil/favoritos` | JWT + CSRF | Obtiene los IDs de películas y cines favoritos. |
| `POST` | `/api/perfil/favoritos/peliculas/:movieId` | JWT + CSRF | Agrega o quita una película de favoritos. |
| `POST` | `/api/perfil/favoritos/cines/:cinemaId` | JWT + CSRF | Agrega o quita un cine de favoritos. |

## Integrantes

- Cristóbal Aravena
- Giorgio Bravo
- Rodrigo Guerrero
- Tomás Raggio
