# Proposal Wizard: Vertical Architecture & Numeric Precision Plan

## Overview
We are transitioning the proposal creation process from a top-heavy horizontal wizard to a sophisticated **Vertical Protocol Sidebar** layout. This reorganization better utilizes widescreen displays, reduces visual redundancy, and aligns with high-end fintech application patterns. We will also implement a controlled, formatted input for capital requirements.

## 1. Architectural Reorganization: Vertical Protocol
- **Side-by-Side Layout**: Refactor `NewProposalPage` and `ProposalWizard` to use a 2-column grid (`sidebar` | `content`).
- **Protocol Sidebar (Left)**:
    - **Sticky Navigation**: A vertical list of steps (`Identity`, `Mission`, `Anchor`, etc.).
    - **Dynamic Feedback**: Each step will show as `Completed` (Checkmark), `Active` (Bold/Highlighted), or `Pending`.
    - **Title & Description**: Move the step headers and descriptions from the form body into this sidebar.
    - **Visual Continuity**: A vertical progress line connecting the steps, tracking the user's descent through the protocol.
- **Form Content (Right)**:
    - **Focused Workspace**: Centered inputs within the larger content area.
    - **Minimalist Scaling**: The `Identity` title input will be reduced from `h-20` to `h-16` for a more balanced appearance.
    - **No Redundancy**: Remove all per-step `h2` headers and paragraph summaries from within the wizard steps.

## 2. Numeric Precision: Formatted Capital Input
- **Objective**: The "Capital" (Amount) input must automatically format with thousands separators (e.g., `1,250,000`) and handle decimal precision.
- **Mechanism**: 
    - Implement a custom controlled input component for `budget_amount`.
    - Use `toLocaleString()` logic or a dedicated utility to transform the raw number into a human-readable string in real-time.
    - Ensure the React Hook Form state maintains the raw `number` type while the UI shows the formatted string.

## 3. Stability & Quality Assurance
- **Fix Imports**: 
    - Add missing `useEffect` to `proposal-explorer.tsx`.
    - Add missing `Badge` to `proposal-wizard.tsx`.
- **Validation**:
    - Run `pnpm -F web exec tsc --noEmit` and ensure zero errors.
    - Verify that the layout remains responsive on smaller screens (sidebar collapses to top or drawer).

## 4. UI Polish (Vercel Style)
- Maintain the high-contrast monochrome palette.
- Use subtle background blurs (`backdrop-blur-xl`) and thin borders (`border-border/40`).
- Ensure micro-interactions (framer-motion) are consistent across the vertical transition.
