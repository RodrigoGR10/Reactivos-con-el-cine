INSERT INTO cines (id, nombre, direccion, comuna, cadena, logo_url)
VALUES ('cinemark:1', 'Cinemark Prueba', 'Av. Siempre Viva 123', 'Santiago', 'cinemark', 'https://example.com/logo.png');

INSERT INTO peliculas (id, titulo, duracion, imagen_url, fecha_estreno)
VALUES ('cinemark:p1', 'Pelicula Hoy', 100, 'https://example.com/p1.jpg', CURRENT_DATE),
       ('cinemark:p2', 'Pelicula Futura', 110, 'https://example.com/p2.jpg', CURRENT_DATE + 30);

INSERT INTO funciones (id, pelicula_id, cine_id, fecha_hora)
VALUES ('cinemark:f1', 'cinemark:p1', 'cinemark:1', NOW() + interval '2 hours'),
       ('cinemark:f2', 'cinemark:p2', 'cinemark:1', NOW() + interval '2 days');
