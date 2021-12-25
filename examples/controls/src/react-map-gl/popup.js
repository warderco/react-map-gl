import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useContext } from 'react';

import mapboxgl from 'mapbox-gl';

import MapContext from './map-context';
import propTypes from 'prop-types';

function Popup(props) {
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
  const thisRef = useRef({});
  thisRef.current.props = props;

  useEffect(() => {
    popup.on('open', (e) => {
      thisRef.current.props.onOpen?.(e);
    });
    popup.on('close', (e) => {
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

Popup.propTypes = {
  anchor: propTypes.string,
  className: propTypes.string,
  closeButton: propTypes.bool,
  closeOnClick: propTypes.bool,
  closeOnMove: propTypes.bool,
  focusAfterOpen: propTypes.bool,
  maxWidth: propTypes.string,
  offset: propTypes.oneOfType([
    propTypes.number,
    propTypes.arrayOf(propTypes.number),
    propTypes.object
  ]),
  onOpen: propTypes.func,
  onClose: propTypes.func
};

Popup.defaultProps = {
  closeButton: true,
  closeOnClick: true,
  closeOnMove: true,
  focusAfterOpen: true,
  maxWidth: '240px'
};

export default React.memo(Popup);
