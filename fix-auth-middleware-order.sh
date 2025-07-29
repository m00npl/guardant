#!/bin/bash

echo "🔧 Naprawianie kolejności middleware i endpointów"

# Backup current file
cp services/api-admin/src/index.ts services/api-admin/src/index.ts.backup

# Create a script to move endpoints after middleware
cat > move-endpoints.js << 'EOF'
const fs = require('fs');

const content = fs.readFileSync('services/api-admin/src/index.ts', 'utf8');

// Find the start of endpoint definitions
const endpointStart = content.indexOf('// Auth endpoints (public)');
const endpointEnd = content.indexOf('// Initialize storage and start server');

if (endpointStart === -1 || endpointEnd === -1) {
  console.error('Could not find endpoint markers');
  process.exit(1);
}

// Extract endpoints
const endpoints = content.substring(endpointStart, endpointEnd);

// Remove endpoints from original position
let newContent = content.substring(0, endpointStart) + 
                 '\n// Endpoints moved to after middleware initialization\n\n' +
                 content.substring(endpointEnd);

// Find where to insert (after middleware setup)
const insertPoint = newContent.indexOf('// Mount platform admin routes');
if (insertPoint === -1) {
  console.error('Could not find insertion point');
  process.exit(1);
}

// Insert endpoints after middleware
newContent = newContent.substring(0, insertPoint) + 
             '\n    // ===== ENDPOINTS START HERE =====\n' +
             endpoints.split('\n').map(line => '    ' + line).join('\n') + '\n' +
             newContent.substring(insertPoint);

fs.writeFileSync('services/api-admin/src/index.ts', newContent);
console.log('✅ Endpoints moved successfully');
EOF

# Run the script
node move-endpoints.js

echo "✅ Kolejność naprawiona - endpointy będą teraz po middleware"