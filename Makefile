.PHONY: all backend frontend backend-api clean dev docker-up docker-build help

help:
	@echo "┌──────────────────────────────────────────────────────┐"
	@echo "│  Register Allocation Simulator                       │"
	@echo "├──────────────────────────────────────────────────────┤"
	@echo "│  make all          Build everything                  │"
	@echo "│  make backend      Build C++ CLI backend             │"
	@echo "│  make backend-api  Build + run API server            │"
	@echo "│  make frontend     Install + run frontend dev server │"
	@echo "│  make dev          Run full stack (API + frontend)   │"
	@echo "│  make docker-up    Start with Docker Compose         │"
	@echo "│  make clean        Clean build artifacts             │"
	@echo "└──────────────────────────────────────────────────────┘"

# ─── OS detection ──────────────────────────────────────
ifeq ($(OS),Windows_NT)
  RM = powershell -Command "Remove-Item -Recurse -Force"
  MKDIR = powershell -Command "New-Item -ItemType Directory -Force"
  SEP = \\
  EXT = .exe
  NPM = npm.cmd
  NODE = node.exe
else
  RM = rm -rf
  MKDIR = mkdir -p
  SEP = /
  EXT =
  NPM = npm
  NODE = node
endif

# ─── All ────────────────────────────────────────────────
all: backend frontend-deps
	@echo "Build complete."

# ─── Backend C++ CLI ────────────────────────────────────
backend:
	$(MKDIR) backend$(SEP)build
	cd backend && cd build && cmake .. && cmake --build . --config Release

backend-test:
	cd backend && cd build && $(MAKE) run_tests && .$(SEP)build$(SEP)run_tests$(EXT)

backend-run:
	cd backend && .$(SEP)build$(SEP)rasim$(EXT)

# ─── Backend API Server ─────────────────────────────────
backend-api-install:
	cd backend$(SEP)server && $(NPM) install

backend-api:
	cd backend$(SEP)server && $(NODE) index.js

# ─── Frontend ───────────────────────────────────────────
frontend-deps:
	cd frontend && $(NPM) install

frontend-dev:
	cd frontend && $(NPM) run dev

frontend-build:
	cd frontend && $(NPM) run build

# ─── Full Stack ─────────────────────────────────────────
dev: backend-api-install frontend-deps
	@echo ""
	@echo "Starting backend API server on :4000 and frontend on :3000..."
	@echo "Open http://localhost:3000"
	@echo ""
	$(NODE) backend$(SEP)server$(SEP)index.js &
	cd frontend && $(NPM) run dev

# ─── Docker ─────────────────────────────────────────────
docker-build:
	docker compose build

docker-up:
	docker compose up

docker-up-build:
	docker compose up --build

# ─── Clean ──────────────────────────────────────────────
clean:
	$(RM) backend$(SEP)build
	$(RM) frontend$(SEP).next
	$(RM) frontend$(SEP)node_modules
	$(RM) backend$(SEP)server$(SEP)node_modules
	$(RM) graphs
