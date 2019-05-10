import {ascending, min, sum} from 'd3-array';
import {map, nest} from 'd3-collection';
import {justify} from './align';
import constant from './constant';
import {scaleLinear} from 'd3-scale';

function ascendingSourceBreadth(a, b) {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}

function ascendingTargetBreadth(a, b) {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}

function ascendingBreadth(a, b) {
  return a.y0 - b.y0;
}

function value(d) {
  return d.value;
}

function nodeCenter(node) {
  return (node.y0 + node.y1) / 2;
}

function weightedSource(link) {
  return nodeCenter(link.source) * link.value;
}

function weightedTarget(link) {
  return nodeCenter(link.target) * link.value;
}

function defaultId(d) {
  return d.index;
}

function defaultNodes(graph) {
  return graph.nodes;
}

function defaultLinks(graph) {
  return graph.links;
}

function find(nodeById, id) {
  let node = nodeById.get(id);
  if (!node) {
throw new Error('missing: ' + id);
}
  return node;
}

export default function () {
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1, // extent
    dx = 24, // nodeWidth
    py = 8, // nodePadding
    id = defaultId,
    align = justify,
    nodes = defaultNodes,
    links = defaultLinks,
    iterations = 32,
    geospatialPositioner = null,
    // A function that expects options, minValue, maxValue of all nodes and a
    // node and returns a normalized height, y1, for geospatial mode
    heightNormalizer = null,
    // A function that expects a node an returns a normalized width, x1, for geospatial mode
    widthNormalizer = null,
    linkWidthNormalizer = null;

  function sankey() {
    let graph = {nodes: nodes.apply(null, arguments), links: links.apply(null, arguments)};
    if (geospatialPositioner) {
      computeNodeLinks(graph);
      computeNodeValues(graph);
      computeGeospatialNodeDepths(graph);
      // This is normally done by computeNodeBreadths, which we don't use
      computeGeospatialLinkWidths(graph);
      computeLinkBreadths(graph);
    } else {
      computeNodeLinks(graph);
      computeNodeValues(graph);
      computeNodeDepths(graph);
      computeNodeBreadths(graph, iterations);
      computeLinkBreadths(graph);
    }
    return graph;
  }

  sankey.update = function (graph) {
    computeLinkBreadths(graph);
    return graph;
  };

  sankey.nodeId = function (_) {
    return arguments.length ? (id = typeof _ === 'function' ? _ : constant(_), sankey) : id;
  };

  sankey.nodeAlign = function (_) {
    return arguments.length ? (align = typeof _ === 'function' ? _ : constant(_), sankey) : align;
  };

  sankey.nodeWidth = function (_) {
    return arguments.length ? (dx = +_, sankey) : dx;
  };

  sankey.nodePadding = function (_) {
    return arguments.length ? (py = +_, sankey) : py;
  };

  sankey.nodes = function (_) {
    return arguments.length ? (nodes = typeof _ === 'function' ? _ : constant(_), sankey) : nodes;
  };

  sankey.links = function (_) {
    return arguments.length ? (links = typeof _ === 'function' ? _ : constant(_), sankey) : links;
  };

  sankey.size = function (_) {
    return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
  };

  sankey.extent = function (_) {
    return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
  };

  sankey.iterations = function (_) {
    return arguments.length ? (iterations = +_, sankey) : iterations;
  };

  sankey.geospatialPositioner = function (_) {
    return arguments.length ? (geospatialPositioner = _, sankey) : geospatialPositioner;
  };

  sankey.heightNormalizer = function (_) {
    return arguments.length ? (heightNormalizer = _, sankey) : heightNormalizer;
  };

  sankey.widthtNormalizer = function (_) {
    return arguments.length ? (widthNormalizer = _, sankey) : widthNormalizer;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks(graph) {
    graph.nodes.forEach(function (node, i) {
      node.index = i;
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    let nodeById = map(graph.nodes, id);
    graph.links.forEach(function (link, i) {
      link.index = i;
      let source = link.source, target = link.target;
      if (typeof source !== 'object') {
source = link.source = find(nodeById, source);
}
      if (typeof target !== 'object') {
target = link.target = find(nodeById, target);
}
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues(graph) {
    graph.nodes.forEach(function (node) {
      node.value = Math.max(
        sum(node.sourceLinks, value),
        sum(node.targetLinks, value)
      );
    });
  }

  // Iteratively assign the depth (x-position) for each node.
  // Nodes are assigned the maximum depth of incoming neighbors plus one;
  // nodes with no incoming links are assigned depth zero, while
  // nodes with no outgoing links are assigned the maximum depth.
  function computeNodeDepths(graph) {
    let nodes, next, x;

    for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
      nodes.forEach(function (node) {
        // depth is the column position from left to right
        // A node that is only a target has maximum depth
        // A node that is only a source has 0 depth
        node.depth = x;
        node.sourceLinks.forEach(function (link) {
          if (next.indexOf(link.target) < 0) {
            next.push(link.target);
          }
        });
      });
    }

    for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
      nodes.forEach(function (node) {
        // height is the column position from right to left
        // A node that is only a source has maximum height
        // A node that is only a target has 0 height
        node.height = x;
        node.targetLinks.forEach(function (link) {
          if (next.indexOf(link.source) < 0) {
            next.push(link.source);
          }
        });
      });
    }

    // kx is the column width of the view minus the padding between nodes divided by the number of columns
    // If there are only two columns kx is the whole view width
    // If there are three columns key is half the view width, etc
    let kx = (x1 - x0 - dx) / (x - 1);
    graph.nodes.forEach(function (node) {
      // The x0 position is between 0 and the max column index times the kx width
      // The x0 plus the node padding
      node.x1 = (node.x0 = x0 + Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x)))) * kx) + dx;
    });
  }

  /**
   * Disregards standard positioning and uses geospatial positioning
   * @param graph
   */
  function computeGeospatialNodeDepths(graph) {
    let nodeValues = graph.nodes.map(function (node) {
 return node.value;
}),
    minValue = Math.min.apply(undefined, nodeValues),
    maxNodeValue = Math.max.apply(undefined, nodeValues);
    graph.nodes.forEach(function (node) {
      Object.assign(node, {depth: 0, height: 0, x0: 0, y0: 0,
        x1: widthNormalizer ? widthNormalizer(node) : dx,
        y1: heightNormalizer ? heightNormalizer({minValue: minValue, maxValue: maxNodeValue}, node) : 1});
      Object.assign(node, geospatialPositioner(node));
    });
    let nodeHeights = graph.nodes.map(function (node) {
 return node.y1 - node.y0;
}),
    minNodeHeight = Math.min.apply(undefined, nodeHeights),
    maxNodeHeight = Math.max.apply(undefined, nodeHeights);
    let linkValues = graph.links.map(function (link) {
 return link.value;
}),
    minLinkValue = Math.min.apply(undefined, linkValues),
    maxLinkValue = Math.max.apply(undefined, linkValues);
    linkWidthNormalizer = scaleLinear().domain([minLinkValue, maxLinkValue]).range([minNodeHeight, maxNodeHeight]);
  }

  function computeColumns(graph) {
    return nest()
      .key(function (d) {
        return d.x0;
      })
      .sortKeys(ascending)
      .entries(graph.nodes)
      .map(function (d) {
        return d.values;
      });
  }

  function computeNodeBreadths(graph) {
    let columns = computeColumns(graph);

    initializeNodeBreadth();
    resolveCollisions();
    for (let alpha = 1, n = iterations; n > 0; --n) {
      relaxRightToLeft(alpha = alpha * 0.99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeBreadth() {
      let ky = computeKy(graph, columns);

      columns.forEach(function (nodes) {
        nodes.forEach(function (node, i) {
          node.y1 = (node.y0 = i) + node.value * ky;
        });
      });

      computeLinkWidths(graph, columns, ky);
    }


    function relaxLeftToRight(alpha) {
      columns.forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.targetLinks.length) {
            let dy = (sum(node.targetLinks, weightedSource) / sum(node.targetLinks, value) - nodeCenter(node)) * alpha;
            node.y0 = node.y0 + dy, node.y1 = node.y1 + dy;
          }
        });
      });
    }

    function relaxRightToLeft(alpha) {
      columns.slice().reverse().forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.sourceLinks.length) {
            let dy = (sum(node.sourceLinks, weightedTarget) / sum(node.sourceLinks, value) - nodeCenter(node)) * alpha;
            node.y0 = node.y0 + dy, node.y1 = node.y1 + dy;
          }
        });
      });
    }

    function resolveCollisions() {
      columns.forEach(function (nodes) {
        let node,
          dy,
          y = y0,
          n = nodes.length,
          i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingBreadth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y - node.y0;
          if (dy > 0) {
node.y0 = node.y0 + dy, node.y1 = node.y1 + dy;
}
          y = node.y1 + py;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y - py - y1;
        if (dy > 0) {
          y = (node.y0 = node.y0 - dy), node.y1 = node.y1 - dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y1 + py - y;
            if (dy > 0) {
node.y0 = node.y0 - dy, node.y1 = node.y1 - dy;
}
            y = node.y0;
          }
        }
      });
    }
  }

  function computeKy(graph, columns) {
    columns = columns || computeColumns(graph);
    return min(columns, function (nodes) {
      // Nominator is the total amount of screen height available minus the node padding
      // Denominator is the sum of all node values (which normally represents the y1-y0 of the node) in the column
      return (y1 - y0 - (nodes.length - 1) * py) / sum(nodes, value);
    });
  }

  function computeLinkWidths(graph, columns, ky) {
    ky = ky || computeKy(graph, columns);
    graph.links.forEach(function (link) {
      link.width = link.value * ky;
    });
  }

  // Normalize the link width to the height range of the nodes
  function computeGeospatialLinkWidths(graph) {
    graph.links.forEach(function (link) {
      link.width = linkWidthNormalizer(link.value);
    });
  }

  function computeLinkBreadths(graph) {
    graph.nodes.forEach(function (node) {
      node.sourceLinks.sort(ascendingTargetBreadth);
      node.targetLinks.sort(ascendingSourceBreadth);
    });
    graph.nodes.forEach(function (node) {
      let y0 = node.y1 + node.y0 / 2, y1 = y0;
      node.sourceLinks.forEach(function (link) {
        link.y0 = y0 + link.width / 2; // , y0 += link.width;
      });
      node.targetLinks.forEach(function (link) {
        link.y1 = y1 + link.width / 2; // , y1 += link.width;
      });
    });
  }

  return sankey;
}
