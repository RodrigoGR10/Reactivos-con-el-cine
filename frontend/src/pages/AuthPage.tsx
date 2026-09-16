import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import type { FormularioErrores } from '../types/auth';
import './AuthPage.css';

type ModoAuth = 'login' | 'registro';

const AuthPage = () => {
    const { login, register } = useAuth();

    // Estado para alternar entre Login y Registro
    const [modo, setModo] = useState<ModoAuth>('login');

    // Estados de los campos controlados del formulario
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');

    // Estados para mensajes de validación, confirmación y carga
    const [errores, setErrores] = useState<FormularioErrores>({});
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    // Valida las reglas del formulario en el frontend antes de enviar
    const validarFormulario = (): boolean => {
        const nuevosErrores: FormularioErrores = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            nuevosErrores.email = 'El correo electrónico es obligatorio.';
        } else if (!emailRegex.test(email.trim())) {
            nuevosErrores.email = 'Ingresa un formato de correo válido.';
        }

        if (!contrasena) {
            nuevosErrores.contrasena = 'La contraseña es obligatoria.';
        } else if (contrasena.length < 6) {
            nuevosErrores.contrasena = 'La contraseña debe tener al menos 6 caracteres.';
        }

        if (modo === 'registro') {
            if (!nombre.trim()) {
                nuevosErrores.nombre = 'El nombre es obligatorio.';
            } else if (nombre.trim().length < 2) {
                nuevosErrores.nombre = 'El nombre debe tener al menos 2 caracteres.';
            }

            if (contrasena !== confirmarContrasena) {
                nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.';
            }
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // Procesa el envío del formulario delegando al AuthContext
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validarFormulario()) return;

        setCargando(true);
        setErrores({});
        setMensajeExito(null);

        try {
            if (modo === 'login') {
                await login({ email, contrasena });
                setMensajeExito('Has iniciado sesión correctamente.');
            } else {
                await register({ nombre, email, contrasena, confirmarContrasena });
                setMensajeExito('Te has registrado correctamente.');
                setContrasena('');
                setConfirmarContrasena('');
            }
        } catch (error) {
            setErrores({
                general: error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
            });
        } finally {
            setCargando(false);
        }
    };

    // Alterna entre pestañas y reinicia estados de feedback
    const cambiarModo = (nuevoModo: ModoAuth) => {
        setModo(nuevoModo);
        setErrores({});
        setMensajeExito(null);
        setConfirmarContrasena('');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>{modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
                    <p className="auth-subtitle">
                        {modo === 'login'
                            ? 'Accede a tu cuenta de Reactivos en el Cine'
                            : 'Únete para consultar funciones y cines'}
                    </p>
                </div>

                {/* Selector de pestañas */}
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={`auth-tab ${modo === 'login' ? 'active' : ''}`}
                        onClick={() => cambiarModo('login')}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        type="button"
                        className={`auth-tab ${modo === 'registro' ? 'active' : ''}`}
                        onClick={() => cambiarModo('registro')}
                    >
                        Registrarse
                    </button>
                </div>

                {/* Feedback de error general */}
                {errores.general && (
                    <div className="auth-alert error">
                        {errores.general}
                    </div>
                )}

                {/* Feedback de confirmación exitosa */}
                {mensajeExito && (
                    <div className="auth-alert success">
                        {mensajeExito}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    {modo === 'registro' && (
                        <div className="form-group">
                            <label htmlFor="nombre">Nombre</label>
                            <input
                                id="nombre"
                                type="text"
                                placeholder="Tu nombre o apodo"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className={errores.nombre ? 'input-error' : ''}
                            />
                            {errores.nombre && <span className="error-text">{errores.nombre}</span>}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="ejemplo@correo.cl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={errores.email ? 'input-error' : ''}
                        />
                        {errores.email && <span className="error-text">{errores.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="contrasena">Contraseña</label>
                        <input
                            id="contrasena"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            className={errores.contrasena ? 'input-error' : ''}
                        />
                        {errores.contrasena && <span className="error-text">{errores.contrasena}</span>}
                    </div>

                    {modo === 'registro' && (
                        <div className="form-group">
                            <label htmlFor="confirmarContrasena">Confirmar Contraseña</label>
                            <input
                                id="confirmarContrasena"
                                type="password"
                                placeholder="Repite tu contraseña"
                                value={confirmarContrasena}
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                className={errores.confirmarContrasena ? 'input-error' : ''}
                            />
                            {errores.confirmarContrasena && (
                                <span className="error-text">{errores.confirmarContrasena}</span>
                            )}
                        </div>
                    )}

                    <button type="submit" className="auth-submit-btn" disabled={cargando}>
                        {cargando
                            ? 'Procesando...'
                            : modo === 'login'
                                ? 'Ingresar'
                                : 'Crear Cuenta'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;
