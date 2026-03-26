"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Map, { 
  FullscreenControl,
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source 
} from "react-map-gl/mapbox";
import type { MapRef, ViewState, MapMouseEvent } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { convertProposalsToGeoJSON } from "@/lib/geojson";
import 'mapbox-gl/dist/mapbox-gl.css';
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SerializedProposal } from "@/lib/actions/proposals";
import type { GeoJSONSource } from "mapbox-gl";

interface InteractiveMapProps {
  proposals: SerializedProposal[];
  interactive?: boolean;
  onBoundingBoxChange?: (bbox: [number, number, number, number] | null) => void;
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
    longitude: 10.0,
    latitude: 50.0,
    zoom: 3.5,
  });

  const geoJsonData = useMemo(() => convertProposalsToGeoJSON(proposals), [proposals]);

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId),
    [proposals, selectedProposalId]
  );

  const mapStyle = resolvedTheme === "dark" 
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
          bounds.getNorth()
        ]);
      }
    }
  }, [onBoundingBoxChange]);

  const onClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0];
    
    if (feature && feature.layer?.id === 'clusters') {
      const clusterId = feature.properties?.cluster_id;
      const mapboxSource = mapRef.current?.getMap().getSource('proposals') as GeoJSONSource;

      mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !mapRef.current) return;

        const geometry = feature.geometry as { type: 'Point', coordinates: [number, number] };
        const coords = geometry.coordinates;
        mapRef.current.flyTo({
          center: coords,
          zoom: (zoom ?? 1) + 1,
          duration: 500
        });
      });
      return;
    }

    if (feature && feature.layer?.id === 'unclustered-point') {
      const proposalId = feature.properties?.id;
      if (proposalId && onProposalSelect) {
        onProposalSelect(proposalId);
      }
    }
  }, [onProposalSelect]);

  const onMouseEnter = useCallback(() => {
    if (interactive && mapRef.current) {
      mapRef.current.getCanvas().style.cursor = 'pointer';
    }
  }, [interactive]);

  const onMouseLeave = useCallback(() => {
    if (interactive && mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
  }, [interactive]);

  useEffect(() => {
    if (selectedProposal && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedProposal.location.lng, selectedProposal.location.lat],
        zoom: 12,
        duration: 800,
      });
    }
  }, [selectedProposal]);

  return (
    <div className={`relative w-full h-full bg-muted overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactive={interactive}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
        interactiveLayerIds={['clusters', 'unclustered-point']}
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
            filter={['has', 'point_count']}
            paint={{
              'circle-color': resolvedTheme === 'dark' ? '#ffffff' : '#000000',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                10,
                30,
                50,
                40
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': resolvedTheme === 'dark' ? '#333333' : '#cccccc'
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            source="proposals"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 14
            }}
            paint={{
              'text-color': resolvedTheme === 'dark' ? '#000000' : '#ffffff'
            }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            source="proposals"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': resolvedTheme === 'dark' ? '#ffffff' : '#000000',
              'circle-radius': 10,
              'circle-stroke-width': 2,
              'circle-stroke-color': resolvedTheme === 'dark' ? '#333333' : '#cccccc',
              'circle-opacity': 0.9,
            }}
          />
        </Source>
        
        {interactive && (
          <>
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <FullscreenControl />
              <NavigationControl showCompass={false} />
              <GeolocateControl positionOptions={{ enableHighAccuracy: true }} />
            </div>
            <div className="absolute bottom-4 left-4">
              <ScaleControl />
            </div>
          </>
        )}

        {interactive && selectedProposal && (
          <Popup
            longitude={selectedProposal.location.lng}
            latitude={selectedProposal.location.lat}
            anchor="bottom"
            onClose={() => onProposalSelect?.("")}
            closeButton={false}
            className="z-50"
            maxWidth="320px"
            offset={15}
          >
            <div className="flex flex-col p-3 font-sans text-foreground bg-background rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest h-5 leading-none px-2 rounded-full border-primary/20 bg-primary/5 text-primary">
                  {selectedProposal.status}
                </Badge>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">ID: {selectedProposal.id.substring(0, 8)}</span>
              </div>
              <h4 className="font-black text-lg leading-tight mb-2 line-clamp-2 tracking-tight">
                {selectedProposal.title}
              </h4>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                {selectedProposal.short_description || selectedProposal.description}
              </p>
              
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Protocol Funding</span>
                  <span className="text-foreground">
                    {(selectedProposal.funding_goal ?? 0) > 0 ? Math.round((selectedProposal.current_funding / (selectedProposal.funding_goal ?? 1)) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900 shadow-inner">
                  <div
                    className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000"
                    style={{ 
                      width: `${(selectedProposal.funding_goal ?? 0) > 0 ? Math.min(100, (selectedProposal.current_funding / (selectedProposal.funding_goal ?? 1)) * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>

              <Link 
                href={`${linkPrefix}/${selectedProposal.id}`}
                className="flex items-center justify-center w-full h-11 text-xs font-black uppercase tracking-widest bg-foreground text-background rounded-xl transition-all hover:bg-foreground/90 active:scale-[0.98] shadow-lg shadow-black/5"
              >
                Inspect Data Pack <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
