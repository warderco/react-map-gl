import mapboxgl from 'mapbox-gl';

import type {PaddingOptions} from 'mapbox-gl';

export type ViewState = {
  longitude?: number,
  latitude?: number,
  zoom?: number,
  bearing?: number,
  pitch?: number,
  padding?: PaddingOptions,
};

// Stub for mapbox's Transform class
// https://github.com/mapbox/mapbox-gl-js/blob/main/src/geo/transform.js
export type Transform = {
  center: {lng: number, lat: number},
  zoom: number,
  bearing: number,
  pitch: number,
  padding: PaddingOptions,

  clone: () => Transform,
  resize: (width: number, height: number) => void,
  isPaddingEqual: (value: PaddingOptions) => boolean
};

export function deepEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  } else if (Array.isArray(b)) {
    return false;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (!b.hasOwnProperty(key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function transformToViewState(tr: Transform): ViewState {
  return {
    longitude: tr.center.lng,
    latitude: tr.center.lat,
    zoom: tr.zoom,
    pitch: tr.pitch,
    bearing: tr.bearing,
    padding: tr.padding
  };
}

export function applyViewStateToTransform(tr: Transform, vs: ViewState | {viewState: ViewState}): boolean {
  // @ts-ignore
  const v: ViewState = vs.viewState || vs;
  let changed = false;

  if ('longitude' in v && 'latitude' in v) {
    const center = tr.center;
    tr.center = new mapboxgl.LngLat(v.longitude, v.latitude);
    changed = changed || center !== tr.center;
  }
  if ('zoom' in v) {
    const zoom = tr.zoom;
    tr.zoom = v.zoom;
    changed = changed || zoom !== tr.zoom;
  }
  if ('bearing' in v) {
    const bearing = tr.bearing;
    tr.bearing = v.bearing;
    changed = changed || bearing !== tr.bearing;
  }
  if ('pitch' in v) {
    const pitch = tr.pitch;
    tr.pitch = v.pitch;
    changed = changed || pitch !== tr.pitch;
  }
  if (v.padding && !tr.isPaddingEqual(v.padding)) {
    changed = true;
    tr.padding = v.padding;
  }
  return changed;
}
