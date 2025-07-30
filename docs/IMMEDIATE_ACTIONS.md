# GuardAnt - Immediate Action Plan

## 🚀 Deploy w 5 krokach

### 1. Przygotuj serwer (30 min)
```bash
# Na serwerze (Ubuntu/Debian)
sudo apt update
sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

# Clone repo
git clone https://github.com/m00npl/guardant.git
cd guardant

# Create .env
cp .env.example .env
# Edit .env with production values
```

### 2. Skonfiguruj domenę (15 min)
```bash
# DNS Records (w panelu domeny)
A     @          -> YOUR_SERVER_IP
A     www        -> YOUR_SERVER_IP
A     api        -> YOUR_SERVER_IP
CNAME admin      -> @
CNAME status     -> @

# SSL Certificate
sudo certbot --nginx -d guardant.me -d www.guardant.me -d api.guardant.me
```

### 3. Uruchom serwisy (10 min)
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Initialize database
docker-compose exec admin-api bun run migrate
```

### 4. Stwórz pierwszego admina (5 min)
```bash
# Create admin user
docker-compose exec admin-api bun run scripts/create-admin.ts \
  --email admin@guardant.me \
  --password your-secure-password
```

### 5. Testuj worker installation (5 min)
```bash
# From any Linux server
curl -sSL https://guardant.me/install | bash

# Check registration in admin panel
# https://guardant.me/admin (gdy będzie frontend)
```

## 🎨 Quick Frontend (1 dzień)

### Option 1: Static Admin Page (Fastest)
```html
<!-- /frontends/admin/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>GuardAnt Admin</title>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
    <div id="app">
        <h1>GuardAnt Admin</h1>
        <div id="login">
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <button onclick="login()">Login</button>
        </div>
        <div id="dashboard" style="display:none">
            <h2>Worker Registrations</h2>
            <div id="workers"></div>
        </div>
    </div>
    <script>
        const API = '/api/admin';
        let token = localStorage.getItem('token');
        
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const res = await axios.post(`${API}/auth/login`, { email, password });
                token = res.data.token;
                localStorage.setItem('token', token);
                showDashboard();
            } catch (err) {
                alert('Login failed');
            }
        }
        
        async function showDashboard() {
            document.getElementById('login').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            // Load pending workers
            const res = await axios.get(`${API}/workers/registrations/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const workers = res.data.pending;
            document.getElementById('workers').innerHTML = workers.map(w => `
                <div>
                    <h3>${w.workerId}</h3>
                    <p>Owner: ${w.ownerEmail}</p>
                    <p>IP: ${w.ip}</p>
                    <button onclick="approveWorker('${w.workerId}')">Approve</button>
                </div>
            `).join('');
        }
        
        async function approveWorker(workerId) {
            await axios.post(`${API}/workers/registrations/${workerId}/approve`, 
                { region: 'auto' },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            alert('Worker approved!');
            showDashboard();
        }
        
        if (token) showDashboard();
    </script>
</body>
</html>
```

### Option 2: React SPA (Better)
```bash
# Create React app
npx create-react-app guardant-admin
cd guardant-admin

# Install deps
npm install axios react-router-dom

# Build for production
npm run build

# Copy to nginx
cp -r build/* /var/www/guardant-admin/
```

## 📊 Quick Status Page

### Template per Nest
```javascript
// /services/api-public/src/routes/status-page.ts
export async function getStatusPage(nestId: string) {
  const services = await redis.get(`services:${nestId}`);
  const nest = await redis.get(`nest:${nestId}`);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${nest.name} Status</title>
        <style>
            .status-up { color: green; }
            .status-down { color: red; }
        </style>
    </head>
    <body>
        <h1>${nest.name} System Status</h1>
        <div id="services">
            ${services.map(s => `
                <div class="service">
                    <h3>${s.name}</h3>
                    <span class="status-${s.status}">${s.status}</span>
                </div>
            `).join('')}
        </div>
        <script>
            // WebSocket for real-time updates
            const ws = new WebSocket('wss://guardant.me/ws/status/${nestId}');
            ws.onmessage = (event) => {
                const update = JSON.parse(event.data);
                // Update UI
            };
        </script>
    </body>
    </html>
  `;
}
```

## 🔔 Quick Alerts

### Email notifications
```javascript
// /services/scheduler/src/notifications.ts
import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendDownAlert(service: Service) {
  await mailer.sendMail({
    to: service.nest.adminEmail,
    subject: `[Alert] ${service.name} is DOWN`,
    text: `Service ${service.name} is not responding.`
  });
}
```

## 💰 Quick Pricing

### Start Simple
- **Free**: 5 services, 5-minute checks
- **Pro**: $10/mo - 50 services, 1-minute checks
- **Business**: $50/mo - Unlimited services, 30-second checks

### Implement Later
- Stripe integration
- Usage-based billing
- Worker rewards

## 📝 Landing Page Content

```markdown
# GuardAnt.me

## Uptime Monitoring That Scales With You

### Features
- ⚡ Real-time monitoring from multiple regions
- 📊 Beautiful status pages
- 🔔 Instant alerts (Email, SMS, Slack)
- 🌍 Global monitoring network
- 💰 Earn money by running a monitoring node

### Pricing
- Free for 5 services
- Pro from $10/month
- Enterprise - contact us

### Get Started
1. Sign up
2. Add your services
3. Get your status page
4. Sleep better

### For Developers
Run a monitoring node and earn points:
```curl -sSL https://guardant.me/install | bash```
```

## ✅ Checklist na dziś

- [ ] Deploy na serwerze
- [ ] SSL certificate
- [ ] Create admin user
- [ ] Test worker installation
- [ ] Basic admin HTML page
- [ ] Landing page
- [ ] Test full flow

## 🎯 Cel: Working MVP w 24h

1. **Monitoring działa** ✅
2. **Workers się rejestrują** ✅
3. **Admin może zatwierdzać** (needs UI)
4. **Status page pokazuje status** (needs UI)
5. **Alerts działają** (needs implementation)

Focus: Najprostsze rozwiązania, które działają!