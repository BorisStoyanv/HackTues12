import { SerializedProposal } from "./actions/proposals";

export interface ProposalGeoJSONProperties {
  id: string;
  title: string;
  region: string;
  status: string;
  funding_progress: number;
  funding_goal: number;
  current_funding: number;
}

export interface ProposalGeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: ProposalGeoJSONProperties;
}

export interface ProposalGeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: ProposalGeoJSONFeature[];
}

/**
 * Converts backend SerializedProposal objects to GeoJSON for Mapbox.
 */
export function convertProposalsToGeoJSON(proposals: SerializedProposal[]): ProposalGeoJSONFeatureCollection {
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  
  return {
    type: 'FeatureCollection',
    features: safeProposals
      .filter((p) => p?.location && typeof p.location.lng === "number" && typeof p.location.lat === "number")
      .map((proposal) => {
        const goal = proposal.funding_goal ?? 0;
        const current = proposal.current_funding ?? 0;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [proposal.location.lng, proposal.location.lat],
          },
          properties: {
            id: proposal.id,
            title: proposal.title,
            region: proposal.location.city || proposal.region_tag || "Unknown",
            status: typeof proposal.status === 'string' ? proposal.status : "Active",
            funding_progress: goal > 0 ? (current / goal) * 100 : 0,
            funding_goal: goal,
            current_funding: current,
          },
        };
      }),
  };
}
