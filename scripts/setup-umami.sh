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
  warn ".env already exists, skipping secret generation (existing secrets preserved)"
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

# ── Step 3.5: Force-rotate the default admin password ────────────────────────
# Umami ships with a fixed admin/umami account. Left unchanged, this account
# is reachable on the public dashboard. This step logs in with the default
# credentials, and if they still work, immediately rotates the password via
# Umami's own API (self-service change, no direct database write). No secret
# ever touches disk: the generated password lives only in this process'
# memory and is printed once at the very end of the script.
UMAMI_API="http://127.0.0.1:3000/api"
PASSWORD_MARKER="${UMAMI_DIR}/.admin-password-rotated"
NEW_ADMIN_PASSWORD=""

if [[ -f "${PASSWORD_MARKER}" ]]; then
  success "Admin password already rotated by a previous run, skipping"
else
  info "Waiting for the Umami API to become ready..."
  API_READY=0
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "${UMAMI_API}/heartbeat"; then
      API_READY=1
      break
    fi
    sleep 2
  done
  [[ ${API_READY} -eq 1 ]] || die "Umami API did not become ready in time"

  info "Checking whether the default admin credentials are still active..."
  # Payload goes through stdin (--data-binary @-), never as a command-line
  # argument, so the default password never appears in `ps` output.
  LOGIN_RESPONSE=$(printf '{"username":"admin","password":"umami"}' \
    | curl -fsS -X POST "${UMAMI_API}/auth/login" \
        -H "Content-Type: application/json" \
        --data-binary @- || true)

  DEFAULT_TOKEN=$(printf '%s' "${LOGIN_RESPONSE}" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ -z "${DEFAULT_TOKEN}" ]]; then
    warn "Default admin/umami credentials are no longer valid, assuming the password was already customized: skipping rotation"
    touch "${PASSWORD_MARKER}"
    chmod 600 "${PASSWORD_MARKER}"
  else
    ADMIN_ID=$(printf '%s' "${LOGIN_RESPONSE}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    [[ -n "${ADMIN_ID}" ]] || die "Could not parse the admin user id from the login response"

    info "Default credentials still active: rotating the admin password now..."
    NEW_ADMIN_PASSWORD=$(openssl rand -base64 24)

    printf '{"currentPassword":"umami","newPassword":"%s"}' "${NEW_ADMIN_PASSWORD}" \
      | curl -fsS -X POST "${UMAMI_API}/me/password" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ${DEFAULT_TOKEN}" \
          --data-binary @- >/dev/null

    touch "${PASSWORD_MARKER}"
    chmod 600 "${PASSWORD_MARKER}"
    success "Admin password rotated"
  fi
fi

# ── Step 4: Nginx vhost ───────────────────────────────────────────────────────
if [[ -f "${NGINX_CONF}" ]]; then
  warn "Nginx vhost already exists at ${NGINX_CONF}, skipping"
else
  info "Creating Nginx vhost for ${DOMAIN}..."
  cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Force HTTPS for every future visit once TLS is enabled by certbot below.
    # Harmless while served over plain HTTP: browsers ignore HSTS on http://.
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Refuse to be embedded in a frame on another origin (clickjacking guard).
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Stop browsers from guessing content types away from what we declare.
    add_header X-Content-Type-Options "nosniff" always;

    # Only leak the origin (not the full path/query) to other origins.
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CSP scoped to the Umami dashboard's own Next.js frontend: 'unsafe-inline'
    # is required because Umami ships inline <script>/<style> tags without
    # nonces; everything else is restricted to same-origin. data: is allowed
    # for images/fonts only (charts and icon fonts embed as data URIs).
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;

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
echo "  Username: admin"
if [[ -n "${NEW_ADMIN_PASSWORD}" ]]; then
  echo ""
  warn "New admin password (shown ONCE, never stored on disk):"
  echo "    ${NEW_ADMIN_PASSWORD}"
  warn "Save it in a password manager right now, it will not be shown again."
else
  echo "  Admin password: already customized by a previous run (not shown)"
fi
echo ""
echo "  Next steps:"
echo "  1. Go to Settings > Websites > Add website"
echo "  2. Copy the website-id (UUID)"
echo "  3. Add to .env.production in the site repo:"
echo "       PUBLIC_UMAMI_WEBSITE_ID=<uuid>"
echo "       PUBLIC_UMAMI_URL=https://${DOMAIN}"
echo "  4. Redeploy the site: .\\scripts\\deploy.ps1"
echo "=================================================="
echo ""
