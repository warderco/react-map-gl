import * as React from 'react';
import propTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import Mapbox from './mapbox';

import MapContext from './map-context';

export default function Map(props) {
  const [mapInstance, setMapInstance] = useState(null);
  const containerRef = useRef();

  if (mapInstance) {
    mapInstance.setProps(props);
  }

  useEffect(() => {
    const map = new Mapbox(props);
    map.initialize(containerRef.current);
    setMapInstance(map);
    return () => map.destroy();
  }, [])

  const style = {
    position: 'relative',
    width: '100%',
    height: '100%',
    ...props.style
  };

  return (
    <div id={props.id} ref={containerRef} style={style}>
      {mapInstance && <MapContext.Provider value={{
        map: mapInstance.map
      }}>
        {props.children}
      </MapContext.Provider>}
    </div>
  );
}

Map.propTypes = {
  // react-map-gl props
  id: propTypes.string,
  style: propTypes.object,
  styleDiffing: propTypes.bool,
  interactiveLayerIds: propTypes.arrayOf(propTypes.string),
  mapboxAccessToken: propTypes.string,
  // Options that are passed directly to the Map constructor
  // This catch-all prop is only used once on initial mount
  initOptions: propTypes.object,

  /* Reactive props that maps to Map options */

  // Constraints
  maxBounds: propTypes.array,
  minZoom: propTypes.number,
  maxZoom: propTypes.number,
  minPitch: propTypes.number,
  maxPitch: propTypes.number,

  // Interaction handlers
  scrollZoom: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  boxZoom: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  dragRotate: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  dragPan: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  keyboard: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  doubleClickZoom: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  touchZoomRotate: propTypes.oneOfType([propTypes.bool, propTypes.object]),
  touchPitch: propTypes.oneOfType([propTypes.bool, propTypes.object]),

  // Camera state
  longitude: propTypes.number,
  latitude: propTypes.number,
  zoom: propTypes.number,
  bearing: propTypes.number,
  pitch: propTypes.number,
  padding: propTypes.object,

  // Style
  style: propTypes.oneOfType([propTypes.string, propTypes.object]),
  projection: propTypes.oneOfType([propTypes.object, propTypes.string]),
  renderWorldCopies: propTypes.bool
};

Map.defaultProps = {
  // react-map-gl props
  styleDiffing: true,
  style: null,
  interactiveLayerIds: null,

  // Constraints
  maxBounds: null,
  minZoom: 0,
  maxZoom: 22,
  minPitch: 0,
  maxPitch: 85,

  // Interaction handlers
  scrollZoom: true,
  boxZoom: true,
  dragRotate: true,
  dragPan: true,
  keyboard: true,
  doubleClickZoom: true,
  touchZoomRotate: true,
  touchPitch: true,

  // Style
  mapStyle: "mapbox://styles/mapbox/light-v9",
  projection: 'mercator',
  renderWorldCopies: true
};
