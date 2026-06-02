#!/bin/sh
set -e

echo "🔧  Generating Prisma client..."
./node_modules/.bin/prisma generate

echo "🗄️   Applying pending migrations..."
./node_modules/.bin/prisma migrate deploy

echo "🧹  Clearing stale TS build cache..."
rm -f tsconfig.build.tsbuildinfo

echo "🎬  Starting iVOD video worker..."
exec npm run dev:worker
