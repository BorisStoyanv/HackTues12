import { AIIntegrityReport, VotingMetrics, Location as ApiLocation } from "./api";

export interface Location extends ApiLocation {
  address_line_1?: string;
  address_line_2?: string;
  state_province?: string;
  postal_code?: string;
}

export interface LineItem {
  id: string;
  description: string;
  amount: number;
  category?: string; // e.g., "Materials", "Labor", "Permits"
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  percentage_release: number; // e.g., 30 for 30%
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  proof_url?: string; // URL to uploaded proof (video, photos, receipts)
  verification_date?: string; // ISO string
}

export interface FunderPledge {
  funder_id: string; // Principal or User ID
  amount: number;
  timestamp: string; // ISO string
  status: 'pledged' | 'deployed' | 'in_escrow';
}

export interface ProposalMock {
  id: string;
  creator_id: string; // The principal or ID of the user who proposed
  title: string;
  short_description: string;
  problem_statement: string;
  success_metric: string; // e.g., "Plant 500 trees in the local park"
  
  // Geographic Information
  location: Location;
  region_id: string; // UUID or string identifier for the regional voter pool
  
  // Financials & Escrow
  funding_goal: number;
  current_funding: number;
  currency: string; // e.g., "USD", "ICP", "USDC"
  line_item_budget: LineItem[];
  milestones: Milestone[];
  funder_pledges: FunderPledge[];
  
  // Status and AI Analysis
  status: string;
  ai_integrity_report: AIIntegrityReport | null; // Null if AI debate is not finished
  
  // Governance & Community
  voting_metrics: VotingMetrics;
  
  // Metadata & Timestamps
  created_at: string; // ISO String
  updated_at: string; // ISO String
  voting_starts_at?: string; // ISO String
  voting_ends_at?: string; // ISO String
  funding_deadline?: string; // ISO String
  tags: string[]; // e.g., ["Environment", "Infrastructure", "Education"]
}

export interface PlatformStatsMock {
  total_funded: number;
  active_projects: number;
  verified_users: number;
  total_regions: number;
  average_ai_integrity_score: number;
}
