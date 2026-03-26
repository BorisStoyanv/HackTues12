import { AuthClient } from '@dfinity/auth-client';
import { Identity, Principal } from '@dfinity/principal';

export const getAuthClient = async () => {
  return await AuthClient.create();
};

export const login = async (client: AuthClient) => {
  return new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: 'https://identity.ic0.app',
      onSuccess: () => resolve(),
      onError: (err) => reject(err),
    });
  });
};

export const getIdentity = (client: AuthClient) => client.getIdentity();
export const getPrincipal = (client: AuthClient) => client.getIdentity().getPrincipal();
