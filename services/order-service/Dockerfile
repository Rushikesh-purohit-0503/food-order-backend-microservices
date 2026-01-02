FROM node:18-alpine

WORKDIR /app

COPY services/order-service/package.json ./package.json
RUN npm install

COPY services/order-service/ .
COPY shared ./shared

CMD ["node", "index.js"]
