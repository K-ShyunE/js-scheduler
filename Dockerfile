FROM node:24.18.0-bookworm-slim

WORKDIR /app

COPY app/package*.json ./
RUN npm ci

COPY app/ ./

EXPOSE 5173

CMD ["npm", "run", "dev:host"]

