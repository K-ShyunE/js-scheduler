FROM node:24.18.0-bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app/package*.json ./
RUN npm ci

COPY app/ ./

EXPOSE 5173

CMD ["npm", "run", "dev:host"]

