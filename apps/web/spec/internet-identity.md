# Internet Identity (ICP) Setup Plan

## 1. Dependencies
Install the required packages in `apps/web`:
```bash
pnpm add @dfinity/auth-client @dfinity/agent @dfinity/identity @dfinity/principal
```

## 2. Auth Client Wrapper
Create `src/lib/icp/auth.ts`:
- Handle the `AuthClient` singleton instance.
- Setup the login flow: `authClient.login({ identityProvider: "https://identity.ic0.app", onSuccess: ... })`.
- Expose the current `Identity` and `Principal`.

## 3. Persistent Sessions
Since II uses `localStorage` for the identity, we need to ensure the client-side state is synced with our application logic.
- Create a `useAuth` hook or context provider to make the `Principal` available to all UI components.

## 4. Identity Forwarding
When making tRPC calls, the client should pass the current `Principal` (or a signature/delegation) to the server for validation if necessary.
- Note: In a fully decentralized app, the client might write directly to Tableland using its own signer (EVM), but we will coordinate via tRPC for backend tasks.
