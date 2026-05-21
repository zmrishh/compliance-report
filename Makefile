.PHONY: help dev infra infra-stop migrate seed test lint type-check build clean

# ─── Colours ──────────────────────────────────────────────────────────────────
CYAN  := \033[36m
RESET := \033[0m

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

# ─── Infrastructure ────────────────────────────────────────────────────────────

infra: ## Start all local infrastructure (Postgres, Redis, LocalStack)
	docker compose -f infra/docker-compose.yml up -d
	@echo "Waiting for services to become healthy..."
	@docker compose -f infra/docker-compose.yml wait postgres redis localstack || true

infra-stop: ## Stop all local infrastructure
	docker compose -f infra/docker-compose.yml down

infra-clean: ## Stop and delete all local infrastructure volumes
	docker compose -f infra/docker-compose.yml down -v

# ─── Database ─────────────────────────────────────────────────────────────────

migrate: ## Run Drizzle database migrations
	cd packages/db && pnpm drizzle-kit migrate

generate: ## Generate Drizzle migration files from schema changes
	cd packages/db && pnpm drizzle-kit generate

seed: ## Seed the database (runs migrate first)
	cd apps/api && pnpm seed

# ─── Development ──────────────────────────────────────────────────────────────

dev: infra ## Start all services in development mode
	pnpm turbo dev

dev-api: ## Start only the API in development mode
	cd apps/api && pnpm dev

dev-web: ## Start only the web app in development mode
	cd apps/web && pnpm dev

# ─── Code quality ─────────────────────────────────────────────────────────────

lint: ## Run ESLint across all packages
	pnpm turbo lint

type-check: ## Run TypeScript type checking across all packages
	pnpm turbo type-check

format: ## Format all files with Prettier
	pnpm format

format-check: ## Check formatting without writing changes
	pnpm format:check

# ─── Testing ──────────────────────────────────────────────────────────────────

test: ## Run all tests
	pnpm turbo test

# ─── Build ────────────────────────────────────────────────────────────────────

build: ## Build all packages and apps
	pnpm turbo build

clean: ## Clean all build artefacts
	pnpm turbo clean 2>/dev/null || true
	find . -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".tsbuildinfo" -not -path "*/node_modules/*" -exec rm -f {} + 2>/dev/null || true

# ─── Install ──────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	pnpm install

# ─── Docker ───────────────────────────────────────────────────────────────────

docker-build: ## Build API Docker image
	docker build -f apps/api/Dockerfile -t compliance-api:latest .

docker-build-web: ## Build web Docker image
	docker build -f apps/web/Dockerfile -t compliance-web:latest .
