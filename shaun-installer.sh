#!/bin/bash
# ALX Outreach — Mac Installer (don't tell him)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
BLINK='\033[5m'
NC='\033[0m'
BOLD='\033[1m'

clear

sleep 0.3

echo -e "${RED}${BOLD}"
echo "  ██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗ "
echo "  ██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗"
echo "  ███████║███████║██║     █████╔╝ █████╗  ██║  ██║"
echo "  ██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██║  ██║"
echo "  ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██████╔╝"
echo "  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝ "
echo -e "${NC}"
echo -e "  ${DIM}v4.2.1 — Advanced Persistent Threat Framework${NC}"
echo -e "  ${DIM}Target OS: $(uname -s) $(uname -m)${NC}"
echo ""
sleep 1.2

echo -e "${RED}[!!!]${NC} ${WHITE}Unauthorized access initiated...${NC}"
sleep 0.4
echo -e "${RED}[!!!]${NC} ${WHITE}Bypassing Gatekeeper security...${NC}"
sleep 0.6
echo -e "${RED}[!!!]${NC} ${WHITE}Disabling SIP (System Integrity Protection)...${NC}"
sleep 0.8
echo ""
echo -e "${YELLOW}[*]${NC} Establishing encrypted tunnel to C2 server..."
for i in {1..5}; do
  echo -e "    ${DIM}> relay-$(shuf -i 100-999 -n 1).$(shuf -i 10-99 -n 1).darknet.io ... ${GREEN}OK${NC}"
  sleep 0.25
done
echo ""
sleep 0.4

echo -e "${YELLOW}[*]${NC} Scanning for sensitive data..."
sleep 0.5
echo -e "    ${DIM}~/Library/Application Support/discord/Local Storage/leveldb${NC}"
sleep 0.3
echo -e "    ${GREEN}[+]${NC} Discord token found: ${RED}MTEx$(cat /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c 48)${NC}"
sleep 0.4
echo -e "    ${DIM}~/Library/Application Support/Google/Chrome/Default/Cookies${NC}"
sleep 0.3
echo -e "    ${GREEN}[+]${NC} Chrome session cookies: ${RED}$(shuf -i 200-400 -n 1) entries harvested${NC}"
sleep 0.4
echo -e "    ${DIM}~/.ssh/${NC}"
sleep 0.3
echo -e "    ${GREEN}[+]${NC} SSH private keys: ${RED}id_rsa, id_ed25519${NC}"
sleep 0.4
echo -e "    ${DIM}~/Library/Keychains/${NC}"
sleep 0.3
echo -e "    ${GREEN}[+]${NC} Keychain passwords: ${RED}$(shuf -i 30-80 -n 1) credentials extracted${NC}"
sleep 0.5
echo ""

echo -e "${YELLOW}[*]${NC} Locating crypto wallets..."
sleep 0.4
echo -e "    ${DIM}Scanning for MetaMask, Phantom, Exodus, Coinbase Wallet...${NC}"
sleep 0.6
echo -e "    ${RED}[-]${NC} ${DIM}No wallets found (your loss tbh)${NC}"
echo ""
sleep 0.4

echo -e "${YELLOW}[*]${NC} Uploading harvested data..."
FAKE_BYTES=0
while [ $FAKE_BYTES -lt 94 ]; do
  FAKE_BYTES=$((FAKE_BYTES + RANDOM % 8 + 2))
  [ $FAKE_BYTES -gt 94 ] && FAKE_BYTES=94
  BAR=$(printf '#%.0s' $(seq 1 $((FAKE_BYTES / 4))))
  SPACES=$(printf ' %.0s' $(seq 1 $((24 - FAKE_BYTES / 4))))
  printf "\r    ${DIM}[${NC}${RED}${BAR}${NC}${SPACES}${DIM}]${NC} ${WHITE}%d%%${NC}  " $FAKE_BYTES
  sleep 0.07
done
echo ""
echo -e "    ${GREEN}[+]${NC} Upload complete → ${DIM}hxxps://definitely-not-alex.com/loot${NC}"
echo ""
sleep 0.6

echo -e "${YELLOW}[*]${NC} Installing persistence daemon..."
sleep 0.3
echo -e "    ${DIM}Writing to ~/Library/LaunchAgents/com.apple.system.helper.plist${NC}"
sleep 0.4
echo -e "    ${DIM}Scheduling cron job: */5 * * * * curl -s ...${NC}"
sleep 0.4
echo -e "    ${GREEN}[+]${NC} Persistence established. You're owned forever lmao."
echo ""
sleep 0.8

echo -e "${RED}${BOLD}[!!!] SYSTEM COMPROMISED — UPLOADING EVERYTHING [!!!]${NC}"
echo ""
sleep 1.5

# ─────────────────────────────────────────────────────────────
# ok jk lol — actual install starts here
# ─────────────────────────────────────────────────────────────

clear
sleep 0.3

echo -e "${GREEN}${BOLD}"
echo "  ██████╗  ██████╗ ████████╗ ██████╗██╗  ██╗ █████╗ "
echo "  ██╔════╝ ██╔═══██╗╚══██╔══╝██╔════╝██║  ██║██╔══██╗"
echo "  ██║  ███╗██║   ██║   ██║   ██║     ███████║███████║"
echo "  ██║   ██║██║   ██║   ██║   ██║     ██╔══██║██╔══██║"
echo "  ╚██████╔╝╚██████╔╝   ██║   ╚██████╗██║  ██║██║  ██║"
echo "   ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${WHITE}${BOLD}lmaooo gotcha. relax nothing happened.${NC}"
echo -e "  ${DIM}we're just installing ALX Outreach. Alex set this up 😭${NC}"
echo ""
sleep 2

echo -e "${CYAN}[1/4]${NC} Checking dependencies..."
sleep 0.5

if ! command -v brew &>/dev/null; then
  echo -e "      Installing Homebrew (this might take a sec)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
else
  echo -e "      ${GREEN}✓${NC} Homebrew already installed"
fi

NODE_OK=false
if command -v node &>/dev/null; then
  node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" 2>/dev/null && NODE_OK=true
fi

if [ "$NODE_OK" = false ]; then
  echo -e "      Installing Node.js..."
  brew install node@20 --quiet
  export PATH="$(brew --prefix node@20)/bin:$PATH"
else
  echo -e "      ${GREEN}✓${NC} Node.js $(node --version) ready"
fi
echo ""

echo -e "${CYAN}[2/4]${NC} Installing app dependencies..."
npm install --silent 2>&1 | tail -1
echo -e "      ${GREEN}✓${NC} Dependencies installed"
echo ""

echo -e "${CYAN}[3/4]${NC} Building ALX Outreach for macOS..."
echo -e "      ${DIM}(compiling ~2000 modules, this takes 2-3 minutes)${NC}"
npm run build:mac 2>&1 | grep -E "✓|building|error|Error" | head -5
echo ""

DMG=$(find dist -name "*.dmg" 2>/dev/null | head -1)
if [ -z "$DMG" ]; then
  echo -e "${RED}[!]${NC} Build failed — send Alex a screenshot of this window."
  exit 1
fi

echo -e "${CYAN}[4/4]${NC} Installing..."
cp "$DMG" ~/Desktop/
DMG_NAME=$(basename "$DMG")
echo -e "      ${GREEN}✓${NC} Copied to Desktop: ${WHITE}${DMG_NAME}${NC}"
echo ""

echo -e "${GREEN}${BOLD}  ✅ ALX Outreach is on your Desktop!${NC}"
echo ""
echo -e "  ${WHITE}1.${NC} Open Finder → Desktop"
echo -e "  ${WHITE}2.${NC} Double-click ${BOLD}${DMG_NAME}${NC}"
echo -e "  ${WHITE}3.${NC} Drag ALX Outreach into Applications"
echo -e "  ${WHITE}4.${NC} Open it — the setup wizard will guide you through the rest"
echo ""
echo -e "  ${DIM}(and yes Alex is a menace for that intro 😂)${NC}"
echo ""

open ~/Desktop/
