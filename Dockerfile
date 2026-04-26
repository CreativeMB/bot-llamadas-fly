FROM node:20-alpine

WORKDIR /app

# Instalamos dependencias necesarias para compilar paquetes nativos en Linux
RUN apk add --no-cache tzdata

ENV NODE_ENV=production

# Copiamos solo los archivos de dependencias PRIMERO
COPY package*.json ./

# Esto instalará el esbuild de Linux correctamente
RUN npm install
# Creamos la carpeta de sesión y aseguramos permisos
RUN mkdir -p /data/session && chmod -R 777 /data
COPY . .

EXPOSE 3008

# Usamos npx tsx que es más directo
CMD ["npx", "tsx", "src/app.ts"]