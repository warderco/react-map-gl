import mapboxgl from 'mapbox-gl';
import {
  ViewState,
  Transform,
  deepEqual,
  transformToViewState,
  applyViewStateToTransform
} from './utils';

import type {MapboxOptions, Style, MapLayerMouseEvent, MapLayerTouchEvent, MapWheelEvent, MapboxEvent, ErrorEvent, DragPanOptions} from 'mapbox-gl';

type ViewStateChangeEvent = MapboxEvent & {
  viewState: ViewState
};

export type MapboxProps = {
  mapboxAccessToken?: string,
  initOptions?: Omit<MapboxOptions, 'center' | 'accessToken' | 'container' | 'style' > & {
    // Initial view state, for use as a stateful component
    longitude?: number,
    latitude?: number
  },

  /* Reactive props */

  // Constraints
  maxBounds?: [[number, number], [number, number]],
  minZoom: number,
  maxZoom: number,
  minPitch: number,
  maxPitch: number,

  // Interaction handlers
  scrollZoom: boolean | {
    around?: 'center'
  },
  boxZoom: boolean,
  dragRotate: boolean,
  dragPan: boolean | DragPanOptions,
  keyboard: boolean,
  doubleClickZoom: boolean,
  touchZoomRotate: boolean | {
    around?: 'center'
  },
  touchPitch: boolean,

  // View state
  viewState?: ViewState,

  // Style
  mapStyle: string | Style,
  styleDiffing: boolean,
  interactiveLayerIds?: [string],
  projection: string | object,
  renderWorldCopies: boolean

  // Callbacks
  onMouseDown?: (e: MapLayerMouseEvent) => void,
  onMouseUp?: (e: MapLayerMouseEvent) => void,
  onMouseOver?: (e: MapLayerMouseEvent) => void,
  onMouseMove?: (e: MapLayerMouseEvent) => void,
  onPreClick?: (e: MapLayerMouseEvent) => void,
  onClick?: (e: MapLayerMouseEvent) => void,
  onDblClick?: (e: MapLayerMouseEvent) => void,
  onMouseEnter?: (e: MapLayerMouseEvent) => void,
  onMouseLeave?: (e: MapLayerMouseEvent) => void,
  onMouseOut?: (e: MapLayerMouseEvent) => void,
  onContextMenu?: (e: MapLayerMouseEvent) => void,
  onWheel?: (e: MapWheelEvent) => void,
  onTouchStart?: (e: MapLayerTouchEvent) => void,
  onTouchEnd?: (e: MapLayerTouchEvent) => void,
  onTouchMove?: (e: MapLayerTouchEvent) => void,
  onTouchCancel?: (e: MapLayerTouchEvent) => void,
  
  onResize?: (e: ViewStateChangeEvent) => void,
  onMoveStart?: (e: ViewStateChangeEvent) => void,
  onMove?: (e: ViewStateChangeEvent) => void,
  onMoveEnd?: (e: ViewStateChangeEvent) => void,
  onDragStart?: (e: ViewStateChangeEvent) => void,
  onDrag?: (e: ViewStateChangeEvent) => void,
  onDragEnd?: (e: ViewStateChangeEvent) => void,
  onZoomStart?: (e: ViewStateChangeEvent) => void,
  onZoom?: (e: ViewStateChangeEvent) => void,
  onZoomEnd?: (e: ViewStateChangeEvent) => void,
  onRotateStart?: (e: ViewStateChangeEvent) => void,
  onRotate?: (e: ViewStateChangeEvent) => void,
  onRotateEnd?: (e: ViewStateChangeEvent) => void,
  onPitchStart?: (e: ViewStateChangeEvent) => void,
  onPitch?: (e: ViewStateChangeEvent) => void,
  onPitchEnd?: (e: ViewStateChangeEvent) => void,
  onBoxZoomStart?: (e: ViewStateChangeEvent) => void,
  onBoxZoomEnd?: (e: ViewStateChangeEvent) => void,
  onBoxZoomCancel?: (e: ViewStateChangeEvent) => void,
  
  onLoad?: (e: MapboxEvent) => void,
  onRender?: (e: MapboxEvent) => void,
  onIdle?: (e: MapboxEvent) => void,
  onError?: (e: ErrorEvent) => void,
  onRemove?: (e: MapboxEvent) => void
} & ViewState;

const pointerEvents = {
  mousedown: 'onMouseDown',
  mouseup: 'onMouseUp',
  mouseover: 'onMouseOver',
  mousemove: 'onMouseMove',
  preclick: 'onPreClick',
  click: 'onClick',
  dblclick: 'onDblClick',
  mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave',
  mouseout: 'onMouseOut',
  contextmenu: 'onContextMenu',
  wheel: 'onWheel',
  touchstart: 'onTouchStart',
  touchend: 'onTouchEnd',
  touchmove: 'onTouchMove',
  touchcancel: 'onTouchCancel'
};
const cameraEvents = {
  resize: "onResize",
  movestart: 'onMoveStart',
  move: 'onMove',
  moveend: 'onMoveEnd',
  dragstart: 'onDragStart',
  drag: 'onDrag',
  dragend: 'onDragEnd',
  zoomstart: 'onZoomStart',
  zoom: 'onZoom',
  zoomend: 'onZoomEnd',
  rotatestart: 'onRotateStart',
  rotate: 'onRotate',
  rotateend: 'onRotateEnd',
  pitchstart: 'onPitchStart',
  pitch: 'onPitch',
  pitchend: 'onPitchEnd',
  boxzoomstart: 'onBoxZoomStart',
  boxzoomend: 'onBoxZoomEnd',
  boxzoomcancel: 'onBoxZoomCancel'
};
const lifeCycleEvents = {
  load: 'onLoad',
  render: 'onRender',
  idle: 'onIdle',
  error: 'onError',
  remove: 'onRemove'
};
const settingNames: (keyof MapboxProps)[] = [
  'minZoom',
  'maxZoom',
  'minPitch',
  'maxPitch',
  'maxBounds',
  'projection',
  'renderWorldCopies'
];
const handlerNames: (keyof MapboxProps)[] = [
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
  // mapboxgl.Map instance
  map: any = null;
  // User props
  props: MapboxProps;

  // Mapbox map is stateful and map.transform tracks its view states
  // During method calls/user interactions, the transform is constantly mutated
  // In order to control the map with React props, we swap out the transform
  // with the one below during event callbacks and each render frame
  // This one always reflects the correct view state as user-supplied props
  // override the underlying state
  private _renderTransform: Transform;
  
  // Internal states
  private _isDirty: boolean = false;
  private _updating: boolean = false;
  private _inRender: boolean = false;
  private _nextProps: MapboxProps | null;

  constructor(props: MapboxProps) {
    this.props = props;
  }

  setProps(props: MapboxProps) {
    if (this._inRender) {
      this._nextProps = props;
      return;
    }

    const oldProps = this.props;
    this.props = props;

    const settingsChanged = this._updateSettings(props, oldProps);
    if (settingsChanged) {
      this._renderTransform = this.map.transform.clone();
    }
    const viewStateChanged = this._updateViewState(props);
    this._updateStyle(props, oldProps);
    this._updateHandlers(props, oldProps);

    // If 1) view state has changed to match props and
    //    2) the props change is not triggered by map interaction,
    // it's likely driven by an external state change. Redraw immediately
    if (settingsChanged || (viewStateChanged && this._isDirty)) {
      this.redraw();
    }
  }

  initialize(container: HTMLDivElement) {
    const {props} = this;
    const mapOptions = {
      ...props,
      ...props.initOptions,
      accessToken: props.mapboxAccessToken || getAccessTokenFromEnv() || null,
      container,
      style: props.mapStyle,
    };

    const viewState = mapOptions.viewState || mapOptions;
    Object.assign(mapOptions, {
      center: [viewState.longitude || 0, viewState.latitude || 0],
      zoom: viewState.zoom || 0,
      pitch: viewState.pitch || 0,
      bearing: viewState.bearing || 0
    });
    const map: any = new mapboxgl.Map(mapOptions);
    if (viewState.padding) {
      map.setPadding(viewState.padding);
    }
    this._renderTransform = map.transform.clone();

    // Hack
    // Insert code into map's render cycle
    const renderMap = map._render;
    map._render = this._render.bind(this, renderMap);
    const runRenderTaskQueue = map._renderTaskQueue.run;
    map._renderTaskQueue.run = (arg: number) => {
      runRenderTaskQueue.call(map._renderTaskQueue, arg);
      this._onBeforeRepaint();
    };
    // Insert code into map's event pipeline
    const fireEvent = map.fire;
    map.fire = this._fireEvent.bind(this, fireEvent);

    // add listeners
    for (const eventName in pointerEvents) {
      map.on(eventName, this._onPointerEvent);
    }
    for (const eventName in cameraEvents) {
      map.on(eventName, this._onCameraEvent);
    }
    for (const eventName in lifeCycleEvents) {
      map.on(eventName, this._onLifeCycleEvent);
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

  // Adapted from map.jumpTo
  /* Update camera to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if anything is changed
   */
  _updateViewState(nextProps: MapboxProps): boolean {
    const {map} = this;
    const tr = map.transform;
    // About to mutate the transform, take a snapshot of its state
    const fromViewState = transformToViewState(tr);
    const changed = applyViewStateToTransform(tr, nextProps);

    if (changed) {
      this._updating = true;
      map.fire('movestart').fire('move');

      if (fromViewState.zoom !== tr.zoom) {
        map.fire('zoomstart').fire('zoom').fire('zoomend');
      }

      if (fromViewState.bearing !== tr.bearing) {
        map.fire('rotatestart').fire('rotate').fire('rotateend');
      }

      if (fromViewState.pitch !== tr.pitch) {
        map.fire('pitchstart').fire('pitch').fire('pitchend');
      }

      map.fire('moveend');
      this._updating = false;
    }

    return changed;
  }

  /* Update camera constraints and projection settings to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if anything is changed
   */
  _updateSettings(nextProps: MapboxProps, currProps: MapboxProps): boolean {
    const {map} = this;
    let changed = false;
    for (const propName of settingNames) {
      if (!deepEqual(nextProps[propName], currProps[propName])) {
        changed = true;
        map[`set${propName[0].toUpperCase()}${propName.slice(1)}`]?.(nextProps[propName]);
      }
    }
    return changed;
  }

  /* Update map style to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if style is changed
   */
  _updateStyle(nextProps: MapboxProps, currProps: MapboxProps): boolean {
    if (nextProps.mapStyle !== currProps.mapStyle) {
      const options = {
        diff: nextProps.styleDiffing,
      };
      this.map.setStyle(nextProps.mapStyle, options);
      return true;
    }
    return false;
  }

  /* Update interaction handlers to match props
     @param {object} nextProps
     @param {object} currProps
     @returns {bool} true if anything is changed
   */
  _updateHandlers(nextProps: MapboxProps, currProps: MapboxProps): boolean {
    const { map } = this;
    let changed = false;
    for (const propName of handlerNames) {
      const newValue = nextProps[propName];
      if (!deepEqual(newValue, currProps[propName])) {
        changed = true;
        if (newValue) {
          map[propName].enable(newValue);
        } else {
          map[propName].disable();
        }
      }
    }
    return changed;
  }

  _onLifeCycleEvent = (e: MapboxEvent) => {
    // @ts-ignore
    const cb = this.props[lifeCycleEvents[e.type]];
    if (cb) {
      cb(e);
    }
  }

  _onPointerEvent = (e: MapLayerMouseEvent | MapLayerTouchEvent) => {
    // @ts-ignore
    const cb = this.props[pointerEvents[e.type]];
    if (cb) {
      if (this.props.interactiveLayerIds) {
        e.features = this.map.queryRenderedFeatures(e.point, {
          layers: this.props.interactiveLayerIds
        });
      }
      cb(e);
    }
  }

  _onCameraEvent = (e: MapboxEvent) => {
    if (this._updating) {
      return;
    }
    // @ts-ignore
    const cb = this.props[cameraEvents[e.type]];
    if (cb) {
      cb(e);
    }
  }

  _fireEvent(baseFire: Function, event: string | MapboxEvent, properties?: object) {
    const map = this.map;
    const tr = map.transform;

    const eventType = typeof event === 'string' ? event : event.type;
    switch (eventType) {
      case 'resize':
        this._renderTransform.resize(tr.width, tr.height);
        break;
      
      case 'move':
      case 'movestart':
        const changed = applyViewStateToTransform(this._renderTransform, {
          ...transformToViewState(tr),
          ...this.props
        });
        this._isDirty = this._isDirty || changed;
        break;
    }
    if (typeof event === 'object' && event.type in cameraEvents) {
      (event as ViewStateChangeEvent).viewState = transformToViewState(tr);
    }
    // Replace map.transform with ours during the callbacks
    map.transform = this._renderTransform;
    baseFire.call(map, event, properties);
    map.transform = tr;

    return map;
  }

  _render(baseRender: Function, arg: number) {
    const map = this.map;
    this._inRender = true;
    // map.transform will be swapped out in _onBeforeRender
    const tr = map.transform;
    baseRender.call(map, arg);
    map.transform = tr;
    this._inRender = false;
    this._isDirty = false;

    // We do not allow props to change during a render
    // When render is done, apply any pending changes
    if (this._nextProps) {
      this.setProps(this._nextProps);
      this._nextProps = null;
    }
  }

  _onBeforeRepaint() {
    // Make sure camera matches the current props
    this.map.transform = this._renderTransform;
  };
}

function getAccessTokenFromEnv(): string {
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
