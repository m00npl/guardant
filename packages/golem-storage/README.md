# 📦 GuardAnt Golem L3 Storage Adapter

Adapter do przechowywania danych najemców (nests) na zdecentralizowanej sieci Golem Network L3.

## 🏗️ Architektura

GuardAnt używa hybrydowego podejścia do przechowywania danych:

- **Redis** - szybki cache dla operacji w czasie rzeczywistym
- **Golem L3** - trwałe, zdecentralizowane przechowywanie
- **Memory Fallback** - lokalny fallback gdy Golem nie jest dostępny

## 🚀 Konfiguracja

### Zmienne środowiskowe

```bash
# Golem Network API Key (wymagany w produkcji)
YAGNA_API_KEY=your_yagna_api_key_here

# Opcjonalne konfiguracje
YAGNA_APP_KEY=your_app_key_here
GOLEM_SUBNET_TAG=public
GOLEM_PAYMENT_DRIVER=erc20
GOLEM_PAYMENT_NETWORK=polygon
```

### Instalacja Yagna (wymagana w produkcji)

```bash
# Instalacja Yagna daemon
curl -sSf https://join.golem.network/as-requestor | bash -
yagna service run --enable-data

# Konfiguracja kluczy
yagna app-key create requestor
yagna payment init --sender --network polygon
```

## 📋 Supported Operations

### Nest Operations
- `createNest(nest)` - Utworzenie nowego najemcy
- `getNest(id)` - Pobranie najemcy po ID
- `getNestBySubdomain(subdomain)` - Pobranie po subdomenie
- `getNestByEmail(email)` - Pobranie po emailu
- `updateNest(nest)` - Aktualizacja danych najemcy

### Service Operations
- `createService(service)` - Utworzenie nowego serwisu
- `getService(nestId, serviceId)` - Pobranie serwisu
- `getServicesByNest(nestId)` - Wszystkie serwisy najemcy
- `updateService(service)` - Aktualizacja serwisu
- `deleteService(nestId, serviceId)` - Usunięcie serwisu

### Metrics & Analytics
- `storeMetrics(metrics)` - Zapis metryk
- `getMetrics(nestId, serviceId, period, start, end)` - Pobranie metryk
- `createIncident(incident)` - Zapis incydentu
- `getIncidents(nestId, serviceId?)` - Historia incydentów

### Billing & Audit
- `createBillingRecord(record)` - Zapis płatności
- `getBillingRecords(nestId)` - Historia płatności
- `createAuditLog(log)` - Zapis w audycie
- `getAuditLogs(nestId, start?, end?)` - Logi audytu

## 🔧 Usage Examples

### Basic Setup

```typescript
import { golemStorage } from '@guardant/golem-storage';

// Inicjalizacja (automatyczna przy pierwszym użyciu)
await golemStorage.initialize();

// Tworzenie nowego najemcy
const nest = {
  id: uuidv4(),
  subdomain: 'mycompany',
  name: 'My Company',
  email: 'admin@mycompany.com',
  // ... other properties
};

await golemStorage.createNest(nest);
```

### Advanced Configuration

```typescript
import { GolemStorage } from '@guardant/golem-storage';

const customStorage = new GolemStorage('myapp', {
  yagnaApiKey: process.env.YAGNA_API_KEY,
  subnetTag: 'devnet-beta',
  payment: {
    driver: 'erc20',
    network: 'mumbai', // testnet
  },
});

await customStorage.initialize();
```

## 🛡️ Redundancy & Reliability

System zapewnia wysoką niezawodność poprzez:

1. **Graceful Fallback** - automatyczne przełączenie na pamięć lokalną
2. **Hybrid Storage** - dane w Redis + Golem L3 równocześnie
3. **Error Recovery** - retry logic dla operacji sieciowych
4. **Health Monitoring** - ciągły monitoring połączenia z Golem

## 📊 Monitoring

Storage adapter loguje następujące eventy:

```
✅ Golem L3 storage initialized     - Pomyślna inicjalizacja
⚠️ Failed to initialize Golem L3   - Błąd inicjalizacji (fallback aktywny)
📦 Stored on Golem L3: {key}      - Pomyślny zapis
📦 Nest {id} stored on Golem L3   - Pomyślny zapis najemcy
⚠️ Golem storage failed           - Błąd zapisu (używa fallback)
```

## 🧪 Development & Testing

W środowisku deweloperskim storage używa memory fallback:

```typescript
// Bez kluczy API - używa pamięci lokalnej
const devStorage = new GolemStorage('dev');
await devStorage.initialize(); // Będzie używać memory store
```

## 🔐 Security Best Practices

1. **Przechowuj klucze API bezpiecznie** - używaj Azure Key Vault lub podobnych
2. **Szyfruj wrażliwe dane** - przed zapisem w Golem Network
3. **Regularnie rotuj klucze** - zgodnie z polityką bezpieczeństwa
4. **Monitoruj dostęp** - używaj audit logs dla kontroli

## 📈 Production Checklist

- [ ] Skonfigurowane zmienne środowiskowe
- [ ] Yagna daemon uruchomiony i skonfigurowany  
- [ ] Klucze API zabezpieczone
- [ ] Monitoring i alerty skonfigurowane
- [ ] Backup strategy dla memory fallback
- [ ] Network connectivity do Golem Network potwierdzona

## 🐛 Troubleshooting

### Błąd: "Yagna API key not defined"
```bash
export YAGNA_API_KEY=your_key_here
# lub
yagna app-key create requestor
```

### Błąd: "Failed to connect to Golem Network"
```bash
# Sprawdź status Yagna
yagna status

# Restart jeśli potrzeba
yagna service stop
yagna service run --enable-data
```

### Wysokie opóźnienia
- Sprawdź latencję do węzłów Golem
- Rozważ użycie bliższego subnet tag
- Zoptymalizuj rozmiar zapisywanych danych

## 📚 Resources

- [Golem Network Documentation](https://docs.golem.network/)
- [Yagna Installation Guide](https://handbook.golem.network/requestor-tutorials/flash-tutorial-of-requestor-development)
- [GuardAnt Architecture Overview](../../../ARCHITECTURE.md)