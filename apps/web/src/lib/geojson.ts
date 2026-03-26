import { ProposalMock } from "./types/models";

export interface ProposalGeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    title: string;
    region: string;
    status: string;
    ai_score: number;
    funding_progress: number;
    funding_goal: number;
    current_funding: number;
  };
}

export interface ProposalGeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: ProposalGeoJSONFeature[];
}

export function convertProposalsToGeoJSON(proposals: ProposalMock[]): ProposalGeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: proposals.map((proposal) => ({
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
        ai_score: proposal.ai_integrity_report?.overall_score || 0,
        funding_progress: (proposal.current_funding / proposal.funding_goal) * 100,
        funding_goal: proposal.funding_goal,
        current_funding: proposal.current_funding,
      },
    })),
  };
}
