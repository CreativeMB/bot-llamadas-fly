FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY . .

EXPOSE 3008

CMD ["npx", "tsx", "src/app.ts"]