FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source files
COPY . .

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "index.js"]
