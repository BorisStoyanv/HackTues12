import { HttpAgent, Actor, ActorSubclass, Identity } from '@icp-sdk/core/agent';
import { idlFactory } from './idl';
import { BackendService } from '../types/api';
import { BACKEND_CANISTER_ID, IS_LOCAL, REPLICA_HOST } from '../env';

/**
 * Creates an anonymous or authenticated agent to interact with the backend canister.
 */
export const createBackendActor = async (identity?: Identity): Promise<ActorSubclass<BackendService>> => {
  const agent = await HttpAgent.create({
    host: REPLICA_HOST,
    identity,
  });

  if (IS_LOCAL) {
    await agent.fetchRootKey().catch(console.error);
  }

  return Actor.createActor<BackendService>(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  });
};
