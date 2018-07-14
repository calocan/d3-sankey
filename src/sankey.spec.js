import generateSankey from '../src/sankey';

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
  test('regular sankey', () => {
    const sankey = generateSankey().nodeWidth(15).nodePadding(10).extent([[1, 1], [959, 494]]);
    const energy = sankey(require("./samples/energy.json"));
    expect(energy.nodes.map(nodePosition)).toEqual(require("./samples/energy-nodes.json"));
    expect(energy.links.map(linkPosition)).toEqual(require("./samples/energy-links.json"));
  });

  test('geospatial sankey', () => {
    const sankey = generateSankey().nodeWidth(15).nodePadding(10).extent([[1, 1], [959, 494]])
      .geospatialPositioner(function (node) {
        return node;
      }).heightNormalizer(function (d) {
        return d.y1;
      });
    const energy = sankey(require("./samples/energy.json"));
    expect(energy.nodes.map(nodePosition)).toEqual(require("./samples/energy-nodes.json"));
    expect(energy.links.map(linkPosition)).toEqwual(require("./samples/energy-links.json"));
  });
});