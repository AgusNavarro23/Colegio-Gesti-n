FROM node:24.15-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
COPY prisma ./prisma/ 

RUN npm install

# GENERA EL CLIENTE DE PRISMA (Crucial para que Next.js reconozca la DB)
RUN npx prisma generate

COPY . .

EXPOSE 3000

# Usamos 'dev' para que detecte cambios en tu código de tesis en tiempo real
CMD ["npm", "run", "dev"]