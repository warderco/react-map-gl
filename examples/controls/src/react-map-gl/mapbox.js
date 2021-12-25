import mapboxgl from 'mapbox-gl';
import {deepEqual} from './utils';

function getAccessTokenFromEnv() {
  let accessToken = null;

  if (typeof location !== 'undefined') {
    const match = location.search.match(/access_token=([^&\/]*)/);
    accessToken = match && match[1];
  }

  if (!accessToken && typeof process !== 'undefined') {
    // Note: This depends on bundler plugins (e.g. webpack) importing environment correctly
    accessToken = process.env.MapboxAccessToken || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN; // eslint-disable-line
  }

  return accessToken;
}

function isValidViewState(viewState) {
  return Number.isFinite(viewState.longitude) && Number.isFinite(viewState.latitude);
}

function transformMatchesViewState(viewState, transform) {
  return transform.center.lng === viewState.longitude &&
    transform.center.lat === viewState.latitude &&
    transform.zoom === viewState.zoom &&
    transform.pitch === viewState.pitch &&
    transform.bearing === viewState.bearing &&
    (!viewState.padding || transform.isPaddingEqual(viewState.padding));
}

function transformToViewState(transform) {
  return {
    longitude: transform.center.lng,
    latitude: transform.center.lat,
    zoom: transform.zoom,
    pitch: transform.pitch,
    bearing: transform.bearing,
    padding: transform.padding
  };
}

function areViewStatesEqual(v1, v2) {
  return v1.longitude === v2.longitude &&
    v1.latitude === v2.latitude &&
    v1.zoom === v2.zoom &&
    v1.pitch === v2.pitch &&
    v1.bearing === v2.bearing &&
    deepEqual(v1.padding, v2.padding);
}

function areTransformsEqual(t1, t2) {
  return t1.center.lng === t2.center.lng &&
    t1.center.lat === t2.center.lat &&
    t1.zoom === t2.zoom &&
    t1.pitch === t2.pitch &&
    t1.bearing === t2.bearing &&
    t1.isPaddingEqual(t2.padding);
}

const pointerEvents = [
  'MouseDown',
  'MouseUp',
  'MouseOver',
  'MouseMove',
  'PreClick',
  'Click',
  'DblClick',
  'MouseEnter',
  'MouseLeave',
  'MouseOut',
  'ContextMenu',
  'Wheel',
  'TouchStart',
  'TouchEnd',
  'TouchMove',
  'TouchCancel'
];
const cameraEvents = [
  'MoveStart',
  'Move',
  'MoveEnd',
  'DragStart',
  'Drag',
  'DragEnd',
  'ZoomStart',
  'Zoom',
  'ZoomEnd',
  'RotateStart',
  'Rotate',
  'RotateEnd',
  'PitchStart',
  'Pitch',
  'PitchEnd',
  'BoxZoomStart',
  'BoxZoomEnd',
  'BoxZoomCancel'
];
const settingNames = [
  'minZoom',
  'maxZoom',
  'minPitch',
  'maxPitch',
  'maxBounds',
  'projection',
  'renderWorldCopies'
];
const handlerNames = [
  'scrollZoom',
  'boxZoom',
  'dragRotate',
  'dragPan',
  'keyboard',
  'doubleClickZoom',
  'touchZoomRotate',
  'touchPitch'
];

export default class Mapbox {
  constructor(props) {
    this.map = null;
    this.props = props;

    // map.transform is mutable. Save snapshots at different stages
    this._lastPropsSetTransform = null;
    this._lastRenderTransform = null;
    this._nextTransform = null;
  }

  setProps(props) {
    if (this._inRender) {
      this._nextProps = props;
      return;
    }

    let needsRedraw = false;
    needsRedraw = this._updateViewState(props, this.props) || needsRedraw;
    needsRedraw = this._updateSettings(props, this.props) || needsRedraw;
    // Style loading is asynchronous, no need to redraw right away
    this._updateStyle(props, this.props);
    this._updateHandlers(props, this.props);
    this.props = props;

    // whether view state is controlled by props
    const controlled = props.viewState || isValidViewState(props);
    this._lastPropsSetTransform = controlled ? this.map.transform.clone() : null;
    
    if (needsRedraw) {
      this.redraw();
    }
  }

  initialize(container) {
    const { props } = this;

    const viewState = props.viewState || props.initialViewState || props;
    const mapOptions = {
      ...props,
      ...props.initOptions,
      accessToken: props.mapboxAccessToken || getAccessTokenFromEnv() || null,
      container,
      style: props.mapStyle,
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    };
    const map = new mapboxgl.Map(mapOptions);
    if (viewState.padding) {
      map.setPadding?.(viewState.padding);
    }
    this._lastPropsSetTransform = map.transform.clone();

    // Hack: insert code before render
    const renderMap = map._render;
    map._render = this._render.bind(this, renderMap);

    // add listeners
    map.on('move', this._onCameraChange.bind(this));

    for (const eventName of pointerEvents) {
      map.on(eventName.toLowerCase(), e => this._onPointerEvent(eventName, e));
    }

    for (const eventName of cameraEvents) {
      map.on(eventName.toLowerCase(), e => this._onCameraEvent(eventName, e));
    }
    this.map = map;
  }

  destroy() {
    this.map.remove();
  }

  // Force redraw the map now. Typically resize() and jumpTo() is reflected in the next
  // render cycle, which is managed by Mapbox's animation loop.
  // This removes the synchronization issue caused by requestAnimationFrame.
  redraw() {
    const {map} = this;
    // map._render will throw error if style does not exist
    // https://github.com/mapbox/mapbox-gl-js/blob/fb9fc316da14e99ff4368f3e4faa3888fb43c513
    //   /src/ui/map.js#L1834
    if (map.style) {
      // cancel the scheduled update
      if (map._frame) {
        map._frame.cancel();
        map._frame = null;
      }
      // the order is important - render() may schedule another update
      map._render();
    }
  }

  _render(baseRender, arg) {
    const map = this.map;
    // Check if camera has changed without prop update
    if (this._lastPropsSetTransform && !areTransformsEqual(this._lastPropsSetTransform, map.transform)) {
      // Use the last transform that matches the props
      map.transform = this._lastPropsSetTransform.clone();
    }

    this._lastRenderTransform = map.transform.clone();
    this._inRender = true;
    baseRender.call(map, arg);
    this._inRender = false;

    // We do not allow transform and props to change during a render
    // When render is done, apply any pending change
    if (this._nextTransform) {
      map.transform = this._nextTransform;
      this._nextTransform = null;
    }
    if (this._nextProps) {
      this.setProps(this._nextProps);
      this._nextProps = null;
    }
  }

  /* Update camera to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if immediate redraw is needed
   */
  _updateViewState(nextProps, currProps) {
    const viewState = nextProps.viewState || nextProps;
    const oldViewState = currProps.viewState || currProps;

    if (areViewStatesEqual(viewState, oldViewState)) {
      return false;
    }

    const isCurrent = transformMatchesViewState(viewState, this.map.transform);
    if (isCurrent) {
      return false;
    }

    this._internalUpdate = true;
    const options = {
      padding: viewState.padding || null
    };
    if (Number.isFinite(viewState.longitude) && Number.isFinite(viewState.latitude)) {
      options.center = [viewState.longitude, viewState.latitude];
    }
    if (Number.isFinite(viewState.zoom)) {
      options.zoom = viewState.zoom;
    }
    if (Number.isFinite(viewState.pitch)) {
      options.pitch = viewState.pitch;
    }
    if (Number.isFinite(viewState.bearing)) {
      options.bearing = viewState.bearing;
    }
    this.map.jumpTo(options);
    this._internalUpdate = false;

    // If 1) view state has changed and 2) it's not caused by map interaction, 
    // it's likely driven by an external state change. Redraw immediately
    return !transformMatchesViewState(viewState, this._lastRenderTransform);
  }

  /* Update camera constraints and projection settings to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if immediate redraw is needed
   */
  _updateSettings(nextProps, currProps) {
    const {map} = this;
    let needsRedraw = false;
    for (const propName in settingNames) {
      if (!deepEqual(nextProps[propName], currProps[propName])) {
        needsRedraw = true;
        map[`set${propName[0].toUpperCase()}${propName.slice(1)}`]?.(nextProps[propName]);
      }
    }
    return needsRedraw;
  }

  /* Update map style to match props
     @param {object} nextProps
     @param {object} currProps
   */
  _updateStyle(nextProps, currProps) {
    if (nextProps.mapStyle !== currProps.mapStyle) {
      const options = {
        diff: nextProps.styleDiffing,
      };
      this.map.setStyle(nextProps.mapStyle, options);
    }
  }

  /* Update interaction handlers to match props
     @param {object} nextProps
     @param {object} currProps
   */
  _updateHandlers(nextProps, currProps) {
    const { map } = this;
    for (const propName in handlerNames) {
      const newValue = nextProps[propName];
      if (!deepEqual(newValue, currProps[propName])) {
        if (newValue) {
          map[propName].enable(newValue);
        } else {
          map[propName].disable();
        }
      }
    }
  }

  _onPointerEvent(eventName, e) {
    const cb = this.props[`on${eventName}`];
    if (cb) {
      if (this.props.interactiveLayerIds) {
        e.features = this.map.queryRenderedFeatures(e.point, {
          layers: this.props.interactiveLayerIds
        });
      }
      cb(e);
    }
  }

  _onCameraEvent(eventName, e) {
    if (this._internalUpdate) {
      return;
    }
    const cb = this.props[`on${eventName}`];

    if (cb) {
      e.viewState = transformToViewState(this._nextTransform || this.map.transform);
      cb(e);
    }
  }

  _onCameraChange() {
    if (this._internalUpdate) {
      return;
    }
    if (this._inRender && this._lastPropsSetTransform) {
      // This is triggered by easing during _render
      // Block rendering until the props change
      this._nextTransform = this.map.transform;
      this.map.transform = this._lastPropsSetTransform.clone();
    }
  };
}
