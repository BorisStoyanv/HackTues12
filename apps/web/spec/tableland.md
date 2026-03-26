# Tableland + Drizzle Setup Plan

## 1. Core Dependencies
Install the required packages in `apps/web`:
```bash
pnpm add @tableland/sdk @tableland/drizzle-driver drizzle-orm ethers
pnpm add -D drizzle-kit tsx
```

## 2. Tableland Configuration
Create `src/server/db/index.ts`. We will initialize the Tableland `Database` instance with a private key (for the server-side writes) or a signer if executing on the client.

```typescript
import { Database } from "@tableland/sdk";
import { drizzle } from "@tableland/drizzle-driver";
import { Wallet, providers } from "ethers";
import * as schema from "./schema";

// Server-side signer for automated operations (e.g., AI Engine results)
const privateKey = process.env.TABLELAND_PRIVATE_KEY!;
const providerUrl = process.env.CHAIN_PROVIDER_URL!; // e.g., Arbitrum Sepolia
const wallet = new Wallet(privateKey, new providers.JsonRpcProvider(providerUrl));

export const tbl = new Database({ signer: wallet });
export const db = drizzle(tbl, { schema });
```

## 3. Decentralized Schema Definition
Create `src/server/db/schema.ts`.
**Important:** Tableland tables are mapped by an ID (e.g., `prefix_chainid_tableid`). We will use Drizzle's `text` and `integer` types which are compatible with SQLite (which Tableland uses under the hood).

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey(),
  creatorPrincipal: text("creator_principal").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("pending"),
  createdAt: integer("created_at").notNull(),
});
```

## 4. Migration Strategy
Unlike traditional DBs, Tableland tables are created once and "discovered" or mapped. We will use a script to "create" the tables on-chain and then hardcode the table names in Drizzle or use a mapping logic.
