# Security Specification: 30-Day Execution Operating System

## 1. Data Invariants
1. **User Identity & Isolation**: A user can only read/write their own user profile document (`/users/{userId}`) matching `request.auth.uid`.
2. **Authenticated Access**: All campaign documents, prospects, calls, proposals, fulfillment projects, tasks, transactions, and activity feeds require authenticated access (`request.auth != null`).
3. **Data Integrity**: Campaign IDs and entity IDs must strictly conform to valid alphanumeric character limits (`isValidId`).
4. **Denial-of-Wallet Resistance**: Every string field has strict size limits (e.g. 128 chars for names, 512 for descriptions, 1024 for notes).
5. **No Arbitrary Roles / Privileges**: User profile `role` or `uid` cannot be spoofed or set to arbitrary unauthorized claims.
6. **Immutable IDs**: Once created, document identity keys (`id`, `campaignId`) cannot be mutated across updates.

## 2. The "Dirty Dozen" Threat Vectors
1. **Unauthenticated List Query**: Anonymous attacker attempts `list` on `/campaigns` -> DENIED.
2. **User Profile Hijack**: Attacker `user_B` attempts to read/update `/users/user_A` -> DENIED.
3. **Ghost Field Poisoning**: Payload contains unwhitelisted administrative key `isAdmin: true` -> DENIED.
4. **Junk ID DOS Attack**: Attacker supplies a 2KB string for `{campaignId}` -> DENIED (`isValidId` check fails).
5. **Campaign ID Mutation**: Update attempts to modify `id` or `campaignId` on subdocument -> DENIED.
6. **Negative Value Poisoning**: Negative transaction amount or negative capital allocation -> DENIED.
7. **Task Hijack**: Overwriting completed task with non-conforming status -> DENIED.
8. **Prospect PII Leak**: Unauthenticated user attempts `get` on `/campaigns/{id}/prospects/{prospectId}` -> DENIED.
9. **Fake Transaction Injection**: Creating financial ledger entry without required description/amount -> DENIED.
10. **Oversized String Buffer Attack**: Supplying 100KB notes field to exhaust storage -> DENIED.
11. **Spoofed Audit Feed**: Submitting team activity event with mismatched `memberId` -> DENIED.
12. **Global Catch-All Probe**: Attempting access to arbitrary non-declared collections -> DENIED by default-deny catch-all.
