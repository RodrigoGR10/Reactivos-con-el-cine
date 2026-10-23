# Entorno de desarrollo con Nix y direnv

Este proyecto usa **Nix** para fijar la versión de PostgreSQL (la versión exacta queda en `flake.lock`) y **direnv** para cargar ese entorno automáticamente al entrar a la carpeta del repo. Node no forma parte del entorno de Nix: cada persona usa el que ya tenga instalado.

Sistemas soportados: **macOS** (Intel y Apple Silicon) y **Debian** (y derivados como Ubuntu). En Windows, usa WSL2 con Debian o Ubuntu y sigue los pasos de Debian.

## 1. Instalar Nix

### macOS

Opción recomendada: descarga el instalador gráfico de Determinate Systems desde su sitio web y ábrelo. También puedes usar la terminal:

```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

El instalador pide tu contraseña de administrador.

### Debian

Necesitas `curl` y permisos de `sudo`:

```bash
sudo apt update && sudo apt install -y curl
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

En WSL2 sin systemd, agrega `linux --init none` al final del comando de instalación.

### Verificar

Cierra la terminal, abre una nueva y ejecuta:

```bash
nix --version
```

Este instalador ya activa los flakes. Si instalaste Nix con otro método y aparece un error de "experimental features", agrega esta línea a `~/.config/nix/nix.conf`:

```
experimental-features = nix-command flakes
```

## 2. Instalar direnv y nix-direnv

`nix-direnv` guarda el entorno en caché, así que entrar a la carpeta es instantáneo después de la primera vez. Se instalan con Nix, tanto en macOS como en Debian (en macOS evita problemas con la versión de bash que trae el sistema):

```bash
nix profile add nixpkgs#direnv nixpkgs#nix-direnv
```

Si tu versión de Nix es antigua y `add` no existe, usa `nix profile install` con los mismos argumentos.

Luego conecta nix-direnv con direnv:

```bash
mkdir -p ~/.config/direnv
echo 'source $HOME/.nix-profile/share/nix-direnv/direnvrc' >> ~/.config/direnv/direnvrc
```

## 3. Enganchar direnv a tu shell

macOS usa zsh por defecto; Debian usa bash. Agrega la línea que corresponda:

```bash
# zsh (macOS)
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# bash (Debian)
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
```

Abre una terminal nueva para que tome efecto. Si usas otro shell (fish, etc.), consulta la documentación de direnv.

## 4. Usar el entorno del proyecto

En la raíz del repo deben existir `flake.nix`, `flake.lock` y un `.envrc` con esta línea:

```
use flake
```

Entra a la carpeta y aprueba el `.envrc` una sola vez:

```bash
cd Reactivos-con-el-cine
direnv allow
```

La primera vez descarga PostgreSQL, y puede tardar unos minutos. Después, el entorno se carga solo cada vez que entras a la carpeta y se recarga cuando cambian `flake.nix` o `flake.lock`. El `shellHook` del flake crea la base de datos en `.pgdata/` y arranca el servidor si no está corriendo.

Sin direnv, puedes entrar al mismo entorno a mano con:

```bash
nix develop
```

### Crear la base de datos (solo la primera vez)

```bash
createdb -h localhost -U postgres cine
```

Conexión desde el backend:

```
postgresql://postgres@localhost:5433/cine
```

PostgreSQL queda **sin contraseña** (autenticación `trust`). Es una configuración solo para desarrollo local: el servidor escucha únicamente en `localhost`, pero cualquier programa de tu máquina puede conectarse sin credenciales. No uses esta configuración en un servidor.

### Comandos útiles

```bash
pg_ctl status          # ¿está corriendo?
pg_ctl stop            # apagar PostgreSQL
psql -h localhost -U postgres cine   # entrar a la base
direnv reload          # recargar el entorno
```

Al salir de la carpeta, direnv descarga las variables, pero PostgreSQL sigue corriendo hasta que lo apagues con `pg_ctl stop`.

## 5. Archivos que no se suben al repo

Agrega esto a `.gitignore`:

```
.direnv/
.pgdata/
```

## Problemas frecuentes

| Síntoma                                                        | Causa y solución                                                                                                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `direnv: error .envrc is blocked`                              | Falta aprobarlo: ejecuta `direnv allow`.                                                                                                                                                                  |
| Al entrar a la carpeta no pasa nada                            | El hook no está cargado: revisa el paso 3 y abre una terminal nueva.                                                                                                                                      |
| `flake does not provide attribute devShells.<sistema>.default` | Tu sistema no está en la lista de `flake.nix`. Agrégalo (`x86_64-linux`, `aarch64-linux`, `x86_64-darwin`, `aarch64-darwin`).                                                                             |
| Nix dice que no encuentra `flake.nix` o archivos nuevos        | Los flakes solo ven archivos que Git conoce: ejecuta `git add flake.nix flake.lock`.                                                                                                                      |
| PostgreSQL no arranca                                          | Revisa `.pgdata/log`. Lo más común es que otro PostgreSQL ya use el puerto 5432: detenlo o cambia el puerto.                                                                                              |
| Postgres pide contraseña                                       | `.pgdata/` se creó antes con otra configuración de autenticación. Bórrala (`pg_ctl stop && rm -rf .pgdata`, se pierden los datos locales) y vuelve a entrar a la carpeta para que se cree sin contraseña. |
| Errores de `nix-direnv` en macOS sobre `local -n`              | Estás usando una versión antigua de bash. Verifica que `direnv` venga de Nix (`which direnv` debe apuntar a `~/.nix-profile`).                                                                            |

## Desinstalar Nix

```bash
/nix/nix-installer uninstall
```
