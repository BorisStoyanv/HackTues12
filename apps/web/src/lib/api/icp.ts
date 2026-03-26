import { HttpAgent, Actor, ActorSubclass, Identity } from '@icp-sdk/core/agent';
import { idlFactory } from './idl';
import { BackendService } from '../types/api';

const CANISTER_ID = process.env.NEXT_PUBLIC_BACKEND_CANISTER_ID || 'sk6yb-aqaaa-aaaad-qljxa-cai';
const HOST = 'https://icp-api.io'; // Modern standard host

/**
 * Creates an anonymous or authenticated agent to interact with the backend canister.
 */
export const createBackendActor = async (identity?: Identity): Promise<ActorSubclass<BackendService>> => {
  const agent = await HttpAgent.create({
    host: HOST,
    identity,
  });

  // If we were on a local development network, we would call agent.fetchRootKey() here
  if (process.env.NODE_ENV !== 'production' && HOST.includes('localhost')) {
     await agent.fetchRootKey().catch(console.error);
  }

  return Actor.createActor<BackendService>(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
};
