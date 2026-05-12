// From http://www.redblobgames.com/pathfinding/
// Copyright 2014 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
///<reference path="../typings/d3/d3.d.ts" />
///<reference path="grid.ts" />
///<reference path="search.ts" />
function svg_blob(radius) {
    var path = [];
    for (var angle = 0.0; angle < 2 * Math.PI; angle += 0.1) {
        var r = radius * (1 + Math.sin(5 * angle) / 5);
        var x = r * Math.cos(angle);
        var y = -r * Math.sin(angle);
        y -= 0.05 * radius; // adjust for blob head having less "weight" than feet
        path.push('L', x, y);
    }
    path[0] = 'M';
    path.push('Z');
    return path.join(" ");
}
function svg_cross(radius) {
    var R = radius;
    return ['M', -R, -R, 'L', R, R, 'M', -R, R, 'L', R, -R].join(" ");
}
function svg_points_to_path(points) {
    var svg = ['M', points[0]];
    for (var i = 1; i < points.length; i++) {
        svg.push('L', points[i]);
    }
    svg.push('Z');
    return svg.join(" ");
}
var Diagram = (function () {
    function Diagram(parent_selector, graph, options, layout, init_layers) {
        var _this = this;
        this.graph = graph;
        this.options = options;
        this.layout = layout;
        this.svg = null;
        this.parent = null;
        this._previous_map = undefined; // we keep this for drawing optimization
        this.layer = {}; // access to layers by name
        this.layer_array = []; // access in order
        this.linked_diagrams = [];
        this.graph.add_observer(this.redraw.bind(this));
        this.parent = d3.select(parent_selector);
        var svg_container = this.parent.append('svg');
        var range = this.layout.coordinate_range();
        svg_container
            .attr('width', range.max[0] - range.min[0] + 1)
            .attr('height', range.max[1] - range.min[1] + 1);
        this.svg = svg_container.append('g');
        this.svg.attr('transform', "translate(" + [-range.min[0], -range.min[1]] + ")");
        init_layers.forEach(function (args) { return _this.add.apply(_this, args); });
        this.redraw();
    }
    // Add a diagram layer to this diagram
    Diagram.prototype.add = function (layerClass) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        function construct(constructor, args) {
            // From <http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible>
            function Layer() { constructor.apply(this, args); }
            Layer.prototype = constructor.prototype;
            return new Layer();
        }
        var layer = construct(layerClass, [this].concat(args));
        this._previous_map = undefined; // invalidate cache
        this.layer[layer.name] = layer;
        this.layer_array.push(layer);
        return layer;
    };
    // Redraw these other diagrams when we redraw this one
    Diagram.prototype.link_to = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.linked_diagrams = this.linked_diagrams.concat(args);
    };
    // Redraw this diagrams and any others linked to it
    Diagram.prototype.redraw = function () {
        this._redraw();
        this.linked_diagrams.forEach(function (diagram) { return diagram._redraw(); });
    };
    // Redraw only this diagram
    Diagram.prototype._redraw = function () {
        var _this = this;
        var ids = d3.range(this.graph.num_nodes);
        var map = ids.map(function (id) { return ({ tile_weight: _this.graph.tile_weight(id) }); });
        var ss = search(this.options, this.graph, map);
        if (ss.current != -1) {
            map[ss.current].current = true;
        }
        ss.frontier.forEach(function (id) { map[id].frontier = true; });
        ss.neighbors.forEach(function (id) { map[id].neighbor = true; });
        this.layer_array.forEach(function (layer) {
            // If the layer states which fields it cares about, then we only have to redraw a tile if any one of those fields is changed
            var ids_to_redraw = ids;
            if (_this._previous_map !== undefined && layer.dependencies !== undefined) {
                ids_to_redraw = ids.filter(function (id) { return layer.dependencies.some(function (field) { return map[id][field] != _this._previous_map[id][field]; }); });
            }
            if (ids_to_redraw.length > 0) {
                layer.redraw(map, ss, d3.set(ids_to_redraw));
            }
        });
        this._previous_map = map;
    };
    return Diagram;
})();
var DiagramLayer = (function () {
    // Dependencies are an optional optimization: if it's not null, it should
    // be a set of field names from the 'map' array that affect drawing. The
    // Diagram class will calculate the set of ids that need to be updated,
    // and pass that as a parameter to redraw().
    function DiagramLayer(diagram, name, dependencies) {
        if (dependencies === void 0) { dependencies = undefined; }
        this.diagram = diagram;
        this.name = name;
        this.dependencies = dependencies;
        this.svg = this.diagram.svg.append('g').attr('class', this.name);
    }
    DiagramLayer.prototype.redraw = function (map, ss, id_set) { };
    // Return the id of the graph node currently pointed at. The
    // parent should be an touch/mouse event handler so that d3.event
    // is filled in.
    DiagramLayer.prototype.currently_pointing_at = function () {
        // This function has several cases. The problem is that the
        // layout class's pixel_to_tile is *optional*. I only define
        // it for grids. For non-grids, I get the id here by looking
        // at the svg node, which has its id. However, on touch
        // devices, the svg node returned is that where the touch drag
        // started, not where it is now, so that corner case isn't
        // handled at all here.
        var id = this.diagram.layout.pixel_to_tile(d3.mouse(this.svg.node()));
        // NOTE: if there's a css transform on the svg or parent,
        // Firefox will return the wrong mouse location. I haven't
        // traced this to figure out whether it's d3's fault or
        // Firefox's fault. Firefox may be handling the rotate but not
        // the translate.
        // Fallback is used only if pixel_to_tile returns -1 (e.g.
        // it's not a grid where it's easy to calculate). The fallback
        // works only for mouse pointers, not touch events.
        var target = d3.select(d3.event.sourceEvent.target);
        // There should be a tile on the base layer that has d3's data set to the tile id
        if (id < 0 && target !== undefined && target.classed('tile')) {
            id = target.data()[0];
        }
        // TODO: it may be better to use the touch/mouse location and
        // then find the dom node, using document.elementFromPoint
        // (firefox/webkit, not sure about use in svg for opera/ie) or
        // svg.getIntersectionList (webkit, ie, opera but not firefox)
        return id;
    };
    return DiagramLayer;
})();
var BaseLayer = (function (_super) {
    __extends(BaseLayer, _super);
    function BaseLayer(diagram) {
        var _this = this;
        _super.call(this, diagram, 'base', ['tile_weight', 'current', 'frontier', 'neighbor', 'visited']);
        this.diagram = diagram;
        this.svg.selectAll(".tile").data(d3.range(this.diagram.graph.num_nodes))
            .enter().append('path')
            .attr('class', "tile")
            .attr('transform', function (id) { return "translate(" + _this.diagram.layout.tile_center(id) + ")"; })
            .attr('d', function (id) { return svg_points_to_path(_this.diagram.layout.tile_shape(id)); });
    }
    BaseLayer.prototype.redraw = function (map, ss, id_set) {
        this.svg.selectAll(".tile")
            .filter(function (id) { return id_set.has(id); })
            .attr('class', function (id) {
            var classes = ["tile", "weight-" + map[id].tile_weight];
            if (map[id].current)
                classes.push("current");
            if (map[id].frontier)
                classes.push("frontier");
            if (map[id].neighbor)
                classes.push("neighbor");
            if (map[id].visited)
                classes.push("visited");
            return classes.join(" ");
        });
    };
    return BaseLayer;
})(DiagramLayer);
var GraphEditorLayer = (function (_super) {
    __extends(GraphEditorLayer, _super);
    // Unlike most of the layers, this one reaches into the base layer
    function GraphEditorLayer(diagram, cycle_order) {
        var _this = this;
        _super.call(this, diagram, 'graph_editor');
        this.diagram = diagram;
        this.cycle_order = cycle_order;
        if (this.cycle_order === undefined) {
            this.cycle_order = [1, Infinity];
        }
        var new_weight = 0;
        var drag = d3.behavior.drag()
            .on('dragstart', function (d) {
            new_weight = _this.next_weight(_this.diagram.graph.tile_weight(d));
        })
            .on('drag', function (d) {
            var id = _this.currently_pointing_at();
            if (id != -1) {
                _this.diagram.graph.set_tile_weight(id, new_weight);
            }
        });
        this.diagram.layer.base.svg.selectAll(".tile")
            .on('click', function (id) {
            if (d3.event.ctrlKey) {
                // Keep color
                var old_weight = _this.diagram.graph.tile_weight(id);
                _this.diagram.graph.set_tile_weight(id, old_weight);
            }
            else {
                var new_weight = _this.next_weight(_this.diagram.graph.tile_weight(id));
                _this.diagram.graph.set_tile_weight(id, new_weight);
            }
        })
            .call(drag);
    }
    // What's the next weight in cycle order? By default it toggles 1 and Infinity
    GraphEditorLayer.prototype.next_weight = function (weight) {
        var i = this.cycle_order.indexOf(weight);
        return this.cycle_order[(i + 1) % this.cycle_order.length];
    };
    return GraphEditorLayer;
})(DiagramLayer);
var Slider = (function () {
    function Slider(parent_selector, diagrams) {
        var _this = this;
        this.parent_selector = parent_selector;
        this.diagrams = diagrams;
        this.slider = null;
        this.play_pause_button = null;
        this.position = 0;
        this.max_value = 1;
        this.animation_id = null; // non-null means it's animating
        var parent = d3.select(parent_selector);
        this.max_value = this.diagrams[0].graph.num_nodes;
        this.diagrams.forEach(function (diagram) {
            var previous_exit_now = diagram.options.exit_now;
            diagram.options.exit_now = function (ss) { return previous_exit_now(ss) || (ss.steps >= _this.position); };
        });
        var div = parent.append('div')
            .attr('class', "slider")
            .style('text-align', "center");
        this.slider = div.append('input')
            .attr('type', "range")
            .attr('min', 0)
            .attr('max', this.max_value)
            .attr('step', 1)
            .attr('value', this.position)
            .style('width', "95%")
            .style('margin', "0")
            .on('input', function () { return _this.set_slider_to(parseInt(_this.slider.node().value)); })
            .on('change', function () { return _this.set_slider_to(parseInt(_this.slider.node().value)); });
        div.append('br');
        div.append('button')
            .attr('class', "step_back")
            .on('click', function () { return _this.set_slider_to(_this.position - 1); })
            .text("<");
        this.play_pause_button = div.append('button')
            .attr('class', "play_pause")
            .on('click', function () { return _this.set_play_pause(_this.animation_id == null); });
        div.append('button')
            .attr('class', "step_forward")
            .on('click', function () { return _this.set_slider_to(_this.position + 1); })
            .text(">");
        this.set_slider_to(0);
    }
    Slider.prototype.loop = function () {
        this.diagrams.forEach(function (diagram) { diagram.redraw(); });
        if (this.position <= this.max_value) {
            this.set_position(Math.min(1 + this.position, this.max_value));
        }
        else {
            this.set_play_pause(false);
        }
    };
    Slider.prototype.set_play_pause = function (state) {
        this.play_pause_button.text(state ? "Pause animation" : "Start animation");
        if (state && this.animation_id == null) {
            this.animation_id = setInterval(this.loop.bind(this), 16);
            if (this.position >= this.max_value) {
                // Reset back to the beginning
                this.set_position(0);
            }
        }
        else if (!state && this.animation_id != null) {
            clearInterval(this.animation_id);
            this.animation_id = null;
        }
    };
    Slider.prototype.set_slider_to = function (pos) {
        this.set_position(pos);
        this.diagrams.forEach(function (diagram) { diagram.redraw(); });
        this.set_play_pause(false);
    };
    Slider.prototype.set_position = function (pos) {
        if (pos < 0) {
            pos = 0;
        }
        if (pos >= this.max_value) {
            pos = this.max_value;
        }
        this.position = pos;
        this.slider.node().value = pos;
    };
    return Slider;
})();
var EdgeLayer = (function (_super) {
    __extends(EdgeLayer, _super);
    function EdgeLayer(diagram) {
        _super.call(this, diagram, 'edges');
        this.diagram = diagram;
    }
    EdgeLayer.prototype.redraw = function (map, ss) {
    };
    return EdgeLayer;
})(DiagramLayer);
var NeighborsLayer = (function (_super) {
    __extends(NeighborsLayer, _super);
    function NeighborsLayer(diagram) {
        var _this = this;
        _super.call(this, diagram, 'neighbors');
        this.diagram = diagram;
        this.svg.selectAll(".edge").data(this.diagram.graph.all_edges())
            .enter().append('path')
            .attr('class', "edge")
            .attr('d', function (edge) {
            var xy0 = _this.diagram.layout.tile_center(edge[0]);
            var xy1 = _this.diagram.layout.tile_center(edge[1]);
            return ['M', xy0, 'L', [0.5 * (xy0[0] + xy1[0]), 0.5 * (xy0[1] + xy1[1])]].join(" ");
        });
    }
    NeighborsLayer.prototype.redraw = function (map, ss) {
        var _this = this;
        var n = this.svg.selectAll(".neighbor").data(ss.neighbors);
        n.exit().remove();
        n.enter().append('path')
            .attr('class', "neighbor")
            .attr('d', function (id) { return svg_points_to_path(_this.diagram.layout.tile_shape(id)); })
            .attr('fill', "none")
            .attr('stroke-width', "4px")
            .attr('stroke-opacity', 1.0)
            .attr('stroke', d3.hsl(150, 0.5, 0.5));
        n.attr('transform', function (id) { return "translate(" + _this.diagram.layout.tile_center(id) + ")"; });
    };
    return NeighborsLayer;
})(DiagramLayer);
var ParentPointerLayer = (function (_super) {
    __extends(ParentPointerLayer, _super);
    function ParentPointerLayer(diagram) {
        _super.call(this, diagram, 'parent_pointers', ['parent']);
        this.diagram = diagram;
        var defs = this.diagram.parent.select("svg").insert('defs', ':first-child');
        var marker = defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', "0 0 10 10")
            .attr('refX', 7)
            .attr('refY', 5)
            .attr('markerUnits', 'strokeWidth')
            .attr('markerWidth', 4)
            .attr('markerHeight', 3)
            .attr('orient', 'auto');
        var path = marker.append('path')
            .attr('d', "M 0 0 L 10 5 L 0 10 z");
        this.svg.selectAll("path.parent").data(d3.range(this.diagram.graph.num_nodes))
            .enter().append('path')
            .attr('class', "parent")
            .attr('d', "M 0 0")
            .attr('marker-end', "url(#arrowhead)");
    }
    ParentPointerLayer.prototype.redraw = function (map, ss, id_set) {
        var _this = this;
        this.svg.selectAll(".parent")
            .filter(function (id) { return id_set.has(id); })
            .attr('d', function (id1) {
            var id2 = map[id1].parent;
            if (id2 === undefined) {
                return "M 0 0";
            }
            var xy1 = _this.diagram.layout.tile_center(id1);
            var xy2 = _this.diagram.layout.tile_center(id2);
            var beg = [xy1[0] * 0.9 + xy2[0] * 0.1,
                xy1[1] * 0.9 + xy2[1] * 0.1];
            var end = [xy2[0] * 0.6 + xy1[0] * 0.4,
                xy2[1] * 0.6 + xy1[1] * 0.4];
            return ['M', beg, 'L', end].join(" ");
        });
    };
    return ParentPointerLayer;
})(DiagramLayer);
var NumericLabelLayer = (function (_super) {
    __extends(NumericLabelLayer, _super);
    function NumericLabelLayer(diagram, field, format) {
        var _this = this;
        _super.call(this, diagram, 'numeric_label_' + field, [field]);
        this.diagram = diagram;
        this.field = field;
        this.format = format;
        if (this.format === undefined) {
            this.format = function (x) { return x == Infinity ? "" : x.toFixed(0); };
        }
        this.svg.selectAll("text.label").data(d3.range(this.diagram.graph.num_nodes))
            .enter().append('text')
            .style('font-family', "sans-serif")
            .style('font-size', 0.4 * this.diagram.layout.SCALE + "px")
            .attr('class', "label")
            .attr('text-anchor', "middle")
            .attr('transform', function (id) { return "translate(" + _this.diagram.layout.tile_center(id) + ") translate(0, " + 0.2 * _this.diagram.layout.SCALE + ")"; });
    }
    NumericLabelLayer.prototype.redraw = function (map, ss, id_set) {
        var _this = this;
        this.svg.selectAll("text.label")
            .filter(function (id) { return id_set.has(id); })
            .text(function (id) {
            var v = map[id][_this.field];
            return v === undefined ? "" : _this.format(v);
        });
    };
    return NumericLabelLayer;
})(DiagramLayer);
var MouseoverLayer = (function (_super) {
    __extends(MouseoverLayer, _super);
    function MouseoverLayer(diagram, set) {
        var _this = this;
        _super.call(this, diagram, 'mouseover');
        this.diagram = diagram;
        this.set = set;
        this.diagram.layer.base.svg.selectAll(".tile")
            .on('mouseover', function (id) { return _this.set_target(id); });
    }
    MouseoverLayer.prototype.set_target = function (id) {
        this.set(id);
        this.diagram.redraw();
    };
    return MouseoverLayer;
})(DiagramLayer);
var ReconstructedPathLayer = (function (_super) {
    __extends(ReconstructedPathLayer, _super);
    function ReconstructedPathLayer(diagram, get, name) {
        if (name === void 0) { name = 'reconstructed_path'; }
        _super.call(this, diagram, name);
        this.diagram = diagram;
        this.get = get;
        this.svg.append('path')
            .attr('class', "path-trace")
            .attr('d', "M 0 0");
    }
    ReconstructedPathLayer.prototype.redraw = function (map, ss) {
        var path = ['M'];
        var id = this.get();
        if (id < 0) {
            path.push(0, 0);
        }
        else {
            path.push(this.diagram.layout.tile_center(id));
            while (map[id].parent !== undefined) {
                id = map[id].parent;
                path.push('L', this.diagram.layout.tile_center(id));
            }
        }
        this.svg.select(".path-trace")
            .attr('d', path.join(" "));
    };
    return ReconstructedPathLayer;
})(DiagramLayer);
var HeuristicLayer = (function (_super) {
    __extends(HeuristicLayer, _super);
    function HeuristicLayer(diagram, get_mouseover, get_goal) {
        _super.call(this, diagram, 'heuristic_distance');
        this.diagram = diagram;
        this.get_mouseover = get_mouseover;
        this.get_goal = get_goal;
        this.svg.append('path')
            .attr('class', "heuristic")
            .attr('d', "M 0 0");
    }
    HeuristicLayer.prototype.redraw = function (map, ss) {
        var layout = this.diagram.layout;
        var d = ['M', 0, 0];
        if (this.get_goal() >= 0 && this.get_mouseover() >= 0) {
            d = [
                'M', layout.tile_center(this.get_mouseover()),
                'L', layout.tile_center(this.get_goal())
            ];
        }
        this.svg.select(".heuristic").attr('d', d.join(" "));
    };
    return HeuristicLayer;
})(DiagramLayer);
// Draggable markers for start positions. As we're dragging, I use the
// 'target' property to determine which tile we're dragging to.
// Sometimes that target will be a drag marker; I'm going to ignore
// these by only looking for tile targets. It'd be smoother if I
// disabled mouse events on the markers on dragstart and restored them
// on dragend, but then I lose the css cursor on the marker. It'd be
// even smoother if I mapped x,y to grid position directly instead of
// relying on svg for it, but that'd be harder when I want to reuse
// this code for non-grids.
var DraggableMarkerLayer = (function (_super) {
    __extends(DraggableMarkerLayer, _super);
    function DraggableMarkerLayer(diagram, class_name, svg_shape, obj, key) {
        var _this = this;
        _super.call(this, diagram, 'draggable_marker_' + class_name);
        this.diagram = diagram;
        this.obj = obj;
        this.key = key;
        this.drag_handle = this.svg.append('g')
            .attr('class', "draggable");
        this.drag_handle.append('circle')
            .attr('r', this.diagram.layout.SCALE / Math.sqrt(2))
            .attr('fill', "none");
        this.drag_handle.append('path')
            .attr('class', class_name)
            .attr('d', svg_shape);
        var behavior = d3.behavior.drag()
            .on('dragstart', function (i) { return _this.svg.classed('dragging', true); })
            .on('dragend', function (i) { return _this.svg.classed('dragging', false); })
            .on('drag', function (i) {
            var id = _this.currently_pointing_at();
            if (id != -1) {
                _this.obj[_this.key] = id;
                _this.diagram.redraw();
            }
        });
        this.svg.call(behavior);
    }
    DraggableMarkerLayer.prototype.redraw = function (map, ss) {
        var _this = this;
        var id = this.obj[this.key];
        this.drag_handle
            .attr('transform', function (i) { return "translate(" + _this.diagram.layout.tile_center(id) + ")"; });
    };
    return DraggableMarkerLayer;
})(DiagramLayer);
// Contour lines for any numeric field, for square grids only
var Conrec; // load conrec.js to define this
var ContourLayer = (function (_super) {
    __extends(ContourLayer, _super);
    function ContourLayer(diagram, field) {
        if (field === void 0) { field = 'sort_key'; }
        _super.call(this, diagram, 'contour');
        this.diagram = diagram;
        this.field = field;
        this.sentinelValue = 1e3;
    }
    ContourLayer.prototype.redraw = function (map, ss) {
        var c = new Conrec();
        var graph = this.diagram.graph;
        var layout = this.diagram.layout;
        // Build a 2d array, which the contour library needs; extend it beyond the border with a high value
        var matrix = [];
        var maxLevel = 0;
        for (var x = -1; x <= graph.W; x++) {
            matrix.push([]);
            for (var y = -1; y <= graph.H; y++) {
                var v = this.sentinelValue;
                if (graph.valid(x, y)) {
                    var id = graph.to_id(x, y);
                    v = map[id][this.field];
                    if (v > maxLevel) {
                        maxLevel = v;
                    }
                    if (v === undefined) {
                        v = this.sentinelValue;
                    }
                }
                matrix[x + 1].push(v);
            }
        }
        // Contour lines at 1.5, 2.5, 3.5, etc. It doesn't work well if we are on a integer boundary.
        var levels = [];
        for (var level = 1; level <= maxLevel; level++) {
            levels.push(level + 0.5);
        }
        c.contour(matrix, 0, matrix.length - 1, 0, matrix[0].length - 1, d3.range(-1, matrix.length - 1), d3.range(-1, matrix[0].length - 1), levels.length, levels);
        // Draw the contour lines
        var paths = this.svg.selectAll("path").data(c.contourList());
        var colors = d3.interpolateHsl(d3.hsl("hsl(330, 30%, 30%)"), d3.hsl("hsl(60, 10%, 60%)"));
        paths.exit().remove();
        paths.enter()
            .append('path');
        paths
            .attr('class', function (d, i) { return "contour contour-" + i; })
            .attr('stroke', function (d, i) { return colors(Math.pow(i / levels.length, 0.5)); })
            .attr('d', function (line) { return svg_points_to_path(line.map(function (p) { return layout.xy_scaled([p.x, p.y]); })); });
    };
    return ContourLayer;
})(DiagramLayer);
// Tiles colored with a gradient
var ColoredLabelLayer = (function (_super) {
    __extends(ColoredLabelLayer, _super);
    function ColoredLabelLayer(diagram, field) {
        var _this = this;
        if (field === void 0) { field = 'sort_key'; }
        _super.call(this, diagram, 'colors_' + field);
        this.diagram = diagram;
        this.field = field;
        this.color0 = "hsl(330,50%,50%)";
        this.color1 = "hsl(60,10%,85%)";
        this.exp = 0.7;
        this.svg.selectAll(".tile").data(d3.range(this.diagram.graph.num_nodes))
            .enter().append('path')
            .attr('class', "tile")
            .attr('transform', function (id) { return "translate(" + _this.diagram.layout.tile_center(id) + ")"; })
            .attr('fill-opacity', 0.5)
            .attr('d', function (id) { return svg_points_to_path(_this.diagram.layout.tile_shape(id)); });
    }
    ColoredLabelLayer.prototype.redraw = function (map, ss) {
        var _this = this;
        var max = 0;
        for (var id = 0; id < this.diagram.graph.num_nodes; id++) {
            var x = map[id][this.field];
            if (x > max)
                max = x;
        }
        // Now color things appropriately
        var colors = d3.interpolateHsl(d3.hsl(this.color0), d3.hsl(this.color1));
        this.svg.selectAll(".tile")
            .attr('fill', function (id) { return map[id].tile_weight != Infinity && map[id][_this.field] !== undefined
            ? colors(Math.pow(map[id][_this.field], _this.exp) / Math.pow(max, _this.exp))
            : "none"; });
    };
    return ColoredLabelLayer;
})(DiagramLayer);
// Utility functions
function makeBlob(selector) {
    var graph = new SquareGrid(1, 1);
    var layout = new SquareGridLayout(graph, 20);
    var options = new SearchOptions([graph.to_id(0, 0)], null);
    var diagram = new Diagram(selector, graph, options, layout, [
        [BaseLayer],
        [DraggableMarkerLayer, 'start', svg_blob(9), options.starts, 0]
    ]);
    return diagram;
}
function makeCross(selector) {
    var graph = new SquareGrid(1, 1);
    var layout = new SquareGridLayout(graph, 20);
    var options = new SearchOptions([graph.to_id(0, 0)], null);
    var diagram = new Diagram(selector, graph, options, layout, [
        [BaseLayer],
        [DraggableMarkerLayer, 'goal', svg_cross(8), options.starts, 0]
    ]);
    return diagram;
}
// Link diagrams together
function link_diagrams(diagrams) {
    for (var i = 0; i < diagrams.length; i++) {
        for (var j = i + 1; j < diagrams.length; j++) {
            diagrams[i].link_to(diagrams[j]);
            diagrams[j].link_to(diagrams[i]);
        }
    }
}
var SimpleDiagramOptions = (function () {
    function SimpleDiagramOptions(selector, graph, starts, exit, tile_types, algorithm, optional_layers) {
        this.selector = selector;
        this.graph = graph;
        this.starts = starts;
        this.exit = exit;
        this.tile_types = tile_types;
        this.algorithm = algorithm;
        this.optional_layers = optional_layers;
        this.early_exit = true;
        this.tile_size = 15;
        this.blob_size = 9;
        this.cross_size = 8;
        this.tile_weights = tile_types.map(function (x) { return x.weight; });
    }
    return SimpleDiagramOptions;
})();
// Custom map to explore
function makeDiagram_custom(opts) {
    d3.select(opts.selector).selectAll('svg').remove();
    var options = getSearchOptions(opts.graph, opts.starts, opts.exit, opts.algorithm, opts.early_exit);
    var layout = new SquareGridLayout(opts.graph, opts.tile_size);
    var tile_weights = opts.tile_weights;
    var layers = [];
    layers.push([BaseLayer]);
    if (opts.optional_layers['edit']) {
        layers.push([GraphEditorLayer, tile_weights]);
    }
    if (opts.optional_layers['path']) {
        layers.push([ReconstructedPathLayer, function () { return opts.exit.id; }]);
    }
    if (opts.optional_layers['backpointer']) {
        layers.push([ParentPointerLayer]);
    }
    if (opts.optional_layers['color']) {
        var color_key = (typeof opts.optional_layers['color'] === 'string') ? opts.optional_layers['color'] : 'sort_key';
        layers.push([ColoredLabelLayer, color_key]);
    }
    if (opts.optional_layers['number']) {
        var number_key = (typeof opts.optional_layers['number'] === 'string') ? opts.optional_layers['number'] : 'cost_so_far';
        layers.push([NumericLabelLayer, number_key, function (x) { return x.toFixed(1); }]);
    }
    if (opts.optional_layers['contour']) {
        layers.push([ContourLayer]);
    }
    if (opts.starts) {
        layers.push([DraggableMarkerLayer, 'start', svg_blob(opts.blob_size), options.starts, 0]);
    }
    if (opts.exit) {
        layers.push([DraggableMarkerLayer, 'goal', svg_cross(opts.cross_size), opts.exit, 'id']);
    }
    var diagram = new Diagram(opts.selector, opts.graph, options, layout, layers);
    return diagram;
}
function makeDiagram_custom_linked(graph, starts, exit, tile_types, diagram_options, optional_layers) {
    var diagrams = [];
    for (var i = 0; i < diagram_options.length; i++) {
        var options = diagram_options[i];
        var algorithm = options['algorithm'];
        var selector = options['selector'];
        var opts = new SimpleDiagramOptions(selector, graph, starts, exit, tile_types, algorithm, optional_layers);
        var diagram = makeDiagram_custom(opts);
        diagrams.push(diagram);
    }
    link_diagrams(diagrams);
    return diagrams;
}
