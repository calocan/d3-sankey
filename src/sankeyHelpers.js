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
import {resolveFeatureFromExtent, resolveSvgPoints} from '@rescapes/helpers';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import center from '@turf/center';
import rhumbDistance from '@turf/rhumb-distance';
import rhumbBearing from '@turf/rhumb-bearing';
import transformTranslate from '@turf/transform-translate';
import {scaleLinear} from 'd3-scale';
import {reqStrPathThrowing, memoized, strPathOr, reqStrPath} from '@rescapes/ramda';
import {v} from '@rescapes/validate';
import PropTypes from 'prop-types';
import sankey from './sankey.js';

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
export const sankeyGenerator = memoized(v((
  {viewport, width, height, nodeWidth, nodePadding, geospatialPositioner, valueKey},
  sankeyData
) => {
  // d3 mutates the data
  const data = R.clone(sankeyData);
  // Normalize heights to range from 10 pixes to 100 pixels independent of the zoom
  const heightNormalizer = ({minValue, maxValue}, node) => {
    const normalized = scaleLinear()
      .domain([minValue, maxValue])
      .range([10, 100])(reqStrPathThrowing('value', node));
    if (!normalized) {
      throw new Error(`Failed to normalize y1 using minValue: ${minValue}, maxValue: ${maxValue} and node value: ${reqStrPathThrowing('value', node)}`);
    }
    return normalized;
  };

  // Create a sankey generator
  const generator = sankey()
    // TODO pass from parent
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .geospatialPositioner(R.defaultTo(null, geospatialPositioner))
    .heightNormalizer(heightNormalizer)
    .extent([[1, 1], [width, height]]);

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
  generator(update);
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

const aberrateIfNeeded = (graph, featureNode, feature) => {
  // Aberrate the location if the node's position is generalized.
  // This keeps node from all being on top of each other until we get a better visualization component some day
  return R.when(
    () => R.propOr(false, 'isGeneralized', featureNode),
    _featureNode => {
      // Make the distance 1km
      const distance = 1;
      // Multiply the index by the percent angle allocated to each node with the same coordinates
      const coordinates = strPathOr([0, 0], 'geometry.coordinates', _featureNode);
      const direction = R.propOr(0, 'index', featureNode) * (360 /
        R.compose(
          R.length,
          nodes => R.filter(
            node => R.compose(
              coord => R.equals(coordinates, coord),
              n => strPathOr([0, 0], 'geometry.coordinates', n)
            )(node),
            nodes
          ),
          R.propOr([], 'nodes')
        )(graph)
      );
      return transformTranslate.default(feature, distance, direction);
    }
  )(feature);
};

/**
 * Translates the given Sankey node to the position of its geometry.
 * @param {Object} graph The full sankey graph used for context only
 * @param {Object} opt Mapbox projection object that contains the unproject function
 * @param {Object} featureNode The sankey node that is also a Feature (has geometry.coordinates)
 * @returns {Object} x0, y0, x1, y1 cooridinates to assign the node as well as an object pointData
 * that contains different point representations:
 * pointData.feature is the projected SVG shape of the geometry of the featureNode. This could be a point, polygon, etc
 * pointData.bbox is a polygon of the bounding box of the node's original x0, y0, x1, y1 translated around the center
 * of the geometry of the feature node.
 * pointData.center is the center point of the geometry of the featureNode
 */
export const sankeyGeospatialTranslate = R.curry((graph, opt, featureNode) => {
    const feature = R.compose(
      f => aberrateIfNeeded(graph, featureNode, f),
      // Translate the feature to the center of the node's coordinates (because the node itself is a feature)
      f => translateNodeFeature(f, featureNode),
      // Next generate a feature from the lat/lon rectangle of the nodes
      nodeToFeature,
      // First unproject the node from pixels to lat/lon
      unprojectNode(opt)
    )(featureNode);

    const boundingBox = bbox.dfeault(feature);
    // Project it to two x,y coordinates
    const bounds = projectBoundingBox(opt, boundingBox);


    return R.merge({
        // Provide various ways to render the node
        pointData: {
          feature: resolveSvgPoints(opt, feature),
          bbox: resolveSvgPoints(opt, bboxPolygon.default(boundingBox)),
          center: resolveSvgPoints(center.default(feature))
        }
      },
      // x0, y0, x1, y1
      bounds
    );
  }
);

/**
 * Calculate the projected value of the bounding box points and return Sankey Node friendly
 * x0, y0, x1, y1
 * @param {Object} opt The react-map-gl projection objet
 * @param {Number[]} bbox Simple 4 element bounding box [x0, y0, x1, y1]
 * @return {Object} The x0, y0, x1, y1 bounds
 */
export const projectBoundingBox = R.curry((opt, theBbox) => {
  // Get the bounding box of the feature
  const [_x0, _y0, _x1, _y1] = theBbox;
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
export const nodeToFeature = node => {
  // Add a feature to the node
  // The shape generated by sankeyd3 as a polygon feature
  return resolveFeatureFromExtent(
    R.map(reqStrPathThrowing(R.__, node), ['x0', 'y0']),
    R.map(reqStrPathThrowing(R.__, node), ['x1', 'y1'])
  );
};

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
  const moveFromCenterPoint = center.default(sourceFeature);
  // Translate its position to here
  const moveToCenterPoint = center.default(targetFeature);
  const distance = rhumbDistance.default(moveFromCenterPoint, moveToCenterPoint);
  const bearing = rhumbBearing.default(moveFromCenterPoint, moveToCenterPoint);
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
 * @return {String} The resolved stage
 */
export const resolveLinkStage = (stageKey, d) => resolveNodeStage(
  stageKey,
  // Resolve the node
  d.target
);

/**
 * Resolves the stage from the target of the node
 * @param {String} stageKey The key indicating the stage name in the properties/propertyValues
 * @param {Object} datum The node to resolve the link stage of
 * @return {String} The resolved stage
 */
export const resolveNodeStage = (stageKey, datum) => R.compose(
  R.propOr('Unknown', stageKey),
  d => propertyObj(d)
)(datum);

/**
 * Resolve the node name of the given name
 * If the location of the node ahs been generalized add it to the name so users know
 * it isn't in an exact location.
 * @param {String} nodeNameKey The node key to use for the name value
 * @param {String} valueKey The node key to use for the value of the node
 * @param {Function} valueFormatter Formats the value to a string so it can have a type, currency, etc
 * @param {Object} datum The node
 * @param {Boolean} [datum.isGeneralized] Optional boolean to indicate if the location of the node has been generalized
 * because the exact location is not known
 * @return {String} The resolved node name
 */
export const resolveNodeName = (nodeNameKey, valueKey, valueFormatter, datum) => {
  const obj = propertyObj(datum);
  // Get the node name or report an unknown site
  const nodeName = R.propOr('Unknown site', nodeNameKey, obj);
  const generalizedLabel = R.ifElse(
    d => R.propOr(false, 'isGeneralized', d),
    () => ' (general location)',
    () => '')(datum);
  const valueLabel = reqStrPath(valueKey, obj).matchWith({
    // Format the value with the valueFormatter
    Ok: ({value}) => valueFormatter(value),
    // Report Unknown value
    Error: () => 'Unknown'
  });
  return `${nodeName}${generalizedLabel}\n${valueLabel}`;
};

export const propertyObj = datum => {
  return R.compose(
    R.fromPairs,
    d => R.zip(
      strPathOr([], 'properties', d),
      strPathOr([], 'propertyValues', d)
    )
  )(datum);
};