# Sawwit Deployment Guide

This guide covers deploying Sawwit to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Setup](#database-setup)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Environment Variables](#environment-variables)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2 GB | 4+ GB |
| Storage | 20 GB | 50+ GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Software Requirements

- **Docker** 20.10+ and Docker Compose 2.0+ (for Docker deployment)
- **Node.js** 18+ and npm (for manual deployment)
- **PostgreSQL** 14+ (can be Docker or managed)
- **Nginx** (for reverse proxy)
- **Certbot** (for SSL certificates)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/mwchase-dev/sawwit.git
cd sawwit
```

### 2. Create Environment Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env

# Docker (if using Docker)
cp .env.docker.example .env
```

### 3. Configure Environment Variables

Edit the `.env` files with production values. See [Environment Variables](#environment-variables) section for details.

---

## Docker Deployment

### Quick Start

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `db` | sawwit-db | 5432 | PostgreSQL database |
| `backend` | sawwit-backend | 3001 | Express API server |
| `frontend` | sawwit-frontend | 80 | Nginx serving React app |

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: sawwit-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-sawwit}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sawwit_password}
      POSTGRES_DB: ${DB_NAME:-sawwit}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-sawwit}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sawwit-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost}
    volumes:
      - uploads_data:/app/uploads
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3001/api}
    container_name: sawwit-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  uploads_data:
```

### Database Migration (Docker)

```bash
# Run migrations inside the backend container
docker-compose exec backend npm run db:migrate

# Seed the database
docker-compose exec backend npm run db:seed
```

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend npm run db:migrate
```

---

## Manual Deployment

### Backend Deployment

#### 1. Install Dependencies

```bash
cd backend
npm ci --production
```

#### 2. Build

```bash
npm run build
```

#### 3. Run Migrations

```bash
npm run db:migrate
npm run db:seed  # First time only
```

#### 4. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name sawwit-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### PM2 Ecosystem File (Optional)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sawwit-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Frontend Deployment

#### 1. Install Dependencies

```bash
cd frontend
npm ci
```

#### 2. Build for Production

```bash
npm run build
```

#### 3. Serve with Nginx

The build output is in `frontend/dist/`. Configure Nginx to serve this directory.

---

## Database Setup

### PostgreSQL Installation (Ubuntu)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE sawwit;
CREATE USER sawwit_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sawwit TO sawwit_user;

# Exit
\q
```

### Configure PostgreSQL for Remote Access (Optional)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/sawwit
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/sawwit/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for long requests
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # File uploads
    location /uploads {
        alias /var/www/sawwit/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Request size limit for uploads
    client_max_body_size 10M;
}
```

### Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/sawwit /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Updated Nginx Configuration (HTTPS)

Certbot will automatically update your Nginx configuration, but here's the full HTTPS config:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # ... rest of configuration
}
```

---

## Environment Variables

### Backend Production Variables

```bash
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sawwit

# JWT (use strong, unique secrets)
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-different-256-bit-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# For S3 storage:
# STORAGE_PROVIDER=s3
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=your-bucket

# Email (optional)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-email.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_SALT_ROUNDS=12
MAX_FILE_SIZE=5242880
```

### Frontend Production Variables

```bash
VITE_API_URL=https://your-domain.com/api
VITE_APP_NAME=Sawwit
VITE_ENABLE_OAUTH=false  # unless configured
```

### Generating Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64
```

---

## Post-Deployment Tasks

### 1. Change Superuser Password

Log in immediately and change the default superuser password.

### 2. Configure OAuth (Optional)

If using OAuth providers:

1. Register your application with each provider
2. Update callback URLs to production domain
3. Add credentials to environment variables
4. Set `VITE_ENABLE_OAUTH=true`

### 3. Configure Email Service

For email verification and notifications:

1. Set up SMTP or use SendGrid/Mailgun
2. Configure email environment variables
3. Test email sending

### 4. Set Up Monitoring

- Configure application logging
- Set up health check monitoring
- Configure alerts for errors

### 5. Security Checklist

- [ ] Changed default superuser password
- [ ] Configured strong JWT secrets
- [ ] Enabled HTTPS with valid certificate
- [ ] Configured firewall (ufw)
- [ ] Disabled direct database access from internet
- [ ] Set up regular backups
- [ ] Configured rate limiting
- [ ] Reviewed CORS settings

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs sawwit-backend

# Monitor processes
pm2 monit

# View status
pm2 status
```

### Application Logs

Logs are output via Morgan middleware. Configure log aggregation as needed:

```bash
# Docker logs
docker-compose logs -f backend

# PM2 logs location
~/.pm2/logs/sawwit-backend-*.log
```

### Health Check

The API provides a health endpoint:

```bash
curl https://your-domain.com/api/health
# Response: {"status":"ok","timestamp":"..."}
```

---

## Backup Strategy

### Database Backup

```bash
# Manual backup
pg_dump -U sawwit_user -d sawwit > backup_$(date +%Y%m%d).sql

# Restore
psql -U sawwit_user -d sawwit < backup_20240101.sql
```

### Automated Backups

```bash
# Create backup script
#!/bin/bash
# /usr/local/bin/sawwit-backup.sh

BACKUP_DIR=/var/backups/sawwit
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -U sawwit_user -d sawwit > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/sawwit/backend/uploads

# Remove backups older than 30 days
find $BACKUP_DIR -mtime +30 -delete
```

```bash
# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/sawwit-backup.sh
```

### File Storage Backup

For local storage:
```bash
rsync -av /path/to/uploads /backup/location/
```

For S3 storage, use S3 versioning and cross-region replication.

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U sawwit_user -d sawwit -h localhost

# Check environment variable
echo $DATABASE_URL
```

#### Backend Won't Start

```bash
# Check logs
pm2 logs sawwit-backend
# or
docker-compose logs backend

# Check port availability
lsof -i :3001
```

#### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check certificate expiration
openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Useful Commands

```bash
# View all running containers
docker ps

# Enter container shell
docker-compose exec backend sh

# Restart services
docker-compose restart

# View resource usage
docker stats

# Check disk space
df -h

# Check memory
free -m
```

---

## Scaling Considerations

For higher traffic:

1. **Database**
   - Use managed PostgreSQL (AWS RDS, DigitalOcean Managed Databases)
   - Set up read replicas

2. **Application**
   - Use PM2 cluster mode
   - Deploy multiple instances behind load balancer

3. **Caching**
   - Add Redis for session store and caching
   - Use CDN for static assets

4. **File Storage**
   - Migrate to S3 or similar object storage
   - Use CloudFront for file delivery

5. **Monitoring**
   - Set up proper APM (Application Performance Monitoring)
   - Use log aggregation service
