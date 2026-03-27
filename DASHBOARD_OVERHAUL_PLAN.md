# Dashboard "Command Center" Overhaul Plan

## Motivation
The current dashboard is a collection of cards that lacks a strong focal point and doesn't fully utilize the "Protocol Node" identity. We want to transform it into a high-fidelity "Command Center" that serves as the intuitive entry point for all governance and financial actions.

## Objectives
1.  **Precision Layout**: Ensure perfect scrollability within the `h-svh` architecture by correctly layering flex containers.
2.  **Immersive Entry**: A welcoming, data-rich header that summarizes the user's standing in the protocol.
3.  **Action Orientation**: High-visibility "Protocol Primary Actions" (New Proposal, Open Map).
4.  **Data Hierarchy**: Group information into "Active Consensus", "Personal Ledger", and "Network Transparency".

## Proposed Sections

### 1. Protocol Header (Immersive)
- **Greeting**: "Welcome back, Citizen [Name]" or "Institutional Node [Name]".
- **Identity Badge**: Visual representation of Principal ID and Identity Tier.
- **Sync Status**: Live pulse indicator showing connection to the ICP Ledger.

### 2. The Core Metrics (Refined)
- **Voting Power ($V_p$)**: Large numeric value with a secondary "Regional Influence" label.
- **Reputation (Trust)**: Progress-bar based visualization showing current standing vs. next tier.
- **Governance Anchor**: The user's regional focus (e.g., "Sofia Domain") with a shortcut to the map.

### 3. Primary Action Hub (Robinhood-style Buttons)
- Centered or right-aligned high-impact buttons:
    *   **"Initialize Proposal"** (Submit new).
    *   **"Explore Impact Map"** (Map view).
    *   **"Sign Contracts"** (If pending).

### 4. The Workspaces (Balanced Grid)
- **Left (60%) - Active Consensus Feed**: 
    - Real-time list of proposals needing votes.
    - Each item shows a mini-progress bar of current support.
- **Right (40%) - Personal Ledger & Contracts**:
    - Condensed view of "My Activity".
    - Status badges for personal proposals and pending trust contracts.

### 5. Network Transparency (Footer / Full Width)
- **Global Stats**: Network Market Cap, Total proposals.
- **Live Audit Stream**: The scrolling list of ledger events.

## Technical Tasks
1.  **Refactor `DashboardPage`**:
    - Use `flex-1 min-h-0 overflow-y-auto` on the main container.
    - Implement a `max-w-7xl` centered layout for the cards.
2.  **Component Polishing**:
    - Create a custom `MetricCard` with better iconography and hover effects.
    - Build a "Broadcast Control" action bar.
3.  **UI Refinement**:
    - Use Vercel's monochrome aesthetic: subtle grays, high-contrast black/white.
    - Add `AnimatePresence` for data entry transitions.
