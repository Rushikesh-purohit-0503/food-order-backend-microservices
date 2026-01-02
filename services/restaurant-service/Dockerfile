FROM node:18-alpine

WORKDIR /app

COPY services/restaurant-service/package.json ./package.json
RUN npm install

COPY services/restaurant-service/ .
COPY shared ./shared

CMD ["node", "index.js"]
