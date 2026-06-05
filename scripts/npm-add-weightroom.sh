#!/usr/bin/env bash
# Add weightroom.360web.cloud proxy host to Nginx Proxy Manager (SQLite).
# Run on VPS with sudo access to /data/nginx/database.sqlite
set -euo pipefail

DB="${NPM_DB:-/data/nginx/database.sqlite}"
NOW=$(date "+%Y-%m-%d %H:%M:%S")

EXIST=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%weightroom.360web.cloud%' AND is_deleted=0 LIMIT 1;" || true)
if [ -n "$EXIST" ]; then
  echo "Proxy host already exists: id=$EXIST"
  sudo sqlite3 "$DB" "SELECT id, domain_names, forward_host, forward_port, certificate_id, ssl_forced FROM proxy_host WHERE id=$EXIST;"
  exit 0
fi

sudo sqlite3 "$DB" <<SQL
INSERT INTO certificate (created_on, modified_on, owner_user_id, is_deleted, provider, nice_name, domain_names, expires_on, meta)
VALUES ('$NOW', '$NOW', 1, 0, 'letsencrypt', 'weightroom.360web.cloud', '["weightroom.360web.cloud"]', '2099-01-01 00:00:00', '{}');
SQL

CERT_ID=$(sudo sqlite3 "$DB" "SELECT id FROM certificate WHERE nice_name='weightroom.360web.cloud' ORDER BY id DESC LIMIT 1;")
echo "Created certificate id=$CERT_ID"

sudo sqlite3 "$DB" <<SQL
INSERT INTO proxy_host (
  created_on, modified_on, owner_user_id, is_deleted, domain_names,
  forward_host, forward_port, access_list_id, certificate_id, ssl_forced,
  caching_enabled, block_exploits, advanced_config, meta,
  allow_websocket_upgrade, http2_support, forward_scheme, enabled,
  locations, hsts_enabled, hsts_subdomains
) VALUES (
  '$NOW', '$NOW', 1, 0, '["weightroom.360web.cloud"]',
  'weightroom-app', 3000, 0, $CERT_ID, 1,
  0, 0, '', '{"nginx_online":true,"nginx_err":null}',
  1, 0, 'http', 1,
  '[]', 0, 0
);
SQL

HOST_ID=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%weightroom.360web.cloud%' ORDER BY id DESC LIMIT 1;")
echo "Created proxy_host id=$HOST_ID -> weightroom-app:3000"

docker restart nginx-proxy
sleep 8

# NPM sometimes skips regenerating proxy_host/*.conf after direct SQLite inserts.
# Write the vhost if missing so nginx picks it up immediately.
if ! docker exec nginx-proxy test -f /data/nginx/proxy_host/${HOST_ID}.conf; then
  docker exec nginx-proxy sh -c "cat > /data/nginx/proxy_host/${HOST_ID}.conf <<EOF
# ------------------------------------------------------------
# weightroom.360web.cloud
# ------------------------------------------------------------

server {
  set \\\$forward_scheme http;
  set \\\$server         \"weightroom-app\";
  set \\\$port           3000;

  listen 80;
  listen [::]:80;

  server_name weightroom.360web.cloud;

  access_log /data/logs/proxy-host-${HOST_ID}_access.log proxy;
  error_log /data/logs/proxy-host-${HOST_ID}_error.log warn;

  location / {
    include conf.d/include/proxy.conf;
  }

  include /data/nginx/custom/server_proxy[.]conf;
}
EOF
nginx -s reload"
  echo "Wrote /data/nginx/proxy_host/${HOST_ID}.conf and reloaded nginx"
fi

echo "NPM restarted"

sudo sqlite3 "$DB" "SELECT id, domain_names, forward_host, forward_port, certificate_id, ssl_forced, enabled FROM proxy_host WHERE id=$HOST_ID;"
