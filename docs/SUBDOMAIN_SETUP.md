# Konfiguracja Subdomen dla Stron Statusowych

## Przegląd

GuardAnt umożliwia każdemu użytkownikowi posiadanie własnej subdomeny (np. `nazwa-firmy.guardant.me`) do wyświetlania publicznej strony statusowej swoich monitorowanych usług.

## ⚠️ UWAGA: Status implementacji

Obecnie brakuje kluczowych komponentów:
1. **Frontend dla stron statusowych** - nie istnieje aplikacja `guardant-status-frontend`
2. **Endpoint API** - `/api/status/page` nie jest zaimplementowany w `api-public`
3. **Docker service** - brak definicji w `docker-compose.yml`

**Te komponenty muszą zostać najpierw utworzone przed konfiguracją subdomen!**

## Wymagania

1. **Wildcard DNS** - Rekord DNS `*.guardant.me` wskazujący na serwer
2. **Wildcard SSL Certificate** - Certyfikat SSL dla `*.guardant.me`
3. **Nginx** - Konfiguracja do obsługi subdomen
4. **Frontend statusowy** - Aplikacja do wyświetlania statusów

## Konfiguracja DNS

### 1. Dodaj wildcard DNS record:
```
*.guardant.me   A   YOUR_SERVER_IP
```

### 2. Alternatywnie użyj CNAME:
```
*.guardant.me   CNAME   guardant.me.
```

## Konfiguracja SSL

### 1. Wygeneruj wildcard certyfikat używając Let's Encrypt:
```bash
certbot certonly --manual --preferred-challenges dns \
  -d "guardant.me" \
  -d "*.guardant.me"
```

### 2. Lub użyj certbot z DNS plugin (np. dla Cloudflare):
```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "guardant.me" \
  -d "*.guardant.me"
```

## Konfiguracja Nginx

### 1. Skopiuj plik konfiguracji subdomen:
```bash
sudo cp nginx/subdomain.conf /etc/nginx/sites-available/guardant-subdomains
sudo ln -s /etc/nginx/sites-available/guardant-subdomains /etc/nginx/sites-enabled/
```

### 2. Lub dodaj do docker-compose.yml w sekcji nginx volumes:
```yaml
nginx:
  volumes:
    - ./nginx/subdomain.conf:/etc/nginx/conf.d/subdomain.conf:ro
```

### 3. Zrestartuj nginx:
```bash
# Dla systemowego nginx
sudo nginx -s reload

# Dla dockera
docker compose restart nginx
```

## Tworzenie Frontend dla Statusów

Obecnie brak dedykowanego frontendu dla stron statusowych. Możesz:

### Opcja 1: Użyć prostego HTML/JS

Utwórz prosty frontend który pobiera dane z API:

```javascript
// Pobierz subdomenę z URL
const subdomain = window.location.hostname.split('.')[0];

// Pobierz dane statusowe
fetch('/api/status/page', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subdomain })
})
.then(res => res.json())
.then(data => {
  // Wyświetl statusy
  displayServices(data.data.services);
});
```

### Opcja 2: Utworzyć React App

```bash
# Utwórz nowy frontend
cd frontends
npx create-react-app status --template typescript
cd status

# Dodaj niezbędne zależności
npm install axios lucide-react
```

### Opcja 3: Użyć istniejącego widgetu

API udostępnia widget JavaScript:
```html
<div data-guardant="subdomena"></div>
<script src="https://guardant.me/api/status/subdomena/widget.js" async></script>
```

## Testowanie

### 1. Dodaj lokalny hosts entry (dla testów):
```bash
echo "127.0.0.1 test.guardant.me" | sudo tee -a /etc/hosts
```

### 2. Sprawdź czy subdomena działa:
```bash
curl -H "Host: test.guardant.me" http://localhost:8080/
```

### 3. Sprawdź API statusów:
```bash
curl -X POST https://test.guardant.me/api/status/page \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "test"}'
```

## Integracja z Aplikacją

### 1. Użytkownik tworzy konto
- Podaje subdomenę podczas rejestracji
- System sprawdza dostępność subdomeny
- Subdomena jest zapisywana w profilu użytkownika

### 2. Konfiguracja statusów
- Użytkownik może wybrać które usługi są publiczne
- Może dostosować wygląd strony statusowej
- Może ustawić custom domain (CNAME)

### 3. Dostęp do strony
- `https://subdomena.guardant.me` - strona statusowa
- `https://subdomena.guardant.me/embed` - wersja do osadzenia
- `https://subdomena.guardant.me/api/status/` - API endpoint

## Przykład Nginx Config dla Custom Domain

Jeśli użytkownik chce używać własnej domeny:

```nginx
server {
    listen 443 ssl http2;
    server_name status.example.com;
    
    # SSL dla custom domain
    ssl_certificate /etc/letsencrypt/live/status.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/status.example.com/privkey.pem;
    
    # Proxy do GuardAnt z odpowiednią subdomeną
    location / {
        proxy_pass http://guardant-nginx;
        proxy_set_header Host example.guardant.me;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Kroki Implementacji (TODO)

### 1. Zaimplementuj endpoint `/api/status/page` w api-public:
```typescript
// services/api-public/src/routes/status.ts
statusRoutes.post('/page', async (c) => {
  const { subdomain } = await c.req.json();
  
  // Pobierz nest ID na podstawie subdomeny
  const nestId = await redisService.get(`nest:subdomain:${subdomain}`);
  if (!nestId) {
    return c.json({ success: false, error: 'Subdomain not found' }, 404);
  }
  
  // Pobierz dane o usługach dla tego nest
  const services = await getPublicServicesForNest(nestId);
  
  return c.json({
    success: true,
    data: {
      subdomain,
      name: nestData.name,
      services: services.map(transformServiceData),
      incidents: [],
      maintenances: []
    }
  });
});
```

### 2. Utwórz frontend dla statusów:
```bash
cd frontends
npx create-react-app status --template typescript
```

### 3. Dodaj do docker-compose.yml:
```yaml
status-frontend:
  build:
    context: ./frontends/status
    dockerfile: Dockerfile
  container_name: guardant-status-frontend
  restart: unless-stopped
  networks:
    - guardant-network
  environment:
    - NODE_ENV=production
    - REACT_APP_API_URL=/api
```

### 4. Zaktualizuj nginx default.conf:
```nginx
# Status page frontend
upstream guardant-status-frontend {
    server status-frontend:80;
}
```

## Troubleshooting

### Problem: Subdomena nie działa
- Sprawdź DNS: `dig test.guardant.me`
- Sprawdź nginx logs: `docker compose logs nginx`
- Sprawdź czy subdomain.conf jest załadowany

### Problem: Certyfikat SSL nie działa
- Sprawdź czy masz wildcard cert: `openssl x509 -in /path/to/cert.pem -text | grep DNS`
- Upewnij się że certyfikat zawiera `*.guardant.me`

### Problem: API zwraca 404
- Sprawdź czy public API działa: `docker compose ps api-public`
- Sprawdź logi: `docker compose logs api-public`
- Upewnij się że subdomena istnieje w bazie

### Problem: Frontend nie istnieje
- Utwórz frontend według instrukcji powyżej
- Lub użyj tymczasowo widgetu JavaScript