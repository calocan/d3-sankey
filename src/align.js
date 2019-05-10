import {min} from 'd3-array';

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
