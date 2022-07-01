import React, { useCallback, useEffect, useState } from "react";
import { MapProps, MapRef, Map, MapProvider } from "react-map-gl";
import maplibregl, { Event } from "maplibre-gl";

import * as Styled from "./styled";
import callIfValid from "./util";
import MarkerWithPopup from "./MarkerWithPopup";

/**
 * The BaseMap component renders a MapLibre map
 * markers that are declared as child elements of the BaseMap element.
 *
 * As BaseMap wraps a react-map-gl Map component, ny control which can be added as a child of a react-map-gl map is supported.
 * See https://visgl.github.io/react-map-gl/docs/api-reference/map to see which react-map-gl
 * children are shipped by default. Others are also supported.
 *
 * Overlays are groups of similar MapLibre markers, e.g. vehicle location
 * markers, bus stop markers, etc.
 *
 * Overlays are automatically added to the overlay control displayed by the
 * BaseMap. The user uses that control to turn overlays on or off. Only overlays
 * with an id are added to the control.
 */
type Props = React.ComponentPropsWithoutRef<React.ElementType> & {
  baseLayer?: string;
  center?: [number, number];
  forceMaxHeight?: boolean;
  mapLibreProps?: MapProps;
  maxZoom?: number;
  onClick?: (evt: Event) => void;
  // Unknown is used here because of a maplibre/mapbox issue with the true type, MapLayerMouseEvent
  onContextMenu?: (e: unknown) => void;
  // TODO: does this cause integration issues?
  onViewportChanged?: (e: maplibregl.MapLibreEvent) => void;
  passedRef?: React.Ref<MapRef>;
  zoom?: number;
};
type State = {
  latitude: number;
  longitude: number;
  zoom: number;
  fitBoundsOptions?: Record<string, number | string | boolean>;
};

const BaseMap = ({
  // These tiles are free to use, but not in production
  baseLayer = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center,
  children,
  forceMaxHeight,
  mapLibreProps,
  maxZoom,
  onClick,
  onContextMenu,
  passedRef,
  onViewportChanged,
  zoom: initZoom = 12
}: Props): JSX.Element => {
  const [viewState, setViewState] = React.useState<State>({
    fitBoundsOptions: {
      animate: true,
      duration: 300,
      essential: false,
      maxDuration: 600,
      padding: 200
    },
    latitude: center?.[0],
    longitude: center?.[1],
    zoom: initZoom
  });
  const [fakeMobileHover, setFakeMobileHover] = useState(false);

  useEffect(() => {
    callIfValid(onViewportChanged)(viewState);
  }, [viewState]);

  useEffect(() => {
    if (center?.[0] === null || center?.[1] === null) return;

    setViewState({
      ...viewState,
      latitude: center?.[0],
      longitude: center?.[1]
    });
  }, [center]);

  const toggleableLayers = Array.isArray(children)
    ? children
        .flat()
        .filter(child => child?.props?.id !== undefined)
        .map(child => {
          const { visible, name, id } = child.props;
          return { visible, name, id };
        })
    : [];

  const [hiddenLayers, setHiddenLayers] = useState(
    toggleableLayers.filter(layer => !layer?.visible).map(layer => layer.id)
  );

  const adjustHiddenLayers = useCallback(
    id => {
      const updatedLayers = [...hiddenLayers];
      // Delete the layer id if present, add it otherwise
      updatedLayers.includes(id)
        ? updatedLayers.splice(updatedLayers.indexOf(id), 1)
        : updatedLayers.push(id);

      setHiddenLayers(updatedLayers);
    },
    [hiddenLayers]
  );

  return (
    <MapProvider>
      <Map
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...mapLibreProps}
        ref={passedRef}
        id="mainMap"
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        mapLib={maplibregl}
        mapStyle={baseLayer}
        maxZoom={maxZoom}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMove={evt => setViewState(evt.viewState)}
        onTouchStart={() => {
          setFakeMobileHover(false);
        }}
        style={{
          display: "block",
          height: forceMaxHeight ? "90vh" : "100%",
          width: "100%"
        }}
        zoom={viewState.zoom}
      >
        {toggleableLayers.length > 0 && (
          // TODO: Mobile view
          <Styled.LayerSelector
            onTouchEnd={() => {
              setFakeMobileHover(true);
            }}
            className="filter-group"
            id="filter-group"
          >
            <ul
              className={`layers-list ${fakeMobileHover &&
                "fake-mobile-hover"}`}
            >
              {toggleableLayers.map((layer: LayerProps, index: number) => {
                return (
                  <li key={index}>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label>
                      <input
                        checked={!hiddenLayers.includes(layer.id)}
                        id={layer.id}
                        onChange={() => adjustHiddenLayers(layer.id)}
                        type="checkbox"
                      />
                      {layer.name || layer.id}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Styled.LayerSelector>
        )}
        {Array.isArray(children)
          ? children
              .flat()
              .filter(child => !hiddenLayers.includes(child?.props?.id))
          : children}
      </Map>
    </MapProvider>
  );
};

export default BaseMap;

type LayerProps = React.ComponentPropsWithoutRef<React.ElementType> & {
  id: string;
  name?: string;
  visible?: boolean;
};
const LayerWrapper = (props: LayerProps): JSX.Element => {
  const { children, visible } = props;
  return <>{visible && children}</>;
};

export { LayerWrapper, MarkerWithPopup, Styled };
