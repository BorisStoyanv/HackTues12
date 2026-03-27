import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Mapbox
vi.mock('react-map-gl/mapbox', () => ({
  default: () => null,
  Marker: () => null,
  NavigationControl: () => null,
  FullscreenControl: () => null,
  GeolocateControl: () => null,
  ScaleControl: () => null,
  Popup: () => null,
  Source: () => null,
  Layer: () => null,
}));

// Mock process.env
process.env.NEXT_PUBLIC_MAPBOX_API_KEY = 'pk.test';
