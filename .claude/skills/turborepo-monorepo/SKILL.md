---
name: turborepo-monorepo
description: "Guide for managing TypeScript monorepos with Turborepo and pnpm workspaces. Covers package creation, dependencies, pipeline configuration, and common patterns."
---

# Turborepo + pnpm Monorepo Management

## Overview

Turborepo orchestrates builds across packages in a monorepo. pnpm workspaces manage dependencies. Together they enable efficient multi-package TypeScript projects.

## Project Structure

```
project/
├── package.json          # Root package.json (workspaces config)
├── pnpm-workspace.yaml   # pnpm workspace definition
├── turbo.json            # Turborepo pipeline configuration
├── packages/
│   ├── types/            # Shared types
│   ├── core/             # Core logic
│   └── client/           # Client library
└── apps/
    ├── server/           # Server application
    └── cli/              # CLI application
```

## Root Configuration

### package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "check-types": "turbo check-types"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "check-types": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Key concepts**:
- `^build` means "build dependencies first"
- `outputs` defines what to cache
- `persistent: true` for long-running dev servers
- `cache: false` for tasks that shouldn't be cached

## Package Configuration

### Package package.json

```json
{
  "name": "@repo/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "vitest run",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*"
  }
}
```

### Package tsconfig.json

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Creating a New Package

### 1. Create directory structure

```bash
mkdir -p packages/newpkg/src
```

### 2. Create package.json

```bash
cat > packages/newpkg/package.json << 'EOF'
{
  "name": "@repo/newpkg",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "vitest run",
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*"
  }
}
EOF
```

### 3. Create tsconfig.json

```bash
cat > packages/newpkg/tsconfig.json << 'EOF'
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 4. Create entry point

```bash
cat > packages/newpkg/src/index.ts << 'EOF'
export * from './main.js';
EOF
```

### 5. Install dependencies

```bash
pnpm install
```

## Dependencies

### Internal Dependencies (workspace:*)

```json
{
  "dependencies": {
    "@repo/types": "workspace:*",
    "@repo/core": "workspace:*"
  }
}
```

**Rules**:
- Always use `workspace:*` for internal packages
- Dependencies must be listed explicitly
- Turborepo handles build order via `^build`

### Adding Dependencies

```bash
# Add to specific package
cd packages/core
pnpm add zod

# Add dev dependency
pnpm add -D vitest

# Add internal dependency
pnpm add @repo/types@workspace:*

# Add to root (tooling only)
cd ../..
pnpm add -D -w turbo
```

### Shared Config Packages

Common pattern for eslint and typescript configs:

```
packages/
├── eslint-config/
│   ├── package.json
│   └── index.js
└── typescript-config/
    ├── package.json
    ├── base.json
    └── node.json
```

**eslint-config/package.json**:
```json
{
  "name": "@repo/eslint-config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./index.js"
  }
}
```

**typescript-config/package.json**:
```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./base.json": "./base.json",
    "./node.json": "./node.json"
  }
}
```

## Pipeline Configuration

### Task Dependencies

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // Build deps first
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],   // Build self first
      "outputs": []
    },
    "lint": {
      "dependsOn": ["^build"],  // Need types from deps
      "outputs": []
    }
  }
}
```

### Filtering

```bash
# Build specific package
pnpm build --filter=@repo/core

# Build package and its dependencies
pnpm build --filter=@repo/core...

# Build package and its dependents
pnpm build --filter=...@repo/core

# Build everything except one package
pnpm build --filter='!@repo/web'
```

### Watch Mode

```bash
# Dev all packages
pnpm dev

# Dev specific packages
pnpm dev --filter=@repo/core --filter=@repo/server
```

## Common Patterns

### Exports for Submodules

When a package has multiple entry points:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js"
    },
    "./validation": {
      "types": "./dist/validation/index.d.ts",
      "import": "./dist/validation/index.js"
    }
  }
}
```

Usage:
```typescript
import { Entity } from '@repo/core';
import { Repository } from '@repo/core/storage';
import { Validator } from '@repo/core/validation';
```

### Apps vs Packages

**Packages** (`packages/`):
- Libraries consumed by other packages/apps
- Have `exports` field
- Build to `dist/`
- No `bin` field

**Apps** (`apps/`):
- Runnable applications
- May have `bin` field for CLIs
- Often have `start` script
- Consume packages but aren't consumed

### Type-Only Packages

For packages that only export types:

```json
{
  "name": "@repo/types",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

The JS file can just re-export or be empty (types are stripped at runtime).

## Troubleshooting

### "Cannot find module @repo/xyz"

1. Check `workspace:*` in dependencies
2. Run `pnpm install`
3. Check package is built: `pnpm build --filter=@repo/xyz`
4. Check `exports` in package.json matches import path

### Build Order Issues

1. Ensure `dependsOn: ["^build"]` in turbo.json
2. Check circular dependencies (not allowed)
3. Run `pnpm build` from root to see full order

### Cache Issues

```bash
# Clear turbo cache
rm -rf .turbo
rm -rf node_modules/.cache/turbo

# Force rebuild
pnpm build --force
```

### Type Errors Across Packages

1. Ensure dependent package is built first
2. Check `tsconfig.json` references are correct
3. Verify `exports` includes `types` field

## Commands Reference

```bash
# Install all dependencies
pnpm install

# Build everything
pnpm build

# Build specific package and deps
pnpm build --filter=@repo/core...

# Dev mode (all packages)
pnpm dev

# Run tests
pnpm test

# Lint all
pnpm lint

# Type check
pnpm check-types

# Add dependency to package
cd packages/core && pnpm add zod

# Add workspace dependency
pnpm add @repo/types@workspace:*

# Clean all build artifacts
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null
find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null
```