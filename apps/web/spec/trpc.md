# tRPC Decentralized Setup Plan

## 1. Dependencies
Install the required packages in `apps/web`:
```bash
pnpm add @trpc/server @trpc/client @trpc/react-query @tanstack/react-query superjson
```

## 2. Server Initialization & Identity Context
Create `src/server/api/trpc.ts`:
- Define a context that extracts the `principal` from the request headers or body.
- Initialize tRPC.
- Define a `protectedProcedure` that ensures the `principal` is present.

```typescript
export const createTRPCContext = async (opts: { req: Request }) => {
  const principal = opts.req.headers.get("x-icp-principal");
  return { db, principal };
};
```

## 3. Client Configuration
Create `src/trpc/react.tsx`:
- Configure the tRPC client to automatically add the `x-icp-principal` header from the current `AuthClient` identity.

```typescript
const trpc = createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            return {
              "x-icp-principal": authClient.getIdentity().getPrincipal().toString(),
            };
          },
        }),
      ],
    })
  );
  // ...
}
```

## 4. API Route
Create `src/app/api/trpc/[trpc]/route.ts` using the standard fetch adapter.
