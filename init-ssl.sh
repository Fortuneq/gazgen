#!/bin/bash
# Initial SSL certificate setup for GasGen MiniApp
# Run this once on the server before starting the full stack

set -e

DOMAIN="gasgen.duckdns.org"
EMAIL="${1:-admin@example.com}"

echo "=== GasGen SSL Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Step 1: Create temporary nginx config for HTTP-only (ACME challenge)
mkdir -p nginx/conf.d
cat > nginx/conf.d/default.conf << 'NGINX_TEMP'
server {
    listen 80;
    server_name gasgen.duckdns.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'GasGen SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP

echo "1. Starting nginx for ACME challenge..."
docker compose -f docker-compose-miniapp.yml up -d nginx

echo "2. Requesting certificate from Let's Encrypt..."
docker compose -f docker-compose-miniapp.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

echo "3. Restoring full nginx config with SSL..."
cat > nginx/conf.d/default.conf << 'NGINX_FULL'
server {
    listen 80;
    server_name gasgen.duckdns.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name gasgen.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/gasgen.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gasgen.duckdns.org/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    client_max_body_size 10M;

    location / {
        proxy_pass http://webapp:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
    }
}
NGINX_FULL

echo "4. Restarting all services..."
docker compose -f docker-compose-miniapp.yml down
docker compose -f docker-compose-miniapp.yml up -d

echo ""
echo "=== Done! ==="
echo "MiniApp should be accessible at https://$DOMAIN"
