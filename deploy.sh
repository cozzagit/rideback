#!/bin/bash
# Deploy RideBack to VPS
# Usage: ssh root@your-vps "bash -s" < deploy.sh
#    OR: copy to VPS and run: bash deploy.sh

set -e

APP_DIR="/opt/rideback"
DOMAIN="rideback.vibecanyon.com"
REPO="https://github.com/cozzagit/rideback.git"

echo "=== RideBack Deploy ==="

# 1. Install deps if missing
command -v docker >/dev/null || { echo "Docker not found. Install docker first."; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null || { echo "Docker Compose not found."; exit 1; }

# 2. Clone or pull
if [ -d "$APP_DIR" ]; then
  echo "Updating repo..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "Cloning repo..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 3. Check .env file
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "=== ATTENZIONE: crea il file .env ==="
  echo "cp .env.example .env && nano .env"
  echo ""
  echo "Parametri richiesti:"
  echo "  DATABASE_URL=postgresql://rideback:PASSWORD@localhost:5432/rideback"
  echo "  NEXTAUTH_SECRET=$(openssl rand -base64 32)"
  echo "  NEXTAUTH_URL=https://$DOMAIN"
  echo "  MAPBOX_ACCESS_TOKEN=pk.xxx"
  echo "  NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx"
  echo ""
  exit 1
fi

# 4. Setup PostgreSQL database (if not exists)
echo "Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='rideback'" | grep -q 1 || {
  sudo -u postgres psql -c "CREATE USER rideback WITH PASSWORD 'rideback2026';"
  sudo -u postgres psql -c "CREATE DATABASE rideback OWNER rideback;"
  echo "Database created. Update DATABASE_URL in .env if needed."
}

# 5. Run migrations
echo "Running migrations..."
source .env
export DATABASE_URL
npm install --prefix "$APP_DIR" 2>/dev/null || true
npx drizzle-kit push --config="$APP_DIR/drizzle.config.ts" 2>/dev/null || {
  # Fallback: apply SQL directly
  echo "Applying migration SQL..."
  PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\(.*\)@.*/\1/') psql "$DATABASE_URL" -f "$APP_DIR/drizzle/0000_complex_the_hood.sql" 2>/dev/null || true
}

# 6. Build and start with Docker
echo "Building Docker image..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 7. Setup Nginx
if [ -f /etc/nginx/sites-available/default ]; then
  echo "Setting up Nginx..."
  cp "$APP_DIR/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"
  ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

  # Get SSL cert if not exists
  if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Getting SSL certificate..."
    # Temp nginx config without SSL for certbot
    cat > "/etc/nginx/sites-available/${DOMAIN}-temp" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { proxy_pass http://127.0.0.1:3100; }
}
NGINX
    ln -sf "/etc/nginx/sites-available/${DOMAIN}-temp" "/etc/nginx/sites-enabled/${DOMAIN}"
    rm -f "/etc/nginx/sites-enabled/${DOMAIN}" 2>/dev/null
    ln -sf "/etc/nginx/sites-available/${DOMAIN}-temp" "/etc/nginx/sites-enabled/${DOMAIN}-temp"
    nginx -t && systemctl reload nginx

    certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos --email admin@vibecanyon.com || {
      echo "Certbot failed. Make sure DNS A record points to this server."
      echo "App is running on http://$DOMAIN (port 80) for now."
      exit 0
    }

    # Now switch to full SSL config
    rm -f "/etc/nginx/sites-enabled/${DOMAIN}-temp" "/etc/nginx/sites-available/${DOMAIN}-temp"
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  fi

  nginx -t && systemctl reload nginx
fi

echo ""
echo "=== Deploy completo! ==="
echo "App: https://$DOMAIN"
echo ""
