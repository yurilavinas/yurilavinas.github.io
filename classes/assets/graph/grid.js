// Grid generator for http://www.redblobgames.com/pathfinding/
// Copyright 2014 Red Blob Games
// License: Apache v2
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Graph class.
//
// Weights are assigned to *nodes* not *edges*, but the pathfinder
// will need edge weights, so we treat an edge A->B as having the
// weight of tile B. If a tile weight is Infinity we don't expose
// edges to it.
var Graph = (function () {
    function Graph(num_nodes) {
        this.num_nodes = num_nodes;
        this._edges = []; // node id to list of node ids
        this._weights = []; // node id to number (could be Infinity)
        this._observers = []; // functions to call when data changes
        for (var id = 0; id < num_nodes; id++) {
            this._weights[id] = 1;
            this._edges[id] = [];
        }
    }
    // Weights are given to tiles, not edges, but the search interface
    // will only ask about edges. Weight of edge id1->id2 is of tile id2.
    Graph.prototype.get_ordered_weights = function () {
        var weight_counts = [];
        this._weights.forEach(function (w) {
            if (weight_counts[w])
                weight_counts[w] = weight_counts[w] + 1;
            else
                weight_counts[w] = 1;
        });
        var ordered_weights = Object.keys(this._weights).map(function (x) { return parseInt(x); });
        return ordered_weights;
    };
    Graph.prototype.tile_weight = function (id) {
        return this._weights[id];
    };
    Graph.prototype.set_tile_weight = function (id, w) {
        if (this._weights[id] != w) {
            this._weights[id] = w;
            this.notify_observers();
        }
    };
    Graph.prototype.set_tile_weights = function (ids, w) {
        var _this = this;
        ids.forEach(function (id) {
            if (_this._weights[id] != w) {
                _this._weights[id] = w;
                _this.notify_observers();
            }
        });
    };
    Graph.prototype.tiles_with_given_weight = function (w) {
        var _this = this;
        if (w === void 0) { w = Infinity; }
        return d3.range(this.num_nodes).filter(function (id) { return _this._weights[id] == w; });
    };
    Graph.prototype.edge_weight = function (id1, id2) {
        if (!this.has_edge(id1, id2)) {
            return Infinity;
        }
        if (this._weights[id2] === undefined) {
            return 1;
        }
        return this._weights[id2];
    };
    // Is there an edge from id1 to id2?
    Graph.prototype.has_edge = function (id1, id2) {
        return this._edges[id1] && this._edges[id1].indexOf(id2) >= 0;
    };
    // All edges from id
    Graph.prototype.edges_from = function (id1) {
        var _this = this;
        var edges = this._edges[id1].filter(function (id2) { return _this.tile_weight(id2) != Infinity; });
        return edges;
    };
    // All edges as a list of [id1, id2]
    Graph.prototype.all_edges = function () {
        var all = [];
        for (var id1 = 0; id1 < this.num_nodes; id1++) {
            this._edges[id1].forEach(function (id2) { return all.push([id1, id2]); });
        }
        return all;
    };
    // Represent this graph as a serializable json object
    Graph.prototype.to_json = function () {
        var json = {
            type: 'Graph',
            edges: this._edges,
            weights: this._weights
        };
        return json;
    };
    Graph.prototype.from_json = function (json) {
        this._edges = json.edges;
        this._weights = json.weights.map(function (x) {
            if (x === null)
                return Infinity;
            else
                return x;
        });
        this.num_nodes = this._weights.length;
    };
    // Observers get notified when the graph changes
    Graph.prototype.notify_observers = function () { this._observers.forEach(function (f) { return f(); }); };
    Graph.prototype.add_observer = function (f) { this._observers.push(f); f(); };
    // Make a proxy graph object, to share some things but override
    // some methods for comparison diagrams
    Graph.prototype.make_proxy = function () {
        var proxy = {};
        for (var field in this) {
            proxy[field] = this[field];
        }
        return proxy;
    };
    return Graph;
})();
// Each graph type is paired with a layout that maps ids to positions and shapes
var GraphLayout = (function () {
    function GraphLayout(graph, SCALE) {
        this.graph = graph;
        this.SCALE = SCALE;
    }
    // Return min/max x/y for the entire graph; caller needs size and offset
    GraphLayout.prototype.coordinate_range = function () {
        var min = [Infinity, Infinity];
        var max = [-Infinity, -Infinity];
        for (var id = 0; id < this.graph.num_nodes; id++) {
            var center = this.tile_center(id);
            var path = this.tile_shape(id);
            for (var j = 0; j < path.length; j++) {
                for (var axis = 0; axis < 2; axis++) {
                    min[axis] = Math.min(min[axis], center[axis] + path[j][axis]);
                    max[axis] = Math.max(max[axis], center[axis] + path[j][axis]);
                }
            }
        }
        return { min: min, max: max };
    };
    // Override these in the child class
    GraphLayout.prototype.tile_center = function (id) { return [0, 0]; };
    GraphLayout.prototype.tile_shape = function (id) { return [[0, 0]]; };
    GraphLayout.prototype.pixel_to_tile = function (coord) { return -1; };
    return GraphLayout;
})();
// Generate a grid of squares, to be used as a graph.
var SquareGrid = (function (_super) {
    __extends(SquareGrid, _super);
    // The class creates the structure of the grid; the client can
    // directly set the weights on nodes.
    function SquareGrid(W, H) {
        var _this = this;
        _super.call(this, W * H);
        this.W = W;
        this.H = H;
        for (var x = 0; x < W; x++) {
            for (var y = 0; y < H; y++) {
                var id = this.to_id(x, y);
                SquareGrid.DIRS.forEach(function (dir) {
                    var x2 = x + dir[0], y2 = y + dir[1];
                    if (_this.valid(x2, y2)) {
                        _this._edges[id].push(_this.to_id(x2, y2));
                    }
                });
            }
        }
    }
    SquareGrid.prototype.edges_from = function (id1) {
        var edges = _super.prototype.edges_from.call(this, id1);
        var xy = this.from_id(id1);
        if ((xy[0] + xy[1]) % 2 == 0) {
            // This is purely for aesthetic purposes on grids -- using a
            // checkerboard pattern, flip every other tile's edges so
            // that paths along diagonal lines end up stairstepping
            // instead of doing all east/west movement first and then
            // all north/south.
            edges.reverse();
        }
        return edges;
    };
    // Encode/decode grid locations (x,y) to integers (id)
    SquareGrid.prototype.valid = function (x, y) { return 0 <= x && x < this.W && 0 <= y && y < this.H; };
    SquareGrid.prototype.to_id = function (x, y) { return x + y * this.W; };
    SquareGrid.prototype.from_id = function (id) { return [id % this.W, Math.floor(id / this.W)]; };
    // Represent this grid as a serializable json object
    SquareGrid.prototype.to_json = function () {
        var json = _super.prototype.to_json.call(this);
        json['type'] = 'SquareGrid';
        json['width'] = this.W;
        json['height'] = this.H;
        return json;
    };
    SquareGrid.DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    return SquareGrid;
})(Graph);
var SquareGridLayout = (function (_super) {
    __extends(SquareGridLayout, _super);
    function SquareGridLayout() {
        _super.apply(this, arguments);
    }
    // Layout -- square tiles
    SquareGridLayout.prototype.xy_scaled = function (xy) { return [xy[0] * this.SCALE, xy[1] * this.SCALE]; };
    SquareGridLayout.prototype.tile_center = function (id) { return this.xy_scaled(this.graph.from_id(id)); };
    SquareGridLayout.prototype.tile_shape = function (id) {
        var S = this.SCALE;
        return [
            [-S / 2, -S / 2],
            [-S / 2, S / 2 - 1],
            [S / 2 - 1, S / 2 - 1],
            [S / 2 - 1, -S / 2]
        ];
    };
    SquareGridLayout.prototype.pixel_to_tile = function (coord) {
        return this.graph.to_id(Math.round(coord[0] / this.SCALE), Math.round(coord[1] / this.SCALE));
    };
    return SquareGridLayout;
})(GraphLayout);
