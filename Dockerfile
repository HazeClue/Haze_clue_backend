FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN npm install --production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ── Production stage ──────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install production-only deps
COPY package.json bun.lock ./
RUN npm install --production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main"]
