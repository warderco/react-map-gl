import * as React from 'react';
import { useEffect, useContext } from 'react';

import mapboxgl from 'mapbox-gl';

import MapContext from './map-context';
import propTypes from 'prop-types';

function NavigationControl(props) {
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

NavigationControl.propTypes = {
  showCompass: propTypes.bool,
  showZoom: propTypes.bool,
  visualizePitch: propTypes.bool,
  position: propTypes.string
};

NavigationControl.defaultProps = {
  showCompass: true,
  showZoom: true,
  visualizePitch: false,
  position: 'top-left'
};

export default React.memo(NavigationControl);
