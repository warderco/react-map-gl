import * as React from 'react';
import type {Map} from 'mapbox-gl';

export type MapContextValue = {
  map: Map
};

export default React.createContext<MapContextValue>({
  map: null
});
