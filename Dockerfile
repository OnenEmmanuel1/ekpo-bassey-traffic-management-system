# JunctionAI Production Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start JunctionAI Server
CMD ["node", "server.js"]
