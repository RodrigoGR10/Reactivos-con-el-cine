{
  description = "Flake para BDD - Una version de Postgre para todos";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixpkgs-unstable/nixexprs.tar.zst";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-linux" # linux comun
        "x86_64-linux" # linux con ARM (servidores)
        "x86_64-darwin" # Mac con intel
        "aarch64-darwin" # Mac con M1
      ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});

    in
    {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.postgresql ];

          # Esto es lo que se ejecuta cuando ocupan el comando nix use
          # No es muy importante los detalles, solo saber que esta ejecucion
          # pregunta si postgre esta corriendo. Si no esta corriendo lo arranca
          # Aparte de eso, crea la carpeta pgdata si no existe
          shellHook = ''
            export PGDATA=$PWD/.pgdata
            [ -d "$PGDATA" ] || initdb -U postgress --auth=trust >/dev/null
            pg_ctl status >/dev/null || pg_ctl -o "-k $PGDATA" -l $PGDATA/log start
          '';

          #Una cosa a prestar muchisima atencion. NO hacer despliegue por ahora, porque esa BDD no pide contrasenia

        };
      });
    };
}
