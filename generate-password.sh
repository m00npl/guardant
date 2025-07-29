#!/bin/bash

echo "🔐 Generowanie hasła dla GuardAnt"

# 1. Generuj hash dla Tola2025!
echo -e "\n1. Generowanie hash dla hasła 'Tola2025!':"

cat > /tmp/hash-password.js << 'EOF'
const bcrypt = require('bcryptjs');
const password = 'Tola2025!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('');
console.log('SQL to update:');
console.log(`UPDATE nest_users SET password_hash = '${hash}' WHERE email = 'admin@guardant.me';`);
EOF

docker run --rm -v /tmp/hash-password.js:/hash.js node:alpine sh -c "npm install bcryptjs && node /hash.js"

# 2. Alternatywnie użyj Bun
echo -e "\n2. Generowanie hash używając Bun:"
cat > /tmp/hash-bun.ts << 'EOF'
const password = 'Tola2025!';
const hash = await Bun.password.hash(password);
console.log('Password:', password);
console.log('Bun Hash:', hash);
EOF

docker run --rm -v /tmp/hash-bun.ts:/hash.ts oven/bun:1 bun run /hash.ts