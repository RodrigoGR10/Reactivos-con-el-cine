import type { MouseEvent, ReactNode } from "react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
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
    label: "Cines",
    renderIcon: (isActive) => <TicketIcon size={28} filled={isActive} />,
  },
  {
    to: "/perfil",
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
  onClick,
}: {
  item: SidebarNavItem;
  tooltipProps: TooltipSharedProps;
  onClick: (evento: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const isActive = Boolean(useMatch({ path: item.to, end: Boolean(item.end) }));

  return (
    <Tooltip label={item.label} {...tooltipProps}>
      <NavLink
        to={item.to}
        end={item.end}
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
  const { user, logout, openAuthModal } = useAuth();
  const location = useLocation();
  const esMovil = useMediaQuery("(max-width: 560px)") ?? false;

  const manejarClicVista =
    (ruta: string) => (evento: MouseEvent<HTMLAnchorElement>) => {
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
                  logout().catch((error: unknown) => {
                    window.alert(
                      error instanceof Error
                        ? error.message
                        : "No se pudo cerrar la sesión.",
                    );
                  });
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
                onClick={openAuthModal}
              >
                <LogInIcon size={26} />
              </button>
            </Tooltip>
          )}
        </div>
      </aside>
    </Tooltip.Group>
  );
}

export default Sidebar;
