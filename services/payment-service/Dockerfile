FROM node:18-alpine

WORKDIR /app

COPY services/payment-service/package.json ./package.json
RUN npm install

COPY services/payment-service/ .
COPY shared ./shared

CMD ["node", "index.js"]
