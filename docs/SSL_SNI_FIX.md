# Naprawa błędu SSL SNI (tlsv1 unrecognized name)

## Problem
```
curl: (35) OpenSSL/3.0.13: error:0A000458:SSL routines::tlsv1 unrecognized name
```

Ten błąd występuje gdy serwer SSL nie rozpoznaje nazwy hosta (SNI).

## Rozwiązania

### 1. Nginx Proxy Manager - Sprawdź konfigurację

1. Zaloguj się do NPM
2. Sprawdź czy masz Proxy Host dla `guardant.me` (bez wildcard)
3. Upewnij się że:
   - Domain Names zawiera dokładnie: `guardant.me`
   - SSL Certificate jest włączony
   - Force SSL jest włączone

### 2. Dodaj default_server w NPM

W **Custom Nginx Configuration** dodaj:

```nginx
# Default SSL server
server {
    listen 443 ssl http2 default_server;
    server_name _;
    
    # Use the guardant.me certificate as default
    ssl_certificate /data/nginx/ssl/npm-1/fullchain.pem;
    ssl_certificate_key /data/nginx/ssl/npm-1/privkey.pem;
    
    return 444;
}
```

### 3. Alternatywa - Custom location dla /install

W Proxy Host dla `guardant.me` dodaj **Custom Location**:

```
Location: /install
Scheme: http
Forward Hostname/IP: guardant-public-api
Forward Port: 4001
```

### 4. Sprawdź certyfikat

```bash
# Sprawdź czy certyfikat jest poprawny
openssl s_client -connect guardant.me:443 -servername guardant.me < /dev/null 2>/dev/null | openssl x509 -text | grep -E "Subject:|DNS:"

# Test z różnymi wersjami TLS
curl -v --tlsv1.2 https://guardant.me/install
curl -v --tlsv1.3 https://guardant.me/install
```

### 5. Tymczasowe obejście

Jeśli potrzebujesz szybko zainstalować:

```bash
# Opcja 1: Użyj --insecure (tylko do testów!)
curl -sSL --insecure https://guardant.me/install | bash

# Opcja 2: Użyj IP zamiast domeny
curl -sSL http://YOUR_SERVER_IP:8080/install | bash

# Opcja 3: Pobierz lokalnie i uruchom
wget --no-check-certificate https://guardant.me/install -O install.sh
bash install.sh
```

### 6. Nginx Proxy Manager - Pełna konfiguracja

Upewnij się że masz te 2 proxy hosts:

#### A. Główna domena
- Domain Names: `guardant.me`, `www.guardant.me`
- Forward to: `guardant-nginx:80`
- SSL: Let's Encrypt
- Force SSL: ON

#### B. Wildcard subdomeny
- Domain Names: `*.guardant.me`
- Forward to: `guardant-nginx:80`
- SSL: Let's Encrypt (z DNS challenge)
- Force SSL: ON

### 7. Debug w NPM

1. Sprawdź logi:
```bash
docker logs nginx-proxy-manager
```

2. Sprawdź konfigurację nginx wewnątrz NPM:
```bash
docker exec nginx-proxy-manager cat /etc/nginx/conf.d/default.conf
```

3. Sprawdź certyfikaty:
```bash
docker exec nginx-proxy-manager ls -la /data/nginx/ssl/
```

### 8. Restart NPM

```bash
docker restart nginx-proxy-manager
```

## Długoterminowe rozwiązanie

Dodaj do docker-compose.yml dla guardant-nginx:

```yaml
environment:
  - NGINX_HOST=guardant.me
  - NGINX_PORT=80
```

I upewnij się że nginx default.conf ma:

```nginx
server {
    listen 80 default_server;
    server_name guardant.me _;
    
    location /install {
        proxy_pass http://guardant-public-api:4001/install;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```