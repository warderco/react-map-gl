import * as React from 'react';
import { useEffect, useContext } from 'react';

import mapboxgl from 'mapbox-gl';

import MapContext from './map-context';

export type NavigationControlProps = {
  showCompass?: boolean,
  showZoom?: boolean,
  visualizePitch?: boolean,
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
};

function NavigationControl(props: NavigationControlProps): null {
  const context = useContext(MapContext);

  useEffect(() => {
    const ctrl = new mapboxgl.NavigationControl({ ...props });
    context.map.addControl(ctrl, props.position);

    return () => {
      context.map.removeControl(ctrl);
    };
  }, [])
  
  return null;
}

export default React.memo(NavigationControl);
