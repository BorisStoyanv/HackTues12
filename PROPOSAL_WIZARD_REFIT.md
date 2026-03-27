# Enterprise-Ready Immersive Proposal Wizard Plan

## Motivation
The current proposal creation form is functional but lacks the sophisticated, immersive "onboarding" experience expected of an enterprise-grade platform. It feels cramped and uses a traditional sidebar navigation that distracts from the core task. We want to transition to a centered, high-impact, multi-step flow similar to modern fintech apps (e.g., Robinhood).

## Objectives
1.  **Immersive Layout**: Remove the sidebar and focus the user's attention on one or two inputs at a time.
2.  **Sophisticated Inputs**: Use visual grids for categories, a dedicated currency selector, and enhanced location picking.
3.  **European Focus**: Restrict location selection to European countries and support European currencies (EUR, GBP, CHF, BGN, PLN, CZK, etc.).
4.  **Vercel Aesthetic**: High-contrast, monochrome, minimal usage of color, Inter typography, and subtle micro-interactions.

## Proposed Steps

### 1. The Identity (Title & Category)
- **Input**: Large, bold input for project title.
- **Selection**: A grid of cards for categories (Infrastructure, Technology, etc.) with icons.
- **Validation**: Title uniqueness (if possible) or length.

### 2. The Mission (Executive Summary)
- **Input**: Large-scale textarea for the project description.
- **Experience**: Focus on the narrative. character count as a sophisticated progress ring or indicator.

### 3. The Impact Zone (Location)
- **Input**: Expanded `LocationPicker`.
- **Constraint**: Update geocoding logic or UI to block selection outside of Europe.
- **UI**: Full-width map interaction.

### 4. The Capital (Amount & Currency)
- **Input**: Very large numeric input for the target amount.
- **Input**: `Select` component for Currencies (EUR, GBP, CHF, BGN, etc.).
- **Input**: Itemized budget breakdown.

### 5. The Strategy (Execution & Timeline)
- **Input**: Executor name, operational roadmap, and timeline.
- **Experience**: Structured fields for logistics.

### 6. Verification (Audit Preview)
- **UI**: A "Final Review" summary before committing to the ledger.
- **Commit**: High-impact "Broadcast to Ledger" button.

## Implementation Tasks
1.  **Modify `ProposalWizard`**:
    - Centralize the layout.
    - Implement a top progress line.
    - Switch to a centered `max-w-5xl` container.
2.  **Enhance Components**:
    - Build `CategoryPicker` (Grid of cards).
    - Build `CurrencySelect`.
    - Update `LocationPicker` for European restriction.
3.  **Refine Transitions**:
    - Use `AnimatePresence` for smooth vertical/horizontal sliding between steps.
4.  **Polish Styles**:
    - Ensure strict adherence to Vercel's clean design system.
