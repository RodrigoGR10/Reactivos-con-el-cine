import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { AuthModal } from '../components/auth/AuthModal'
import { useAuth } from '../context/AuthContext'

function MainLayout() {
  const { isAuthModalOpen, closeAuthModal } = useAuth()

  return (
    <div className="layout-root">
      <Sidebar />
      <main className="main-principal">
        <Outlet />
      </main>
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
        />
      )}
    </div>
  )
}

export default MainLayout
