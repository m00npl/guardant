import { Hono } from 'hono';

const installRoutes = new Hono();

// Redirect to worker install script
installRoutes.get('/', async (c) => {
  // Return the install script directly
  const installScript = `#!/bin/bash

# GuardAnt Worker Quick Install Script
# Usage: curl -sSL https://guardant.me/install | bash

set -e

INSTALL_DIR=\${INSTALL_DIR:-/opt/guardant-worker}
REGISTRATION_URL=\${REGISTRATION_URL:-https://guardant.me/api/public/workers/register}
REGISTRATION_TOKEN=\${REGISTRATION_TOKEN:-}
OWNER_EMAIL=\${OWNER_EMAIL:-}

echo "🚀 GuardAnt Worker Installer"
echo "==========================="
echo ""

# Detect system and set appropriate install directory
detect_install_location() {
    # Check if running in Docker
    if [ -f /.dockerenv ]; then
        echo "🐳 Detected Docker environment"
        INSTALL_DIR="/app/guardant-worker"
        return 0
    fi
    
    # Check common cloud providers
    if [ -f /etc/cloud/cloud.cfg ]; then
        if grep -q "ubuntu" /etc/os-release 2>/dev/null; then
            echo "☁️  Detected Ubuntu cloud instance"
            INSTALL_DIR="/opt/guardant-worker"
            return 0
        fi
    fi
    
    # Check if running on EC2
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-id >/dev/null 2>&1; then
        echo "🔶 Detected AWS EC2 instance"
        INSTALL_DIR="/opt/guardant-worker"
        return 0
    fi
    
    # Check if running on DigitalOcean
    if [ -f /etc/digitalocean ]; then
        echo "🌊 Detected DigitalOcean droplet"
        INSTALL_DIR="/opt/guardant-worker"
        return 0
    fi
    
    # Check standard Linux systems
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "\$ID" in
            ubuntu|debian)
                echo "🐧 Detected \$PRETTY_NAME"
                INSTALL_DIR="/opt/guardant-worker"
                return 0
                ;;
            centos|rhel|fedora)
                echo "🎩 Detected \$PRETTY_NAME"
                INSTALL_DIR="/opt/guardant-worker"
                return 0
                ;;
        esac
    fi
    
    # Unknown system
    return 1
}

# Only use provided INSTALL_DIR if explicitly set
if [ -z "\${INSTALL_DIR}" ]; then
    if detect_install_location; then
        echo "📍 Using standard location: \$INSTALL_DIR"
    else
        # Unknown system - ask for confirmation
        INSTALL_DIR="/opt/guardant-worker"
        echo "⚠️  Could not detect system type"
        echo "📍 Suggested installation location: \$INSTALL_DIR"
        echo ""
        echo -n "Do you want to proceed with installation in this directory? (y/N): "
        read CONFIRM < /dev/tty
        
        if [[ ! \$CONFIRM =~ ^[Yy]$ ]]; then
            echo ""
            echo "❌ Installation cancelled by user"
            echo ""
            echo "To install in a different location, run:"
            echo "  INSTALL_DIR=/your/path curl -sSL https://guardant.me/install | bash"
            exit 0
        fi
    fi
else
    echo "📍 Using custom location: \$INSTALL_DIR"
fi

echo ""

# Get owner email if not provided
if [ -z "\$OWNER_EMAIL" ]; then
    # Read from /dev/tty to work even when piped
    echo -n "📧 Please enter your email address: "
    read OWNER_EMAIL < /dev/tty
    
    # Basic email validation
    if ! echo "\$OWNER_EMAIL" | grep -qE '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'; then
        echo "❌ Invalid email format"
        exit 1
    fi
fi

echo "Owner email: \$OWNER_EMAIL"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ All prerequisites met"

# Create installation directory
echo "Creating installation directory..."
sudo mkdir -p \$INSTALL_DIR
cd \$INSTALL_DIR

# Clone worker repository
echo "Downloading GuardAnt Worker..."
if [ -d ".git" ]; then
    echo "Updating existing installation..."
    sudo git pull
else
    sudo git clone https://github.com/m00npl/guardant-worker.git .
fi

# Set registration config
echo "Configuring registration..."
sudo tee bootstrap.env > /dev/null <<EOF
REGISTRATION_URL=\$REGISTRATION_URL
REGISTRATION_TOKEN=\$REGISTRATION_TOKEN
OWNER_EMAIL=\$OWNER_EMAIL
EOF

# Run bootstrap
echo "Starting bootstrap process..."
sudo docker run --rm \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    -v \$INSTALL_DIR:/app \\
    -w /app \\
    --env-file bootstrap.env \\
    oven/bun:1 \\
    bun run src/bootstrap.ts

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Admin will receive notification for: \$OWNER_EMAIL"
echo "2. Wait for approval in GuardAnt dashboard"
echo "3. Worker will start automatically once approved"
echo "4. Check logs: cd \$INSTALL_DIR && docker-compose logs -f"
echo ""
echo "Worker location: \$INSTALL_DIR"
echo "Owner email: \$OWNER_EMAIL"
`;

  // Set proper headers for shell script
  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return c.text(installScript);
});

// Short URL for curl command
installRoutes.get('/worker.sh', async (c) => {
  return c.redirect('/install');
});

export { installRoutes };