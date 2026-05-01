// From http://www.redblobgames.com/pathfinding/a-star/
// Copyright 2014 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
///<reference path="typings/tsd.d.ts" />
///<reference path="graph/grid.ts" />
///<reference path="graph/search.ts" />
///<reference path="graph/diagram.ts" />
"use strict";
// Take plain text (from a <pre> section) and a set of words, and turn
// the text into html with those words marked. This code is for my own
// use and assumes that the words are \w+ with no spaces or
// punctuation etc.
function highlight_words(text, words) {
    var pattern = new RegExp("\\b(" + words.join("|") + ")\\b", 'g');
    return text.replace(pattern, "<span class='$&'>$&</span>");
}
// Code for creating basic grids for tutorial
var diagram0_walls = [21, 22, 51, 52, 81, 82, 93, 94, 111, 112, 123, 124, 133, 134, 141, 142, 153, 154, 163, 164, 171, 172, 173, 174, 175, 183, 184, 193, 194, 201, 202, 203, 204, 205, 213, 214, 223, 224, 243, 244, 253, 254, 273, 274, 283, 284, 303, 304, 313, 314, 333, 334, 343, 344, 373, 374, 403, 404, 433, 434]; /* ids for a 30x15 grid */
function makeDiagram0() {
    // NOTE: Unfortunately, because of the simplistic way my diagrams
    // work, I can't link these together with a shared graph. I want
    // the first diagram to have an animated slider, which is
    // optimized to draw only changed elements. The second diagram has
    // expensive contour lines, and is not animated. If I share the
    // graph, then the slider will trigger a redraw in the second
    // diagram, and that's rather slow. So I'm just going to ignore
    // the problem for now and not have the diagrams linked.
    var graph_a = new SquareGrid(30, 15);
    var graph_b = new SquareGrid(30, 15);
    // NOTE: to make this list, draw on the graph, then run in console: diagram0.graph.tiles_with_given_weight(Infinity).toString()
    diagram0_walls.forEach(function (id) { graph_a.set_tile_weight(id, Infinity); graph_b.set_tile_weight(id, Infinity); });
    var starts = [graph_a.to_id(8, 7)];
    var layout_a = new SquareGridLayout(graph_a, 20);
    var options_a = getSearchOptions(graph_a, starts, null, 'BFS');
    var diagram_a = new Diagram("#diagram0a", graph_a, options_a, layout_a, [
        [BaseLayer],
        [GraphEditorLayer],
        [ColoredLabelLayer, 'visit_order'],
        [DraggableMarkerLayer, 'start', svg_blob(11), options_a.starts, 0]
    ]);
    var layout_b = new SquareGridLayout(graph_b, 20);
    var options_b = getSearchOptions(graph_b, starts, null, 'DFS');
    var diagram_b = new Diagram("#diagram0b", graph_b, options_b, layout_b, [
        [BaseLayer],
        [GraphEditorLayer],
        [ColoredLabelLayer, 'visit_order'],
        [DraggableMarkerLayer, 'start', svg_blob(11), options_b.starts, 0]
    ]);
    diagram_a.link_to(diagram_b);
    diagram_b.link_to(diagram_a);
    new Slider("#diagram0", [diagram_a, diagram_b]).set_slider_to(13);
    //var layout_b = new SquareGridLayout(graph_b, 20);
    //var options_b = new SearchOptions(options_a.starts);
    //var diagram_b = new Diagram("#diagram0b", graph_b, options_b, layout_b, [
    //    [BaseLayer],
    //    [GraphEditorLayer],
    //    [ColoredLabelLayer],
    //    [ContourLayer],
    //    [DraggableMarkerLayer, 'start', svg_blob(13), options_b.starts, 0]
    //]);
    //// NOTE: I made the second blob a little bigger to hide the contour lines underneath it
    return { a: diagram_a, b: diagram_b };
}
function makeDiagram1() {
    var graph = new SquareGrid(9, 9);
    var layout = new SquareGridLayout(graph, 300 / 9);
    var starts = [graph.to_id(4, 4)];
    var options = getSearchOptions(graph, starts, null, 'BFS');
    var diagram_a = new Diagram("#diagram1a", graph, options, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [NumericLabelLayer, 'visit_order'],
        [NeighborsLayer],
        [DraggableMarkerLayer, 'start', svg_blob(20), options.starts, 0]
    ]);
    var graph_b = new SquareGrid(9, 9);
    var layout_b = new SquareGridLayout(graph_b, 300 / 9);
    var options_b = getSearchOptions(graph_b, starts, null, 'DFS');
    var diagram_b = new Diagram("#diagram1b", graph_b, options_b, layout_b, [
        [BaseLayer],
        [GraphEditorLayer],
        [NumericLabelLayer, 'visit_order'],
        [NeighborsLayer],
        [DraggableMarkerLayer, 'start', svg_blob(20), options_b.starts, 0]
    ]);
    diagram_a.link_to(diagram_b);
    diagram_b.link_to(diagram_a);
    new Slider("#diagram1", [diagram_a, diagram_b]);
    d3.select("#diagram1 .step_back").text("< Step backward");
    d3.select("#diagram1 .step_forward").text("Step forward >");
    return { a: diagram_a, b: diagram_b };
}
function makeDiagram2() {
    var graph = new SquareGrid(30, 15);
    var layout = new SquareGridLayout(graph, 20);
    diagram0_walls.forEach(function (id) { graph.set_tile_weight(id, Infinity); });
    var mouseover = -1;
    var starts = [graph.to_id(8, 7)];
    var options = new SearchOptions(starts);
    var diagram = new Diagram("#diagram2", graph, options, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [MouseoverLayer, function (id) { mouseover = id; }],
        [ParentPointerLayer],
        [ReconstructedPathLayer, function () { return mouseover; }],
        [DraggableMarkerLayer, 'start', svg_blob(14), options.starts, 0]
    ]);
    // NOTE: I made the second blob a little bigger to hide the parent pointers underneath it
    return diagram;
}
function makeDiagram3() {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var exit = { id: graph.to_id(8, 9) };
    var starts = [graph.to_id(2, 6)];
    var a_options = new SearchOptions(starts);
    var a = new Diagram("#diagram-early-exit-false", graph, a_options, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'cost_so_far'],
        [DraggableMarkerLayer, 'start', svg_blob(10), a_options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    var b_options = new SearchOptions(a_options.starts, function (ss) { return exit.id == ss.current; });
    var b = new Diagram("#diagram-early-exit-true", graph, b_options, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'cost_so_far'],
        [DraggableMarkerLayer, 'start', svg_blob(10), b_options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    a.link_to(b);
    b.link_to(a);
    return { a: a, b: b };
}
function makeDiagram4() {
    var graph = new SquareGrid(10, 10);
    var layout = new SquareGridLayout(graph, 28);
    var options = new SearchOptions([graph.to_id(1, 4)]);
    var exit = { id: graph.to_id(8, 5) };
    [71, 72, 73, 81, 82, 83].forEach(function (id) { return graph.set_tile_weight(id, Infinity); });
    [14, 15, 24, 25, 26, 34, 35, 36, 37, 43, 44, 45, 46, 47, 53, 54, 55, 56, 57, 64, 65, 66, 74, 75, 76, 84, 85].forEach(function (id) { return graph.set_tile_weight(id, 5); });
    var graph_proxy = graph.make_proxy();
    graph_proxy.edge_weight = function (id1, id2) { return 1; };
    var a = new Diagram("#diagram-weights-false", graph_proxy, options, layout, [
        [BaseLayer],
        [GraphEditorLayer, [1, 5, Infinity]],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'cost_so_far'],
        [DraggableMarkerLayer, 'start', svg_blob(15), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(12), exit, 'id']
    ]);
    var b = new Diagram("#diagram-weights-true", graph, options, layout, [
        [BaseLayer],
        [GraphEditorLayer, [1, 5, Infinity]],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'cost_so_far'],
        [DraggableMarkerLayer, 'start', svg_blob(15), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(12), exit, 'id'],
    ]);
    var c = new Diagram("#diagram-weights-empty", graph, options, layout, [
        [BaseLayer],
        //        [ReconstructedPathLayer, () => exit.id],
        [GraphEditorLayer, [1, 5, Infinity]],
        [DraggableMarkerLayer, 'start', svg_blob(15), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(12), exit, 'id'],
    ]);
    link_diagrams([a, b, c]);
    return { a: a, b: b, c: c };
}
function makeDiagram5() {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var options = new SearchOptions([graph.to_id(2, 8)]);
    var exit = { id: graph.to_id(13, 6) };
    [0, 1, 2, 15, 16, 17, 30, 31, 36, 37, 38, 39, 45, 46, 51, 52, 53, 54, 60, 61, 65, 66, 67, 68, 69, 70, 75, 80, 81, 82, 83, 84, 85, 95, 96, 97, 98, 100, 110, 111, 113, 114, 115, 125, 126, 127, 128, 130, 140, 141, 143, 144, 145, 155, 156, 157, 158, 159, 160, 171, 172, 173, 174, 180, 186, 187, 188, 189, 195, 196, 197, 210, 211, 212, 213].forEach(function (id) { return graph.set_tile_weight(id, 5); });
    var graph_proxy = graph.make_proxy();
    graph_proxy.edge_weight = function (id1, id2) { return 1; };
    var a = new Diagram("#diagram-dijkstra-unweighted", graph_proxy, options, layout, [
        [BaseLayer],
        [GraphEditorLayer, [1, 5, Infinity]],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [ContourLayer],
        [DraggableMarkerLayer, 'start', svg_blob(10), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    var b = new Diagram("#diagram-dijkstra-weighted", graph, options, layout, [
        [BaseLayer],
        [GraphEditorLayer, [1, 5, Infinity]],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [ContourLayer],
        [DraggableMarkerLayer, 'start', svg_blob(10), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    a.link_to(b);
    b.link_to(a);
    new Slider("#diagram-dijkstra", [a, b]).set_slider_to(67);
    return { a: a, b: b };
}
// I drew this on graph paper by hand and then wrote down the
// coordinates here, then tweaked it a lot. I'm sure there's a better
// way but I'm only making one of these and it didn't take long enough
// that I cared to use better tools.
function makeDiagram6() {
    var graph = new Graph(17);
    graph._center = [];
    graph._paths = [];
    graph.edge_weight = function (id1, id2) {
        var xy1 = this._center[id1], xy2 = this._center[id2];
        var dx = xy1[0] - xy2[0], dy = xy1[1] - xy2[1];
        return Math.sqrt(dx * dx + dy * dy);
    };
    var layout = new GraphLayout(graph, 29);
    function S(xy) { return xy.map(function (z) { return z * layout.SCALE; }); }
    layout.tile_center = function (id) { return S(graph._center[id]); };
    layout.tile_shape = function (id) { return graph._paths[id].map(S); };
    function P(id, neighbors, center, path) {
        graph._center[id] = center;
        graph._paths[id] = path.map(function (p) { return [p[0] - center[0], p[1] - center[1]]; });
        graph._edges[id] = neighbors;
    }
    P(0, [1, 2], [2, 2], [[1, 0], [0, 2], [0, 3], [1, 4], [3.5, 2], [3.5, 1], [3, 0.5]]);
    P(1, [0, 2, 5], [5, 0.75], [[4, 0.5], [3.5, 1], [3.5, 2], [5, 4], [6, 3.5], [6.5, 3], [7, 2], [7, 1], [8, 1], [8, 0.5], [7, 0.5], [7, 0], [5, 0]]);
    P(2, [0, 1, 3], [3.5, 5], [[1, 4], [1, 5], [3, 6], [3, 6.5], [4, 6.5], [4, 6], [5, 5], [5, 4], [3.5, 2]]);
    P(3, [2, 4, 15], [3.5, 8.5], [[3, 6.5], [3, 7], [2.5, 7], [2.5, 10], [5, 10], [5, 9], [6.5, 9], [6.5, 8], [5, 8], [5, 7], [4, 7], [4, 6.5]]);
    P(4, [3], [1, 8.5], [[0, 7], [0, 10], [2.5, 10], [2.5, 7]]);
    P(5, [1, 6], [10, 0.75], [[10, 0], [9, 0.5], [8, 0.5], [8, 1], [9, 1], [8.5, 2], [8.5, 3], [9, 4], [10, 4.5], [11, 4.5], [11, 0]]);
    P(6, [5, 7, 13], [13, 3], [[11, 0], [11, 4.5], [15, 4.5], [15, 0]]);
    P(7, [6, 8], [16, 1.5], [[15, 0], [15, 4.5], [16, 4], [16.5, 3], [16.5, 2], [17, 2], [17, 1], [16.5, 1], [16.5, 0]]);
    P(8, [7, 9], [18, 1.5], [[17, 0], [17, 3], [17.5, 3.5], [20, 1], [20, 0]]);
    P(9, [8, 10], [19.5, 4.5], [[17.5, 3.5], [18, 4], [19, 4], [19, 5], [20, 5], [20, 1]]);
    P(10, [9, 11], [18.75, 6], [[19, 5], [18, 6], [17, 6], [19, 8], [19, 6], [20, 5]]);
    P(11, [10, 12], [17.5, 7.5], [[17, 6], [17, 7], [16.5, 7], [16.5, 8], [17, 8], [17, 9], [19, 9], [19, 8]]);
    P(12, [11, 13, 14], [15, 7.5], [[14, 7], [14, 10], [16, 10], [16, 8], [16.5, 8], [16.5, 7], [16, 7], [16, 6], [15.5, 5.5]]);
    P(13, [6, 16, 15, 14, 12], [13, 6], [[12, 4.5], [12, 5], [11, 5], [11, 6.5], [12, 7], [14, 7], [15.5, 5.5], [15, 5], [14, 5], [14, 4.5]]);
    P(14, [12, 13, 15], [13, 8], [[12, 7], [12, 10], [14, 10], [14, 7]]);
    P(15, [14, 13, 16, 3], [9, 8.5], [[6.5, 8], [6.5, 9], [8, 9], [8, 10], [12, 10], [12, 7], [11, 6.5], [8, 8]]);
    P(16, [13, 15], [9.5, 6], [[9, 5], [8, 6], [8, 8], [11, 6.5], [11, 5]]);
    var options = new SearchOptions([0]);
    var exit = { id: 11 };
    var diagram = new Diagram("#diagram-nongrid", graph, options, layout, [
        [BaseLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [ParentPointerLayer],
        [NumericLabelLayer, 'cost_so_far', function (x) { return x.toFixed(1); }],
        [DraggableMarkerLayer, 'start', svg_blob(15), options.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(13), exit, 'id']
    ]);
    return diagram;
}
function makeDiagram_7_8(parent_selector, walls, alg_a, alg_b) {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var starts = [graph.to_id(0, 12)];
    var exit = { id: graph.to_id(14, 2) };
    walls.forEach(function (id) { return graph.set_tile_weight(id, Infinity); });
    var options_a = getSearchOptions(graph, starts, exit, alg_a, true);
    var diagram_a = new Diagram(parent_selector + " .left", graph, options_a, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_a.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    var options_b = getSearchOptions(graph, starts, exit, alg_b, true);
    var diagram_b = new Diagram(parent_selector + " .right", graph, options_b, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_b.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    diagram_a.link_to(diagram_b);
    diagram_b.link_to(diagram_a);
    new Slider(parent_selector, [diagram_a, diagram_b]);
    return { a: diagram_a, b: diagram_b };
}
function makeDiagram_7_8_Abi(parent_selector, walls, alg_a, alg_b) {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var starts = [graph.to_id(1, 1)];
    var exit = { id: graph.to_id(11, 11) };
    walls.forEach(function (id) { return graph.set_tile_weight(id, Infinity); });
    var options_a = getSearchOptions(graph, starts, exit, alg_a, true);
    var diagram_a = new Diagram(parent_selector + " .left", graph, options_a, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_a.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    var options_b = getSearchOptions(graph, starts, exit, alg_b, true);
    var diagram_b = new Diagram(parent_selector + " .right", graph, options_b, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_b.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(9), exit, 'id']
    ]);
    diagram_a.link_to(diagram_b);
    diagram_b.link_to(diagram_a);
    new Slider(parent_selector, [diagram_a, diagram_b]);
    return { a: diagram_a, b: diagram_b };
}
function makeDiagram7() {
    return makeDiagram_7_8("#diagram-greedybestfirst", [], 'Dijkstra', 'GreedyBest');
}
function makeDiagramAbi() {
    return makeDiagram_7_8_Abi("#diagram-greedybestfirst", [], 'Dijkstra', 'DFS');
}

function makeDiagram8() {
    return makeDiagram_7_8("#diagram-greedybestfirst-complex", [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 57, 72, 87, 102, 117, 132, 147, 162, 177, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192], 'Dijkstra', 'GreedyBest');
}
function makeDiagram9() {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var exit = { id: graph.to_id(14, 1) };
    var mouseover = -1;
    [35, 36, 37, 38, 39, 40, 41, 42, 57, 72, 87, 102, 117, 132, 147, 162, 177, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192].forEach(function (id) { return graph.set_tile_weight(id, Infinity); });
    var options_a = new SearchOptions([graph.to_id(0, 12)], function (ss) { return ss.current == exit.id; });
    var diagram_a = new Diagram("#diagram-astar-1", graph, options_a, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'cost_so_far'],
        [MouseoverLayer, function (id) { mouseover = id; }],
        [ReconstructedPathLayer, function () { return mouseover; }, 'cost_so_far'],
        [DraggableMarkerLayer, 'start', svg_blob(8), options_a.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(7), exit, 'id']
    ]);
    var options_b = new SearchOptions(options_a.starts, options_a.exit_now, function (id, node) { node.h = manhattan_heuristic(graph, exit.id, id); return node.h; });
    options_b.allow_reprioritize = false;
    var diagram_b = new Diagram("#diagram-astar-2", graph, options_b, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'h'],
        [MouseoverLayer, function (id) { mouseover = id; }],
        [HeuristicLayer, function () { return mouseover; }, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(8), options_b.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(7), exit, 'id']
    ]);
    var options_c = new SearchOptions(options_a.starts, options_a.exit_now, function (id, node) { node.h = manhattan_heuristic(graph, exit.id, id); return node.cost_so_far + 1.01 * node.h; });
    var layout_c = new SquareGridLayout(graph, 35);
    var diagram_c = new Diagram("#diagram-astar-3", graph, options_c, layout_c, [
        [BaseLayer],
        [GraphEditorLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [NumericLabelLayer, 'sort_key'],
        [MouseoverLayer, function (id) { mouseover = id; }],
        [ReconstructedPathLayer, function () { return mouseover; }, 'cost_so_far'],
        [HeuristicLayer, function () { return mouseover; }, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(16), options_c.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(15), exit, 'id']
    ]);
    diagram_a.link_to(diagram_b);
    diagram_a.link_to(diagram_c);
    diagram_b.link_to(diagram_a);
    diagram_b.link_to(diagram_c);
    diagram_c.link_to(diagram_a);
    diagram_c.link_to(diagram_b);
    return { a: diagram_a, b: diagram_b, c: diagram_c };
}
function makeDiagram10() {
    var graph = new SquareGrid(15, 15);
    var layout = new SquareGridLayout(graph, 19);
    var exit = { id: graph.to_id(10, 9) };
    var options_a = new SearchOptions([graph.to_id(4, 5)]);
    var diagram_a = new Diagram("#diagram-contour-comparison .left", graph, options_a, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ColoredLabelLayer],
        [ContourLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_a.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(7), exit, 'id']
    ]);
    var options_b = new SearchOptions(options_a.starts, options_a.exit_now, function (id, node) { node.h = manhattan_heuristic(graph, exit.id, id); return node.h; });
    options_b.allow_reprioritize = false;
    var diagram_b = new Diagram("#diagram-contour-comparison .right", graph, options_b, layout, [
        [BaseLayer],
        [GraphEditorLayer],
        [ColoredLabelLayer],
        [ContourLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(10), options_b.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(7), exit, 'id']
    ]);
    var options_c = new SearchOptions(options_a.starts, options_a.exit_now, function (id, node) { node.h = manhattan_heuristic(graph, exit.id, id); return node.cost_so_far + 1.01 * node.h; });
    var layout_c = new SquareGridLayout(graph, 35);
    var diagram_c = new Diagram("#diagram-contour-comparison .combined", graph, options_c, layout_c, [
        [BaseLayer],
        [GraphEditorLayer],
        [ColoredLabelLayer],
        [ContourLayer],
        [ReconstructedPathLayer, function () { return exit.id; }],
        [DraggableMarkerLayer, 'start', svg_blob(16), options_c.starts, 0],
        [DraggableMarkerLayer, 'goal', svg_cross(15), exit, 'id']
    ]);
    diagram_a.link_to(diagram_b);
    diagram_a.link_to(diagram_c);
    diagram_b.link_to(diagram_a);
    diagram_b.link_to(diagram_c);
    diagram_c.link_to(diagram_a);
    diagram_c.link_to(diagram_b);
    return { a: diagram_a, b: diagram_b, c: diagram_c };
}
function makeDiagram_with3parts(parent_selector, walls, alg_a, alg_b, alg_c) {
    var graph = new SquareGrid(15, 15);
    //var layout = new SquareGridLayout(graph, 19);
    var starts = [graph.to_id(0, 12)];
    var exit = { id: graph.to_id(14, 2) };
    walls.forEach(function (id) { return graph.set_tile_weight(id, Infinity); });
    var tile_types = [
        { name: 'default', weight: 1 },
        { name: 'wall', weight: Infinity }
    ];
    var diagram_options = [
        { selector: parent_selector + " .left", algorithm: alg_a },
        { selector: parent_selector + " .center", algorithm: alg_b },
        { selector: parent_selector + " .right", algorithm: alg_c }
    ];
    var diagrams = makeDiagram_custom_linked(graph, starts, exit, tile_types, diagram_options, { edit: true, path: true });
    new Slider(parent_selector, diagrams);
    return diagrams;
}
function makeDiagram11() {
    return makeDiagram_with3parts("#diagram-astar-complex", [35, 36, 37, 38, 39, 40, 41, 42, 57, 72, 87, 102, 117, 132, 147, 162, 177, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192], 'Dijkstra', 'GreedyBest', 'A*');
}
function makeAllDiagrams() {
    var diagram0 = makeDiagram0();
    var diagram1 = makeDiagram1();
    var diagram2 = makeDiagram2();
    var diagram3 = makeDiagram3();
    var diagram4 = makeDiagram4();
    var diagram5 = makeDiagram5();
    var diagram6 = makeDiagram6();
    var diagram7 = makeDiagram7();
    var diagram8 = makeDiagram8();
    var diagram9 = makeDiagram9();
    var diagram10 = makeDiagram10();
}
