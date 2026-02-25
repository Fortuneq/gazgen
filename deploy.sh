#!/bin/bash
# Deployment script for GasGen bot to remote server

set -e

echo "=== GasGen Deployment Script ==="

# Configuration
REMOTE_USER="${REMOTE_USER:-gas}"
REMOTE_HOST="${REMOTE_HOST:-gas}"
REMOTE_DIR="${REMOTE_DIR:-~/gasgen}"
PROJECT_NAME="GasGen"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if SSH connection works
echo ""
echo "Checking SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 ${REMOTE_USER}@${REMOTE_HOST} exit 2>/dev/null; then
    print_status "SSH connection successful"
else
    print_error "Cannot connect to ${REMOTE_USER}@${REMOTE_HOST}"
    echo "Please check your SSH configuration"
    exit 1
fi

# Create remote directory
echo ""
echo "Creating remote directory..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"
print_status "Remote directory created: ${REMOTE_DIR}"

# Sync project files (excluding unnecessary files)
echo ""
echo "Syncing project files..."
rsync -avz --progress \
    --exclude '.git' \
    --exclude '.idea' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.DS_Store' \
    --exclude 'venv' \
    --exclude '.venv' \
    --exclude '.env' \
    --exclude 'higgsfield_data_v3' \
    --exclude 'higgsfield_data' \
    --exclude 'chroma_db' \
    ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

print_status "Files synced successfully"

# Transfer v3 data (this may take a while)
echo ""
read -p "Do you want to transfer higgsfield_data_v3 folder? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Transferring higgsfield_data_v3 (this may take a while)..."
    rsync -avz --progress \
        higgsfield_data_v3/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/higgsfield_data_v3/
    print_status "Data transferred successfully"
else
    print_warning "Skipping higgsfield_data_v3 transfer"
fi

# Setup on remote server
echo ""
echo "Setting up environment on remote server..."

ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
set -e

cd ~/gasgen

echo "Checking Python version..."
python3 --version

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "⚠ Please edit .env file with your actual credentials!"
fi

echo "✓ Environment setup completed"
ENDSSH

print_status "Remote environment configured"

# Setup PostgreSQL
echo ""
echo "PostgreSQL setup instructions:"
echo "1. Install PostgreSQL on the remote server if not already installed:"
echo "   sudo apt update && sudo apt install postgresql postgresql-contrib"
echo ""
echo "2. Install pgvector extension:"
echo "   sudo apt install postgresql-server-dev-all"
echo "   cd /tmp && git clone https://github.com/pgvector/pgvector.git"
echo "   cd pgvector && make && sudo make install"
echo ""
echo "3. Create database and user:"
echo "   sudo -u postgres psql -c \"CREATE DATABASE gasgen;\""
echo "   sudo -u postgres psql -c \"CREATE USER gasgen_user WITH PASSWORD 'your_password';\""
echo "   sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE gasgen TO gasgen_user;\""
echo ""
echo "4. Enable pgvector:"
echo "   sudo -u postgres psql gasgen -c \"CREATE EXTENSION vector;\""
echo ""

read -p "Do you want to run these PostgreSQL setup commands now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
        # Install PostgreSQL
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib postgresql-server-dev-all build-essential git

        # Install pgvector
        cd /tmp
        if [ -d "pgvector" ]; then
            rm -rf pgvector
        fi
        git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
        cd pgvector
        make
        sudo make install

        # Setup database
        sudo -u postgres psql << EOF
CREATE DATABASE gasgen;
CREATE USER gasgen_user WITH PASSWORD 'gasgen_password_change_me';
GRANT ALL PRIVILEGES ON DATABASE gasgen TO gasgen_user;
\c gasgen
CREATE EXTENSION vector;
EOF

        echo "✓ PostgreSQL setup completed"
        echo "⚠ Please change the default password in .env file!"
ENDSSH
    print_status "PostgreSQL configured"
else
    print_warning "Skipping PostgreSQL setup. You'll need to configure it manually."
fi

# Migration
echo ""
read -p "Do you want to run the migration script now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migration script..."
    ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
        cd ~/gasgen
        source .venv/bin/activate
        python migrate_to_db.py
ENDSSH
    print_status "Migration completed"
else
    print_warning "Skipping migration. Run 'python migrate_to_db.py' manually when ready."
fi

# Systemd service setup
echo ""
read -p "Do you want to create a systemd service for the bot? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating systemd service..."

    ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
        cat > /tmp/gasgen-bot.service << EOF
[Unit]
Description=GasGen Telegram Bot
After=network.target postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$HOME/gasgen
Environment="PATH=$HOME/gasgen/.venv/bin"
ExecStart=$HOME/gasgen/.venv/bin/python $HOME/gasgen/bot/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        sudo mv /tmp/gasgen-bot.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable gasgen-bot

        echo "Systemd service created. Start it with:"
        echo "  sudo systemctl start gasgen-bot"
        echo "  sudo systemctl status gasgen-bot"
ENDSSH
    print_status "Systemd service configured"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
print_status "Project deployed to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual credentials:"
echo "   ssh ${REMOTE_USER}@${REMOTE_HOST}"
echo "   cd ${REMOTE_DIR}"
echo "   nano .env"
echo ""
echo "2. If you haven't run migration, run it now:"
echo "   source .venv/bin/activate"
echo "   python migrate_to_db.py"
echo ""
echo "3. Start the bot:"
echo "   sudo systemctl start gasgen-bot"
echo "   sudo systemctl status gasgen-bot"
echo ""
echo "4. View logs:"
echo "   sudo journalctl -u gasgen-bot -f"
echo ""
