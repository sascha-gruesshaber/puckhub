# PuckHub Deployment Guide

This guide covers deploying PuckHub in various environments.

## 📦 Docker Images

PuckHub Docker images are automatically built and published to GitHub Container Registry on every release.

**Registry:** `ghcr.io/sascha-gruesshaber/puckhub`

Available tags:
- `latest` - Latest stable release
- `v1.0.0` - Specific version
- `main-abc1234` - Latest commit from main branch

## 🚀 Quick Start with Docker Compose

### 1. Download Production Compose File

```bash
wget https://raw.githubusercontent.com/sascha-gruesshaber/puckhub/main/docker-compose.prod.yml
```

### 2. Create Environment File

```bash
cat > .env << EOF
# Database
POSTGRES_DB=puckhub
POSTGRES_USER=puckhub
POSTGRES_PASSWORD=your_secure_password_here

# Auth (generate with: openssl rand -base64 32)
AUTH_SECRET=your_auth_secret_here
AUTH_URL=https://your-domain.com

# Auto-migration
AUTO_MIGRATE=true

# API Port
API_PORT=3001

# Trusted Origins (comma-separated)
TRUSTED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
EOF
```

### 3. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Access PuckHub

- API: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

### 5. Complete Setup

Navigate to `http://localhost:3001` and follow the setup wizard to:
1. Configure your league name and settings
2. Create your admin account
3. Set up your first season

## 🔧 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/puckhub` |
| `AUTH_SECRET` | Secret for session signing | Generate with `openssl rand -base64 32` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_URL` | `http://localhost:3001` | Base URL for auth callbacks |
| `API_PORT` | `3001` | API server port |
| `AUTO_MIGRATE` | `true` | Auto-run DB migrations on startup |
| `UPLOAD_DIR` | `./uploads` | Upload directory path |
| `TRUSTED_ORIGINS` | `http://localhost:3000` | CORS allowed origins (comma-separated) |

## 🏢 Production Deployment Options

### Option 1: Docker on VPS (Recommended)

**Cost:** €5-20/month (Hetzner, DigitalOcean, Linode)

1. Rent a VPS (2GB RAM minimum)
2. Install Docker and Docker Compose
3. Follow Quick Start guide above
4. Set up reverse proxy (Caddy/Nginx) for HTTPS
5. Configure domain DNS

**Example with Caddy:**

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
cat > /etc/caddy/Caddyfile << EOF
your-domain.com {
    reverse_proxy localhost:3001
}
EOF

# Restart Caddy
sudo systemctl restart caddy
```

### Option 2: Cloud Platforms

#### Hetzner Cloud (Germany)

```bash
# Create server
hcloud server create --name puckhub --type cx21 --image ubuntu-22.04

# SSH and deploy
ssh root@<server-ip>
curl -fsSL https://get.docker.com | sh
# ... follow Quick Start
```

Cost: ~€5/month for CX21 (2 vCPU, 4GB RAM)

#### DigitalOcean

Use Docker Droplet, follow Quick Start.
Cost: $12/month for 2GB droplet

#### Railway.app

1. Connect GitHub repository
2. Add PostgreSQL addon
3. Deploy API service
4. Set environment variables

Cost: Pay-as-you-go, ~$5-15/month

### Option 3: Self-Hosted

Run on your own hardware (home server, NAS, etc.).

**Requirements:**
- x86_64 or ARM64 processor
- 2GB+ RAM
- 10GB+ storage
- Docker installed

## 🔐 Security Checklist

### Before Going to Production

- [ ] Generate strong `AUTH_SECRET` (32+ characters)
- [ ] Use strong database password
- [ ] Enable HTTPS (use Caddy or Certbot)
- [ ] Set proper `TRUSTED_ORIGINS`
- [ ] Configure firewall (allow only 80, 443, SSH)
- [ ] Set up automated backups (database + uploads)
- [ ] Configure monitoring (Uptime Kuma, etc.)
- [ ] Review license compliance

### Database Backups

```bash
# Backup
docker exec puckhub-db pg_dump -U puckhub puckhub > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20250213.sql | docker exec -i puckhub-db psql -U puckhub puckhub
```

Automate with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3001/api/health
# Response: {"status":"ok"}
```

### Docker Logs

```bash
# View logs
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api
```

### Resource Usage

```bash
docker stats puckhub-api puckhub-db
```

## 🔄 Updates

### Update to Latest Version

```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Migrations run automatically if AUTO_MIGRATE=true
```

### Update to Specific Version

```bash
# Edit docker-compose.prod.yml
# Change: image: ghcr.io/sascha-gruesshaber/puckhub:latest
# To: image: ghcr.io/sascha-gruesshaber/puckhub:v1.2.0

docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs puckhub-api

# Common issues:
# - DATABASE_URL incorrect
# - Database not ready (wait 30s and retry)
# - Port 3001 already in use
```

### Database Connection Failed

```bash
# Check database is running
docker-compose ps

# Check connection from API container
docker exec puckhub-api ping postgres

# Verify DATABASE_URL format
# postgresql://user:password@postgres:5432/database
```

### Permission Errors (Uploads)

```bash
# Fix upload directory permissions
docker exec puckhub-api chown -R puckhub:nodejs /app/uploads
```

## 💰 Cost Estimates

### Self-Hosting (per month)

| Option | Cost | Notes |
|--------|------|-------|
| Home server | €0 | Electricity ~€2-5/month |
| Hetzner CX21 | €5 | 2 vCPU, 4GB RAM, 40GB SSD |
| DigitalOcean Basic | $12 | 2GB RAM droplet |
| Railway.app | $5-15 | Pay-as-you-go |

### Managed Hosting

Contact for managed hosting options:
📧 sascha@gruesshaber.eu

## 📄 License Compliance

### Self-Hosting (Free)

You may self-host PuckHub for your own organization under the source-available license.

### Commercial Use

Reselling, offering as a service, or using in commercial products requires a commercial license.

**Contact:** sascha@gruesshaber.eu

## 📞 Support

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/sascha-gruesshaber/puckhub/issues)
- **Commercial Licensing**: sascha@gruesshaber.eu

---

**PuckHub** — Professional ice hockey league management system
Copyright © 2025 Sascha Grüßhaber
