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
 * Converts backend Proposal objects to GeoJSON for Mapbox.
 * Assumes funding values have already been converted from BigInt to Number.
 */
export function convertProposalsToGeoJSON(proposals: SerializedProposal[]): ProposalGeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: proposals.map((proposal) => {
      const goal = proposal.funding_goal;
      const current = proposal.current_funding;
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [proposal.location.lng, proposal.location.lat],
        },
        properties: {
          id: proposal.id,
          title: proposal.title,
          region: proposal.location.city,
          status: proposal.status,
          funding_progress: goal > 0 ? (current / goal) * 100 : 0,
          funding_goal: goal,
          current_funding: current,
        },
      };
    }),
  };
}
