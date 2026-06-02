#!/bin/sh
set -e

echo "Applying pending migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting iVOD API (production)..."
exec node dist/main
