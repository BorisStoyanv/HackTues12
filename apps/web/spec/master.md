# Master Plan: Decentralized Web Stack (Tableland + Drizzle + Internet Identity + tRPC)

## Objective
Establish a fully decentralized and transparent web architecture for `apps/web` by leveraging Tableland for SQL storage, Drizzle for type-safe database interactions, and Internet Identity (ICP) for user authentication, all coordinated via tRPC.

## Architectural Overview
This stack emphasizes transparency and data ownership:
1.  **Decentralized Database (Tableland + Drizzle):**
    *   **Tableland:** A decentralized SQL database protocol that stores data on-chain (EVM) and off-chain (IPFS/Validators).
    *   **Drizzle ORM:** Provides the type-safe interface for managing Tableland SQL schemas and executing queries.
2.  **Decentralized Authentication (Internet Identity):**
    *   **Internet Identity (II):** An anonymous blockchain authentication system for the Internet Computer (ICP). Users sign in with their device's secure enclave (TouchID, FaceID, etc.).
    *   **Identity Mapping:** The II `Principal` serves as the primary identifier for users within the system.
3.  **API Layer (tRPC):**
    *   Provides type-safe communication between the frontend and the Next.js "bridge" server (or edge functions).
    *   Injects the validated ICP Identity into the context for authorized Tableland operations.

## Proposed Folder Structure for `apps/web`

```text
apps/web/
├── spec/                       # Decentralized architecture documentation
├── src/
│   ├── server/
│   │   ├── db/                 # Tableland + Drizzle setup
│   │   │   ├── schema.ts       # Table definitions (with Tableland naming conventions)
│   │   │   └── index.ts        # Tableland connection and Drizzle instance
│   │   ├── api/
│   │   │   ├── trpc.ts         # tRPC init with ICP Identity validation
│   │   │   ├── root.ts         # Main app router
│   │   │   └── routers/        # Domain routers (proposals, voting, etc.)
│   ├── lib/
│   │   ├── icp/                # ICP & Internet Identity helpers
│   │   │   ├── auth.ts         # AuthClient initialization and II logic
│   │   │   └── agent.ts        # ICP Agent configuration
│   ├── trpc/                   # tRPC client/server caller setup
│   └── app/
│       ├── api/trpc/[trpc]/route.ts # tRPC API endpoint
```

## Implementation Phases

### Phase 1: Tableland & Drizzle Integration
*   **Goal:** Setup Tableland SDK and Drizzle adapter.
*   **Deliverable:** A mechanism to create and query decentralized tables using Drizzle.

### Phase 2: Internet Identity Authentication
*   **Goal:** Implement the II login flow on the client side.
*   **Deliverable:** A persistent authenticated session with an ICP Principal.

### Phase 3: tRPC Bridge & Authorized Writes
*   **Goal:** Secure the tRPC layer by verifying ICP identities.
*   **Deliverable:** Procedures that can write to Tableland based on the caller's Principal or authorized EVM address mapping.

## Next Steps
1.  Generate detailed `spec/` files for Tableland, II, and tRPC.
2.  Finalize the Todo list.
3.  Install core dependencies for Tableland and ICP.
