"use client";

import { InteractiveMap } from "@/components/map/interactive-map";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
	ArrowRight,
	Filter,
	Landmark,
	Search,
	ShieldCheck,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ExplorePage() {
	const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
		null,
	);
	const [boundingBox, setBoundingBox] = useState<
		[number, number, number, number] | null
	>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Filter proposals based on bounding box and search query
	const visibleProposals = useMemo(() => {
		let filtered = MOCK_FEATURED_PROPOSALS;

		if (searchQuery) {
			filtered = filtered.filter(
				(p) =>
					p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					p.location.city
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			);
		}

		if (boundingBox) {
			const [west, south, east, north] = boundingBox;
			filtered = filtered.filter((p) => {
				const { lng, lat } = p.location;
				return (
					lng >= west && lng <= east && lat >= south && lat <= north
				);
			});
		}

		return filtered;
	}, [boundingBox, searchQuery]);

	const selectedProposal = useMemo(
		() => MOCK_FEATURED_PROPOSALS.find((p) => p.id === selectedProposalId),
		[selectedProposalId],
	);

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
			{/* Mini Navigation */}
			<header className="z-50 border-b bg-background/80 backdrop-blur-md">
				<div className="flex h-14 items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-4">
						<Link href="/" className="flex items-center gap-2">
							<Landmark className="h-5 w-5 text-primary" />
							<span className="text-lg font-bold tracking-tight hidden sm:inline-block">
								OpenFairTrip
							</span>
						</Link>
						<div className="h-4 w-px bg-border hidden sm:block" />
						<div className="relative w-64 hidden md:block">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search projects or cities..."
								className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="h-8 gap-1.5"
						>
							<Filter className="h-3.5 w-3.5" />
							Filters
						</Button>
						<Link
							href="/proposals/new"
							className={buttonVariants({
								size: "sm",
								className: "h-8",
							})}
						>
							Submit Project
						</Link>
					</div>
				</div>
			</header>

			<main className="relative flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className="z-10 flex w-full flex-col border-r bg-background md:w-80 lg:w-96">
					<div className="p-4 border-b">
						<div className="flex items-center justify-between mb-2">
							<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Proposals in area
							</h2>
							<Badge
								variant="secondary"
								className="rounded-full px-2 py-0"
							>
								{visibleProposals.length}
							</Badge>
						</div>
					</div>

					<ScrollArea className="flex-1">
						<div className="divide-y divide-border">
							{visibleProposals.length > 0 ? (
								visibleProposals.map((proposal) => (
									<div
										key={proposal.id}
										onClick={() =>
											setSelectedProposalId(proposal.id)
										}
										className={cn(
											"p-4 cursor-pointer transition-colors hover:bg-muted/50",
											selectedProposalId ===
												proposal.id && "bg-muted",
										)}
									>
										<div className="flex items-start justify-between mb-1">
											<h3 className="font-bold text-sm line-clamp-1">
												{proposal.title}
											</h3>
											<Badge
												variant="outline"
												className="text-[10px] h-4 px-1 leading-none uppercase"
											>
												{proposal.status}
											</Badge>
										</div>
										<p className="text-xs text-muted-foreground line-clamp-2 mb-3">
											{proposal.short_description}
										</p>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
												<span className="flex items-center gap-0.5">
													<Users className="h-2.5 w-2.5" />
													{
														proposal.voting_metrics
															.total_votes
													}
												</span>
												<span className="flex items-center gap-0.5">
													<ShieldCheck className="h-2.5 w-2.5" />
													{
														proposal
															.ai_integrity_report
															?.overall_score
													}
													%
												</span>
											</div>
											<div className="flex items-center gap-1">
												<span className="text-[10px] font-bold">
													$
													{(
														proposal.current_funding /
														1000
													).toFixed(0)}
													k
												</span>
												<div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
													<div
														className="h-full bg-primary"
														style={{
															width: `${(proposal.current_funding / proposal.funding_goal) * 100}%`,
														}}
													/>
												</div>
											</div>
										</div>
									</div>
								))
							) : (
								<div className="p-8 text-center">
									<p className="text-sm text-muted-foreground">
										No proposals found in this viewport.
									</p>
									<Button
										variant="link"
										size="sm"
										onClick={() => {
											setBoundingBox(null);
											setSearchQuery("");
										}}
									>
										Reset filters
									</Button>
								</div>
							)}
						</div>
					</ScrollArea>

					{/* Quick Selected Detail (Desktop only, slide up or overlay) */}
					{selectedProposal && (
						<div className="border-t p-4 bg-muted/30">
							<div className="flex items-center justify-between mb-3">
								<span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
									Selected
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
									onClick={() => setSelectedProposalId(null)}
								>
									×
								</Button>
							</div>
							<h4 className="font-bold text-base mb-1">
								{selectedProposal.title}
							</h4>
							<div className="flex items-center gap-2 mb-4">
								<Badge className="bg-primary text-primary-foreground text-[10px]">
									{
										selectedProposal.ai_integrity_report
											?.overall_score
									}
									% Integrity
								</Badge>
								<span className="text-xs text-muted-foreground">
									{
										selectedProposal.location
											.formatted_address
									}
								</span>
							</div>
							<Button className="w-full h-9 text-xs">
								<Link
									href={`/proposals/${selectedProposal.id}`}
								>
									View Full Details{" "}
									<ArrowRight className="ml-2 h-3.5 w-3.5" />
								</Link>
							</Button>
						</div>
					)}
				</aside>

				{/* Map Canvas */}
				<div className="flex-1">
					<InteractiveMap
						proposals={MOCK_FEATURED_PROPOSALS}
						selectedProposalId={selectedProposalId}
						onProposalSelect={setSelectedProposalId}
						onBoundingBoxChange={setBoundingBox}
					/>
				</div>
			</main>
		</div>
	);
}
