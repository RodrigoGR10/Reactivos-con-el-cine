# Reactivos con el Cine

Aplicación web fullstack para explorar la cartelera de cine en Chile, comparar horarios y tarifas en tiempo real entre distintas cadenas.

---

## Tecnologías utilizadas

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **React Router DOM v7** (navegación SPA y rutas protegidas)
- **Axios** (comunicación con el backend enviando credenciales y cabecera CSRF)
- **CSS Puro** con diseño adaptable y variables CSS

### Backend
- **Node.js** + **Express 5** + **TypeScript**
- **MongoDB** + **Mongoose** (persistencia de películas, cines, horarios, funciones y usuarios)
- **Autenticación segura**: **JWT** en cookie `httpOnly` (`sameSite: "lax"`) + token **CSRF** (`X-CSRF-Token`) y contraseñas encriptadas con **bcrypt**
- **Scraper multicadena + TMDB**: extracción de cartelera y consulta de tarifas bajo demanda, complementado con pósters, banners y sinopsis desde **The Movie Database (TMDB)**

---

## Requisitos previos

- **Node.js** (v22 o superior recomendado)
- **npm**
- **MongoDB** ejecutándose localmente (por defecto en `mongodb://localhost:27017`) o una instancia remota

---

## Configuración del entorno

1. En la carpeta `backend/`, crea un archivo `.env` copiando la plantilla [`backend/.env.example`](./backend/.env.example):

```bash
cp backend/.env.example backend/.env
```

2. Ajusta las variables en `backend/.env` según tu entorno:

```env
NODE_ENV=development
HOST=localhost
PORT=3001
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_NAME=reactivos-cine

JWT_SECRET=miclavesecreta
TMDB_API_KEY=tu_api_key_de_tmdb
```

| Variable | Descripción | Obligatoria |
| :--- | :--- | :---: |
| `NODE_ENV` | Entorno de ejecución (`development` o `production`) | No |
| `HOST` | Host del servidor Express (por defecto `localhost`) | No |
| `PORT` | Puerto donde se levanta el servidor Express (por defecto `3001`) | No |
| `FRONTEND_URL` | Origen permitido por CORS para el frontend (por defecto `http://localhost:5173`) | No |
| `MONGODB_URI` | URI de conexión a MongoDB | Sí |
| `MONGODB_NAME` | Nombre de la base de datos en MongoDB (por defecto `reactivos-cine`) | No |
| `JWT_SECRET` | Clave secreta para firmar y verificar los tokens JWT de sesión | Sí |
| `TMDB_API_KEY` | API Key de TMDB (v3) para enriquecer pósters, banners y sinopsis de películas | Opcional |

---

## Instalación y Ejecución

### 1. Levantar el Backend

```bash
cd backend
npm install
npm run dev
```

El servidor quedará disponible en `http://localhost:3001`.

### 2. Levantar el Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación web estará disponible en `http://localhost:5173`.

---

## Carga y sincronización de cartelera

Desde la carpeta `backend/`, puedes poblar o actualizar la base de datos ejecutando los comandos del scraper:

```bash
# Extraer e importar cartelera por cadena de cine
npm run sync:cinemark
npm run sync:cineplanet
npm run sync:muvix
npm run sync:cinestar

# Enriquecer pósters, banners y sinopsis con TMDB y unificar catálogo
npm run sync:tmdb
```

---

## Vistas de la aplicación

- `/` — **Cartelera Principal**: banner destacado dinámico, búsqueda por título y filtros por género, cadena de cine y formato.
- `/peliculas/:id` — **Detalle de Película**: sinopsis, clasificación, selector de fecha y complejo (con ordenamiento por cercanía geográfica) y consulta de precios por tarifa con enlace directo de compra.
- `/cines` — **Directorio de Cines**: listado de complejos cinematográficos con buscador, filtro por cadena/comuna y ordenamiento por ubicación.
- `/cines/:id` — **Detalle de Cine**: información del complejo, guardado como cine habitual y cartelera disponible por fecha y formato.
- `/perfil` — **Perfil de Usuario (Ruta Protegida)**: resumen de cuenta y gestión de películas en seguimiento y cines habituales sincronizados en MongoDB.

---

## Endpoints Principales de la API

| Método | Ruta | Protección | Descripción |
| :---: | :--- | :---: | :--- |
| `GET` | `/peliculas` | Pública | Lista todas las películas (`?cartelera=true` filtra las que tienen horarios vigentes). |
| `GET` | `/peliculas/:id` | Pública | Obtiene el detalle de una película por su ID. |
| `GET` | `/cines` | Pública | Lista todos los cines registrados. |
| `GET` | `/cines/:id` | Pública | Obtiene el detalle de un cine por su ID. |
| `GET` | `/funciones/horarios` | Pública | Obtiene los horarios vigentes filtrados por `peliculaId` y/o `cineId`. |
| `GET` | `/funciones/precios` | Pública | Consulta y actualiza en tiempo real las tarifas para `peliculaId`, `cineId` y `fecha`. |
| `POST` | `/auth/register` | Pública | Registra un nuevo usuario e inicia sesión (entrega cookie `httpOnly` + `X-CSRF-Token`). |
| `POST` | `/auth/login` | Pública | Autentica un usuario existente (entrega cookie `httpOnly` + `X-CSRF-Token`). |
| `POST` | `/auth/logout` | JWT + CSRF | Cierra la sesión activa eliminando la cookie `token`. |
| `GET` | `/auth/me` | JWT + CSRF | Verifica la sesión activa y retorna los datos del usuario autenticado. |
| `GET` | `/perfil/favoritos` | JWT + CSRF | Obtiene los IDs de películas y cines favoritos del usuario autenticado. |
| `POST` | `/perfil/favoritos/peliculas/:movieId` | JWT + CSRF | Agrega o quita una película de la lista de favoritos del usuario en MongoDB. |
| `POST` | `/perfil/favoritos/cines/:cinemaId` | JWT + CSRF | Agrega o quita un cine de la lista de favoritos del usuario en MongoDB. |
