/**
 * Código que se ejecuta dentro de Chrome, en el contexto de cinepolis.com.
 * Importante: no usar backticks ni la secuencia dollar-llave dentro de este texto.
 * Por cada cine prueba los identificadores candidatos en orden y registra cada intento,
 * para que una respuesta de error o vacía no se pierda en silencio.
 */
export const PAGE_SCRIPT = `async (cfg) => {
  const post = async (body) => {
    try {
      const res = await fetch(cfg.apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "country-id": cfg.countryId, "x-apikey": cfg.apiKey },
        body: JSON.stringify(body),
      });
      const texto = await res.text();
      let json = null;
      try { json = JSON.parse(texto); } catch (e) {}
      return { status: res.status, json, texto: json ? null : texto.slice(0, 300) };
    } catch (e) {
      return { status: 0, json: null, texto: String(e) };
    }
  };

  const MOVIES_QUERY = 'query Movies($countryId: String!, $limit: Int) { movies(countryId: $countryId, limit: $limit) { edges { node { id name originalName genre rating ratingDescription length releaseDate synopsis media { resource type code sizes { large } } } } } }';
  const BILLBOARD_QUERY = 'query Billboard($countryId: String!, $cinemaId: String!, $timezone: String!, $isAbsoluteExperiencePath: Boolean) { billboardByCinema(countryId: $countryId, cinemaId: $cinemaId, timezone: $timezone, isAbsoluteExperiencePath: $isAbsoluteExperiencePath) { schedules { movieId dates { date languages { language displayLanguage showtimes { format { name } experience { name } sessionId datetime screen movieVistaId cinemaVistaId availability } } } } } }';
  const TRAILER_QUERY = 'query MovieTrailer($countryId: String!, $id: String!) { movie(countryId: $countryId, id: $id, isAbsoluteMediaPath: true) { media { resource type code sizes { large } } } }';

  const errores = [];
  const m = await post({ operationName: "Movies", variables: { countryId: cfg.countryId, limit: cfg.movieLimit }, query: MOVIES_QUERY });
  const edges = m.json && m.json.data && m.json.data.movies ? m.json.data.movies.edges : null;
  if (!Array.isArray(edges)) {
    errores.push({ tipo: "cartelera_error", status: m.status, errores: m.json && m.json.errors ? m.json.errors : null, texto: m.texto });
  }
  const movies = Array.isArray(edges) ? edges.map((e) => e && e.node).filter(Boolean) : [];

  const consultar = async (cine) => {
    const intentos = [];
    let respondio = false;
    for (const cinemaId of cine.candidatos) {
      const r = await post({
        operationName: "Billboard",
        variables: { countryId: cfg.countryId, cinemaId: String(cinemaId), timezone: cfg.timezone, isAbsoluteExperiencePath: true },
        query: BILLBOARD_QUERY,
      });
      const bb = r.json && r.json.data ? r.json.data.billboardByCinema : null;
      const schedules = bb && Array.isArray(bb.schedules) ? bb.schedules : null;
      intentos.push({
        cinemaId: String(cinemaId),
        status: r.status,
        errores: r.json && r.json.errors ? r.json.errors : null,
        texto: r.texto,
        schedules: schedules ? schedules.length : null,
      });
      if (schedules) {
        respondio = true;
        if (schedules.length > 0) {
          return { estado: "ok", idUsado: String(cinemaId), schedules, intentos, raw: cfg.debug ? r.json : undefined };
        }
      }
    }
    return { estado: respondio ? "vacio" : "error", idUsado: null, schedules: [], intentos };
  };

  const billboards = {};
  for (let i = 0; i < cfg.cinemas.length; i += cfg.concurrency) {
    const lote = cfg.cinemas.slice(i, i + cfg.concurrency);
    const resultados = await Promise.all(lote.map((c) => consultar(c).then((r) => [c.id, r])));
    for (const [id, r] of resultados) billboards[id] = r;
    if (i + cfg.concurrency < cfg.cinemas.length) {
      await new Promise((resolve) => setTimeout(resolve, cfg.pausaMs));
    }
  }

  const movieIdsInBillboards = new Set(Object.values(billboards).flatMap((billboard) => billboard.schedules.map((schedule) => schedule.movieId)));
  for (const movie of movies) {
    if (!movieIdsInBillboards.has(movie.id) || !movie.media || !movie.media.some((media) => media.type === "video" || /trailer/i.test(media.code || ""))) continue;
    await new Promise((resolve) => setTimeout(resolve, cfg.pausaMs));
    const detail = await post({
      operationName: "MovieTrailer",
      variables: { countryId: cfg.countryId, id: movie.id },
      query: TRAILER_QUERY,
    });
    const media = detail.json?.data?.movie?.media;
    if (Array.isArray(media)) movie.media = media;
  }

  return { movies, errores, billboards };
}`;
