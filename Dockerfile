# Multi-stage Dockerfile for SvelteKit + SQLite app

# 1) Build stage: install deps, init DB, build app
FROM node:22-alpine AS build

# Useful for native modules like better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Initialize SQLite database schema
RUN npm run db:init

# Build the SvelteKit app
RUN npm run build


# 2) Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy app source, dependencies, and build artifacts
# SvelteKit with adapter-auto outputs to .svelte-kit; we keep the whole app directory
COPY --from=build /app .

# App will listen on this port when using `npm run preview`
EXPOSE 4173

# Start the built SvelteKit app
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
