ARG BASE_IMAGE=node:16-alpine

FROM ${BASE_IMAGE} as builder

WORKDIR /app

COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build


FROM ${BASE_IMAGE} as runner

WORKDIR /app

COPY ./docker/run.sh /usr/local/bin/run.sh
COPY ./package.json ./yarn.lock ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
RUN yarn --production=true --frozen-lockfile install && yarn cache clean

ENTRYPOINT []
CMD ["/usr/local/bin/run.sh"]
