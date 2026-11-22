import { scrapeCinemark } from "./cinemark/scraper.ts";
import { scrapeCineplanet } from "./cineplanet/scraper.ts";
import { initializeCinepolis } from "./cinepolis/client.ts";
import { scrapeCinepolis } from "./cinepolis/scraper.ts";
import { validarScrapeResult } from "./validate.ts";
import { scrapeVista } from "./vista/scraper.ts";
import type { Origen, ScrapeOptions } from "./types.ts";

export async function extraerCartelera(
    origen: Origen,
    options: ScrapeOptions,
    opcionesCinepolis?: Parameters<typeof scrapeCinepolis>[1],
) {
    const scrapers = {
        cinemark: () => scrapeCinemark(options),
        cineplanet: () => scrapeCineplanet(options),
        muvix: () => scrapeVista("muvix", options),
        cinestar: () => scrapeVista("cinestar", options),
        cinepolis: async () => {
            await initializeCinepolis();
            return scrapeCinepolis(options, opcionesCinepolis);
        },
    };

    const data = await scrapers[origen]();
    validarScrapeResult(data);
    return data;
}
