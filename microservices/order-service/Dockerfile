FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies (works without a lockfile)
RUN npm install --production --silent

# Copy source code
COPY . .

# Expose port
EXPOSE 8084

# Health check (fails safely if service unavailable)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:8084/health',res=>process.exit(res.statusCode===200?0:1)); req.on('error',()=>process.exit(1));"

# Start application
CMD ["npm", "start"]
