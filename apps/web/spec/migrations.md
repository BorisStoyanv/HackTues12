# ICP Backend Migration Strategy (StableBTreeMap)

## 1. Context
Unlike traditional SQL databases where you run migrations on the database server, ICP canisters with `StableBTreeMap` handle state persistence in **Stable Memory**. 

When a canister is upgraded, the `StableBTreeMap` remains intact. However, the logic that *reads* from it must be compatible with the *data* stored.

## 2. Standard Migration Scenarios

### Scenario A: Adding Optional Fields
If you add an optional field to a record, you can simply update the TypeScript type. Existing records in stable memory won't have the field, so you'll need to handle `undefined` or provide a default when reading.

### Scenario B: Adding Required Fields
1.  Update the record type to include the new field.
2.  Implement a migration loop in the `@postUpgrade` method.

**Example Migration Logic:**
```typescript
@postUpgrade([])
postUpgrade() {
    // Check version or detect schema changes
    for (const key of users.keys()) {
        const user = users.get(key)[0];
        if (!user.newField) {
            user.newField = "default_value";
            users.insert(key, user);
        }
    }
}
```

## 3. Versioned Storage (Recommended for Scale)
For complex apps, wrap your storage records in an `IDL.Variant` to handle multiple versions simultaneously.

```typescript
const User = IDL.Variant({
    V1: UserV1,
    V2: UserV2
});
```

## 4. Stability Check
Before every upgrade, Azle serializes the state to stable memory. If your schema change is incompatible (e.g. changing a key type), the upgrade will fail safely.
