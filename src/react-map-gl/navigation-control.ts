import * as React from 'react';
import mapboxgl from './mapbox-gl';
import useControl from './use-control';

export type NavigationControlProps = {
  showCompass?: boolean,
  showZoom?: boolean,
  visualizePitch?: boolean,
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
};

function NavigationControl(props: NavigationControlProps): null {
  const ctrl = useControl(() => new mapboxgl.NavigationControl(props), props.position);

  return null;
}

export default React.memo(NavigationControl);
