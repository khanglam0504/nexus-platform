# Nexus Platform - Code Standards

## File Organization

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── workspace/         # Workspace routes
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── chat/             # Chat-specific components
│   └── workspace/        # Workspace components
├── lib/                   # Utilities
├── server/               # Server-side code
│   └── routers/          # tRPC routers
├── hooks/                # Custom hooks
└── types/                # TypeScript definitions
```

### Naming Conventions
- Files: kebab-case (`message-input.tsx`)
- Components: PascalCase (`MessageInput`)
- Functions: camelCase (`handleSubmit`)
- Constants: UPPER_SNAKE_CASE (`MAX_MESSAGE_LENGTH`)
- Types/Interfaces: PascalCase (`MessageProps`)

## TypeScript

### Strict Mode
- Enable strict mode in tsconfig
- No `any` types (use `unknown` if needed)
- Explicit return types for functions
- Non-null assertions only when certain

### Type Patterns
```typescript
// Props interfaces
interface Props {
  channel: Channel;
  onSubmit: (value: string) => void;
}

// Server action return types
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## React Patterns

### Components
- Functional components only
- Use `forwardRef` for UI primitives
- Destructure props in parameter
- Keep components under 200 lines

### State Management
- React Query for server state
- Zustand for global client state
- useState for local component state
- Avoid prop drilling (use context)

### Hooks
- Custom hooks in `/hooks` directory
- Prefix with `use` (e.g., `useSocket`)
- Keep focused on single responsibility

## tRPC Conventions

### Router Structure
```typescript
export const channelRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),
});
```

### Error Handling
- Use `TRPCError` with appropriate codes
- Validate input with Zod schemas
- Return typed responses

## Styling

### Tailwind Classes
- Use utility classes directly
- Group related utilities
- Extract complex patterns to components
- Use `cn()` for conditional classes

### Component Variants
- Use CVA for variant definitions
- Define variants in component file
- Export variants for reuse

## Testing (TODO)

### Unit Tests
- Jest + React Testing Library
- Test component behavior, not implementation
- Mock API calls and external dependencies

### Integration Tests
- Test tRPC endpoints
- Verify database operations
- Check authentication flows

## Git Workflow

### Commits
- Use conventional commits
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore

### Branches
- `main` - production
- `develop` - integration
- `feature/*` - new features
- `fix/*` - bug fixes
