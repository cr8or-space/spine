---
name: zod-schemas
description: "Guide for runtime validation with Zod in TypeScript. Covers schema design patterns, type inference, composition, error handling, and common patterns for domain modeling."
---

# Zod Schema Design

## Overview

Zod provides runtime validation with automatic TypeScript type inference. Define the schema once, get both validation and types.

## Basic Patterns

### Schema Definition and Type Inference

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// Result: { id: string; name: string; email: string; age?: number; role: 'admin' | 'user' | 'guest'; createdAt: Date }

// Validate data
const user = UserSchema.parse(inputData); // throws on invalid
const result = UserSchema.safeParse(inputData); // returns { success, data?, error? }
```

### Common Validators

```typescript
// Strings
z.string()
z.string().min(1)              // Non-empty
z.string().max(100)            // Max length
z.string().email()             // Email format
z.string().url()               // URL format
z.string().uuid()              // UUID format
z.string().regex(/pattern/)    // Custom regex
z.string().trim()              // Trim whitespace (transform)

// Numbers
z.number()
z.number().int()               // Integer only
z.number().positive()          // > 0
z.number().nonnegative()       // >= 0
z.number().min(0).max(100)     // Range

// Booleans
z.boolean()

// Dates
z.date()
z.coerce.date()                // Coerce from string/number

// Enums
z.enum(['a', 'b', 'c'])
z.nativeEnum(MyEnum)           // From TypeScript enum

// Arrays
z.array(z.string())
z.array(z.number()).nonempty()
z.string().array()             // Same as z.array(z.string())

// Objects
z.object({ name: z.string() })
z.object({}).passthrough()     // Allow extra keys
z.object({}).strict()          // Reject extra keys

// Records (string keys, typed values)
z.record(z.string())           // { [key: string]: string }
z.record(z.string(), z.number()) // { [key: string]: number }

// Optional and nullable
z.string().optional()          // string | undefined
z.string().nullable()          // string | null
z.string().nullish()           // string | null | undefined

// Defaults
z.string().default('unknown')
z.number().default(() => Date.now())
```

## Schema Composition

### Extending Objects

```typescript
// Base schema
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Extended schema
const CharacterSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting']),
  traits: z.array(z.string()),
});

type Character = z.infer<typeof CharacterSchema>;
// Includes id, createdAt, updatedAt, name, role, traits
```

### Picking and Omitting

```typescript
// Pick specific fields
const UserSummarySchema = UserSchema.pick({
  id: true,
  name: true,
});

// Omit specific fields
const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
});
```

### Merging Schemas

```typescript
const A = z.object({ a: z.string() });
const B = z.object({ b: z.number() });
const AB = A.merge(B); // { a: string, b: number }
```

### Partial and Required

```typescript
// All fields optional
const PartialUserSchema = UserSchema.partial();

// Specific fields optional
const UserUpdateSchema = UserSchema.partial({
  name: true,
  email: true,
});

// Make optional fields required
const RequiredSchema = PartialUserSchema.required();
```

## Discriminated Unions

For type-safe tagged unions:

```typescript
const StructureSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('book'),
    title: z.string(),
    isbn: z.string().optional(),
  }),
  z.object({
    type: z.literal('chapter'),
    title: z.string(),
    number: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('scene'),
    title: z.string(),
    pov: z.string(),
  }),
]);

type Structure = z.infer<typeof StructureSchema>;

// TypeScript narrows correctly:
function handleStructure(s: Structure) {
  if (s.type === 'book') {
    console.log(s.isbn); // OK - isbn exists on book
  }
}
```

## Transformations

### Transform Output

```typescript
const DateStringSchema = z.string().transform((s) => new Date(s));
// Input: string, Output: Date

const TrimmedStringSchema = z.string().transform((s) => s.trim());

// Chain validations after transform
const PositiveNumberStringSchema = z
  .string()
  .transform((s) => parseInt(s, 10))
  .pipe(z.number().positive());
```

### Coercion

```typescript
// Built-in coercion
z.coerce.string()   // Anything → string
z.coerce.number()   // String/boolean → number
z.coerce.boolean()  // Truthy/falsy → boolean
z.coerce.date()     // String/number → Date
```

### Preprocessing

```typescript
// Run before validation
const Schema = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().optional()
);
```

## Refinements

### Simple Refinement

```typescript
const PasswordSchema = z
  .string()
  .min(8)
  .refine((s) => /[A-Z]/.test(s), 'Must contain uppercase')
  .refine((s) => /[0-9]/.test(s), 'Must contain number');
```

### Cross-Field Validation

```typescript
const DateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'], // Which field to attach error to
  });
```

### Super Refine (Multiple Errors)

```typescript
const FormSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match',
        path: ['confirmPassword'],
      });
    }
  });
```

## Error Handling

### Safe Parse

```typescript
const result = UserSchema.safeParse(input);

if (result.success) {
  // result.data is typed as User
  console.log(result.data.name);
} else {
  // result.error is ZodError
  console.log(result.error.issues);
}
```

### Formatted Errors

```typescript
const result = UserSchema.safeParse(input);
if (!result.success) {
  const formatted = result.error.format();
  // { name?: { _errors: string[] }, email?: { _errors: string[] }, ... }
  
  const flat = result.error.flatten();
  // { formErrors: string[], fieldErrors: { name?: string[], email?: string[] } }
}
```

### Custom Error Messages

```typescript
const Schema = z.object({
  name: z.string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string',
  }).min(1, 'Name cannot be empty'),
  
  age: z.number().min(0, 'Age cannot be negative'),
});
```

## Domain Modeling Patterns

### Entity with Status Lifecycle

```typescript
const ContentStatusSchema = z.enum([
  'draft',
  'review',
  'approved',
  'published',
]);

const ContentSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  status: ContentStatusSchema,
  publishedAt: z.date().optional(),
}).refine(
  (data) => data.status !== 'published' || data.publishedAt !== undefined,
  { message: 'Published content must have publishedAt', path: ['publishedAt'] }
);
```

### Recursive Types

```typescript
// Define base first
const BaseNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
});

// Use z.lazy for recursion
type TreeNode = z.infer<typeof BaseNodeSchema> & {
  children: TreeNode[];
};

const TreeNodeSchema: z.ZodType<TreeNode> = BaseNodeSchema.extend({
  children: z.lazy(() => TreeNodeSchema.array()),
});
```

### Input vs Output Types

```typescript
// Schema for creating (no id, timestamps)
const CreateCharacterSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting']),
});

// Schema for stored entity (has id, timestamps)
const CharacterSchema = CreateCharacterSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for updates (all optional except id)
const UpdateCharacterSchema = CreateCharacterSchema.partial().extend({
  id: z.string().uuid(),
});

type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
type Character = z.infer<typeof CharacterSchema>;
type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
```

### API Response Schemas

```typescript
// Wrapper for API responses
function apiResponse<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

function apiError() {
  return z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  });
}

const GetUserResponseSchema = z.discriminatedUnion('success', [
  apiResponse(UserSchema),
  apiError(),
]);
```

## Best Practices

### Export Both Schema and Type

```typescript
// entities.ts
export const CharacterSchema = z.object({ /* ... */ });
export type Character = z.infer<typeof CharacterSchema>;

// Usage elsewhere
import { CharacterSchema, Character } from './entities';
```

### Use .brand() for Nominal Types

```typescript
const UserIdSchema = z.string().uuid().brand<'UserId'>();
type UserId = z.infer<typeof UserIdSchema>;

const ProjectIdSchema = z.string().uuid().brand<'ProjectId'>();
type ProjectId = z.infer<typeof ProjectIdSchema>;

// Now UserId and ProjectId are distinct types
function getUser(id: UserId) { /* ... */ }
getUser(projectId); // Type error!
```

### Schema Organization

```typescript
// types/index.ts - re-export everything
export * from './base.js';
export * from './character.js';
export * from './location.js';

// types/base.ts - shared schemas
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// types/character.ts - domain schema
import { BaseEntitySchema } from './base.js';

export const CharacterSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  // ...
});
export type Character = z.infer<typeof CharacterSchema>;
```

### Avoid

```typescript
// ❌ Don't use z.any() - defeats the purpose
const BadSchema = z.object({ data: z.any() });

// ❌ Don't validate then cast - use inference
const user = UserSchema.parse(data) as User; // Redundant

// ❌ Don't define types separately from schemas
interface User { name: string } // May drift from schema
const UserSchema = z.object({ name: z.string() });

// ✅ Do infer types from schemas
const UserSchema = z.object({ name: z.string() });
type User = z.infer<typeof UserSchema>; // Always in sync
```