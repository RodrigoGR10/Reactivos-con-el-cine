-- Habilitar extensión para UUIDs automáticos si fuera necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------
-- 1. TABLA USERS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 2. TABLA CINES
--------------------------------------------------
CREATE TABLE IF NOT EXISTS cines (
    id VARCHAR(100) PRIMARY KEY, -- ID del scraper u origen
    nombre VARCHAR(150) NOT NULL,
    direccion TEXT NOT NULL,
    comuna VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100),
    cadena VARCHAR(50) NOT NULL, -- "cinemark", "cineplanet", "vista", etc.
    logo_url TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 3. TABLA PELICULAS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS peliculas (
    id VARCHAR(100) PRIMARY KEY, -- ID del scraper u origen
    titulo VARCHAR(255) NOT NULL,
    sinopsis TEXT,
    duracion INT, -- En minutos
    genero VARCHAR(100),
    clasificacion VARCHAR(20),
    imagen_url TEXT,
    fecha_estreno DATE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 4. TABLA FUNCIONES (CARTELERA Y HORARIOS)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS funciones (
    id VARCHAR(150) PRIMARY KEY, -- ID de la sesión/función
    pelicula_id VARCHAR(100) NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    cine_id VARCHAR(100) NOT NULL REFERENCES cines(id) ON DELETE CASCADE,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    precio NUMERIC(10, 2) DEFAULT 0.00,
    sala VARCHAR(50),
    formato VARCHAR(50), -- "2D", "3D", "IMAX", etc.
    agotada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 5. TABLA PIVOTE: FAVORITOS PELICULAS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS favoritos_peliculas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pelicula_id VARCHAR(100) NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    agregado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pelicula_id)
);

--------------------------------------------------
-- 6. TABLA PIVOTE: FAVORITOS CINES
--------------------------------------------------
CREATE TABLE IF NOT EXISTS favoritos_cines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cine_id VARCHAR(100) NOT NULL REFERENCES cines(id) ON DELETE CASCADE,
    agregado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, cine_id)
);

--------------------------------------------------
-- 7. TABLA PIVOTE: VISTAS PELICULAS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS vistas_peliculas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pelicula_id VARCHAR(100) NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    marcado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pelicula_id)
);

--------------------------------------------------
-- INDICES PARA OPTIMIZAR CONSULTAS
--------------------------------------------------

-- Búsquedas y consultas de cartelera por fecha y disponibilidad
CREATE INDEX IF NOT EXISTS idx_funciones_fecha_hora ON funciones(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_funciones_pelicula ON funciones(pelicula_id);
CREATE INDEX IF NOT EXISTS idx_funciones_cine ON funciones(cine_id);

-- Búsquedas combinadas en funciones (ej. cartelera vigentes)
CREATE INDEX IF NOT EXISTS idx_funciones_pelicula_fecha
    ON funciones(pelicula_id, fecha_hora)
    WHERE agotada = FALSE;

-- Filtros de cines por ubicación o cadena
CREATE INDEX IF NOT EXISTS idx_cines_comuna ON cines(comuna);
CREATE INDEX IF NOT EXISTS idx_cines_cadena ON cines(cadena);
