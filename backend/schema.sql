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
    origen_id VARCHAR(100) NOT NULL, -- id del cine en la cadena
    url TEXT,                        -- pagina del cine (de ahi sale el slug)
    logo_url TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cadena, origen_id)
);



--------------------------------------------------
-- 3. TABLA PELICULAS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS peliculas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    sinopsis TEXT,
    duracion INT, -- En minutos
    genero VARCHAR(150),
    clasificacion VARCHAR(20),
    imagen_url TEXT,
    banner TEXT,
    tmdb_id INT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pelicula_fuentes (
    origen VARCHAR(20) NOT NULL,
    origen_id VARCHAR(100) NOT NULL,
    pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    url TEXT,
    estado_estreno VARCHAR(20) CHECK (estado_estreno IN ('cartelera', 'preventa', 'proximamente')),
    fecha_estreno DATE,
    PRIMARY KEY (origen, origen_id)         -- una fuente pertenece a una sola pelicula
);

--------------------------------------------------
-- 4. TABLA FUNCIONES (CARTELERA Y HORARIOS)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id SERIAL PRIMARY KEY,
    origen_id VARCHAR(150) NOT NULL, -- Conservamos el ID del scraper para sincronización
    pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    cine_id VARCHAR(100) NOT NULL REFERENCES cines(id) ON DELETE CASCADE,
    origen VARCHAR(20) NOT NULL,
    pelicula_origen_id VARCHAR(100) NOT NULL,   -- id de la pelicula en ESTA cadena
    pelicula_url TEXT,
    sesion_id VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,                    -- hora local de Chile
    horario TIME NOT NULL,                  -- hora local de Chile
    fecha_cartelera DATE NOT NULL,
    formato_resumen VARCHAR(100),
    idioma VARCHAR(50),
    sala VARCHAR(50) NOT NULL DEFAULT '',
    agotada BOOLEAN NOT NULL DEFAULT FALSE,
    url_compra TEXT,
    revision VARCHAR(300) NOT NULL,
    extraido_en TIMESTAMP WITH TIME ZONE NOT NULL,
    -- estado de la consulta de precios bajo demanda
    precios_consultados_en TIMESTAMP WITH TIME ZONE,
    precios_error_hasta TIMESTAMP WITH TIME ZONE,
    consulta_precios_hasta TIMESTAMP WITH TIME ZONE,
    consulta_precios_token VARCHAR(100),
    precios_revision VARCHAR(300),
    consulta_precios_revision VARCHAR(300),
    precios_error_revision VARCHAR(300)
);

CREATE TABLE IF NOT EXISTS tarifas (
    id SERIAL NOT NULL,
    origen_id VARCHAR(200) NOT NULL, -- ID de la tarifa en el scraper
    horario_id INT NOT NULL REFERENCES horarios(id) ON DELETE CASCADE,
    tipo_entrada VARCHAR(100) NOT NULL,
    formato VARCHAR(100) NOT NULL,
    precio INT,                             -- CLP, enteros
    cargo_servicio INT,
    precio_online INT NOT NULL,
    url_compra TEXT NOT NULL,
    extraido_en TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (horario_id, id)
);

-- Horarios que aun no han pasado, en hora de Chile (fecha + hora local).
CREATE OR REPLACE VIEW horarios_vigentes AS
    SELECT * FROM horarios
    WHERE (fecha + horario) >= (NOW() AT TIME ZONE 'America/Santiago');
--------------------------------------------------
-- 5. TABLA PIVOTE: FAVORITOS PELICULAS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS favoritos_peliculas (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
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
    pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
    marcado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pelicula_id)
);

--------------------------------------------------
-- INDICES PARA OPTIMIZAR CONSULTAS
--------------------------------------------------

-- Filtros de cines por ubicación o cadena
CREATE INDEX IF NOT EXISTS idx_cines_comuna ON cines(comuna);
CREATE INDEX IF NOT EXISTS idx_cines_cadena ON cines(cadena);


CREATE INDEX IF NOT EXISTS idx_horarios_pelicula_fecha ON horarios(pelicula_id, fecha, horario);
CREATE INDEX IF NOT EXISTS idx_horarios_cine_fecha ON horarios(cine_id, fecha, horario);
CREATE INDEX IF NOT EXISTS idx_horarios_sync ON horarios(origen, cine_id, fecha_cartelera);
CREATE INDEX IF NOT EXISTS idx_pelicula_fuentes_pelicula ON pelicula_fuentes(pelicula_id);
CREATE INDEX IF NOT EXISTS idx_peliculas_tmdb ON peliculas(tmdb_id);

-- Una sesión de una cadena en un cine solo puede existir una vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_horarios_origen_cine_sesion
ON horarios (origen, cine_id, sesion_id);
