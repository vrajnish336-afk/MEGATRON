FROM node:24-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create persistent data and logs directories
RUN mkdir -p /app/data /app/logs

EXPOSE 5000

CMD ["npm", "start"]
