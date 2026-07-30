# syntax=docker/dockerfile:1.7
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Portão de testes do push-to-deploy (scripts/post-receive.sh): substitui o job
# de testes do GitHub Actions, bloqueado no nível da conta. Se a suíte quebra, a
# imagem não é gerada, o `compose up` aborta e o container antigo segue servindo.
# Roda antes do ENV NODE_ENV=production porque precisa das devDependencies; o
# script já força NODE_ENV=test, e src/test/setup.ts tem fallback de DATABASE_URL,
# então não depende do secret app_env.
RUN npm test

ARG NEXT_PUBLIC_SPACES_PIX_QR_URL
ARG NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL
ARG NEXT_PUBLIC_SPACES_BROADCAST_IMAGES_URL
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SPACES_PIX_QR_URL=$NEXT_PUBLIC_SPACES_PIX_QR_URL
ENV NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL=$NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL
ENV NEXT_PUBLIC_SPACES_BROADCAST_IMAGES_URL=$NEXT_PUBLIC_SPACES_BROADCAST_IMAGES_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production

RUN --mount=type=secret,id=app_env,target=/app/.env,required=true \
    npm run build

EXPOSE 3000

CMD ["npm", "start"]
