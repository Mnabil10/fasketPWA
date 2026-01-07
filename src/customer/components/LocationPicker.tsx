import React, { useCallback, useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LocationValue = { lat: number; lng: number };

type LocationPickerProps = {
  value?: LocationValue | null;
  onChange: (value: LocationValue) => void;
  active?: boolean;
  height?: number;
  disabled?: boolean;
  placeholder?: string;
};

const DEFAULT_CENTER = { lat: 30.135, lng: 31.741 };
const DEFAULT_ZOOM = 16;

let iconPatched = false;
function ensureLeafletIcon() {
  if (iconPatched) return;
  iconPatched = true;
  delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

function MapClickHandler({ onPick, disabled }: { onPick: (value: LocationValue) => void; disabled: boolean }) {
  useMapEvents({
    click: (event: L.LeafletMouseEvent) => {
      if (disabled) return;
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function MapResizeHandler({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [active, map]);
  return null;
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center[0], center[1], map]);
  return null;
}

export function LocationPicker({
  value,
  onChange,
  active = true,
  height = 220,
  disabled = false,
  placeholder = "Tap the map to drop a pin",
}: LocationPickerProps) {
  ensureLeafletIcon();
  const center = value ?? DEFAULT_CENTER;
  const centerTuple: [number, number] = [center.lat, center.lng];

  const handlePick = useCallback(
    (next: LocationValue) =>
      onChange({
        lat: Number(next.lat.toFixed(6)),
        lng: Number(next.lng.toFixed(6)),
      }),
    [onChange]
  );

  const markerHandlers = useMemo(
    () => ({
      dragend: (event: L.LeafletEvent) => {
        const marker = event.target as L.Marker;
        const latlng = marker.getLatLng();
        handlePick({ lat: latlng.lat, lng: latlng.lng });
      },
    }),
    [handlePick]
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <MapContainer
        center={centerTuple}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height }}
        className="w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPick={handlePick} disabled={disabled} />
        <MapCenterUpdater center={centerTuple} />
        <MapResizeHandler active={active} />
        {value && (
          <Marker position={[value.lat, value.lng]} draggable={!disabled} eventHandlers={markerHandlers} />
        )}
      </MapContainer>
      {!value && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-gray-600 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
