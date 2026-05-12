# Custom Caddy image with the Caddyfile baked in.
#
# Why not just bind-mount ./Caddyfile? Docker Desktop on Windows + WSL2 has
# a long-standing bug where single-file bind-mounts fail with
# "mkdir /run/desktop/mnt/host/d: file exists" after the mount cache gets
# corrupted (e.g. after sleep/wake or restart). Folder mounts work; single
# files don't. Baking the config into the image avoids the host filesystem
# entirely.
#
# Edit ./Caddyfile → `docker compose --profile proxy up --build` and the
# image is rebuilt with the new config.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
