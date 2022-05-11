#!/bin/ash

# we don't want to crash container if db connection cannot be made (for
# purposes of being able to run the demo container without having setup
# persistent storage  / db connections)
yarn prisma db push

set -e

yarn start:prod
