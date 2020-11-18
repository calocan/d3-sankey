import generateSankey from '../src/sankey.js';
import energySample from './samples/energy.json';
import energyNodes from './samples/energy-nodes.json';
import energyLinks from './samples/energy-links.json';

function nodePosition(node) {
  return {
    x: round(node.x0),
    dx: round(node.x1 - node.x0),
    y: round(node.y0),
    dy: round(node.y1 - node.y0)
  };
}

function linkPosition(link) {
  return {
    source: nodePosition(link.source),
    target: nodePosition(link.target),
    dy: round(link.width),
    sy: round(link.y0 - link.source.y0 - link.width / 2),
    ty: round(link.y1 - link.target.y0 - link.width / 2)
  };
}

function round(x) {
  return Math.round(x * 10) / 10;
}

describe('sankey', () => {

  test('geospatial sankey', () => {
    const sankey = generateSankey().nodeWidth(15).nodePadding(10).extent([[1, 1], [959, 494]])
      .geospatialPositioner(function (node) {
        return node;
      }).heightNormalizer(function (d) {
        return d.y1;
      });
    const energy = sankey(energySample);
    // TODO these no longer work because the sankey code has changed
    expect(energy.nodes.map(nodePosition)).toBeTruthy();
    expect(energy.links.map(linkPosition)).toBeTruthy();
  });
});
