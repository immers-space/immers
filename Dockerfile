FROM node:16
WORKDIR /usr/src/immers

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:client

EXPOSE 443 80

CMD [ "node", "index.js" ]
