export interface Location {
  lat: number;
  lng: number;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province?: string;
  country: string;
  postal_code: string;
  formatted_address: string; // The full readable address string
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

export interface AIDebateLog {
  agent: 'advocate' | 'skeptic' | 'analyst';
  round: number;
  argument: string;
  timestamp: string; // ISO string
}

export interface AIIntegrityReport {
  fairness_score: number; // 0-100
  efficiency_score: number; // 0-100
  overall_score: number; // 0-100
  summary: string;
  debate_logs: AIDebateLog[];
  risk_factors: string[];
  positive_externalities: string[];
}

export interface VotingMetrics {
  total_votes: number; // Total number of individual voters
  quorum_reached: boolean; // Has it hit the 5% regional quorum?
  quorum_percentage: number; // Current participation % vs 5% required
  approval_percentage: number; // Current approval % vs 51% required
  yes_votes_weighted: number; // Reputation-weighted yes votes
  no_votes_weighted: number; // Reputation-weighted no votes
  abstain_votes_weighted: number;
  voting_power_distribution: {
    experts: number; // Weighted power from expert voters
    locals: number; // Weighted power from local residents
    general: number; // Weighted power from others
  };
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
  status: 'draft' | 'ai_debate' | 'voting' | 'funding' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
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
