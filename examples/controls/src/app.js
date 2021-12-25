import * as React from 'react';
import {useState, useMemo} from 'react';
import {render} from 'react-dom';
import {
  MapGL,
  Popup,
  Marker,
  NavigationControl
} from './react-map-gl';

import CITIES from '../../.data/cities.json';

const TOKEN = ''; // Set your mapbox token here

export default function App() {
  const [viewState, setViewState] = useState({
    latitude: 40,
    longitude: -100,
    zoom: 3.5,
    bearing: 0,
    pitch: 0
  });
  const [popupInfo, setPopupInfo] = useState(null);

  const pins = useMemo(() => CITIES.map((city, index) => (
    <Marker key={`marker-${index}`}
      longitude={city.longitude}
      latitude={city.latitude}
      draggable
      anchor="bottom">
      <svg
        height={20}
        viewBox="0 0 24 24"
        style={{
          cursor: 'pointer',
          fill: '#d00',
          stroke: 'none',
        }}
        onClick={() => setPopupInfo(city)}
      >
        <path d="M20.2,15.7L20.2,15.7c1.1-1.6,1.8-3.6,1.8-5.7c0-5.6-4.5-10-10-10S2,4.5,2,10c0,2,0.6,3.9,1.6,5.4c0,0.1,0.1,0.2,0.2,0.3
  c0,0,0.1,0.1,0.1,0.2c0.2,0.3,0.4,0.6,0.7,0.9c2.6,3.1,7.4,7.6,7.4,7.6s4.8-4.5,7.4-7.5c0.2-0.3,0.5-0.6,0.7-0.9
  C20.1,15.8,20.2,15.8,20.2,15.7z" />
      </svg>
    </Marker>
  )), []);

  return (
    <MapGL
      initialViewState={viewState}
      mapStyle="mapbox://styles/mapbox/dark-v9"
      mapboxAccessToken={TOKEN}
    >
      <NavigationControl />

      {pins}

      {popupInfo && (
        <Popup
          tipSize={5}
          anchor="top"
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          closeOnClick={false}
          onClose={() => setPopupInfo(null)}
        >
          <div>
            {popupInfo.city}, {popupInfo.state} |{' '}
            <a
              target="_new"
              href={`http://en.wikipedia.org/w/index.php?title=Special:Search&search=${popupInfo.city}, ${popupInfo.state}`}
            >
              Wikipedia
            </a>
          </div>
          <img width="100%" src={popupInfo.image} />
        </Popup>
      )}
    </MapGL>
  );
}

export function renderToDom(container) {
  render(<App />, container);
}
