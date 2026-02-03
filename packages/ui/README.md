# @repo/ui

Shared UI components library for PardxAI monorepo.

## Structure

```
src/
└── hooks/         # Shared React hooks
```

## Usage

```typescript
import { Button, Dialog, Input } from '@repo/ui';
import { AuthGuard, PermissionGate } from '@repo/ui';
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check
```
