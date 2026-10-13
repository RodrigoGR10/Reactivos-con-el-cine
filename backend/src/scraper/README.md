# Cinemark: version simplificada

Ejecuta los comandos desde `backend`, con Node 24 o superior.

## Actualizar la pagina

```powershell
npm run sync:cinemark
```

Consulta los cines y sesiones de los proximos siete dias, valida el resultado y
sincroniza MongoDB directamente. No necesitas un JSON ni un segundo comando.
Usa `MONGODB_URI` y `MONGODB_NAME` de `backend/.env`.

Guarda peliculas y cines mediante `findOneAndUpdate` con `upsert`. Las funciones
se validan localmente y se envian con `Funcion.bulkWrite` en lotes de hasta 250.
Actualiza o agrega sin duplicar y conserva sus ObjectId. Los indices de origen
impiden duplicados. Retira funciones ausentes dentro del alcance consultado,
vencidas de los cines sincronizados y peliculas de Cinemark sin funciones.
No borra usuarios ni reinicia el catalogo en cada ejecucion.

## Guardar un JSON opcional

```powershell
npm run sync:cinemark -- --output=data/cinemark.json
```

Para extraer solo a JSON, sin escribir en Mongo:

```powershell
npm run scrape:cinemark
```

Para validar un JSON existente, sin conectarte a Mongo:

```powershell
npm run import:cinemark
```

`import:cinemark -- --write --sync` importa y sincroniza un JSON existente.
`--reset` requiere `--write`: respalda primero en `data/backups` y reemplaza
todo el catalogo de peliculas, cines y funciones, incluidas otras fuentes.
Conserva usuarios. No uses `--reset` para una actualizacion habitual.
Si falla la escritura del respaldo, el reinicio no borra el catalogo.
Las extracciones limitadas con `--limit` no permiten sincronizacion o reinicio.

## Como funciona

- `client.ts`: funciones async para consultar la API publica con pausa y timeout.
- `cinemark.ts`: bucles por cine y sesion, de una en una; reutiliza peliculas ya consultadas.
- `normalize.ts`: transforma campos, selecciona tarifas normales por area y arma enlaces.
- `import-data.ts`: valida y guarda mediante los modelos Mongoose del proyecto.
- `cli.ts` e `import-cli.ts`: ejecutan las funciones y manejan las opciones de consola.

Se mantienen `lz-string` para descomprimir la configuracion publica de Cinemark
y `parseArgs`, incluido en Node, para interpretar opciones. No hay clase HTTP,
workers, colas de promesas ni reanudacion. Una extraccion interrumpida
se ejecuta desde el principio; una extraccion con incidencias no se importa.
Las consultas a Cinemark siguen siendo secuenciales. El guardado por lotes reduce
las peticiones de escritura de funciones a Mongo. La consola muestra por separado
los tiempos de extraccion y guardado; no se promete un tiempo total fijo.

`precio` no incluye servicio; `precioOnline` es el total. El formato pertenece
a cada tarifa, no al resumen de la sala. Los enlaces abren pelicula, cine,
fecha e idioma/formato filtrados; el horario y la entrada se eligen en Cinemark.
La pagina conserva sus filtros, precios y tarjetas enlazadas.
