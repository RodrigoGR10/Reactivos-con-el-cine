import { Skeleton } from "@mantine/core";
import { TarjetaCineSkeleton } from "../../components/cines/TarjetaCine";
import type { TabFavoritos } from "../../hooks/useFavoritosPerfil";

const POSTERS_ESQUELETO = [0, 1, 2, 3, 4, 5];
const CINES_ESQUELETO = [0, 1, 2, 3];

interface ProfileFavoritesSkeletonProps {
    tabActiva: TabFavoritos;
}

export const ProfileFavoritesSkeleton = ({
    tabActiva,
}: ProfileFavoritesSkeletonProps) => (
    <div className="content-area" role="status" aria-busy="true">
        <span className="visualmente-oculto">Cargando favoritos...</span>
        {tabActiva === "cines" ? (
            <div className="cines-grid">
                {CINES_ESQUELETO.map((idx) => (
                    <TarjetaCineSkeleton key={idx} />
                ))}
            </div>
        ) : (
            <div className="posters-grid">
                {POSTERS_ESQUELETO.map((idx) => (
                    <div
                        key={idx}
                        className="poster-card-skeleton"
                        aria-hidden="true"
                    >
                        <Skeleton height="100%" radius={0} />
                    </div>
                ))}
            </div>
        )}
    </div>
);
