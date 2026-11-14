import type { MouseEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  HomeIcon,
  TicketIcon,
  UserIcon,
  LogInIcon,
  LogOutIcon,
} from "./common/Icons";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user, logout, openAuthModal } = useAuth();
  const location = useLocation();

  const manejarClicVista = (ruta: string) => (evento: MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === ruta) {
      evento.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
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
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-btn ${isActive ? "active" : ""}`
          }
          title="Inicio"
          onClick={manejarClicVista("/")}
        >
          {({ isActive }) => <HomeIcon size={28} filled={isActive} />}
        </NavLink>
        <NavLink
          to="/cines"
          className={({ isActive }) =>
            `sidebar-btn ${isActive ? "active" : ""}`
          }
          title="Cines"
          onClick={manejarClicVista("/cines")}
        >
          {({ isActive }) => <TicketIcon size={28} filled={isActive} />}
        </NavLink>
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            `sidebar-btn ${isActive ? "active" : ""}`
          }
          title="Perfil"
          onClick={manejarClicVista("/perfil")}
        >
          {({ isActive }) => <UserIcon size={28} filled={isActive} />}
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        {user ? (
          <button
            type="button"
            className="sidebar-btn"
            title="Cerrar sesión"
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
        ) : (
          <button
            type="button"
            className="sidebar-btn"
            title="Iniciar sesión"
            onClick={openAuthModal}
          >
            <LogInIcon size={26} />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
