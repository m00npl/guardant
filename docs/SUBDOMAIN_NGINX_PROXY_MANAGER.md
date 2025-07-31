# Konfiguracja Subdomen w Nginx Proxy Manager

## Przegląd
Nginx Proxy Manager (NPM) ułatwia konfigurację wildcard subdomen z GUI.

## Kroki konfiguracji

### 1. Wildcard SSL Certificate

1. Zaloguj się do Nginx Proxy Manager
2. Idź do **SSL Certificates** → **Add SSL Certificate**
3. Wybierz **Let's Encrypt**
4. W polu **Domain Names** dodaj:
   ```
   guardant.me
   *.guardant.me
   ```
5. Włącz **Use a DNS Challenge**
6. Wybierz swój DNS Provider (np. Cloudflare)
7. Dodaj API credentials dla DNS providera
8. Kliknij **Save**

### 2. Wildcard Proxy Host

1. Idź do **Hosts** → **Proxy Hosts** → **Add Proxy Host**
2. Wypełnij:
   - **Domain Names**: `*.guardant.me`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `guardant-nginx` (lub IP kontenera nginx)
   - **Forward Port**: `80`
   
3. W zakładce **Custom Locations** dodaj:
   ```
   Location: /
   Scheme: http
   Forward Hostname/IP: guardant-nginx
   Forward Port: 80
   ```

4. W zakładce **Advanced** dodaj custom nginx configuration:
   ```nginx
   # Extract subdomain
   if ($host ~* ^([^.]+)\.guardant\.me$) {
       set $subdomain $1;
   }
   
   # Skip www
   if ($subdomain = "www") {
       return 301 https://guardant.me$request_uri;
   }
   
   # Pass subdomain as header
   proxy_set_header X-Subdomain $subdomain;
   proxy_set_header X-Nest-Subdomain $subdomain;
   ```

5. W zakładce **SSL** wybierz wildcard certyfikat utworzony wcześniej

6. Kliknij **Save**

### 3. Konfiguracja dla głównej domeny

1. Utwórz osobny Proxy Host dla `guardant.me` (bez wildcard)
2. Skieruj na ten sam backend
3. Użyj tego samego certyfikatu SSL

### 4. Alternatywa - Używanie Custom Nginx Config

Jeśli potrzebujesz bardziej zaawansowanej konfiguracji, możesz użyć **Custom Nginx Configuration** w NPM:

1. Idź do **Settings** → **Custom Nginx Configuration**
2. Dodaj:

```nginx
# Wildcard subdomains handler
server {
    listen 80;
    listen 443 ssl http2;
    server_name ~^(?<subdomain>.+)\.guardant\.me$;
    
    # SSL managed by NPM
    include /data/nginx/ssl/npm-*.conf;
    
    # Skip certain subdomains
    if ($subdomain ~ ^(www|admin|api)$) {
        return 404;
    }
    
    location / {
        # Status frontend (when ready)
        proxy_pass http://guardant-status-frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Subdomain $subdomain;
        proxy_set_header X-Nest-Subdomain $subdomain;
    }
    
    location /api/status/ {
        proxy_pass http://guardant-public-api:4001/api/status/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Nest-Subdomain $subdomain;
    }
}
```

### 5. Docker Network Configuration

Upewnij się, że NPM jest w tej samej sieci Docker co GuardAnt:

```yaml
# docker-compose.yml dla NPM
services:
  nginx-proxy-manager:
    image: 'jc21/nginx-proxy-manager:latest'
    networks:
      - guardant-network
    # ... reszta konfiguracji

networks:
  guardant-network:
    external: true
```

### 6. Testowanie

1. Sprawdź DNS:
   ```bash
   dig test.guardant.me
   ```

2. Sprawdź certyfikat:
   ```bash
   curl -v https://test.guardant.me 2>&1 | grep "subject:"
   ```

3. Sprawdź nagłówki:
   ```bash
   curl -I https://test.guardant.me
   ```

## Rozwiązywanie problemów

### Problem: Wildcard cert nie działa
- Upewnij się że używasz DNS Challenge
- Sprawdź czy API credentials są poprawne
- Poczekaj 2-3 minuty na propagację DNS

### Problem: Subdomena zwraca 502 Bad Gateway
- Sprawdź czy `guardant-nginx` jest dostępny z NPM
- Upewnij się że są w tej samej sieci Docker
- Sprawdź logi: `docker logs nginx-proxy-manager`

### Problem: Subdomena zwraca 404
- Frontend statusowy nie jest jeszcze utworzony
- Tymczasowo możesz przekierować na główną stronę

## Tymczasowe rozwiązanie

Dopóki frontend statusowy nie jest gotowy, możesz:

1. Przekierować subdomeny na stronę główną z parametrem:
```nginx
return 301 https://guardant.me/status/$subdomain;
```

2. Lub wyświetlić placeholder:
```nginx
location / {
    return 200 '<html><body><h1>Status page for $subdomain coming soon!</h1></body></html>';
    add_header Content-Type text/html;
}
```

## Uwagi

- NPM automatycznie zarządza odnowieniem certyfikatów
- Wildcard cert wymaga DNS Challenge (nie HTTP)
- Pamiętaj o backupie konfiguracji NPM: `/data/nginx/`