import { useState, useEffect, type SubmitEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CloseIcon, MailIcon, PersonIcon, EyeIcon, EyeOffIcon } from '../common/Icons';
import './AuthModal.css';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
    const { login, register } = useAuth();

    const [isRegisterActive, setIsRegisterActive] = useState(initialMode === 'register');

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    // Cierra con Escape; el bloqueo de scroll se hace vía CSS :has() en AuthModal.css
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const switchView = (toRegister: boolean) => {
        setIsRegisterActive(toRegister);
        setErrorMsg(null);
        setSuccessMsg(null);
    };

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
            // Cierra tras breve delay para que el usuario vea el mensaje de éxito
            setTimeout(() => {
                onClose();
            }, 600);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
        } finally {
            setCargando(false);
        }
    };

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
            setSuccessMsg('¡Cuenta creada e iniciada con éxito!');
            setTimeout(() => {
                onClose();
            }, 700);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Error al registrar la cuenta.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div
            className="auth-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Iniciar Sesión o Registrarse"
        >
            <div className={`auth-modal-wrapper ${isRegisterActive ? 'active' : ''}`}>
                <button
                    type="button"
                    className="auth-icon-close"
                    onClick={onClose}
                    aria-label="Cerrar modal"
                >
                    <CloseIcon size={20} />
                </button>

                <div className="auth-form-box login">
                    <h2>Iniciar Sesión</h2>

                    {errorMsg && !isRegisterActive && (
                        <div className="auth-alert error">{errorMsg}</div>
                    )}
                    {successMsg && !isRegisterActive && (
                        <div className="auth-alert success">{successMsg}</div>
                    )}

                    <form onSubmit={handleLoginSubmit} noValidate>
                        <div className={`auth-input-box ${loginEmail ? 'has-value' : ''}`}>
                            <span className="icon">
                                <MailIcon size={18} />
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

                        <div className={`auth-input-box ${loginPassword ? 'has-value' : ''}`}>
                            <button
                                type="button"
                                className="icon auth-btn-toggle-password"
                                onClick={() => setShowLoginPassword((prev) => !prev)}
                                aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showLoginPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
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

                        <button type="submit" className="auth-btn-submit" disabled={cargando}>
                            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
                        </button>

                        <div className="auth-switch-link">
                            <p>
                                ¿No tienes una cuenta?{' '}
                                <a
                                    href="#register"
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

                <div className="auth-form-box register">
                    <h2>Registrarse</h2>

                    {errorMsg && isRegisterActive && (
                        <div className="auth-alert error">{errorMsg}</div>
                    )}
                    {successMsg && isRegisterActive && (
                        <div className="auth-alert success">{successMsg}</div>
                    )}

                    <form onSubmit={handleRegisterSubmit} noValidate>
                        <div className={`auth-input-box ${regUsername ? 'has-value' : ''}`}>
                            <span className="icon">
                                <PersonIcon size={18} />
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

                        <div className={`auth-input-box ${regEmail ? 'has-value' : ''}`}>
                            <span className="icon">
                                <MailIcon size={18} />
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

                        <div className={`auth-input-box ${regPassword ? 'has-value' : ''}`}>
                            <button
                                type="button"
                                className="icon auth-btn-toggle-password"
                                onClick={() => setShowRegPassword((prev) => !prev)}
                                aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showRegPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
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

                        <button type="submit" className="auth-btn-submit" disabled={cargando}>
                            {cargando ? 'Registrando...' : 'Registrarse'}
                        </button>

                        <div className="auth-switch-link">
                            <p>
                                ¿Ya tienes una cuenta?{' '}
                                <a
                                    href="#login"
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
        </div>
    );
};

export default AuthModal;

