/* 
 * patterns.js
 * https://github.com/aegean-odyssey/mpmd-calibration-experimental
 *
 * Copyright (c) 2020 Aegean Associates, Inc.
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

function R(r, t) {
    t = t * math.pi / 180.0;
    return [ 10*r * math.cos(t), 10*r * math.sin(t) ];
}

function X(x, y) {
    return [ 10*x, 10*y ];
}

function g30(pattern, name) {

    const FILENAME = name;
    const MIMETYPE = "text/x-gcode";

    var ss = [];

    function s(u) {
	ss.push(u + '\n');
    }
    
    s('M988 /G30PROBE.TXT');
    s('M115');
    s('M503');
    s('G28');
    for (const i in pattern) {
        const a = pattern[i];
        s(math.print('G30 X$0 Y$1 V1', a));
    }
    s('G1 X0 Y0 Z40');
    s('M400#');
    s('M989');
    s('M118 {TQ\\:100}{SYS\\:STARTED}#');
    s('M118 {E\:Done! (see /G30PROBE.TXT)}#');
    return [ 0, ss, FILENAME, MIMETYPE ];
}

function bed(pattern, name) {

    var ss = [];

    function s(u) {
	ss.push(u + '\n');
    }
    
    s('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ');
    s(' width="100%" height="100%" viewBox="-600 -600 1200 1200"');
    s(' preserveAspectRatio="xMidYMid meet">');
    s(' <g transform="scale(1,-1)" stroke-width="2" stroke="steelblue">');
    s('  <defs>');
    s('   <marker id="arrow" orient="auto" markerUnits="strokeWidth"');
    s('    markerWidth="11" markerHeight="7" refX="18" refY="3">');
    s('    <path d="M0,0 L10,3 L0,6 L4,3 z" fill="steelblue"/>');
    s('   </marker>');
    s('  </defs>');
    s('  <circle cx="0" cy="0" r="550" stroke="grey" fill="none"/>');
    const point = '  <circle cx="$0" cy="$1" r="12" stroke="white" fill="black"/>';
    const arrow = '  <line x1="$0" y1="$1" x2="$2" y2="$3" marker-end="url(#arrow)"/>';
    pattern.reverse();  // display in reverse for cleaner overlapping arrows
    var a = pattern.shift();
    s(math.print(point, a));
    for (const i in pattern) {
        const b = pattern[i];
        s(math.print(arrow, b.concat(a)));
        s(math.print(point, b));
        a = b;
    }
    const tower = '  <g transform="rotate($0)">$1</g>';
    const T = '<line x1="0" y1="535" x2="0" y2="570" stroke-width="10"/>';
    s(math.print(tower, [0, T]));
    s(math.print(tower, [120, T]));
    s(math.print(tower, [240, T]));
    s(' </g>');
    s('</svg>');
    return s.join('');
}
