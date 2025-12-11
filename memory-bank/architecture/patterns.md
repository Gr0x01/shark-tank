---
Last-Updated: 2025-12-12
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

### Database Triggers for Data Consistency
Use PostgreSQL triggers to maintain data integrity and automate related updates.

**Pattern: Automatic Cache Invalidation**

When source data changes, automatically flag dependent cached/generated content for refresh.

**Example: Narrative Refresh on Status Change**

Problem: Product narrative content becomes stale when business status changes (e.g., active → out_of_business).

Solution: Database trigger automatically flags narratives for regeneration.

```sql
-- Migration: 00007_narrative_refresh_on_status_change.sql

CREATE OR REPLACE FUNCTION flag_narrative_refresh_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only flag if status actually changed and narrative exists
    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.narrative_version > 0 THEN
        NEW.narrative_version := 0;
        RAISE NOTICE 'Product % status changed from % to %. Flagging narrative for refresh.',
            NEW.name, OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_narrative_refresh_on_status_change
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION flag_narrative_refresh_on_status_change();
```

**How It Works:**

1. **Status Update**: Any update to `products.status` triggers the function
2. **Condition Check**: Only flags if status actually changed AND narrative exists (version > 0)
3. **Flag for Refresh**: Sets `narrative_version = 0` to mark as needing regeneration
4. **Batch Regeneration**: Run enrichment script to process flagged products

**Usage:**

```bash
# Status change automatically flags product
UPDATE products SET status = 'out_of_business' WHERE slug = 'scrub-daddy';

# Query flagged products
SELECT id, name, status, narrative_version
FROM products
WHERE narrative_version = 0;

# Regenerate narratives for flagged products
npx tsx scripts/enrich-narratives.ts --limit 10

# Manual flagging (if needed)
SELECT flag_product_for_narrative_refresh('product-uuid-here');
```

**Benefits:**
- **Automatic**: No manual tracking of what needs updating
- **Consistent**: Works from any update source (scripts, admin panel, direct SQL)
- **Efficient**: Only flags when status actually changes
- **Cost-effective**: Batch processing keeps LLM costs predictable (~$0.001/product)

**When to Use This Pattern:**
- Generated/cached content depends on source data
- Content generation is expensive (time/cost) so you want batching
- Changes are infrequent enough that real-time regeneration isn't needed
- Multiple update paths exist (can't rely on application-level hooks)

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
