# Funder/NPO KYC & Enterprise Verification Plan

## Overview
We are upgrading the funder onboarding flow to include automated legal entity validation (via European VIES API) and an enterprise-grade document audit system (via custom AI OCR API).

## Technical Strategy

### 1. Company Validation (VIES)
- **Mechanism**: Server Action in `apps/web/src/lib/actions/kyc.ts`.
- **API**: Use the official EU VIES REST API (`https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`).
- **Input**: Country Code (ISO) and Registration (VAT) Number.
- **Output**: Boolean validity + Official Registered Name/Address.

### 2. Document Verification (AI Audit)
- **Endpoint**: We will proxy requests through `apps/web/src/app/api/ai/document/route.ts` to the AI Worker.
- **UI Component**: A custom `DocumentVault` component in the KYC flow.
- **Capabilities**:
    - Enterprise drag-and-drop file upload.
    - Live analysis feedback using the provided JSON structure (`processed`, `processed_confidence`, `validation_results`).
    - Suspicion flagging (e.g., placeholder date tokens like `20XX`).

### 3. Updated Onboarding Flow (KYC Page)
The `KYCPage` will be refactored into a 5-step interactive wizard:
1.  **Entity Declaration**: Basic form for Org Name, Reg Number, and Country.
2.  **Ledger Handshake (VIES)**: Automated cross-reference check with EU databases.
3.  **Credential Vault**: Upload Incorporation Certificate or NPO Charter.
4.  **AI Forensic Audit**: Real-time display of the OCR results, suspicious heuristic checks, and LLM review summary.
5.  **Profile Finalization**: Syncing the validated data to the Internet Computer ledger.

### 4. Implementation Steps
1.  **Server Action**: Implement `validateCompanyVies` in `lib/actions/kyc.ts`.
2.  **API Proxy**: Create `app/api/ai/document/route.ts` to handle file uploads to the AI engine.
3.  **UI Overhaul**: 
    - Update `KYCPage` state management for the new steps.
    - Build a "Forensic Report" view to display the validation results (warnings for `20XX`, etc.).
4.  **Integration**: Link VIES validation results to the auto-completion of the Org Name if verified.

## Enterprise UI Standards
- Use high-contrast monochrome design (Vercel style).
- Precise progress indicators (Skeleton loaders for AI analysis).
- Clear warning badges for "Suspicious" or "Requires Manual Review" states.
