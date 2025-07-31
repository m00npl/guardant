#!/bin/bash

# Setup script for GuardAnt aliases

echo "🐜 GuardAnt Alias Setup"
echo "======================"

# Detect the shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo "❌ Unsupported shell. Please use bash or zsh."
    exit 1
fi

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "📍 GuardAnt directory: $SCRIPT_DIR"
echo "🐚 Detected shell: $SHELL_NAME"
echo "📄 Shell config file: $SHELL_RC"

# Check if aliases are already added
if grep -q "guardant-aliases.sh" "$SHELL_RC" 2>/dev/null; then
    echo "⚠️  GuardAnt aliases already configured in $SHELL_RC"
    echo -n "Do you want to update the configuration? (y/n): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 0
    fi
    # Remove old configuration
    sed -i.bak '/guardant-aliases.sh/d' "$SHELL_RC"
fi

# Add source line to shell RC
echo "" >> "$SHELL_RC"
echo "# GuardAnt aliases" >> "$SHELL_RC"
echo "source $SCRIPT_DIR/guardant-aliases.sh" >> "$SHELL_RC"

echo "✅ Added GuardAnt aliases to $SHELL_RC"

# Make scripts executable
chmod +x "$SCRIPT_DIR"/update-containers.sh
chmod +x "$SCRIPT_DIR"/smart-rebuild.sh
echo "✅ Made scripts executable"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start using the aliases, run:"
echo "  source $SHELL_RC"
echo ""
echo "Or restart your terminal."
echo ""
echo "Type 'guardant-help' to see available commands."