#!/usr/bin/env bash
# =============================================================================
# GetLocal - Restart Docker Services & Backend Server
# =============================================================================
# Usage:
#   ./restart.sh          # Restart dev docker + backend server
#   ./restart.sh prod     # Restart full production stack
# =============================================================================

set -e

MODE="${1:-dev}"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo " GetLocal - Restarting ($MODE mode)"
echo "========================================="

if [ "$MODE" = "prod" ]; then
  COMPOSE_FILE="docker-compose.yml"
else
  COMPOSE_FILE="docker-compose.dev.yml"
fi

# ---- Stop running containers ----
echo ""
echo "[1/4] Stopping Docker containers..."
docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" down
echo "      Containers stopped."

# ---- Stop any running backend/frontend dev processes ----
echo ""
echo "[2/4] Stopping local dev processes..."

# Kill any node processes on the backend port (3000) and frontend port (5173)
if command -v lsof &>/dev/null; then
  for PORT in 3000 5173; do
    PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
      echo "      Killing process on port $PORT (PID: $PID)"
      kill $PID 2>/dev/null || true
    fi
  done
elif command -v netstat &>/dev/null; then
  # Windows/Git Bash fallback
  for PORT in 3000 5173; do
    PID=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep LISTENING | awk '{print $5}' | head -1)
    if [ -n "$PID" ] && [ "$PID" != "0" ]; then
      echo "      Killing process on port $PORT (PID: $PID)"
      taskkill //F //PID "$PID" 2>/dev/null || true
    fi
  done
fi
echo "      Dev processes stopped."

# ---- Start Docker containers ----
echo ""
echo "[3/4] Starting Docker containers..."
docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" up -d
echo "      Waiting for services to be healthy..."

# Wait for PostgreSQL
echo -n "      PostgreSQL: "
for i in $(seq 1 30); do
  if docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T postgres pg_isready -q 2>/dev/null; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "timed out (continuing anyway)"
  fi
  sleep 1
done

# Wait for Redis
echo -n "      Redis: "
for i in $(seq 1 15); do
  if docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "timed out (continuing anyway)"
  fi
  sleep 1
done

# ---- Start the server ----
echo ""
echo "[4/4] Starting server..."

if [ "$MODE" = "prod" ]; then
  echo "      Production stack is running via Docker."
  echo "      Backend:  http://localhost:3000"
  echo "      Frontend: http://localhost:80"
else
  echo "      Starting backend dev server..."
  cd "$PROJECT_ROOT/backend"
  npm run dev &
  BACKEND_PID=$!

  echo "      Starting frontend dev server..."
  cd "$PROJECT_ROOT/frontend"
  npm run dev &
  FRONTEND_PID=$!

  cd "$PROJECT_ROOT"

  echo ""
  echo "========================================="
  echo " GetLocal is running!"
  echo "========================================="
  echo " Docker:   docker-compose.dev.yml (postgres + redis)"
  echo " Backend:  http://localhost:3000  (PID: $BACKEND_PID)"
  echo " Frontend: http://localhost:5173  (PID: $FRONTEND_PID)"
  echo ""
  echo " Press Ctrl+C to stop dev servers."
  echo "========================================="

  # Trap Ctrl+C to clean up child processes
  trap 'echo ""; echo "Shutting down..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

  # Wait for background processes
  wait
fi

if [ "$MODE" = "prod" ]; then
  echo ""
  echo "========================================="
  echo " GetLocal production stack is running!"
  echo "========================================="
  echo " PostgreSQL: localhost:5432"
  echo " Redis:      localhost:6379"
  echo " Backend:    http://localhost:3000"
  echo " Frontend:   http://localhost:80"
  echo "========================================="
fi
