# Authentication & Onboarding Flow Architecture

## Objective
Design and plan the enterprise-grade authentication and KYC onboarding flow for OpenFairTrip. The flow must seamlessly guide users from initial login (via Internet Identity/Social) through role selection and specialized verification (KYC for Funders, Geographic/Expertise for Regional Users). The UI will strictly adhere to Vercel's clean, high-contrast, minimalist design language.

## Design System Constraints (Vercel Style)
- **Typography:** Inter (sans-serif) for all UI text.
- **Color Palette:** Pure white background for light mode (or pure black for dark mode). Use high-contrast monochrome for primary actions. Minimal to no colored accents unless indicating success/error.
- **Components:** Cards and buttons with slight border radii (`md` or `lg` - 6px/8px). Subtle 1px borders (`border-neutral-200` or `border-neutral-800`). Generous whitespace.
- **Layout:** Centered, focused layouts for auth screens (e.g., standard Vercel auth modal/page style). Multi-step processes should use a minimal, text-based or thin-line stepper.

## The Onboarding Flow

The onboarding process is a state machine that progresses through the following stages:

### 1. Unified Login Portal (`/login`)
- **Visuals:** Centered minimalist card. "OpenFairTrip" logo at the top.
- **Actions:**
  - Primary CTA: "Continue with Internet Identity" (ICP logo, high contrast button).
  - Secondary CTAs: "Continue with Google", "Continue with LinkedIn" (Subtle outline buttons).
- **Post-Action:** Upon mock successful authentication, if the user has no established profile, redirect to Role Selection. If returning, redirect to Dashboard.

### 2. Role Selection (`/onboarding/role`)
- **Visuals:** Split screen or two large interactive cards.
- **Content:**
  - "How do you want to participate in OpenFairTrip?"
  - **Card A: Funder / NPO.** "I want to deploy capital and fund verified local projects."
  - **Card B: Regional User.** "I want to propose projects, debate, and vote in my community."
- **State Management:** User's choice determines the next route (`/onboarding/kyc` vs `/onboarding/verification`).

### 3. Funder / NPO Path (`/onboarding/kyc`)
Since we are mocking the process, we will build a multi-step UI that simulates a Stripe Identity flow.
- **Step 1: Entity Details.** Organization Name, Registration Number, Country of Operation.
- **Step 2: Document Upload (Mock).** Drag-and-drop zone with a dashed border for Tax-exempt status (e.g., 501(c)(3)) or organizational charters.
- **Step 3: Verification Processing.** A simulated loading state ("Analyzing documents...", "Verifying entity status...").
- **Step 4: Completion.** Success message and CTA to "Go to Investor Dashboard".

### 4. Regional User Path (`/onboarding/verification`)
This path establishes the user's Geographic Location and Expertise, which directly impacts their Reputation Attribute ($V_p$).
- **Step 1: Geographic Verification.** 
  - Input fields for Address/City/Region.
  - A "Verify via IP/GPS" mock button.
- **Step 2: Expertise Portfolio.**
  - "Link your professional background to increase your voting weight."
  - Options to mock-link LinkedIn or upload a CV/Degree.
  - Select predefined categories of expertise (e.g., Infrastructure, Education, Environment).
- **Step 3: Completion.** Success message emphasizing their starting Reputation Score, followed by CTA to "Explore Local Projects".

## Component Architecture

To implement this, we need a robust set of reusable UI components:

1. **`AuthCard`**: A wrapper component ensuring consistent max-width, padding, and subtle borders.
2. **`Stepper`**: A minimalist progress indicator (e.g., `Step 1 of 3: Verification`).
3. **`FileUploadZone`**: A clean drag-and-drop area for documents.
4. **`ProviderButton`**: Standardized buttons with icons for different auth providers.

## Implementation Steps

1. **Specs Update:** Write this detailed architecture into `@apps/web/spec/frontend/onboarding-flow.md`.
2. **Route Scaffolding:** Create the Next.js App Router directories:
   - `apps/web/src/app/(auth)/login/page.tsx`
   - `apps/web/src/app/onboarding/layout.tsx` (Shared minimal header/stepper layout)
   - `apps/web/src/app/onboarding/role/page.tsx`
   - `apps/web/src/app/onboarding/kyc/page.tsx`
   - `apps/web/src/app/onboarding/verification/page.tsx`
3. **Component Development:** Build the necessary UI components in `apps/web/src/components/auth/` and `apps/web/src/components/onboarding/`.
4. **State Simulation:** Implement a mock `useAuth` hook or context to hold the temporary state (e.g., `role`, `kycStatus`) allowing smooth navigation between these pages without a real backend.

## Verification
- Verify that the design strictly adheres to the monochrome, high-contrast Vercel style.
- Ensure all routes are accessible and the "Back" and "Next" flows work flawlessly with the mock state.
- Validate that the mock forms have basic validation (using Zod if appropriate, or just simple state checks) before allowing the user to proceed to the next step.