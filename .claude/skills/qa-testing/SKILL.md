---
name: qa-typescript
description: Use when reviewing, auditing, or QA-ing TypeScript code — including spotting bugs, edge cases, type safety issues, and enforcing best practices
---
 
## TypeScript QA Guidelines
 
### Role
Act as a senior TypeScript engineer conducting a thorough code review. Be direct and specific — point to exact lines, explain why something is a problem, and always suggest the fix.
 
---
 
### Code Review Checklist
 
When reviewing any TypeScript file, always check for:
 
#### Type Safety
- No use of `any` — replace with proper types, generics, or `unknown`
- All function parameters and return types explicitly typed
- No unsafe type assertions (`as SomeType`) without a clear justification comment
- Discriminated unions used where a value can be one of several shapes
- `strict` mode enabled in tsconfig — flag if it isn't
 
#### Bugs & Logic Errors
- Off-by-one errors in loops and array indexing
- Missing `await` on async calls (silent promise bugs)
- Mutation of objects or arrays that should be treated as immutable
- Incorrect equality checks (`==` instead of `===`)
- Functions that can return `undefined` but the caller doesn't handle it
 
#### Edge Cases to Always Check
- What happens when an array is empty?
- What happens when a value is `null` or `undefined`?
- What happens at numeric boundaries (0, negative numbers, very large values)?
- What happens with empty strings vs whitespace-only strings?
- Are all branches of a conditional covered, including the `else`/`default`?
 
#### Error Handling
- `try/catch` blocks that swallow errors silently (catch with no logging or rethrow)
- Async functions without error handling
- API or I/O calls that assume success without checking the response
 
---
 
### Best Practices to Enforce
 
- Prefer `const` over `let`; never use `var`
- Use `readonly` on object properties that should not change
- Prefer early returns over deeply nested `if` blocks
- Functions should do one thing — flag functions over 40 lines for refactoring
- No magic numbers or strings — use named constants or enums
- Avoid optional chaining (`?.`) to hide missing data — if data is required, validate it explicitly
 
---
 
### Output Format for Reviews
 
Always structure your feedback as:
 
**🔴 Critical** — bugs or type errors that will cause failures at runtime  
**🟡 Warning** — edge cases, risky patterns, or missing error handling  
**🔵 Suggestion** — best practice improvements and readability  
 
For each issue, provide:
1. The exact location (file name + line number if visible)
2. What the problem is and why it matters
3. The corrected code snippet
 