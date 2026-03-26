#!/bin/bash
set -e

echo "Initializing monorepo root..."
echo '{
  "name": "hacktues12-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}' > package.json

mkdir -p apps packages

echo "Setting up apps/web (Next.js)..."
npx create-next-app@14 apps/web --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --use-npm --yes

echo "Setting up apps/contracts (Hardhat)..."
mkdir -p apps/contracts
cd apps/contracts
echo '{
  "name": "contracts",
  "version": "1.0.0",
  "private": true
}' > package.json
npm install --save-dev hardhat
echo "module.exports = { solidity: '0.8.24' };" > hardhat.config.js
mkdir -p contracts scripts test
cd ../..

echo "Setting up apps/ai-engine (Node.js)..."
mkdir -p apps/ai-engine
cd apps/ai-engine
echo '{
  "name": "ai-engine",
  "version": "1.0.0",
  "private": true
}' > package.json
npm install typescript @types/node tsx --save-dev
npx tsc --init
mkdir -p src
echo "console.log('AI Engine');" > src/index.ts
cd ../..

echo "Setting up packages/ui (React Component Library)..."
mkdir -p packages/ui
cd packages/ui
echo '{
  "name": "@repo/ui",
  "version": "1.0.0",
  "private": true,
  "main": "index.tsx",
  "dependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}' > package.json
npx tsc --init
echo "import React from 'react';
export const Button = () => <button>Click me</button>;" > index.tsx
cd ../..

echo "Setting up packages/types (Shared Types)..."
mkdir -p packages/types
cd packages/types
echo '{
  "name": "@repo/types",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}' > package.json
npx tsc --init
echo "export interface Proposal { id: string; title: string; }" > index.ts
cd ../..

echo "Installing workspace dependencies..."
npm install

echo "Done!"
