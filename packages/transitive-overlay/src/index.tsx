import React, { useEffect } from "react";
import { Layer, Source, useMap } from "react-map-gl";
import polyline from "@mapbox/polyline";
import {
  Leg,
  TransitiveData,
  TransitiveJourney,
  TransitivePattern,
  TransitivePlace
} from "@opentripplanner/types";
import bbox from "@turf/bbox";

import { itineraryToTransitive } from "./util";

export { itineraryToTransitive };

// TODO: BETTER COLORS
const modeColorMap = {
  CAR: "#888",
  BICYCLE: "#f00",
  SCOOTER: "#f5a729",
  MICROMOBILITY: "#f5a729",
  MICROMOBILITY_RENT: "#f5a729",
  WALK: "#86cdf9"
};

type Props = {
  activeLeg?: Leg;
  transitiveData: TransitiveData;
};
const TransitiveCanvasOverlay = ({
  activeLeg,
  transitiveData
}: Props): JSX.Element => {
  const { current: map } = useMap();

  transitiveData?.patterns.flatMap((pattern: TransitivePattern) =>
    pattern.stops
      .map(stop => stop.geometry)
      .filter(geometry => !!geometry)
      .map(geometry => polyline.toGeoJSON(geometry))
  );
  const geojson: GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    Record<any, any>
  > = {
    type: "FeatureCollection",
    // @ts-expect-error TODO: fix the type above for geojson
    features: [
      ...(transitiveData?.places || []).flatMap((place: TransitivePlace) => {
        return {
          type: "Feature",
          properties: { name: place.place_name, type: "place" },
          geometry: {
            type: "Point",
            coordinates: [place.place_lon, place.place_lat]
          }
        };
      }),
      ...(transitiveData?.journeys || []).flatMap(
        (journey: TransitiveJourney) =>
          journey.segments
            .filter(segment => segment.streetEdges?.length > 0)
            .map(segment => ({
              ...segment,
              geometries: segment.streetEdges.map(
                edge => transitiveData.streetEdges[edge]
              )
            }))
            .flatMap(segment => {
              return segment.geometries.map(geometry => {
                return {
                  type: "Feature",
                  properties: {
                    type: "street-edge",
                    color: modeColorMap[segment.type] || "#008",
                    mode: segment.type
                  },
                  geometry: polyline.toGeoJSON(geometry.geometry.points)
                };
              });
            })
      ),
      ...(transitiveData?.patterns || []).flatMap(
        (pattern: TransitivePattern) =>
          pattern.stops
            .map(stop => stop.geometry)
            .filter(geometry => !!geometry)
            .map(geometry => {
              const route = Object.entries(transitiveData.routes).find(
                r => r[1].route_id === pattern.route_id
              )[1];

              return {
                type: "Feature",
                properties: {
                  color: `#${route.route_color || "000080"}`,
                  name: route.route_short_name || route.route_long_name || "",
                  routeType: route.route_type,
                  type: "route"
                },
                geometry: polyline.toGeoJSON(geometry)
              };
            })
      )
    ]
  };

  const zoomToGeoJSON = geoJson => {
    const b = bbox(geoJson);
    const bounds: [number, number, number, number] = [b[0], b[1], b[2], b[3]];

    if (bounds.length === 4 && bounds.every(Number.isFinite)) {
      map?.fitBounds(bounds, {
        duration: 500,
        padding: window.innerWidth > 500 ? 200 : undefined
      });
    }
  };

  useEffect(() => {
    zoomToGeoJSON(geojson);
  }, [transitiveData]);

  useEffect(() => {
    if (!activeLeg?.legGeometry) return;
    zoomToGeoJSON(polyline.toGeoJSON(activeLeg.legGeometry.points));
  }, [activeLeg]);

  return (
    <Source data={geojson} id="itinerary" type="geojson">
      {/* Create a layer for each line type
          (conditional expressions are not supported for line-dash attributes). */}
      <Layer
        // This layer is for WALK modes - dotted path
        filter={["all", ["==", "type", "street-edge"], ["==", "mode", "WALK"]]}
        id="street-edges-walk"
        layout={{
          "line-cap": "round",
          "line-join": "round"
        }}
        paint={{
          // TODO: get from transitive properties
          "line-color": ["get", "color"],
          // First parameter of array is the length of the dash which is set to zero,
          // so that maplibre simply adds the rounded ends to make things look like dots.
          // Even so, note that maplibre still renders beans instead of dots
          // (as if maplibre fuses dots together).
          "line-dasharray": [0, 1.3],
          "line-opacity": 0.9,
          "line-width": 6
        }}
        type="line"
      />
      <Layer
        // This layer is for other modes - dashed path
        filter={["all", ["==", "type", "street-edge"], ["!=", "mode", "WALK"]]}
        id="street-edges"
        layout={{
          "line-cap": "butt"
        }}
        paint={{
          // TODO: get from transitive properties
          "line-color": ["get", "color"],
          "line-dasharray": [2, 1],
          // TODO: get from transitive properties
          "line-width": 4,
          "line-opacity": 0.9
        }}
        type="line"
      />
      <Layer
        filter={["==", "type", "route"]}
        id="routes"
        layout={{
          "line-join": "round",
          "line-cap": "round"
        }}
        paint={{
          "line-color": ["get", "color"],
          // Apply a thinner line (width = 6) for bus routes (route_type = 3), set width to 10 otherwise.
          "line-width": ["match", ["get", "routeType"], 3, 6, 10],
          "line-opacity": 1
        }}
        type="line"
      />
      <Layer
        filter={["==", "type", "route"]}
        id="routes-labels"
        layout={{
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-keep-upright": true,
          "text-size": 16
        }}
        paint={{
          "text-color": "#eee",
          "text-halo-blur": 15,
          "text-halo-color": ["get", "color"],
          "text-halo-width": 15
        }}
        type="symbol"
      />
      <Layer filter={["==", "type", "place"]} id="places" type="circle" />
      <Layer
        filter={["==", "type", "place"]}
        id="places-labels"
        layout={{
          "symbol-placement": "point",
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-anchor": "top",
          "text-padding": 5,
          "text-optional": true,
          "text-allow-overlap": false
        }}
        paint={{ "text-translate": [0, 5] }}
        type="symbol"
      />
    </Source>
  );
};

export default TransitiveCanvasOverlay;
