// Search algorithm for http://www.redblobgames.com/pathfinding/
// Copyright 2013 Red Blob Games
// License: Apache v2
// **********************************************************************
//
//
// NOTE:
// This code is designed for generating diagrams and is not necessarily
// the best way to implement the search algorithms in your own project.
//
// If you want to see code that you can use in your own project, see
// <http://www.redblobgames.com/pathfinding/a-star/implementation.html>
//
//
//
// ********************************************************************************
"use strict";
// The search algorithm takes a set of start points, graph
// (read-only), and a map (read-write). We assume map doesn't have
// 'visited' field set. We'll set the 'cost_so_far', 'sort_key', and
// 'parent' fields of the map. The algorithm modifies map in place,
// and returns its internal state at the time it stopped.
var SearchState = (function () {
    function SearchState(steps, current, frontier, neighbors) {
        this.steps = steps;
        this.current = current;
        this.frontier = frontier;
        this.neighbors = neighbors;
    }
    return SearchState;
})();
var SearchOptions = (function () {
    function SearchOptions(starts, exit_now, sort_key) {
        if (starts === void 0) { starts = []; }
        this.starts = starts;
        this.exit_now = exit_now;
        this.sort_key = sort_key;
        // - starts (required) - list of start points
        // - exit_now function (optional) - return true if it's time to early exit
        // - sort_key (optional) - return a number for sorting the priority queue
        // - allow_reprioritize - true in general, but needs to be set to false for greedy best first search (ugly hack)
        this.allow_reprioritize = true;
        this.exit_now = this.exit_now || (function (_) { return false; });
        this.sort_key = this.sort_key || (function (id, node) { return node.cost_so_far; });
    }
    return SearchOptions;
})();
function search(options, graph, map) {
    var s = new SearchState(0, -1, options.starts.concat(), []);
    s.frontier.forEach(function (id, i) {
        map[id].steps = 0;
        map[id].cost_so_far = 0;
        map[id].visited = true;
        map[id].visit_order = i;
        map[id].sort_key = options.sort_key(id, map[id]);
    });
    if (options.exit_now(s)) {
        return s;
    }
    // For stable sorting, I keep a counter for the elements inserted
    // into the frontier; this is used for breaking ties in the
    // priority queue key
    var visit_order = s.frontier.length;
    while (s.frontier.length > 0) {
        s.steps++;
        s.frontier.sort(function (a, b) {
            return map[a].sort_key == map[b].sort_key
                ? map[a].visit_order - map[b].visit_order
                : map[a].sort_key - map[b].sort_key;
        });
        s.current = s.frontier.shift();
        s.neighbors = graph.edges_from(s.current);
        if (options.exit_now(s)) {
            break;
        }
        s.neighbors.forEach(function (next) {
            var new_cost_so_far = (map[s.current].cost_so_far
                + graph.edge_weight(s.current, next));
            if (!map[next].visited
                || (options.allow_reprioritize && map[next].visited && new_cost_so_far < map[next].cost_so_far)) {
                if (s.frontier.indexOf(next) < 0) {
                    s.frontier.push(next);
                }
                map[next].steps = map[s.current].steps + 1;
                map[next].cost_so_far = new_cost_so_far;
                map[next].parent = s.current;
                map[next].visited = true;
                map[next].visit_order = visit_order++;
                map[next].sort_key = options.sort_key(next, map[next]);
            }
        });
    }
    if (s.frontier.length == 0 && s.steps > 1) {
        // We actually finished the search, so internal state no
        // longer applies. NOTE: this code "smells" bad to me and I
        // should revisit it. I think I am missing one step of the iteration.
        s.current = -1;
        s.neighbors = [];
    }
    return s;
}
// Predefined distance heuristics
function manhattan_heuristic(graph, goal, current) {
    var xy0 = graph.from_id(goal);
    var xy1 = graph.from_id(current);
    return Math.abs(xy0[0] - xy1[0]) + Math.abs(xy0[1] - xy1[1]);
}
function getSearchOptions(graph, starts, exit, algorithm, early_stop) {
    var searchOpts;
    var stopCondition = (early_stop && exit) ? function (ss) { return exit.id == ss.current; } : null;
    switch (algorithm) {
        case 'BFS':
            searchOpts = new SearchOptions(starts, stopCondition, function (id, node) {
                return node.visit_order;
            });
            searchOpts.allow_reprioritize = false;
            break;
        case 'DFS':
            searchOpts = new SearchOptions(starts, stopCondition, function (id, node) {
                return graph.num_nodes - node.visit_order;
            });
            searchOpts.allow_reprioritize = false;
            break;
        case 'Dijkstra':
            searchOpts = new SearchOptions(starts, stopCondition);
            break;
        case 'GreedyBest':
            searchOpts = new SearchOptions(starts, stopCondition, function (id, node) {
                node.h = manhattan_heuristic(graph, exit.id, id);
                return node.h;
            });
            searchOpts.allow_reprioritize = false;
            break;
        case 'A*':
            searchOpts = new SearchOptions(starts, stopCondition, function (id, node) {
                node.h = manhattan_heuristic(graph, exit.id, id);
                return node.cost_so_far + 1.01 * node.h;
            });
            break;
        default:
            console.error("Unsupported search algorithm: " + algorithm);
    }
    return searchOpts;
}
function test_search() {
    function test(a, b) {
        a = JSON.stringify(a);
        b = JSON.stringify(b);
        if (a != b)
            console.log("FAIL", a, "should be", b);
    }
    var G, map, ret, options;
    options = new SearchOptions();
    // Test full exploration with no early exit
    G = new SquareGrid(2, 2);
    map = d3.range(G.num_nodes).map(function (i) { return ({}); });
    ret = search(new SearchOptions([0]), G, map);
    test(map[3].cost_so_far, 2);
    test(map[1].parent, 0);
    test(ret.frontier, []);
    test(ret.neighbors, []);
    test(ret.current, -1);
    // Test grid with obstacles
    G = new SquareGrid(2, 2);
    G.set_tile_weight(1, Infinity);
    G.set_tile_weight(2, Infinity);
    map = d3.range(G.num_nodes).map(function (i) { return ({}); });
    ret = search(new SearchOptions([0]), G, map);
    test(map[3].cost_so_far, undefined);
    test(map[1].parent, undefined);
    test(ret.frontier, []);
    test(ret.neighbors, []);
    test(ret.current, -1);
    // Test early exit
    G = new SquareGrid(2, 2);
    G.set_tile_weight(2, Infinity);
    map = d3.range(G.num_nodes).map(function (i) { return ({}); });
    ret = search(new SearchOptions([0], function (s) { return s.current == 1; }), G, map);
    test(map[3].cost_so_far, undefined);
    test(map[1].parent, 0);
    test(ret.frontier, []);
    test(ret.neighbors, []);
    test(ret.current, -1);
}
