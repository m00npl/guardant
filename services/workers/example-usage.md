# Intelligent Monitoring - Przykłady użycia

## Konfiguracja serwisu przez użytkownika

### 1. Monitor z najbliższego regionu
```json
{
  "name": "My API",
  "type": "web",
  "target": "https://api.mycompany.com",
  "interval": 30,
  "monitoring": {
    "regions": ["eu-west-1", "eu-central-1", "us-east-1"],
    "strategy": "closest",
    "minRegions": 1,
    "maxRegions": 1
  }
}
```

### 2. Monitor ze wszystkich wybranych regionów
```json
{
  "name": "Global CDN",
  "type": "web", 
  "target": "https://cdn.mycompany.com",
  "interval": 60,
  "monitoring": {
    "regions": ["eu-west-1", "us-east-1", "ap-southeast-1"],
    "strategy": "all-selected",
    "minRegions": 3,
    "maxRegions": 3
  }
}
```

### 3. Redundancja z failover
```json
{
  "name": "Critical Service",
  "type": "web",
  "target": "https://critical.mycompany.com", 
  "interval": 10,
  "monitoring": {
    "regions": ["eu-west-1", "eu-central-1", "us-east-1", "ap-southeast-1"],
    "strategy": "failover",
    "minRegions": 2,
    "maxRegions": 3
  }
}
```

### 4. Round-robin dla równomiernego obciążenia
```json
{
  "name": "Load Balanced API",
  "type": "web",
  "target": "https://lb.mycompany.com",
  "interval": 30,
  "monitoring": {
    "regions": ["eu-west-1", "eu-west-2", "eu-central-1"],
    "strategy": "round-robin",
    "minRegions": 1,
    "maxRegions": 1
  }
}
```

## Dostępne regiony

### Europa
- `eu-west-1` - Frankfurt, Germany 🇩🇪
- `eu-central-1` - Warsaw, Poland 🇵🇱  
- `eu-west-2` - London, UK 🇬🇧

### Ameryka Północna
- `us-east-1` - Ashburn, Virginia 🇺🇸
- `us-west-1` - San Francisco, California 🇺🇸
- `ca-central-1` - Toronto, Canada 🇨🇦

### Azja-Pacyfik
- `ap-southeast-1` - Singapore 🇸🇬
- `ap-northeast-1` - Tokyo, Japan 🇯🇵
- `ap-south-1` - Mumbai, India 🇮🇳
- `ap-southeast-2` - Sydney, Australia 🇦🇺

### Ameryka Południowa
- `sa-east-1` - São Paulo, Brazil 🇧🇷

## Strategie monitorowania

### `closest` - Najbliższy region
- Wybiera region geograficznie najbliższy do monitorowanego serwisu
- Minimalizuje latencję
- Najlepszy do sprawdzania wydajności z perspektywy użytkowników

### `all-selected` - Wszystkie wybrane regiony
- Monitoruje ze wszystkich regionów wskazanych przez użytkownika
- Daje globalny obraz dostępności
- Przydatne dla serwisów CDN i globalnych API

### `round-robin` - Rotacja regionów
- Na zmianę używa różnych regionów
- Równomierne rozłożenie obciążenia
- Oszczędza koszty przy zachowaniu redundancji

### `failover` - Region podstawowy + backup
- Wybiera region podstawowy (najbliższy) + region backup (inny kontynent)
- Zapewnia redundancję przy minimalnych kosztach
- Idealne dla krytycznych serwisów

## Przykłady praktyczne

### E-commerce w Europie
```json
{
  "monitoring": {
    "regions": ["eu-west-1", "eu-central-1", "eu-west-2"],
    "strategy": "all-selected", 
    "minRegions": 2,
    "maxRegions": 3
  }
}
```
→ Monitoruje ze wszystkich europejskich regionów

### Globalny SaaS
```json
{
  "monitoring": {
    "regions": ["eu-west-1", "us-east-1", "ap-southeast-1"],
    "strategy": "round-robin",
    "minRegions": 1,
    "maxRegions": 1  
  }
}
```
→ Rotuje między kontynentami co check

### Krytyczny serwis bankowy
```json
{
  "monitoring": {
    "regions": ["eu-west-1", "eu-central-1", "us-east-1", "ap-southeast-1"],
    "strategy": "failover",
    "minRegions": 2,
    "maxRegions": 4
  }
}
```
→ Europa (primary) + backup z innych kontynentów

### API dla mobile app
```json
{
  "monitoring": {
    "regions": ["eu-west-1", "us-east-1", "ap-southeast-1"],
    "strategy": "closest",
    "minRegions": 1,
    "maxRegions": 2
  }
}
```
→ Najbliższy region + jeden backup

## Inteligentne routing

System automatycznie:

1. **Wykrywa dostępne WorkerAnts** w każdym regionie
2. **Mapuje lokalizacje** WorkerAnt → region monitoring
3. **Wybiera najlepszego WorkerAnt** w regionie (najmniej obciążony)
4. **Respektuje limity** min/max regionów użytkownika
5. **Fallback** gdy preferowany region niedostępny

## Koszty

- **Free tier**: 1 region, strategy `closest`
- **Pro tier**: do 3 regionów, wszystkie strategie  
- **Unlimited**: wszystkie regiony, wszystkie strategie

## Monitoring koordynatora

```bash
# Status regionów
curl /admin/regions

# Aktywne WorkerAnts
curl /admin/worker-ants

# Statystyki routingu
curl /admin/routing-stats
```