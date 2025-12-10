---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Active
---

# Architecture Patterns

## Design Principles

### SOLID Principles
- **Single Responsibility**: Each class/module has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concretions

### Additional Principles
- **DRY (Don't Repeat Yourself)**: Avoid code duplication
- **KISS (Keep It Simple, Stupid)**: Favor simplicity over complexity
- **YAGNI (You Aren't Gonna Need It)**: Don't build features until needed
- **Separation of Concerns**: Separate different aspects of functionality

## Code Organization Patterns

### Directory Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
└── lib/              # Shared utilities and types
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `ProductCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-currency.ts`)
- Types: `types.ts` or `{domain}.types.ts`

**Components:**
- Use PascalCase: `ProductCard`, `SharkProfile`
- Props interfaces: `{ComponentName}Props`
- Event handlers: `on{Event}` (e.g., `onClick`, `onFilter`)

## Established Patterns

### Repository Pattern
Abstract all database access through repository functions.

```typescript
// lib/repositories/products.ts
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}
```

### Result Type
Explicit success/failure handling without exceptions for operations that can fail.

```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

### Schema Validation
Runtime type validation with Zod for external data.

```typescript
const ProductSchema = z.object({
  name: z.string(),
  status: z.enum(['active', 'out_of_business', 'acquired', 'unknown']),
  deal_amount: z.number().nullable(),
});
```

## Anti-Patterns to Avoid

### Don't Create Parallel Structures
Bad:
```
ProductCard.tsx
ProductCardNew.tsx
ProductCardOld.tsx
```

Good:
```
ProductCard.tsx  // One file, extended as needed
```

### Don't Scatter Related Logic
Bad: Database queries in components

Good: All database access through repository functions in `lib/`

### Don't Over-Engineer
Bad: Abstract factory patterns for simple CRUD

Good: Simple functions that do one thing well
