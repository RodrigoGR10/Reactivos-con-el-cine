import type { Cine } from "../types/types";

const baseUrl = "http://localhost:3001/cines";

const getAll = () => {
    return fetch(baseUrl).then((response) => {
        if (!response.ok) {
            throw new Error("No se pudieron obtener los cines");
        }

        return response.json() as Promise<Cine[]>;
    });
};

export default {
    getAll,
};
