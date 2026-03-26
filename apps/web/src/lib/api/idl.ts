import { IDL } from '@dfinity/candid';

export const idlFactory: IDL.InterfaceFactory = ({ IDL }: { IDL: any }) => {
  const User = IDL.Record({
    'principal': IDL.Principal,
    'reputation': IDL.Nat64,
    'joinedAt': IDL.Nat64,
  });

  const Proposal = IDL.Record({
    'id': IDL.Text,
    'creator': IDL.Principal,
    'title': IDL.Text,
    'description': IDL.Text,
    'status': IDL.Text,
    'createdAt': IDL.Nat64,
  });

  const AIReport = IDL.Record({
    'proposalId': IDL.Text,
    'summary': IDL.Text,
    'score': IDL.Nat64,
    'verdict': IDL.Text,
    'timestamp': IDL.Nat64,
  });

  return IDL.Service({
    'registerUser': IDL.Func([], [User], []),
    'getSelf': IDL.Func([], [IDL.Opt(User)], ['query']),
    'createProposal': IDL.Func([IDL.Text, IDL.Text], [Proposal], []),
    'getAllProposals': IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    'getProposalById': IDL.Func([IDL.Text], [IDL.Opt(Proposal)], ['query']),
    'submitAIReport': IDL.Func([IDL.Text, IDL.Text, IDL.Nat64, IDL.Text], [IDL.Bool], []),
    'getReportByProposalId': IDL.Func([IDL.Text], [IDL.Opt(AIReport)], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};
