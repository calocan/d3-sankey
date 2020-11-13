import {min} from 'd3-array';
import {linkHorizontal} from 'd3-shape';

// TODO cleanup and document all this. It's from the original d3-sankey open source code

function targetDepth(d) {
  return d.target.depth;
}

export function left(node) {
  return node.depth;
}

export function right(node, n) {
  return n - 1 - node.height;
}

// n is the number of columns
// If there are source links, return the column index of the node. Otherwise default to the last column index
export function justify(node, n) {
  return node.sourceLinks.length ? node.depth : n - 1;
}

export function center(node) {
  const defaultCenter = (node.sourceLinks.length ? min(node.sourceLinks, targetDepth) - 1 : 0);
  return node.targetLinks.length ? node.depth : defaultCenter;
}

/**
 * Gets the link's source node leftmost x position and the link's bottom y position as a coordinates array.
 * This tells us where to start the link SVG
 * @param {Object} link Sankey link
 * @returns {[Number]} The coords
 */
function linkHorizontalSource(link) {
  return [link.source.x1, link.y0];
}

/**
 * Gets the link's target node leftmost x position and the link's bottom y position as a coordinates array.
 * This tells us where to start the link SVG
 * @param {Object} link Sankey link
 * @returns {[Number]} The coords
 */
function linkHorizontalTarget(link) {
  return [link.target.x0, link.y1];
}

export const sankeyLinkHorizontal = () => {
  return linkHorizontal()
    .source(linkHorizontalSource)
    .target(linkHorizontalTarget);
}


export function ascendingSourceBreadth(a, b) {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}

export function ascendingTargetBreadth(a, b) {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}

export function ascendingBreadth(a, b) {
  return a.y0 - b.y0;
}

export function value(d) {
  return d.value;
}

export function nodeCenter(node) {
  return (node.y0 + node.y1) / 2;
}

export function weightedSource(link) {
  return nodeCenter(link.source) * link.value;
}

export function weightedTarget(link) {
  return nodeCenter(link.target) * link.value;
}
