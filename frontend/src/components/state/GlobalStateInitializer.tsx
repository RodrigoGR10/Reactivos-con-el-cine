import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useFavoritesStore } from "../../stores/favoritesStore";

function SessionInitializer() {
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  return null;
}

function FavoritesInitializer() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const setUser = useFavoritesStore((state) => state.setUser);
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);
  const loginRedirectVersion = useFavoritesStore(
    (state) => state.loginRedirectVersion,
  );

  useEffect(() => {
    setUser(user);
    if (!user) return;

    const controller = new AbortController();
    void loadFavorites(user.id, controller.signal);
    return () => controller.abort();
  }, [user, setUser, loadFavorites]);

  useEffect(() => {
    if (loginRedirectVersion > 0) {
      navigate("/login", { replace: true });
    }
  }, [loginRedirectVersion, navigate]);

  return null;
}

export function GlobalStateInitializer() {
  return (
    <>
      <SessionInitializer />
      <FavoritesInitializer />
    </>
  );
}
