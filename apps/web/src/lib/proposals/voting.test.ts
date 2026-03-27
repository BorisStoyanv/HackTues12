import { describe, expect, it } from "vitest";

import { formatConfigPercent, getProposalVotingMetrics } from "./voting";

describe("proposal voting metrics", () => {
  it("shows 100 percent support when the only cast vote is yes", () => {
    const metrics = getProposalVotingMetrics({
      yes_weight: 12,
      no_weight: 0,
      total_regional_vp: 100,
    });

    expect(metrics.supportPercent).toBe(100);
    expect(metrics.oppositionPercent).toBe(0);
    expect(metrics.turnoutPercent).toBe(12);
  });

  it("shows 100 percent opposition when the only cast vote is no", () => {
    const metrics = getProposalVotingMetrics({
      yes_weight: 0,
      no_weight: 8,
      total_regional_vp: 100,
    });

    expect(metrics.supportPercent).toBe(0);
    expect(metrics.oppositionPercent).toBe(100);
    expect(metrics.turnoutPercent).toBe(8);
  });

  it("splits support and turnout correctly for mixed votes", () => {
    const metrics = getProposalVotingMetrics({
      yes_weight: 30,
      no_weight: 10,
      total_regional_vp: 80,
    });

    expect(metrics.supportPercent).toBe(75);
    expect(metrics.oppositionPercent).toBe(25);
    expect(metrics.turnoutPercent).toBe(50);
  });

  it("returns safe zero values when there are no votes", () => {
    const metrics = getProposalVotingMetrics({
      yes_weight: 0,
      no_weight: 0,
      total_regional_vp: 0,
    });

    expect(metrics.supportPercent).toBe(0);
    expect(metrics.oppositionPercent).toBe(0);
    expect(metrics.turnoutPercent).toBe(0);
  });

  it("formats governance decimals as human-readable percentages", () => {
    expect(formatConfigPercent(0.05)).toBe("5%");
    expect(formatConfigPercent(0.51)).toBe("51%");
  });
});
