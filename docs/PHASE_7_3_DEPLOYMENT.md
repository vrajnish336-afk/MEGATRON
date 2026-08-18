# MEGATRON — Phase 7.3 Production Deployment Runbook

**Release**: MEGATRON Business OS v1.0.0  
**Target Environment**: Linux VPS / Dedicated Server (Ubuntu 22.04 / 24.04 LTS, Debian 12, or RHEL 9)  
**Architecture**: Docker Compose (Caddy + Node.js 24 + Isolated Private Ollama)  

---

## 1. VPS Host Hardware & System Requirements

- **CPU**: Minimum 4 vCPUs (Recommended: 8 vCPUs for faster local LLM token inference)
- **RAM**: Minimum 8 GB RAM (Recommended: 16 GB for simultaneous `llama3.2` model residency)
- **Disk**: Minimum 40 GB NVMe SSD storage
- **Operating System**: Ubuntu 22.04/24.04 LTS, Debian 12, or Alpine Linux
- **Network Ports**:
  - Inbound Port `80` (HTTP → HTTPS redirect by Caddy)
  - Inbound Port `443` (HTTPS traffic to Caddy)
  - Inbound Port `22` (SSH administrative access)
  - *All other ports (e.g. 5000, 11434) MUST be closed/blocked at host firewall.*

---

## 2. Host Docker Engine & Compose Installation

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install prerequisites
sudo apt install -y curl ca-certificates gnupg lsb-release

# 3. Add official Docker GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Verify installation
docker --version
docker compose version
```

---

## 3. Repository Checkout & Directory Setup

```bash
# Clone the repository
git clone https://github.com/vrajnish336-afk/MEGATRON.git /opt/megatron
cd /opt/megatron

# Ensure correct permissions
sudo chown -R $USER:$USER /opt/megatron
```

---

## 4. Production Environment Configuration

Copy the production environment template and generate a cryptographically secure JWT secret:

```bash
# Copy template
cp deploy/.env.production.example deploy/.env.production

# Generate secure random secret (32+ bytes base64)
SECURE_SECRET=$(openssl rand -base64 32)
sed -i "s|REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_STRING_MIN_32_CHARS|$SECURE_SECRET|g" deploy/.env.production

# Edit configuration to set your real domain
nano deploy/.env.production
```

Ensure `FRONTEND_URL` is set to your production domain (e.g. `https://megatron.yourdomain.com`).

---

## 5. Domain DNS Setup & Caddy Configuration

1. **DNS Record**: In your DNS provider (Cloudflare, Namecheap, Route53, etc.), create an **A Record**:
   - `megatron.yourdomain.com` $\rightarrow$ `YOUR_SERVER_PUBLIC_IP`

2. **Update Caddyfile**:
```bash
# Replace placeholder with your real domain
nano deploy/Caddyfile
# Change 'YOUR_DOMAIN_HERE' to 'megatron.yourdomain.com'
```

---

## 6. Starting the Production Stack

```bash
# Build and launch all 3 containers in detached mode
docker compose -f docker-compose.production.yml up -d --build
```

Verify that all services are running:
```bash
docker compose -f docker-compose.production.yml ps
```

---

## 7. Ollama Model Download & Initialization

Because Ollama runs in a private container, download the required model weights directly into the persistent volume:

```bash
# Download Llama 3.2 model inside the isolated Ollama container
docker exec -it megatron-ollama ollama pull llama3.2:latest

# Verify model presence
docker exec -it megatron-ollama ollama list
```

---

## 8. Health Check Verification

Test the health probe through localhost and public domain:

```bash
# Internal Container Health Probe
docker exec -it megatron-business-os node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>r.json()).then(console.log)"

# Public Domain Health Probe (via Caddy HTTPS)
curl -i https://megatron.yourdomain.com/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "platform": "MEGADRONE Business OS",
  "version": "1.0.0",
  "timestamp": "2026-08-18T..."
}
```

---

## 9. Initial Organization Admin Onboarding

1. Open `https://megatron.yourdomain.com` in your browser.
2. Navigate to `#/register`.
3. Register your primary organization name (e.g. `Acme Operations`), Admin Name, Email, and Password.
4. The system initializes the organization and logs into the **Executive Command Center**.
5. *Note: Zero development mock data is seeded. The database starts with clean, isolated tables.*

---

## 10. Viewing Production Logs & Audits

```bash
# View aggregated stream
docker compose -f docker-compose.production.yml logs -f

# View MEGATRON Application Logs
docker logs -f megatron-business-os

# View Caddy Access Logs
docker logs -f megatron-caddy
```

---

## 11. Database Persistence & Automated Backups

All production database files reside in the named volume `megatron_production_data` mounted at `/app/data/megadrone.sqlite`.

### Automated Daily Backup Script (`/opt/megatron/scripts/backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/megatron"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Safe SQLite online backup via container
docker exec megatron-business-os node -e "
import { db } from './backend/database/db.js';
db.raw.exec(\"VACUUM INTO '/app/data/backup_${TIMESTAMP}.sqlite'\");
"

# Move backup to host backup directory
docker cp megatron-business-os:/app/data/backup_${TIMESTAMP}.sqlite "$BACKUP_DIR/"
docker exec megatron-business-os rm /app/data/backup_${TIMESTAMP}.sqlite

# Remove backups older than 14 days
find "$BACKUP_DIR" -name "*.sqlite" -mtime +14 -delete
echo "[$(date)] Backup completed: $BACKUP_DIR/backup_${TIMESTAMP}.sqlite"
```

Add to host crontab (`sudo crontab -e`):
```cron
0 2 * * * /opt/megatron/scripts/backup.sh >> /var/log/megatron_backup.log 2>&1
```

---

## 12. Application Updates & Rolling Deployments

To deploy new versions with zero data loss:

```bash
cd /opt/megatron

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart application container
docker compose -f docker-compose.production.yml up -d --build megatron-app

# 3. Verify health
curl -s https://megatron.yourdomain.com/api/health
```

---

## 13. Rollback Procedure

If an update fails health checks:

```bash
# 1. Check previous git commit
git log -n 5 --oneline

# 2. Checkout previous known-good commit
git checkout <PREVIOUS_STABLE_COMMIT_HASH>

# 3. Rebuild and restart container
docker compose -f docker-compose.production.yml up -d --build megatron-app
```

---

## 14. Database Disaster Recovery

In case of data corruption or disaster:

```bash
# 1. Stop the application container
docker stop megatron-business-os

# 2. Restore SQLite database snapshot from backup
docker cp /var/backups/megatron/backup_YYYYMMDD_HHMMSS.sqlite megatron-business-os:/app/data/megadrone.sqlite

# 3. Restart application container
docker start megatron-business-os

# 4. Verify health
curl https://megatron.yourdomain.com/api/health
```
