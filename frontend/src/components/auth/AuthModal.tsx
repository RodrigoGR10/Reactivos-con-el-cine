import { useState, type SubmitEvent } from "react";
import { Loader, Modal, type MantineTransition } from "@mantine/core";
import { useTimeout } from "@mantine/hooks";
import { useAuth } from "../../context/AuthContext";
import {
  CloseIcon,
  MailIcon,
  PersonIcon,
  EyeIcon,
  EyeOffIcon,
} from "../common/Icons";
import "./AuthModal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "login" | "register";
}

const AUTH_MODAL_TRANSITION: MantineTransition = {
  in: { opacity: 1, transform: "scale(1) translateY(0)" },
  out: { opacity: 0, transform: "scale(0.96) translateY(10px)" },
  transitionProperty: "transform, opacity",
};

export const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}: AuthModalProps) => {
  const { login, register } = useAuth();

  const [isRegisterActive, setIsRegisterActive] = useState(
    initialMode === "register",
  );

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { start: scheduleClose, clear: clearClose } = useTimeout(onClose, 650);

  const handleClose = () => {
    clearClose();
    onClose();
  };

  const switchView = (toRegister: boolean) => {
    clearClose();
    setIsRegisterActive(toRegister);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const resetModalState = () => {
    clearClose();
    setIsRegisterActive(initialMode === "register");
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowLoginPassword(false);
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
  };

  const handleLoginSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (cargando) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = loginEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailTrimmed) {
      setErrorMsg("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMsg("Ingresa un correo electrónico válido.");
      return;
    }
    if (!loginPassword) {
      setErrorMsg("Por favor ingresa tu contraseña.");
      return;
    }

    setCargando(true);
    try {
      await login({ email: emailTrimmed, contrasena: loginPassword });
      if (onSuccess) {
        onSuccess();
        return;
      }
      setSuccessMsg("¡Sesión iniciada con éxito!");
      // Cierra tras breve delay para que el usuario vea el mensaje de éxito
      scheduleClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al iniciar sesión.",
      );
    } finally {
      setCargando(false);
    }
  };

  const handleRegisterSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (cargando) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const usernameTrimmed = regUsername.trim();
    const emailTrimmed = regEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!usernameTrimmed || usernameTrimmed.length < 2) {
      setErrorMsg("El nombre de usuario debe tener al menos 2 caracteres.");
      return;
    }
    if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
      setErrorMsg("Ingresa un correo electrónico válido.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!regConfirmPassword) {
      setErrorMsg("Por favor confirma tu contraseña.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      await register({
        nombre: usernameTrimmed,
        email: emailTrimmed,
        contrasena: regPassword,
        confirmarContrasena: regConfirmPassword,
      });
      if (onSuccess) {
        onSuccess();
        return;
      }
      setSuccessMsg("¡Cuenta creada e iniciada con éxito!");
      scheduleClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al registrar la cuenta.",
      );
    } finally {
      setCargando(false);
    }
  };

  const renderSubmitLabel = (idle: string, loading: string) =>
    cargando ? (
      <>
        <Loader size={16} color="#ffffff" />
        <span>{loading}</span>
      </>
    ) : (
      idle
    );

  return (
    <Modal.Root
      opened={isOpen}
      onClose={handleClose}
      centered
      size={410}
      padding={0}
      zIndex={1200}
      shadow="none"
      transitionProps={{
        transition: AUTH_MODAL_TRANSITION,
        duration: 220,
        exitDuration: 160,
        timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onExitTransitionEnd={resetModalState}
      aria-label="Iniciar Sesión o Registrarse"
    >
      <Modal.Overlay color="#000" backgroundOpacity={0.48} blur={3} />
      <Modal.Content
        radius={20}
        styles={{
          content: {
            background: "transparent",
            border: "none",
            boxShadow: "none",
          },
        }}
      >
        <div className={`auth-modal-wrapper ${isRegisterActive ? "active" : ""}`}>
          <button
            type="button"
            className="auth-icon-close"
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <CloseIcon size={20} />
          </button>

        <div className="auth-form-box login" inert={isRegisterActive}>
          <h2>Iniciar Sesión</h2>

          {errorMsg && !isRegisterActive && (
            <div className="auth-alert error" role="alert">{errorMsg}</div>
          )}
          {successMsg && !isRegisterActive && (
            <div className="auth-alert success">{successMsg}</div>
          )}

          <form onSubmit={handleLoginSubmit} noValidate>
            <div className={`auth-input-box ${loginEmail ? "has-value" : ""}`}>
              <span className="icon">
                <MailIcon size={18} />
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                data-autofocus={!isRegisterActive || undefined}
                required
                placeholder=" "
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="login-email">Correo Electrónico</label>
            </div>

            <div
              className={`auth-input-box ${loginPassword ? "has-value" : ""}`}
            >
              <button
                type="button"
                className="icon auth-btn-toggle-password"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-pressed={showLoginPassword}
                aria-label={
                  showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
                title={
                  showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
              >
                {showLoginPassword ? (
                  <EyeIcon size={19} />
                ) : (
                  <EyeOffIcon size={19} />
                )}
              </button>
              <input
                id="login-password"
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder=" "
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="login-password">Contraseña</label>
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              disabled={cargando}
            >
              {renderSubmitLabel("Iniciar Sesión", "Ingresando...")}
            </button>

            <div className="auth-switch-link">
              <p>
                ¿No tienes una cuenta?{" "}
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

        <div className="auth-form-box register" inert={!isRegisterActive}>
          <h2>Registrarse</h2>

          {errorMsg && isRegisterActive && (
            <div className="auth-alert error" role="alert">{errorMsg}</div>
          )}
          {successMsg && isRegisterActive && (
            <div className="auth-alert success">{successMsg}</div>
          )}

          <form onSubmit={handleRegisterSubmit} noValidate>
            <div className={`auth-input-box ${regUsername ? "has-value" : ""}`}>
              <span className="icon">
                <PersonIcon size={18} />
              </span>
              <input
                id="register-username"
                type="text"
                autoComplete="nickname"
                data-autofocus={isRegisterActive || undefined}
                required
                placeholder=" "
                value={regUsername}
                onChange={(e) => { setRegUsername(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="register-username">Usuario</label>
            </div>

            <div className={`auth-input-box ${regEmail ? "has-value" : ""}`}>
              <span className="icon">
                <MailIcon size={18} />
              </span>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                placeholder=" "
                value={regEmail}
                onChange={(e) => { setRegEmail(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="register-email">Correo Electrónico</label>
            </div>

            <div className={`auth-input-box ${regPassword ? "has-value" : ""}`}>
              <button
                type="button"
                className="icon auth-btn-toggle-password"
                onClick={() => setShowRegPassword((prev) => !prev)}
                aria-pressed={showRegPassword}
                aria-label={
                  showRegPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
                title={
                  showRegPassword ? "Ocultar contraseña" : "Ver contraseña"
                }
              >
                {showRegPassword ? (
                  <EyeIcon size={19} />
                ) : (
                  <EyeOffIcon size={19} />
                )}
              </button>
              <input
                id="register-password"
                type={showRegPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder=" "
                value={regPassword}
                onChange={(e) => { setRegPassword(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="register-password">Contraseña</label>
            </div>

            <div
              className={`auth-input-box ${regConfirmPassword ? "has-value" : ""}`}
            >
              <button
                type="button"
                className="icon auth-btn-toggle-password"
                onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                aria-pressed={showRegConfirmPassword}
                aria-label={
                  showRegConfirmPassword
                    ? "Ocultar confirmación de contraseña"
                    : "Ver confirmación de contraseña"
                }
                title={
                  showRegConfirmPassword
                    ? "Ocultar confirmación de contraseña"
                    : "Ver confirmación de contraseña"
                }
              >
                {showRegConfirmPassword ? (
                  <EyeIcon size={19} />
                ) : (
                  <EyeOffIcon size={19} />
                )}
              </button>
              <input
                id="register-confirm-password"
                type={showRegConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder=" "
                value={regConfirmPassword}
                onChange={(e) => { setRegConfirmPassword(e.target.value); setErrorMsg(null); }}
              />
              <label htmlFor="register-confirm-password">Confirmar Contraseña</label>
            </div>

            <button
              type="submit"
              className="auth-btn-submit"
              disabled={cargando}
            >
              {renderSubmitLabel("Registrarse", "Registrando...")}
            </button>

            <div className="auth-switch-link">
              <p>
                ¿Ya tienes una cuenta?{" "}
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
      </Modal.Content>
    </Modal.Root>
  );
};

export default AuthModal;
