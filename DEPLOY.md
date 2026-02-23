# Deploying Dyad on a Server

This guide explains how to deploy Dyad on a server using Docker. This allows you to host, run, and control your applications from a remote environment.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/dyad-sh/dyad.git
    cd dyad
    ```

2.  **Start the server**:
    ```bash
    docker-compose up -d
    ```

3.  **Access the application**:
    Open your browser and navigate to `http://<server-ip>:3000`.

## Architecture

Dyad typically runs as an Electron desktop app. However, it includes a "Server Mode" which:
- Runs the backend API using Fastify (Node.js).
- Serves the frontend web assets.
- Uses WebSockets for real-time communication.

### Database

Dyad uses an embedded **SQLite** database (`sqlite.db`). In the Docker deployment:
- The database is persisted in the `./data` directory on the host machine.
- This maps to `/app/data` inside the container.
- Configuration is handled via the `DYAD_DATA_DIR` environment variable.

### Application Storage

Applications built with Dyad are stored on the filesystem.
- They are persisted in the `./apps` directory on the host machine.
- This maps to `/app/apps` inside the container.
- Configuration is handled via the `DYAD_APPS_DIR` environment variable.

## Environment Variables

You can configure the deployment by modifying `docker-compose.yml` or setting environment variables:

| Variable | Description | Default (in Docker) |
|----------|-------------|---------------------|
| `DYAD_DATA_DIR` | Path to the directory containing the database. | `/app/data` |
| `DYAD_APPS_DIR` | Path to the directory containing user apps. | `/app/apps` |
| `NODE_ENV` | Node environment. | `production` |

## Security Note

**Dyad Server Mode currently does not implement authentication.**
It is intended for local use or deployment within a secured private network (VPN).
Do **not** expose this server directly to the public internet without an authentication layer (e.g., Nginx with Basic Auth, Cloudflare Tunnel, or a VPN).

## Customizing the Deployment

If you want to change the port or volume locations, edit `docker-compose.yml`:

```yaml
services:
  dyad:
    ports:
      - "8080:3000" # Expose on port 8080 instead
    volumes:
      - /opt/dyad/data:/app/data
      - /opt/dyad/apps:/app/apps
```
