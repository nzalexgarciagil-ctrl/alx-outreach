#!/bin/bash
set -e

echo ""
echo "  ALX Outreach — Mac Setup"
echo "  ========================"
echo ""

# Check for Homebrew, install if missing
if ! command -v brew &>/dev/null; then
  echo "  Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
fi

# Check for Node.js 20+
NODE_OK=false
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
  [[ "$NODE_VER" == "ok" ]] && NODE_OK=true
fi

if [ "$NODE_OK" = false ]; then
  echo "  Installing Node.js..."
  brew install node@20
  export PATH="$(brew --prefix node@20)/bin:$PATH"
fi

echo "  Node $(node --version) ready"
echo ""

# Install dependencies
echo "  Installing dependencies..."
npm install --silent

# Build the Mac app
echo "  Building ALX Outreach for macOS (this takes ~2 mins)..."
npm run build:mac 2>&1 | grep -E "building|built|error|Error" || true

# Find the DMG
DMG=$(find dist -name "*.dmg" | head -1)

if [ -z "$DMG" ]; then
  echo ""
  echo "  Build failed — please contact Alex."
  exit 1
fi

# Copy to Desktop and open
cp "$DMG" ~/Desktop/
DMG_NAME=$(basename "$DMG")

echo ""
echo "  ✅ Done! ALX Outreach is on your Desktop."
echo "  Double-click '${DMG_NAME}' to install."
echo ""

open ~/Desktop/
