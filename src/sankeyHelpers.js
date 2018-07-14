/**
 * Created by Andy Likuski on 2017.11.15
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import {sankey} from 'rescape-geospatial-sankey';
import {asUnaryMemoize} from './selectorHelpers';
import {resolveFeatureFromExtent, resolveSvgPoints} from './svgHelpers';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import center from '@turf/center';
import rhumbDistance from '@turf/rhumb-distance';
import rhumbBearing from '@turf/rhumb-bearing';
import transformTranslate from '@turf/transform-translate';
import {scaleLinear} from 'd3-scale';
import parseDecimalNumber from 'parse-decimal-number';
import {reqStrPathThrowing} from 'rescape-ramda';
import {v} from 'rescape-validate';
import PropTypes from 'prop-types';

/**
 * This needs to be debugged
 * @param {Object} opt Mapbox object that has project function
 * @param {Number} width The width of the containing svg element
 * @param {Number} height The height of the cankentaining svg element
 * @param {Number} nodeWidth
 * @param {Number} nodePadding
 * @param {Boolean} [geospatial] Default to true. If true use geospatial positions for the nodes, otherwise use
 * columns
 * @param {Object} sankeyData. An object with a nodes key and links key
 * @param {Object[]} sankeyData.nodes A list of objects that must have a name at a minimum
 * @param {Object[]} sankeyData.links A list of objects that must have a source and target index into the
 * nodes array and must have a value indicating the weight of the headerLink
 * @returns {null}
 */
export const sankeyGenerator = asUnaryMemoize(v(({width, height, nodeWidth, nodePadding, geospatialPositioner, valueKey}, sankeyData) => {
  // d3 mutates the data
  const data = R.clone(sankeyData);
  // Normalize heights to range from 10 pixes to 100 pixels independent of the zoom
  const heightNormalizer = ({minValue, maxValue}, node) => {
    const normalized = scaleLinear()
      .domain([minValue, maxValue])
      .range([10, 100])(parseDecimalNumber(reqStrPathThrowing('value', node)));
    if (!normalized.y1)
      throw new Error(`Failed to normalize y1 using minValue: ${minValue}, maxValue: ${maxValue} and node value: ${parseDecimalNumber(reqStrPathThrowing('value', node))}`);
    return normalized;
  };

  // Create a sankey generator
  const sankeyGenerator = sankey()
  // TODO pass from parent
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .geospatialPositioner(R.defaultTo(null, geospatialPositioner))
    .heightNormalizer(heightNormalizer)
    .extent([[1, 1], [width, height]]);

  // Map sample nodes to sample features
  /*
  const features = R.zipWith((node, feature) =>
      mergeDeep(
        feature,
        {
          name: feature.properties.name || node.name,
          properties: {
            name: feature.properties.name || node.name
          }
        }
      ),
    data.nodes,
    R.uniqBy(feature => feature.properties.name, BART_SAMPLE.features)
  );*/

  // Call the generator with the features as nodes and the original links
  // This updates the links and nodes.
  //
  // It gives each node a sourceLinks array  and a targetLinks array that reference the links. It also gives each node
  // an x0, y0, x1, y2 to indicate its rectangular bounds. It also gives an index, depth, and value (not sure what
  // depth and value are for yet. value is calculate from the headerLink values)

  // It gives each a source and target reference to its nodes as well as
  // a y0, y1, and width to indicate its start y and end y and width of the path
  // The y0 and y1 are some portion of the vertical service of the two nodes (I think),
  // although there must be more to it since they have to attach to two nodes at different y positions
  // It also gives each headerLink an index
  const update = {links: data.links, nodes: data.nodes};
  sankeyGenerator(update);
  return update;
}, [
  ['_first', PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    nodeWidth: PropTypes.number.isRequired,
    nodePadding: PropTypes.number.isRequired,
    geospatialPositioner: PropTypes.func.isRequired,
    valueKey: PropTypes.string.isRequired
  }).isRequired],
  ['sankeyData', PropTypes.shape({
    nodes: PropTypes.array.isRequired,
    links: PropTypes.array.isRequired
  })]
], 'sankeyGenerator'));

/***
 * Unprojects a node's x0, y0, x1, and y1 by unprojecting from pixels to lat/lon
 * @param {Object} opt
 * @param {Function} opt.unproject unprojects screen coords to lat/lon coords
 * @param {Object} node The node to unproject points for
 * @param {Number} node.x0
 * @param {Number} node.y0
 * @param {Number} node.x1
 * @param {Number} node.y1
 *
 */
export const unprojectNode = R.curry((opt, node) => {
  const nodeProp = R.prop(R.__, node);
  const [[x0, y0], [x1, y1]] = R.map(
    ([x, y]) => opt.unproject([nodeProp(x), nodeProp(y)]),
    [['x0', 'y0'], ['x1', 'y1']]
  );
  return R.merge(node, {x0, y0, x1, y1});
});

/**
 * Translates the given Sankey node to the position of its geometry.
 * @param {Object} opt Mapbox projection object that contains the unproject function
 * @param {Object} featureNode The sankey node that is also a Feature (has geometry.coordinates)
 * @returns {Object} x0, y0, x1, y1 cooridinates to assign the node as well as an object pointData
 * that contains different point representations:
 * pointData.feature is the projected SVG shape of the geometry of the featureNode. This could be a point, polygon, etc
 * pointData.bbox is a polygon of the bounding box of the node's original x0, y0, x1, y1 translated around the center
 * of the geometry of the feature node.
 * pointData.center is the center point of the geometry of the featureNode
 */
export const sankeyGeospatialTranslate = R.curry((opt, featureNode) => {
    const feature = R.compose(
      // Translate the feature to the center of the node's coordinates (because the node itself is a feature)
      translateNodeFeature(R.__, featureNode),
      // Next generate a feature from the lat/lon rectangle of the nodes
      nodeToFeature,
      // First unproject the node from pixels to lat/lon
      unprojectNode(opt)
    )(featureNode);

    const boundingBox = bbox(feature);
    // Project it to two x,y coordinates
    const bounds = projectBoundingBox(opt, boundingBox);

    return {
      // Provide various ways to render the node
      pointData: {
        feature: resolveSvgPoints(opt, feature),
        bbox: resolveSvgPoints(opt, bboxPolygon(boundingBox)),
        center: resolveSvgPoints(center(feature))
      },
      // x0, y0, x1, y1
      ...bounds
    };
  }
);

/**
 * Calculate the projected value of the bounding box points and return Sankey Node friendly
 * x0, y0, x1, y1
 * @param {Object} opt The react-map-gl projection objet
 * @param {Number[]} bbox Simple 4 element bounding box [x0, y0, x1, y1]
 * @return {Object} The x0, y0, x1, y1 bounds
 */
export const projectBoundingBox = R.curry((opt, bbox) => {
  // Get the bounding box of the feature
  const [_x0, _y0, _x1, _y1] = bbox;
  const [[x0, y0], [x1, y1]] = [opt.project([_x0, _y0]), opt.project([_x1, _y1])];
  // Flip the ys. bbox geospatially will have y0 < y1 (geospatial increases up (north),
  // but as pixels increase from top to bottom of the screen
  return {x0, y0: y1, x1, y1: y0};
});

/**
 * Translates a d3 Sankey node to a feature that is a polygon around the node's bounding box (x0, y0 to x1, y1)
 * The node would typically have unprojected coordinates that this point
 * @param {Object} node Node with x0, y0, x1, y2, typically as lat/lon pairs
 * @return {Object} A Feature with a geometry containing the type (Polygon) and coordinates
 */
export const nodeToFeature = node =>
  // Add a feature to the node
  // The shape generated by sankeyd3 as a polygon feature
  resolveFeatureFromExtent(
    R.map(reqStrPathThrowing(R.__, node), ['x0', 'y0']),
    R.map(reqStrPathThrowing(R.__, node), ['x1', 'y1'])
  );

/**
 * Given a d3 Sankey node and its feature representation (as created by nodeToFeature) transform
 * the feature coordinates to the the coordinates stored with the node
 * This assumes that the node has a node.geometry.coordinates (i.e. the node itself is also a feature)
 * Thanks the center of node.geometry.coordinates and translates the given feature from its own center
 * to that of node.geometry.coordinates.
 *
 * The purpose of this function is to calculate spatial coordinates for a sankey node that was dynamically
 * calculated by d3 sankey to layout relative to other nodes. We need to reposition it on the map
 * @param {Object} node d3 Sankey node
 * @param {Object} feature geojson Feature that is a polygon representing the node's x0, y0 and x1, y1 bounding box
 * @returns {Object} A new feature with the translated position
 */
export const translateNodeFeature = R.curry((sourceFeature, targetFeature) => {
  // Translate from the feature center
  const moveFromCenterPoint = center(sourceFeature);
  // Translate its position to here
  const moveToCenterPoint = center(targetFeature);
  const distance = rhumbDistance(moveFromCenterPoint, moveToCenterPoint);
  const bearing = rhumbBearing(moveFromCenterPoint, moveToCenterPoint);
  return transformTranslate(sourceFeature, distance, bearing);
});

/**
 * Builds the link stages from the given stages based on the order of the stages
 * e.g. [a, b, c] -> {source: a, target: b}, {source: b, target: c}
 * @param {[String]} stages List of Sankey stages
 * @return {*} A list of objects where the chained stages are sources and targets. key and name are also added
 */
export const makeLinkStages = stages => R.zipWith(
  (source, target) => ({
    key: R.join('-', R.map(R.prop('key'), [source, target])),
    name: R.join(' -> ', R.map(R.prop('name'), [source, target])),
    source,
    target
  }),
  R.slice(0, -1, stages), R.slice(1, Infinity, stages)
);

/**
 * Resolves the stage from the target of the node
 * @param {String} stageKey The stage name
 * @param {Object} d The node to resolve the link stage of
 * @return {function(*)}
 */
export const resolveLinkStage = R.curry((stageKey, d) => d.target[stageKey]);

/**
 * Resolves the stage from the target of the node
 * @param {String} stageKey The stage name
 * @param {Object} d The node to resolve the link stage of
 * @return {function(*): *}
 */
export const resolveNodeStage = R.curry((stageKey, d) => d => d[stageKey]);

/**
 * Resolve the node name of the given name
 * If the location of the node ahs been generalized add it to the name so users know
 * it isn't in an exact location.
 * TODO this is totally specific to Belgium. Update
 * @param {String} valueKey The node key to use for the name value
 * @param {Object} d The node
 * @return {string}
 */
export const resolveNodeName = R.curry((valueKey, d) => `${d.siteName} ${d.isGeneralized ? ' (general location)' : ''}\n${d[valueKey]} t`);
