import {
    query,
    update,
    StableBTreeMap,
    IDL,
    init,
    postUpgrade,
    msgCaller,
    time
} from 'azle';
import { Principal } from '@dfinity/principal';

// --- Type Definitions (Candid) ---
const User = IDL.Record({
    principal: IDL.Principal,
    reputation: IDL.Nat64,
    joinedAt: IDL.Nat64
});

const Proposal = IDL.Record({
    id: IDL.Text,
    creator: IDL.Principal,
    title: IDL.Text,
    description: IDL.Text,
    status: IDL.Text,
    createdAt: IDL.Nat64
});

const AIReport = IDL.Record({
    proposalId: IDL.Text,
    summary: IDL.Text,
    score: IDL.Nat64,
    verdict: IDL.Text,
    timestamp: IDL.Nat64
});

// --- Storage (StableBTreeMap) ---
type UserType = {
    principal: Principal;
    reputation: bigint;
    joinedAt: bigint;
};

type ProposalType = {
    id: string;
    creator: Principal;
    title: string;
    description: string;
    status: string;
    createdAt: bigint;
};

type AIReportType = {
    proposalId: string;
    summary: string;
    score: bigint;
    verdict: string;
    timestamp: bigint;
};

let users = new StableBTreeMap<string, UserType>(0, 100, 1000);
let proposals = new StableBTreeMap<string, ProposalType>(1, 100, 5000);
let reports = new StableBTreeMap<string, AIReportType>(2, 100, 5000);

export default class {
    @init([])
    init() {
        console.log("Canister initialized");
    }

    @postUpgrade([])
    postUpgrade() {
        console.log("Canister upgraded");
    }

    @update([], User)
    registerUser(): UserType {
        const caller = msgCaller();
        const principalStr = caller.toString();
        
        const existingUser = users.get(principalStr);
        if (existingUser.length > 0) {
            return existingUser[0];
        }

        const newUser: UserType = {
            principal: caller,
            reputation: 0n,
            joinedAt: time()
        };
        
        users.insert(principalStr, newUser);
        return newUser;
    }

    @query([], IDL.Opt(User))
    getSelf(): [UserType] | [] {
        const caller = msgCaller().toString();
        return users.get(caller);
    }

    @update([IDL.Text, IDL.Text], Proposal)
    createProposal(title: string, description: string): ProposalType {
        const caller = msgCaller();
        const id = Math.random().toString(36).substring(2, 10);
        
        const newProposal: ProposalType = {
            id,
            creator: caller,
            title,
            description,
            status: "draft",
            createdAt: time()
        };
        
        proposals.insert(id, newProposal);
        return newProposal;
    }

    @query([], IDL.Vec(Proposal))
    getAllProposals(): ProposalType[] {
        return proposals.values();
    }

    @query([IDL.Text], IDL.Opt(Proposal))
    getProposalById(id: string): [ProposalType] | [] {
        return proposals.get(id);
    }

    @update([IDL.Text, IDL.Text, IDL.Nat64, IDL.Text], IDL.Bool)
    submitAIReport(proposalId: string, summary: string, score: bigint, verdict: string): boolean {
        const report: AIReportType = {
            proposalId,
            summary,
            score,
            verdict,
            timestamp: time()
        };
        
        reports.insert(proposalId, report);
        
        const proposalOpt = proposals.get(proposalId);
        if (proposalOpt.length > 0) {
            const proposal = proposalOpt[0];
            proposal.status = "debating";
            proposals.insert(proposalId, proposal);
        }
        
        return true;
    }

    @query([IDL.Text], IDL.Opt(AIReport))
    getReportByProposalId(proposalId: string): [AIReportType] | [] {
        return reports.get(proposalId);
    }

    @query([], IDL.Text)
    health(): string {
        return "HackTues12 ICP Backend (StableBTreeMap) is operational.";
    }
}
