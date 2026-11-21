import { useState } from "react";
import { Modal, type MantineTransition } from "@mantine/core";
import { useTimeout } from "@mantine/hooks";
import { CloseIcon } from "../common/Icons";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
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

const DELAY_CIERRE_EXITOSO_MS = 650;

export const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}: AuthModalProps) => {
  const [isRegisterActive, setIsRegisterActive] = useState(
    initialMode === "register",
  );
  // Cambiar la clave remonta los formularios y limpia todo su estado al cerrar.
  const [formVersion, setFormVersion] = useState(0);

  const { start: scheduleClose, clear: clearClose } = useTimeout(
    onClose,
    DELAY_CIERRE_EXITOSO_MS,
  );

  const handleClose = () => {
    clearClose();
    onClose();
  };

  const switchView = (toRegister: boolean) => {
    clearClose();
    setIsRegisterActive(toRegister);
  };

  const resetModalState = () => {
    clearClose();
    setIsRegisterActive(initialMode === "register");
    setFormVersion((prev) => prev + 1);
  };

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
        <div
          key={formVersion}
          className={`auth-modal-wrapper ${isRegisterActive ? "active" : ""}`}
        >
          <button
            type="button"
            className="auth-icon-close"
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <CloseIcon size={20} />
          </button>

          <LoginForm
            activo={!isRegisterActive}
            onCloseProgramado={scheduleClose}
            onSwitchView={switchView}
            onSuccess={onSuccess}
          />

          <RegisterForm
            activo={isRegisterActive}
            onCloseProgramado={scheduleClose}
            onSwitchView={switchView}
            onSuccess={onSuccess}
          />
        </div>
      </Modal.Content>
    </Modal.Root>
  );
};

export default AuthModal;
