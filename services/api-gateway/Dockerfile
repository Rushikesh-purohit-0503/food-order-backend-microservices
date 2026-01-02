FROM node:18-alpine

WORKDIR /app

COPY services/api-gateway/package.json ./package.json
RUN npm install

COPY services/api-gateway/ .
COPY shared ./shared

CMD ["node", "index.js"]
