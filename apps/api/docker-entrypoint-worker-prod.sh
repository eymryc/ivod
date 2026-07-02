#!/bin/sh
set -e

# Les migrations sont appliquées par le service API (depends_on: api healthy)
echo "Starting iVOD video worker (production)..."
exec node dist/worker-main
