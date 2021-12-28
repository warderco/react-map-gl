import {useContext, useState, useEffect} from "react";
import type {IControl} from 'mapbox-gl';
import MapContext from './map-context';

export default function useControl(onCreate: () => IControl, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') {
  const map = useContext(MapContext);
  const [ctrl] = useState(onCreate);

  useEffect(() => {
    map.addControl(ctrl, position);

    return () => {
      map.removeControl(ctrl);
    }
  }, []);

  return ctrl;
}
