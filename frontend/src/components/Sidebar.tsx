import { NavLink } from 'react-router-dom'
import { HomeIcon, UserIcon, LogInIcon, LogOutIcon } from './common/Icons'
import { useAuth } from '../context/AuthContext'

function Sidebar() {
  const { user, logout, openAuthModal } = useAuth()

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-top">
        <NavLink
          to="/"
          className="sidebar-btn logo-btn"
          title="Reactivos con el Cine"
        >
          <img
            src="/logo.jpg"
            alt="Reactivos con el Cine"
            className="sidebar-logo-img"
          />
        </NavLink>
      </div>

      <div className="sidebar-mid">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-btn ${isActive ? 'active' : ''}`}
          title="Inicio"
        >
          <HomeIcon size={28} />
        </NavLink>
        <NavLink
          to="/perfil"
          className={({ isActive }) => `sidebar-btn ${isActive ? 'active' : ''}`}
          title="Perfil"
        >
          <UserIcon size={28} />
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        {user ? (
          <button
            type="button"
            className="sidebar-btn"
            title="Cerrar sesión"
            onClick={logout}
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
  )
}

export default Sidebar
