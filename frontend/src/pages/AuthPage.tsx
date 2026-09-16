import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const AuthPage = () => {
    const { login, register, user, logout } = useAuth();

    // Estado para controlar la vista activa: false = Login, true = Register
    const [isRegisterActive, setIsRegisterActive] = useState(false);
    // Estado para controlar la visibilidad de la tarjeta al hacer clic en 'X'
    const [isOpen, setIsOpen] = useState(true);

    // Estados del formulario de Login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Estados del formulario de Registro
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    // Estados de feedback
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    // Limpia mensajes al cambiar entre vistas
    const switchView = (toRegister: boolean) => {
        setIsRegisterActive(toRegister);
        setErrorMsg(null);
        setSuccessMsg(null);
    };

    // Manejador del Login
    const handleLoginSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const emailTrimmed = loginEmail.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailTrimmed) {
            setErrorMsg('Por favor ingresa tu correo electrónico.');
            return;
        }
        if (!emailRegex.test(emailTrimmed)) {
            setErrorMsg('Ingresa un correo electrónico válido.');
            return;
        }
        if (!loginPassword) {
            setErrorMsg('Por favor ingresa tu contraseña.');
            return;
        }

        setCargando(true);
        try {
            await login({ email: emailTrimmed, contrasena: loginPassword });
            setSuccessMsg('¡Sesión iniciada con éxito!');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
        } finally {
            setCargando(false);
        }
    };

    // Manejador del Registro
    const handleRegisterSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const usernameTrimmed = regUsername.trim();
        const emailTrimmed = regEmail.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!usernameTrimmed || usernameTrimmed.length < 2) {
            setErrorMsg('El nombre de usuario debe tener al menos 2 caracteres.');
            return;
        }
        if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
            setErrorMsg('Ingresa un correo electrónico válido.');
            return;
        }
        if (!regPassword || regPassword.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setCargando(true);
        try {
            await register({
                nombre: usernameTrimmed,
                email: emailTrimmed,
                contrasena: regPassword,
                confirmarContrasena: regPassword
            });
            setSuccessMsg('¡Cuenta creada con éxito!');
            // Opcionalmente pasamos a login tras registro exitoso
            setTimeout(() => {
                setIsRegisterActive(false);
            }, 1200);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Error al registrar la cuenta.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Si el usuario ya está autenticado, mostramos un banner informativo arriba */}
            {user && (
                <div className="authenticated-banner">
                    <span>Conectado como <strong>{user.nombre}</strong> ({user.email})</span>
                    <button type="button" className="btn-logout" onClick={logout}>
                        Cerrar Sesión
                    </button>
                </div>
            )}

            {/* Contenedor Principal (Wrapper con Glassmorphism) */}
            <div className={`wrapper ${isRegisterActive ? 'active' : ''} ${!isOpen ? 'closed' : ''}`}>
                {/* Botón de cierre en esquina superior derecha */}
                <button
                    type="button"
                    className="icon-close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Cerrar formulario"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Formulario 1: Iniciar Sesión */}
                <div className="form-box login">
                    <h2>Iniciar Sesión</h2>
                    
                    {errorMsg && !isRegisterActive && (
                        <div className="auth-alert error">{errorMsg}</div>
                    )}
                    {successMsg && !isRegisterActive && (
                        <div className="auth-alert success">{successMsg}</div>
                    )}

                    <form onSubmit={handleLoginSubmit} noValidate>
                        <div className={`input-box ${loginEmail ? 'has-value' : ''}`}>
                            <span className="icon">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                required
                                placeholder=" "
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                            />
                            <label>Correo Electrónico</label>
                        </div>

                        <div className={`input-box ${loginPassword ? 'has-value' : ''}`}>
                            <button
                                type="button"
                                className="icon btn-toggle-password"
                                onClick={() => setShowLoginPassword((prev) => !prev)}
                                aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showLoginPassword ? (
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                            <input
                                type={showLoginPassword ? 'text' : 'password'}
                                required
                                placeholder=" "
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                            />
                            <label>Contraseña</label>
                        </div>

                        <div className="remember-me">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                Recordarme
                            </label>
                        </div>

                        <button type="submit" className="btn-submit" disabled={cargando}>
                            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
                        </button>

                        <div className="login-register">
                            <p>
                                ¿No tienes una cuenta?{' '}
                                <a
                                    href="#register"
                                    className="register-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        switchView(true);
                                    }}
                                >
                                    Regístrate
                                </a>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Formulario 2: Registrarse */}
                <div className="form-box register">
                    <h2>Registrarse</h2>

                    {errorMsg && isRegisterActive && (
                        <div className="auth-alert error">{errorMsg}</div>
                    )}
                    {successMsg && isRegisterActive && (
                        <div className="auth-alert success">{successMsg}</div>
                    )}

                    <form onSubmit={handleRegisterSubmit} noValidate>
                        <div className={`input-box ${regUsername ? 'has-value' : ''}`}>
                            <span className="icon">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                required
                                placeholder=" "
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                            />
                            <label>Usuario</label>
                        </div>

                        <div className={`input-box ${regEmail ? 'has-value' : ''}`}>
                            <span className="icon">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                required
                                placeholder=" "
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                            />
                            <label>Correo Electrónico</label>
                        </div>

                        <div className={`input-box ${regPassword ? 'has-value' : ''}`}>
                            <button
                                type="button"
                                className="icon btn-toggle-password"
                                onClick={() => setShowRegPassword((prev) => !prev)}
                                aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showRegPassword ? (
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                            <input
                                type={showRegPassword ? 'text' : 'password'}
                                required
                                placeholder=" "
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                            <label>Contraseña</label>
                        </div>

                        <button type="submit" className="btn-submit" disabled={cargando}>
                            {cargando ? 'Registrando...' : 'Registrarse'}
                        </button>

                        <div className="login-register">
                            <p>
                                ¿Ya tienes una cuenta?{' '}
                                <a
                                    href="#login"
                                    className="login-link"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        switchView(false);
                                    }}
                                >
                                    Inicia Sesión
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Botón flotante para reabrir la tarjeta en caso de cerrarla con 'X' */}
            {!isOpen && (
                <button
                    type="button"
                    className="btn-reopen"
                    onClick={() => setIsOpen(true)}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    Iniciar Sesión / Registrarse
                </button>
            )}
        </div>
    );
};

export default AuthPage;
