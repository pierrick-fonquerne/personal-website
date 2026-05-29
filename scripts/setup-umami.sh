#!/usr/bin/env bash
# Setup script for self-hosted Umami Analytics on Debian 13
# Run once on the VPS: bash /tmp/setup-umami.sh
# Requirements: sudo access, DNS record analytics.pierrick.fonquerne.com -> this server

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Guards ────────────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Run as root: sudo bash $0"
command -v openssl >/dev/null || die "openssl is required"

DOMAIN="analytics.pierrick.fonquerne.com"
UMAMI_DIR="/opt/umami"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

echo ""
echo "=================================================="
echo " Umami Analytics - VPS Setup"
echo " Target: ${DOMAIN}"
echo "=================================================="
echo ""

# ── Step 1: Install Docker ────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  success "Docker already installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
else
  info "Installing Docker from official repository..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  usermod -aG docker debian || true
  systemctl enable --now docker
  success "Docker installed"
fi

# ── Step 2: Create /opt/umami ─────────────────────────────────────────────────
info "Setting up ${UMAMI_DIR}..."
mkdir -p "${UMAMI_DIR}"

if [[ -f "${UMAMI_DIR}/.env" ]]; then
  warn ".env already exists — skipping secret generation (existing secrets preserved)"
else
  APP_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 24)

  cat > "${UMAMI_DIR}/.env" <<EOF
DATABASE_URL=postgresql://umami:${DB_PASSWORD}@db:5432/umami
APP_SECRET=${APP_SECRET}
DB_PASSWORD=${DB_PASSWORD}
EOF
  chmod 600 "${UMAMI_DIR}/.env"
  success ".env generated with fresh secrets"
fi

# Load vars for docker-compose
set -a; source "${UMAMI_DIR}/.env"; set +a

cat > "${UMAMI_DIR}/docker-compose.yml" <<'EOF'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      APP_SECRET: ${APP_SECRET}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - umami-db:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami -d umami"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  internal:
    internal: true

volumes:
  umami-db:
EOF

success "docker-compose.yml written"

# ── Step 3: Start Umami ───────────────────────────────────────────────────────
info "Starting Umami (docker compose up -d)..."
cd "${UMAMI_DIR}"
docker compose up -d
success "Umami running on 127.0.0.1:3000"

# ── Step 4: Nginx vhost ───────────────────────────────────────────────────────
if [[ -f "${NGINX_CONF}" ]]; then
  warn "Nginx vhost already exists at ${NGINX_CONF} — skipping"
else
  info "Creating Nginx vhost for ${DOMAIN}..."
  cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
EOF
  ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  success "Nginx vhost created and reloaded"
fi

# ── Step 5: SSL via certbot ───────────────────────────────────────────────────
if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
  success "SSL certificate already exists for ${DOMAIN}"
else
  info "Requesting Let's Encrypt certificate for ${DOMAIN}..."
  warn "Make sure the DNS A record ${DOMAIN} -> $(curl -s ifconfig.me) is live before continuing."
  read -r -p "Press Enter when DNS is ready, or Ctrl+C to abort..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
    --email contact@pierrickfonquerne.com --redirect
  success "SSL certificate obtained"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
success "Setup complete!"
echo ""
echo "  Umami UI: https://${DOMAIN}"
echo "  Default credentials: admin / umami"
echo ""
echo "  Next steps:"
echo "  1. Log in and CHANGE the admin password immediately"
echo "  2. Go to Settings > Websites > Add website"
echo "  3. Copy the website-id (UUID)"
echo "  4. Add to .env.production in the site repo:"
echo "       PUBLIC_UMAMI_WEBSITE_ID=<uuid>"
echo "       PUBLIC_UMAMI_URL=https://${DOMAIN}"
echo "  5. Redeploy the site: .\\scripts\\deploy.ps1"
echo "=================================================="
echo ""
