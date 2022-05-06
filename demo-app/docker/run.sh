#!/bin/ash
set -e

yarn prisma db push
yarn start:prod
