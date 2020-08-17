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
    return [ r * math.cos(t), r * math.sin(t) ];
}

function X(x, y) {
    return [ x, y ];
}

function g30(pattern, name) {

    const FILENAME = name;
    const MIMETYPE = "text/x-gcode";
    
    var ss = [];
    function s(u) { ss.push(u + '\n') }
    s('M988 /G30PROBE.TXT');
    s('M115');
    s('M503');
    s('M111');
    s('G28');
    const format = { notation: 'fixed', precision: 3 };
    pattern.forEach(u => s(math.print('G30 V1 X$0 Y$1', u, format)));
    s('G1 X0 Y0 Z40');
    s('M400#');
    s('M989');
    s('M118 {TQ\\:100}{SYS\\:STARTED}#');
    s('M118 {E\:Done! (see /G30PROBE.TXT)}#');
    return [ 0, ss, FILENAME, MIMETYPE ];
}

function bed(pattern, name) {

    const format = { notation: 'fixed', precision: 2 };

    function tag(u, i) {
	function th_d(u) {
	    let [x, y] = u;
	    return math.atan2(y, x) * 180/math.pi;
	}
	return math.print(
	    '#$1 (X:$2$0, Y:$3$0) (R:$4$0, &#952;:$5&#176;)',
	    ['mm', String(i+1), u[0], u[1], math.hypot(u), th_d(u)],
	    format);
    }

    var cloned = math.clone(pattern);

    var ss = [];
    function s(u, v=[], f={}) { ss.push(math.print(u, v, f)) }
    s('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"');
    s(' width="100%" height="100%" viewBox="-600 -600 1200 1200"');
    s(' preserveAspectRatio="xMidYMid meet">');
    s('<defs>');
    s('<marker id="m" orient="auto" markerUnits="strokeWidth"');
    s(' markerWidth="10" markerHeight="6" refX="18" refY="3">');
    s('<path d="M10,0 L0,3 L10,6 L6,3 M10,0" fill="steelblue"/>');
    s('</marker>');
    s('<line id="t" x1="0" y1="535" x2="0" y2="575" stroke-width="11"/>');
    s('<g id="towers">');
    s('<g transform="rotate(0)"><use href="#t"/></g>');
    s('<g transform="rotate(120)"><use href="#t"/></g>');
    s('<g transform="rotate(240)"><use href="#t"/></g>');
    s('</g>');
    s('</defs>');
    s('<g transform="scale(1,-1)" stroke-width="2" stroke="steelblue">');
    s('<circle cx="0" cy="0" r="550" stroke="grey" fill="none"/>');
    s('<use href="#towers"/>');
    cloned.reverse();  // display in reverse for cleaner overlapping arrows
    const P='<circle cx="$0" cy="$1" r="10" stroke-width="7" stroke="white"/>';
    let a = (cloned[0]).map(u => 10 * u);
    s(P, a, format);
    for (let i = 1; i < cloned.length; i++) {
        const b = (cloned[i]).map(u => 10 * u);
        s(P, b, format);
        s('<line x1="$0" y1="$1" x2="$2" y2="$3" marker-end="url(#m)"/>',
	  a.concat(b), format);
        a = b;
    }
    cloned.reverse();
    const Q = '<circle cx="$0" cy="$1" r="8"><title>$2</title></circle>';
    s('<g stroke="none" fill="limegreen">');
    s(Q, a.concat(tag(cloned[0], 0)), format);
    s('</g>');
    s('<g stroke="none" fill="black">');
    for (let i = 1; i < cloned.length; i++) {
        const b = (cloned[i]).map(u => 10 * u);
        s(Q, b.concat(tag(cloned[i], i)), format);
    }
    s('</g>');
    s('</g>');
    s('</svg>');
    ss = 'data:image/svg+xml;base64,' + window.btoa(ss.join(''));
    return '<object class="pattern" type="image/svg+xml" data="'
	+ ss + '"></object>';
}
