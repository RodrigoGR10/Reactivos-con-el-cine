interface BotonFavoritoProps {
    activo: boolean;
    onClick: () => void;
    ariaLabel: string;
    title?: string;
    className?: string;
}

export function BotonFavorito({
    activo,
    onClick,
    ariaLabel,
    title,
    className = "",
}: BotonFavoritoProps) {
    return (
        <button
            type="button"
            className={`boton-fav${className ? ` ${className}` : ""}`}
            aria-pressed={activo}
            aria-label={ariaLabel}
            title={title ?? ariaLabel}
            onClick={onClick}
        >
            <svg
                className="icono-corazon-fav"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M12 20.85l-1.45-1.32C5.4 14.86 2 11.78 2 8 2 4.92 4.42 2.5 7.5 2.5c1.74 0 3.41.81 4.5 2.09C13.09 3.31 14.76 2.5 16.5 2.5 19.58 2.5 22 4.92 22 8c0 3.78-3.4 6.86-8.55 11.54L12 20.85z" />
            </svg>
        </button>
    );
}
