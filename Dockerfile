# Use Node.js 22 (LTS)
FROM node:22-slim

# Install system dependencies for native modules (better-sqlite3, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend assets for the server to serve
# The server expects these in out/renderer/main_window
RUN npx vite build -c vite.renderer.config.mts --outDir out/renderer/main_window

# Expose the port the server listens on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "run", "server"]
