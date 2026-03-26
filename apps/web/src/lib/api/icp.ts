import { HttpAgent, Actor, ActorSubclass, Identity } from '@dfinity/agent';
import { idlFactory } from './idl';
import { BackendService } from '../types/api';

const CANISTER_ID = 'htkot-kiaaa-aaaaa-qgtsa-cai';
const HOST = 'https://icp0.io'; // Mainnet boundary node

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
