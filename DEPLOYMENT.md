# MEGADRONE Production Deployment Guide

## 1. Production Docker Containerization

MEGADRONE Business OS includes container definitions for containerized production environments.

### Build and Run with Docker Compose:
```bash
docker-compose up -d --build
```

---

## 2. Production Checklist

1. **Secure JWT Secret**: Generate a cryptographically random 64-character secret in `.env`:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```
2. **Reverse Proxy (Nginx / Caddy / Cloudflare)**: Terminate TLS (HTTPS) in front of MEGADRONE.
3. **Database Volume Persistence**: Ensure `./data` directory is mounted to persistent block storage.
4. **Data Privacy Defaults**:
   ```env
   ALLOW_CLOUD_FOR_CONFIDENTIAL=false
   ALLOW_CLOUD_FOR_SENSITIVE=false
   ```
