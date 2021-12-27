import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useContext } from 'react';

import mapboxgl from 'mapbox-gl';
import type {PopupOptions, MapboxEvent} from 'mapbox-gl';

import MapContext from './map-context';

export type PopupProps = PopupOptions & {
  longitude: number,
  latitude: number,
  onOpen?: (e: MapboxEvent) => void,
  onClose?: (e: MapboxEvent) => void,
  children?: React.ReactNode
};

function Popup(props: PopupProps) {
  const context = useContext(MapContext);
  const [container] = useState(() => {
    return document.createElement('div');
  });
  const [popup] = useState(() => {
    const options = {...props};
    return new mapboxgl.Popup(options)
      .setLngLat([props.longitude, props.latitude])
      .setDOMContent(container)
      .addTo(context.map);
  });
  const thisRef = useRef({props});
  thisRef.current.props = props;

  useEffect(() => {
    popup.on('open', (e: MapboxEvent) => {
      thisRef.current.props.onOpen?.(e);
    });
    popup.on('close', (e: MapboxEvent) => {
      thisRef.current.props.onClose?.(e);
    });

    return () => {
      popup.remove();
    }
  }, []);

  popup.setLngLat?.([props.longitude, props.latitude]);
  if (props.offset) {
    popup.setOffset?.(props.offset);
  }
  popup.setMaxWidth?.(props.maxWidth);

  return createPortal(props.children, container);
}

export default React.memo(Popup);
