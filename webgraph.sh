#!/usr/bin/env bash
# WebGraph Viz — docker compose helper.
#
#   ./webgraph.sh up        # build + start (detached)
#   ./webgraph.sh down      # stop + remove containers
#   ./webgraph.sh restart   # restart services without rebuild
#   ./webgraph.sh rebuild   # rebuild images then start
#   ./webgraph.sh logs      # tail logs (follow)
#   ./webgraph.sh status    # show running containers
#   ./webgraph.sh shell <backend|frontend>  # exec /bin/sh in container

set -euo pipefail

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed or not on PATH" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "error: neither 'docker compose' nor 'docker-compose' is available" >&2
  exit 1
fi

cmd="${1:-help}"
shift || true

case "$cmd" in
  up)
    "${COMPOSE[@]}" up -d --build
    echo
    echo "→ frontend: http://localhost:5173"
    echo "→ backend:  http://localhost:8000 (internal — proxied via nginx)"
    ;;

  down)
    "${COMPOSE[@]}" down
    ;;

  restart)
    "${COMPOSE[@]}" restart "$@"
    ;;

  rebuild)
    "${COMPOSE[@]}" build --no-cache "$@"
    "${COMPOSE[@]}" up -d
    ;;

  logs)
    "${COMPOSE[@]}" logs -f --tail=200 "$@"
    ;;

  status|ps)
    "${COMPOSE[@]}" ps
    ;;

  shell)
    target="${1:-backend}"
    "${COMPOSE[@]}" exec "$target" /bin/sh
    ;;

  help|-h|--help|"")
    sed -n '2,10p' "$0"
    ;;

  *)
    echo "unknown command: $cmd" >&2
    sed -n '2,10p' "$0"
    exit 2
    ;;
esac
