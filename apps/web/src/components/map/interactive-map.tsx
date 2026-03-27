"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SerializedProposal } from "@/lib/actions/proposals";
import { convertProposalsToGeoJSON } from "@/lib/geojson";
import { cn } from "@/lib/utils";
import { MAPBOX_API_KEY } from "@/lib/env";
import { motion } from "framer-motion";
import {
	ArrowRight,
	Briefcase,
	Clock,
	DollarSign,
	Info,
	MapPin,
	Users,
} from "lucide-react";
import type { GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapMouseEvent, MapRef, ViewState } from "react-map-gl/mapbox";
import Map, {
	GeolocateControl,
	Layer,
	NavigationControl,
	Popup,
	Source,
} from "react-map-gl/mapbox";
import { ProposalDetailSheet } from "../proposals/proposal-detail-sheet";

interface InteractiveMapProps {
	proposals: SerializedProposal[];
	interactive?: boolean;
	onBoundingBoxChange?: (
		bbox: [number, number, number, number] | null,
	) => void;
	onProposalSelect?: (proposalId: string) => void;
	selectedProposalId?: string | null;
	className?: string;
	linkPrefix?: string;
}

export function InteractiveMap({
	proposals,
	interactive = true,
	onBoundingBoxChange,
	onProposalSelect,
	selectedProposalId,
	className = "",
	linkPrefix = "/proposals",
}: InteractiveMapProps) {
	const mapRef = useRef<MapRef>(null);
	const { resolvedTheme } = useTheme();

	const [viewState, setViewState] = useState<Partial<ViewState>>({
		longitude: 23.3219,
		latitude: 42.6977,
		zoom: 4,
	});

	const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

	const geoJsonData = useMemo(
		() => convertProposalsToGeoJSON(proposals),
		[proposals],
	);

	const selectedProposal = useMemo(
		() => proposals.find((p) => p.id === selectedProposalId),
		[proposals, selectedProposalId],
	);
	const selectedProposalLocationLabel = selectedProposal
		? selectedProposal.location.city && selectedProposal.location.country
			? `${selectedProposal.location.city}, ${selectedProposal.location.country}`
			: selectedProposal.location.city || selectedProposal.region_tag
		: "";

	const mapStyle =
		resolvedTheme === "dark"
			? "mapbox://styles/mapbox/dark-v11"
			: "mapbox://styles/mapbox/light-v11";

	const onMove = useCallback((evt: { viewState: ViewState }) => {
		setViewState(evt.viewState);
	}, []);

	const onMoveEnd = useCallback(() => {
		if (onBoundingBoxChange && mapRef.current) {
			const bounds = mapRef.current.getMap().getBounds();
			if (bounds) {
				onBoundingBoxChange([
					bounds.getWest(),
					bounds.getSouth(),
					bounds.getEast(),
					bounds.getNorth(),
				]);
			}
		}
	}, [onBoundingBoxChange]);

	const onClick = useCallback(
		(event: MapMouseEvent) => {
			const feature = event.features?.[0];

			if (feature && feature.layer?.id === "clusters") {
				const clusterId = feature.properties?.cluster_id;
				const mapboxSource = mapRef.current
					?.getMap()
					.getSource("proposals") as GeoJSONSource;

				mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err || !mapRef.current) return;
					const geometry = feature.geometry as {
						type: "Point";
						coordinates: [number, number];
					};
					mapRef.current.flyTo({
						center: geometry.coordinates,
						zoom: (zoom ?? 1) + 1,
						duration: 500,
					});
				});
				return;
			}

			if (feature && feature.layer?.id === "unclustered-point") {
				const proposalId = feature.properties?.id;
				if (proposalId && onProposalSelect) {
					onProposalSelect(proposalId);
				}
			}
		},
		[onProposalSelect],
	);

	const onMouseMove = useCallback((event: MapMouseEvent) => {
		const feature = event.features?.[0];
		if (feature && feature.layer?.id === "unclustered-point") {
			if (mapRef.current)
				mapRef.current.getCanvas().style.cursor = "pointer";
		} else {
			if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
		}
	}, []);

	useEffect(() => {
		if (selectedProposal && mapRef.current) {
			mapRef.current.flyTo({
				center: [
					selectedProposal.location.lng,
					selectedProposal.location.lat,
				],
				zoom: 12,
				duration: 800,
			});
		}
	}, [selectedProposalId]);

	return (
		<div
			className={cn(
				"relative w-full h-full bg-muted overflow-hidden",
				className,
			)}
		>
			<Map
				ref={mapRef}
				{...viewState}
				onMove={onMove}
				onMoveEnd={onMoveEnd}
				onClick={onClick}
				onMouseMove={onMouseMove}
				interactive={interactive}
				mapStyle={mapStyle}
				mapboxAccessToken={MAPBOX_API_KEY}
				interactiveLayerIds={["clusters", "unclustered-point"]}
			>
				<Source
					id="proposals"
					type="geojson"
					data={geoJsonData}
					cluster={true}
					clusterMaxZoom={14}
					clusterRadius={50}
				>
					<Layer
						id="clusters"
						type="circle"
						source="proposals"
						filter={["has", "point_count"]}
						paint={{
							"circle-color":
								resolvedTheme === "dark"
									? "#ffffff"
									: "#000000",
							"circle-radius": [
								"step",
								["get", "point_count"],
								24,
								10,
								32,
								50,
								42,
							],
							"circle-stroke-width": 1,
							"circle-stroke-color":
								resolvedTheme === "dark"
									? "#333333"
									: "#cccccc",
							"circle-opacity": 0.9,
						}}
					/>
					<Layer
						id="cluster-count"
						type="symbol"
						source="proposals"
						filter={["has", "point_count"]}
						layout={{
							"text-field": "{point_count_abbreviated}",
							"text-font": [
								"DIN Offc Pro Medium",
								"Arial Unicode MS Bold",
							],
							"text-size": 14,
						}}
						paint={{
							"text-color":
								resolvedTheme === "dark"
									? "#000000"
									: "#ffffff",
						}}
					/>
					<Layer
						id="unclustered-point"
						type="circle"
						source="proposals"
						filter={["!", ["has", "point_count"]]}
						paint={{
							"circle-color":
								resolvedTheme === "dark"
									? "#ffffff"
									: "#000000",
							"circle-radius": 11,
							"circle-stroke-width": 3,
							"circle-stroke-color":
								resolvedTheme === "dark" ? "#222" : "#eee",
						}}
					/>
				</Source>

				{interactive && (
					<div className="absolute top-6 right-6 flex flex-col gap-2">
						<div className="bg-background/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 p-1 rounded-xl shadow-2xl flex flex-col gap-1">
							<NavigationControl
								showCompass={false}
								position="top-right"
								style={{ position: "relative" }}
							/>
							<div className="h-px bg-neutral-200 dark:bg-neutral-800 mx-2" />
							<GeolocateControl
								positionOptions={{ enableHighAccuracy: true }}
								style={{ position: "relative" }}
							/>
						</div>
					</div>
				)}

				{interactive && selectedProposal && (
					<Popup
						longitude={selectedProposal.location.lng}
						latitude={selectedProposal.location.lat}
						anchor="bottom"
						onClose={() => onProposalSelect?.("")}
						closeButton={false}
						className="z-40"
						maxWidth="360px"
						offset={25}
					>
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="flex flex-col p-5 font-sans text-foreground bg-background rounded-4xl shadow-2xl border border-neutral-200 dark:border-neutral-800"
						>
							<div className="flex items-center justify-between mb-4">
								<Badge className="bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border-none">
									{selectedProposal.status.toUpperCase()}
								</Badge>
								<div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded-md">
									<Clock className="w-3 h-3" />
									{new Date(
										selectedProposal.created_at / 1000000,
									).toLocaleDateString()}
								</div>
							</div>

							<h4 className="font-black text-xl leading-[1.1] mb-3 line-clamp-2 tracking-tight">
								{selectedProposal.title}
							</h4>

							<div className="flex items-center gap-3 mb-6">
								<div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
									<Briefcase className="h-3 w-3" />
									{selectedProposal.category}
								</div>
								<div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
									<MapPin className="h-3 w-3" />
									{selectedProposalLocationLabel}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-neutral-100 dark:border-neutral-900">
								<div className="space-y-1">
									<p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
										Protocol Budget
									</p>
									<p className="text-lg font-black flex items-center gap-1">
										<DollarSign className="h-4 w-4 text-primary" />
										{selectedProposal.budget_amount.toLocaleString()}
									</p>
								</div>
								<div className="space-y-1 text-right">
									<p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
										Node Consensus
									</p>
									<p className="text-lg font-black flex items-center justify-end gap-1">
										<Users className="h-4 w-4 text-blue-500" />
										{selectedProposal.voter_count}
									</p>
								</div>
							</div>

							<div className="flex gap-2">
								<Link
									href={`${linkPrefix}/${selectedProposal.id}`}
									className="flex-1 flex items-center justify-center h-12 text-[10px] font-black uppercase tracking-[0.2em] bg-foreground text-background rounded-2xl transition-all hover:bg-foreground/90 active:scale-[0.98] shadow-xl"
								>
									Full Audit{" "}
									<ArrowRight className="ml-2 h-3 w-3" />
								</Link>
								<Button
									variant="outline"
									size="icon"
									className="h-12 w-12 rounded-2xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
									onClick={() => setIsDetailSheetOpen(true)}
								>
									<Info className="h-5 w-5 text-primary" />
								</Button>
							</div>
						</motion.div>
					</Popup>
				)}
			</Map>

			{/* Global Detail Sheet for Seamless Inspection */}
			{selectedProposal && (
				<ProposalDetailSheet
					proposal={selectedProposal}
					isOpen={isDetailSheetOpen}
					onOpenChange={setIsDetailSheetOpen}
					mode={
						linkPrefix.includes("dashboard")
							? "authenticated"
							: "public"
					}
				/>
			)}
		</div>
	);
}
