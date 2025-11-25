# Force rebuild - port 8000 configuration
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

# Set as environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build application
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Install curl for healthcheck (Alpine doesn't include it by default)
RUN apk add --no-cache curl

# Remove default nginx config to avoid port conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check with curl and longer start period
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]
