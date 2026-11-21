import { useState, type MouseEvent, type ReactNode } from "react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { Alert, Button, Group, Modal, Text, Tooltip } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
    AlertCircleIcon,
    HomeIcon,
    TicketIcon,
    UserIcon,
    LogInIcon,
    LogOutIcon,
} from "./common/Icons";
import { useAuth } from "../context/AuthContext";

const TOOLTIP_EVENTS = { hover: true, focus: true, touch: false } as const;

interface SidebarNavItem {
    to: string;
    end?: boolean;
    label: string;
    renderIcon: (isActive: boolean) => ReactNode;
}

const NAV_ITEMS: readonly SidebarNavItem[] = [
    {
        to: "/",
        end: true,
        label: "Inicio",
        renderIcon: (isActive) => <HomeIcon size={28} filled={isActive} />,
    },
    {
        to: "/cines",
        end: true,
        label: "Cines",
        renderIcon: (isActive) => <TicketIcon size={28} filled={isActive} />,
    },
    {
        to: "/perfil",
        end: true,
        label: "Perfil",
        renderIcon: (isActive) => <UserIcon size={28} filled={isActive} />,
    },
];

interface TooltipSharedProps {
    position: "right";
    floatingStrategy: "fixed";
    offset: number;
    disabled: boolean;
    events: typeof TOOLTIP_EVENTS;
}

function SidebarNavLink({
    item,
    tooltipProps,
    state,
    onClick,
}: {
    item: SidebarNavItem;
    tooltipProps: TooltipSharedProps;
    state?: unknown;
    onClick: (evento: MouseEvent<HTMLAnchorElement>) => void;
}) {
    const isActive = Boolean(
        useMatch({ path: item.to, end: Boolean(item.end) }),
    );

    return (
        <Tooltip label={item.label} {...tooltipProps}>
            <NavLink
                to={item.to}
                end={item.end}
                state={state}
                className="sidebar-btn"
                aria-label={item.label}
                onClick={onClick}
            >
                {item.renderIcon(isActive)}
            </NavLink>
        </Tooltip>
    );
}

function Sidebar() {
    const { user, isLoadingSession, logout, openAuthModal } = useAuth();
    const location = useLocation();
    const esMovil = useMediaQuery("(max-width: 560px)") ?? false;
    const [
        confirmarSalida,
        { open: abrirConfirmacion, close: cerrarConfirmacion },
    ] = useDisclosure(false);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const [errorLogout, setErrorLogout] = useState<string | null>(null);

    const manejarCerrarConfirmacion = () => {
        if (cerrandoSesion) return;
        cerrarConfirmacion();
    };

    const confirmarCerrarSesion = async () => {
        if (cerrandoSesion) return;
        setErrorLogout(null);
        setCerrandoSesion(true);
        try {
            await logout();
            cerrarConfirmacion();
        } catch (error: unknown) {
            setErrorLogout(
                error instanceof Error
                    ? error.message
                    : "No se pudo cerrar la sesión.",
            );
        } finally {
            setCerrandoSesion(false);
        }
    };

    const manejarClicVista =
        (ruta: string) => (evento: MouseEvent<HTMLAnchorElement>) => {
            if (
                ruta === "/perfil" &&
                !isLoadingSession &&
                !user &&
                !evento.metaKey &&
                !evento.ctrlKey &&
                !evento.shiftKey &&
                !evento.altKey &&
                evento.button === 0
            ) {
                evento.preventDefault();
                openAuthModal("/perfil");
                return;
            }
            if (location.pathname === ruta) {
                evento.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        };

    const tooltipProps: TooltipSharedProps = {
        position: "right",
        floatingStrategy: "fixed",
        offset: 12,
        disabled: esMovil,
        events: TOOLTIP_EVENTS,
    };

    return (
        <>
            <Tooltip.Group openDelay={200} closeDelay={80}>
                <aside className="sidebar" aria-label="Navegación principal">
                    <div className="sidebar-top">
                        <div className="sidebar-logo">
                            <img
                                src="/logo.jpg"
                                alt="Reactivos con el Cine"
                                className="sidebar-logo-img"
                            />
                        </div>
                    </div>

                    <div className="sidebar-mid">
                        {NAV_ITEMS.map((item) => (
                            <SidebarNavLink
                                key={item.to}
                                item={item}
                                tooltipProps={tooltipProps}
                                state={
                                    item.to === "/perfil"
                                        ? {
                                              returnTo: `${location.pathname}${location.search}${location.hash}`,
                                          }
                                        : undefined
                                }
                                onClick={manejarClicVista(item.to)}
                            />
                        ))}
                    </div>

                    <div className="sidebar-bottom">
                        {user ? (
                            <Tooltip label="Cerrar sesión" {...tooltipProps}>
                                <button
                                    type="button"
                                    className="sidebar-btn"
                                    aria-label="Cerrar sesión"
                                    onClick={() => {
                                        setErrorLogout(null);
                                        abrirConfirmacion();
                                    }}
                                >
                                    <LogOutIcon size={26} />
                                </button>
                            </Tooltip>
                        ) : (
                            <Tooltip label="Iniciar sesión" {...tooltipProps}>
                                <button
                                    type="button"
                                    className="sidebar-btn"
                                    aria-label="Iniciar sesión"
                                    onClick={() => openAuthModal()}
                                >
                                    <LogInIcon size={26} />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </aside>
            </Tooltip.Group>

            <Modal
                opened={confirmarSalida}
                onClose={manejarCerrarConfirmacion}
                centered
                size={390}
                padding={0}
                zIndex={1200}
                shadow="none"
                title="¿Cerrar sesión?"
                closeButtonProps={{ "aria-label": "Cerrar confirmación" }}
                closeOnClickOutside={!cerrandoSesion}
                closeOnEscape={!cerrandoSesion}
                withCloseButton={!cerrandoSesion}
                returnFocus
                overlayProps={{
                    color: "#000",
                    backgroundOpacity: 0.48,
                    blur: 3,
                }}
                transitionProps={{
                    transition: "pop",
                    duration: 200,
                    exitDuration: 150,
                }}
                onExitTransitionEnd={() => setErrorLogout(null)}
                classNames={{
                    content: "modal-confirmacion-contenido",
                    header: "modal-confirmacion-header",
                    title: "modal-confirmacion-titulo",
                    close: "modal-confirmacion-cerrar",
                    body: "modal-confirmacion-cuerpo",
                }}
            >
                <Text size="sm" c="var(--color-texto-secundario)">
                    Tendrás que volver a iniciar sesión para guardar o ver tus
                    cines y películas favoritas.
                </Text>

                {errorLogout && (
                    <Alert
                        variant="light"
                        color="cine"
                        radius="md"
                        icon={<AlertCircleIcon size={18} />}
                        role="alert"
                        className="modal-confirmacion-alerta"
                    >
                        {errorLogout}
                    </Alert>
                )}

                <Group justify="flex-end" gap="sm" mt={20}>
                    <Button
                        type="button"
                        variant="default"
                        data-autofocus
                        disabled={cerrandoSesion}
                        onClick={manejarCerrarConfirmacion}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        color="cine"
                        loading={cerrandoSesion}
                        onClick={confirmarCerrarSesion}
                    >
                        Cerrar sesión
                    </Button>
                </Group>
            </Modal>
        </>
    );
}

export default Sidebar;
