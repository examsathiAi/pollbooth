.PHONY: dev test build clean setup-local migrate deploy-staging deploy-production

# Development
dev:
	docker-compose up -d

# One-command local setup
setup-local:
	bash scripts/setup-local.sh

# Testing
test:
	pnpm test

test-coverage:
	pnpm test:coverage

test-integration:
	pnpm test:integration

test-e2e:
	pnpm test:e2e

# Database
migrate:
	pnpm db:migrate:dev

migrate-deploy:
	pnpm db:migrate:deploy

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

# Build
build:
	pnpm build

# Clean
clean:
	pnpm clean
	docker-compose down -v

# Deployment
deploy-staging:
	gh workflow run deploy-staging.yml

deploy-production:
	gh workflow run deploy-production.yml
