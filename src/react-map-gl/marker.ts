import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState, useMemo, useRef, useContext } from 'react';

import mapboxgl from './mapbox-gl';
import type {MarkerOptions, MapboxEvent} from 'mapbox-gl';

import MapContext from './map-context';
import {arePointsEqual} from './utils';

export type MarkerProps = Omit<MarkerOptions, 'element'> & {
  longitude: number,
  latitude: number,
  onDragStart?: (e: MapboxEvent) => void,
  onDrag?: (e: MapboxEvent) => void,
  onDragEnd?: (e: MapboxEvent) => void,
  children?: React.ReactNode
};

const defaultProps: Partial<MarkerProps> = {
  draggable: false,
  rotation: 0,
  rotationAlignment: 'auto',
  pitchAlignment: 'auto'
};

function Marker(props: MarkerProps) {
  const map = useContext(MapContext);
  const [marker] = useState(() => {
    let hasChildren = false;
    React.Children.forEach(props.children, el => {
      if (el) {
        hasChildren = true;
      }
    });
    const options = {
      ...props,
      element: hasChildren ? document.createElement('div') : null
    };

    return new mapboxgl.Marker(options)
      .setLngLat([props.longitude, props.latitude])
      .addTo(map);
  });
  const thisRef = useRef({props});
  thisRef.current.props = props;

  useEffect(() => {
    marker.on('dragstart', (e: MapboxEvent) => {
      thisRef.current.props.onDragStart?.(e);
    });
    marker.on('drag', (e: MapboxEvent) => {
      thisRef.current.props.onDrag?.(e);
    });
    marker.on('dragend', (e: MapboxEvent) => {
      thisRef.current.props.onDragEnd?.(e);
    });

    return () => {
      marker.remove();
    }
  }, []);

  if (marker.getLngLat().lng !== props.longitude || marker.getLngLat().lat !== props.latitude) {
    marker.setLngLat([props.longitude, props.latitude]);
  }
  if (props.offset && !arePointsEqual(marker.getOffset(), props.offset)) {
    marker.setOffset(props.offset);
  }
  if (marker.isDraggable() !== props.draggable) {
    marker.setDraggable(props.draggable);
  }
  if (marker.getRotation() !== props.rotation){
    marker.setRotation(props.rotation);
  }
  if (marker.getRotationAlignment() !== props.rotationAlignment) {
    marker.setRotationAlignment(props.rotationAlignment);
  }
  if (marker.getPitchAlignment() !== props.pitchAlignment) {
    marker.setPitchAlignment(props.pitchAlignment);
  }

  return createPortal(props.children, marker.getElement());
}

Marker.defaultProps = defaultProps;

export default React.memo(Marker);
