import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useContext } from 'react';

import mapboxgl from 'mapbox-gl';
import type {MarkerOptions, MapboxEvent} from 'mapbox-gl';

import MapContext from './map-context';

export type MarkerProps = Omit<MarkerOptions, 'element'> & {
  longitude: number,
  latitude: number,
  onDragStart?: (e: MapboxEvent) => void,
  onDrag?: (e: MapboxEvent) => void,
  onDragEnd?: (e: MapboxEvent) => void,
  children?: React.ReactNode
};

function Marker(props: MarkerProps) {
  const context = useContext(MapContext);
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
      .addTo(context.map);
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

  marker.setLngLat([props.longitude, props.latitude]);
  if (props.offset) {
    marker.setOffset(props.offset);
  }
  marker.setDraggable(props.draggable);
  marker.setRotation(props.rotation);
  marker.setRotationAlignment(props.rotationAlignment);
  marker.setPitchAlignment(props.pitchAlignment);

  return createPortal(props.children, marker.getElement());
}

export default React.memo(Marker);
