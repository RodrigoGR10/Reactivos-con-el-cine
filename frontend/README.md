# React + TypeScript + Vite

## Pruebas frontend

Desde `frontend/`, con Node.js 24 y pnpm:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm test:watch
```

Vitest reutiliza la configuración de Vite. Las pruebas de componentes usan
jsdom, Testing Library y `user-event`. Cada prueba busca controles por su rol o
etiqueta y verifica el resultado visible de la interacción. Las pruebas
unitarias de lógica pura pueden correr en Node. [Apunte de testing del curso CC5003](https://users.dcc.uchile.cl/~mtoro/cursos/CC5003/apunte/09-testing-frontend.html)

| Etapa | Segmento                     | Comportamientos prioritarios                                                                        |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 1     | Inicio de sesión             | Formulario con correo inválido, inicio exitoso y reintento tras un rechazo. Implementado.           |
| 2     | Cuenta y favoritos           | Registro cubierto. Pendientes restauración de sesión, rutas protegidas y guardado de películas y cines. |
| 3     | Cartelera y cines            | Búsqueda, combinación y limpieza de filtros, resultados vacíos y estados de carga o error.          |
| 4     | Detalle y funciones          | Selección de fecha, agrupación de horarios, precios y butacas con respuestas parciales.             |
| 5     | Destacadas y recomendaciones | Selección de películas con datos controlados y estados del recomendador.                            |

El alcance de `test-frontend` son las pruebas unitarias y de componentes.

Mantén cada suite junto al componente o utilidad que prueba. Separa las
reglas de negocio que necesitan casos de borde de las interacciones del
usuario. En las pruebas de componentes, sustituye la dependencia externa
en el límite más cercano al comportamiento observado. Los formularios de
inicio de sesión y registro sustituyen `useAuth` y conservan los controles reales.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...

            // Remove tseslint.configs.recommended and replace with this
            tseslint.configs.recommendedTypeChecked,
            // Alternatively, use this for stricter rules
            tseslint.configs.strictTypeChecked,
            // Optionally, add this for stylistic rules
            tseslint.configs.stylisticTypeChecked,

            // Other configs...
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
    globalIgnores(["dist"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            // Other configs...
            // Enable lint rules for React
            reactX.configs["recommended-typescript"],
            // Enable lint rules for React DOM
            reactDom.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.node.json", "./tsconfig.app.json"],
                tsconfigRootDir: import.meta.dirname,
            },
            // other options...
        },
    },
]);
```
