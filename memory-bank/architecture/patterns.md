---
Last-Updated: 2025-12-13
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

---

**Pattern: Delayed Cache Invalidation with Cooldown**

Extension of the immediate cache invalidation pattern for scenarios where updates happen in rapid succession.

Problem: When users make multiple incremental edits (e.g., updating deal details during live episode watching), immediate cache invalidation causes repeated expensive regenerations.

Solution: Scheduled cache invalidation with cooldown period - batch multiple edits together.

```sql
-- Migration: 00010_delayed_narrative_refresh.sql

-- Add timestamp field for scheduling
ALTER TABLE products ADD COLUMN narrative_refresh_scheduled_at TIMESTAMPTZ;

-- Trigger schedules refresh (doesn't flag immediately)
CREATE OR REPLACE FUNCTION schedule_narrative_refresh_on_deal_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (/* deal fields changed */) THEN
        -- Only schedule if not already flagged for immediate refresh
        IF NEW.narrative_version > 0 THEN
            NEW.narrative_refresh_scheduled_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cron job processes scheduled refreshes after cooldown
CREATE OR REPLACE FUNCTION process_scheduled_narrative_refreshes()
RETURNS TABLE(product_id UUID, product_name TEXT, scheduled_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH to_process AS (
        SELECT id, narrative_refresh_scheduled_at
        FROM products
        WHERE narrative_refresh_scheduled_at IS NOT NULL
          AND narrative_refresh_scheduled_at < (NOW() - INTERVAL '1 hour')
          AND narrative_version > 0
        FOR UPDATE SKIP LOCKED  -- Prevent race conditions
    ),
    flagged AS (
        UPDATE products p
        SET narrative_version = 0, narrative_refresh_scheduled_at = NULL
        FROM to_process tp
        WHERE p.id = tp.id
        RETURNING p.id, p.name, tp.narrative_refresh_scheduled_at
    )
    SELECT id, name, narrative_refresh_scheduled_at FROM flagged;
END;
$$ LANGUAGE plpgsql;
```

**How It Works:**

1. **First Edit**: User updates deal → trigger sets `narrative_refresh_scheduled_at = NOW()`
2. **Subsequent Edits**: Each edit resets the timestamp to NOW()
3. **Cooldown Period**: No edits for 1 hour
4. **Cron Processing**: Hourly/periodic cron finds products past cooldown → flags for refresh
5. **Batch Regeneration**: Daily enrichment cron regenerates all flagged narratives

**Key Design Decisions:**

- **FOR UPDATE SKIP LOCKED**: Prevents concurrent transaction conflicts when cron runs while user edits
- **Cooldown Check**: `scheduled_at < (NOW() - INTERVAL '1 hour')` ensures minimum wait time
- **Priority Handling**: Immediate refresh (status change) clears `scheduled_at` to take precedence
- **Optimized Index**: `WHERE narrative_refresh_scheduled_at IS NOT NULL AND narrative_version > 0`

**Usage:**

```bash
# User makes multiple edits (each resets the 1-hour timer)
npx tsx scripts/update-deal.ts "Product" --deal --amount 200000 --equity 20
npx tsx scripts/update-deal.ts "Product" --deal --amount 250000 --equity 25

# Cron runs every 3 hours (automatic via Vercel)
# /api/cron/process-narrative-refreshes

# Or manually trigger processing
npx tsx scripts/process-narrative-refreshes.ts
```

**Benefits:**

- **Cost Savings**: Prevents duplicate regenerations during rapid edits (saves ~$0.001 per prevented regen)
- **User Freedom**: Users can make unlimited edits without worrying about system overhead
- **Automatic**: Zero configuration after initial setup
- **Conflict-Free**: `SKIP LOCKED` prevents race conditions during concurrent edits
- **Scalable**: Works with any cooldown period (1 hour, 6 hours, etc.)

**Trade-offs:**

- **Delayed Updates**: Content won't refresh immediately (waits for cooldown + cron schedule)
- **Additional Complexity**: Two trigger types to maintain (immediate vs delayed)
- **Cron Dependency**: Requires periodic job execution (cost: ~$0.50-1/month)

**When to Use This Pattern:**

- Users make rapid incremental updates (live data entry, manual corrections)
- Cache regeneration is expensive (LLM API calls, external searches)
- Immediate updates aren't critical (tolerance for 1-3 hour delays)
- Cost savings from batching outweigh complexity

**When NOT to Use:**

- Real-time updates required (use immediate invalidation)
- Edits are rare/infrequent (cooldown adds unnecessary delay)
- Regeneration is cheap (simple database queries)

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
