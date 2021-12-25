import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useContext } from 'react';

import mapboxgl from 'mapbox-gl';

import MapContext from './map-context';
import propTypes from 'prop-types';

function Marker(props) {
  const context = useContext(MapContext);
  const [marker] = useState(() => {
    let hasChildren = false;
    React.Children.forEach(props.children, el => {
      if (el) {
        hasChildren = true;
      }
    });
    const options = {...props};
    if (hasChildren) {
      options.element = document.createElement('div');
    }

    return new mapboxgl.Marker(options)
      .setLngLat([props.longitude, props.latitude])
      .addTo(context.map);
  });
  const thisRef = useRef({});
  thisRef.current.props = props;

  useEffect(() => {
    marker.on('dragstart', (e) => {
      thisRef.current.props.onDragStart?.(e);
    });
    marker.on('drag', (e) => {
      thisRef.current.props.onDrag?.(e);
    });
    marker.on('dragend', (e) => {
      thisRef.current.props.onDragEnd?.(e);
    });

    return () => {
      marker.remove();
    }
  }, []);

  marker.setLngLat?.([props.longitude, props.latitude]);
  if (props.offset) {
    marker.setOffset?.(props.offset);
  }
  marker.setDraggable?.(props.draggable);
  marker.setRoation?.(props.rotation);
  marker.setRotationAlignment?.(props.rotationAlignment);
  marker.setPitchAlignment?.(props.pitchAlignment);

  return createPortal(props.children, marker.getElement());
}

Marker.propTypes = {
  anchor: propTypes.string,
  clickTolerance: propTypes.number,
  color: propTypes.string,
  draggable: propTypes.bool,
  offset: propTypes.arrayOf(propTypes.number),
  pitchAlignment: propTypes.string,
  rotation: propTypes.number,
  rotationAlignment: propTypes.string,
  scale: propTypes.number,
  onDragStart: propTypes.func,
  onDrag: propTypes.func,
  onDragEnd: propTypes.func
};

Marker.defaultProps = {
  anchor: 'center',
  clickTolerance: 0,
  color: '#3FB1CE',
  draggable: false,
  pitchAlignment: 'auto',
  rotationAlignment: 'auto',
  rotation: 0,
  scale: 1
};

export default React.memo(Marker);
