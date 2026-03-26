# Interactive Map (`/explore`) Architecture & Plan

## Objective
Build an enterprise-grade, highly performant interactive map interface inspired by complex data-tracking platforms (e.g., CargoRadar). The map must serve as the primary discovery engine for OpenFairTrip proposals, encapsulating the entire "Explore -> Analyze -> Action" flow within a single, unified, full-screen view.

## Core Technologies
- **Map Engine:** `react-map-gl` (wrapper around Mapbox GL JS).
- **Styling:** Mapbox custom styles tailored to match the Vercel-inspired monochrome aesthetic (Pure Black/White base with minimal accent colors).
- **State Management:** React hooks for viewport state, selected proposal, and active filters.

## Layout & Component Architecture

### Reusable Core: `<InteractiveMap />`
The map must be architected as a highly reusable, self-contained React component (`src/components/map/InteractiveMap.tsx`). It will accept props for configuring its behavior (e.g., `interactive`, `showSidebar`, `initialViewState`, `filterStatus`) so it can be deployed seamlessly across different contexts:
- **`/` (Landing Page):** A visually striking, non-interactive (or lightly interactive) hero background or section block.
- **`/explore` (Dedicated View):** A full-screen layout (`h-screen`) containing the map alongside a dense, interactive data sidebar.
- **`/dashboard`:** A constrained widget showing only proposals relevant to the user's region or funding portfolio.

### 1. `MapCanvas` (The Engine)
- **Base Map:** A clean, minimal monochrome map style.
- **Clustering:** Automatically groups nearby proposals into numeric clusters when zoomed out to prevent visual clutter.
- **Dynamic Markers:** 
  - Visual indicators representing proposals.
  - Color-coded or icon-coded based on status (e.g., Voting, Funding, In Progress).
  - Size or opacity could represent the AI Integrity Score or Funding Goal.
- **Interactive Popups (`ProposalPopup`):**
  - Triggered on marker click (or hover).
  - Displays a high-density "mini-card": Title, Region, AI Score badge, Funding Progress bar, and a quick "View Details" CTA.
- **Map Controls:** Standard zoom in/out, compass, and a "Locate Me" button.

### 2. `MapSidebar` (Data Feed & Controls)
An absolute-positioned or flex-based sidebar (collapsible on mobile) overlaid on or next to the map.
- **Advanced Search & Filtering:**
  - **Geocoding Search:** Search for a city or region to instantly "fly" the map to that location.
  - **Filters:** Toggles for Proposal Status (`ai_debate`, `voting`, `funding`), Categories/Tags, and sliders for AI Integrity Score thresholds.
- **Viewport-Synced Feed:** 
  - A scrollable list of `ProposalCard` components that dynamically updates to show *only* the proposals currently visible within the map's bounding box.
- **Interactivity Sync:** 
  - Hovering a card in the sidebar highlights the corresponding marker on the map.
  - Clicking a card in the sidebar triggers a `flyTo` animation to center the map on that proposal and opens its popup.

## Enterprise-Grade Features & UX Flows
- **Performance:** Use Mapbox `Source` and `Layer` components for data rendering (GeoJSON) instead of thousands of React DOM nodes if the dataset grows, ensuring smooth 60fps panning/zooming.
- **State URL Syncing:** Store the map coordinates (`lat`, `lng`, `zoom`) and active filters in the URL query parameters so users can share specific map views.
- **Contextual Empty States:** If the viewport has no proposals, show a clean prompt in the sidebar: "No active proposals in this area. Zoom out or [Submit a Project here]."

## TypeScript Interfaces (Map Specific)

```typescript
// Extends the existing ProposalMock for GeoJSON compatibility
export interface ProposalGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    title: string;
    status: string;
    ai_score: number;
    funding_progress: number; // 0-100
  };
}
```

## Implementation Phases
1. **Phase 1: Map Initialization:** Setup `react-map-gl`, mapbox token, and render the base monochrome map in a full-screen layout.
2. **Phase 2: Data Overlay & Clustering:** Transform the `MOCK_FEATURED_PROPOSALS` into GeoJSON and render them using Mapbox layers with clustering enabled.
3. **Phase 3: Interactivity (Popups):** Implement the click/hover interactions to show the enterprise-grade `ProposalPopup`.
4. **Phase 4: The Sidebar:** Build the viewport-synced sidebar, advanced filters, and bi-directional hover/click states.
