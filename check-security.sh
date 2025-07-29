#!/bin/bash

echo "🔒 Sprawdzanie zabezpieczeń systemu"

# 1. SELinux
echo -e "\n1. Status SELinux:"
if command -v getenforce &> /dev/null; then
    getenforce
    sestatus 2>/dev/null | grep -E "(SELinux status|Current mode)" || true
else
    echo "SELinux nie jest zainstalowany"
fi

# 2. AppArmor
echo -e "\n2. Status AppArmor:"
if command -v aa-status &> /dev/null; then
    sudo aa-status --summary 2>/dev/null || echo "AppArmor status niedostępny"
else
    echo "AppArmor nie jest zainstalowany"
fi

# 3. Sprawdź limity systemu
echo -e "\n3. Limity systemu:"
ulimit -a

# 4. Sprawdź Docker daemon logs
echo -e "\n4. Ostatnie logi Docker daemon:"
sudo journalctl -u docker -n 50 | grep -E "(3002|admin-api|error|Error)" | tail -20 || echo "Brak logów"

# 5. Sprawdź czy nie ma konfliktu z innymi usługami
echo -e "\n5. Usługi systemowe na porcie 3002:"
sudo systemctl list-units --type=service --state=running | grep -E "(3002|grafana)" || echo "Brak usług"

# 6. Sprawdź Grafana (często używa 3000-3xxx)
echo -e "\n6. Sprawdzanie Grafana:"
docker ps | grep grafana
docker logs guardant-grafana 2>&1 | grep -E "(3002|port|Port)" | tail -10 || echo "Brak logów Grafana"

# 7. Sprawdź wszystkie porty 3xxx
echo -e "\n7. Wszystkie porty 3000-3099:"
sudo lsof -i -P -n | grep -E ":30[0-9]{2}" | grep LISTEN || echo "Brak portów 30xx"