/* 
 * calibrat_txt.js
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


function mesh(XY, Z, R=55, N=15) {
    
    //const R = 55;
    //const N = 15;

    function grid(n) {
        //return math.round(((2 * n - (N - 1)) * R) / (N - 1));
        return ((2 * n - (N - 1)) * R) / (N - 1);
    }

    function interpolate(x, y, XY, Z) {
        let H = XY.map(u => math.pow(math.hypot(x - u[0], y - u[1]), 4));
        let i = H.findIndex(u => (u < 0.0001));
	if (i < 0) {
            let N = H.reduce((v, u, i) => v + (Z[i]/u), 0);
            let D = H.reduce((v, u) => v + (1.0/u), 0);
            return N/D;
        }
        return Z[i];
    }

    let _XY = [], _Z = [];
    for (let j = 0; j < N; j++) {
        let y = grid(j);
        for (let i = 0; i < N; i++) {
            let x = grid(i);
            _XY.push([ x, y ]);
	    _Z.push(interpolate(x, y, XY, Z));
        }
    }
    return [ _XY, _Z, R, N ];
}

function heatmap(xy, z, t) {

    const probe = t.includes("robe");

    function gradient(v) {
	function f(x) {
	    let r = math.floor(x * 0x400);
	    let c = math.bitAnd(r, 0xff);
	    let n = math.bitNot(c);
	    switch(math.bitAnd(r, 0x300)) {
	    case 0x000: return [ 0, c, 255 ];
	    case 0x100: return [ 0, 255, n ];
	    case 0x200: return [ c, 255, 0 ];
	    case 0x300: return [ 255, n, 0 ];
	    }
	}
	return math.print('rgb($0, $1, $2)', f(v));

    }

    let _XY, _Z, _R, _N;
    if (probe)
	[ _XY, _Z, _R, _N ] = mesh(xy, z);
    else
	[ _XY, _Z, _R, _N ] = mesh(xy, z,
				   math.max(math.abs(math.min(xy)),
					    math.abs(math.max(xy))),
				   7);

    let zavg = math.mean(_Z);
    let zmin = math.min(_Z);
    let zmax = math.max(_Z);
    let zlow = math.max(zavg - zmin, zmax - zavg);

    let ss = [];
    function s(u, v=[]) {
	ss.push(math.print(u, v));
    }

    function f(v) {
	let s = (v < 0) ? '' : '+';
	return s + String(math.fix((v * 1000) + 1/2) / 1000);
    }
    
    function datum(u, i) {
	let c = '<circle cx="$0" cy="$1" r="$2"><title>$3 mm</title></circle>';
	let [ x, y ] = u.map(n => n * 10.0);
	s(c, [ x, y, 15, f(z[i]) ]);
    }

    function tiled(u, i) {
	let r = ('<rect x="$0" y="$1" height="$2" width="$2" fill="$3">' +
		 '<title>$4 mm</title></rect>');
	let o = _R / (_N - 1);
	let [ x, y ] = u.map(n => (n - o) * 10.0);
	let z = (_Z[i] - (zavg - zlow)) / zlow / 2.0;
	s(r, [ x, y, 20.0 * o, gradient(z), f(_Z[i]) ]);
    }

    s('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"');
    s(' width="100%" height="100%" viewBox="-700 -700 1400 1400"');
    s(' preserveAspectRatio="xMidYMid meet">');
    s('<defs>');
    s('<linearGradient id="gradient">');
    s('<stop offset="0%"   stop-color="#00F"/>');
    s('<stop offset="25%"  stop-color="#0FF"/>');
    s('<stop offset="50%"  stop-color="#0F0"/>');
    s('<stop offset="75%"  stop-color="#FF0"/>');
    s('<stop offset="100%" stop-color="#F00"/>');
    s('</linearGradient>');
    s('<g id="key" transform="scale(1,-1) translate(0,700)" font-size="28">');
    s('<rect x="-350" y="-80" width="700" height="50"');
    s(' stroke="white" stroke-width="8" fill="url(#gradient)"/>');
    s('<text text-anchor="start" x="-350" y="-3">$0</text>', [ f(zavg-zlow) ]);
    s('<text text-anchor="middle" x="0" y="-3">$0</text>', [ f(zavg) ]);
    s('<text text-anchor="end" x="350" y="-3">$0</text>', [ f(zavg+zlow) ]);
    s('</g>');
    s('</defs>');
    s('<g transform="scale(1,-1)" stroke-width="2" stroke="black">');
    s('<g stroke="white" stroke-width="1">');
    _XY.map(tiled);
    s('</g>');
    s('<circle cx="0" cy="0" r="550" stroke="black" fill="none"/>');
    const tower = '<g transform="rotate($0)">$1</g>';
    const T = '<line x1="0" y1="535" x2="0" y2="580" stroke-width="13"/>';
    s(math.print(tower, [0, T]));
    s(math.print(tower, [120, T]));
    s(math.print(tower, [240, T]));
    if (probe) {
	s('<g stroke="none" fill="black" fill-opacity="0.5">');
	xy.map(datum);
	s('</g>');
    }
    s('<use href="#key"/>');
    s('</g>');
    s('</svg>');
    return 'data:image/svg+xml;base64,' + window.btoa(ss.join(''));
}

function curvefit(s, f) {

    const FILENAME = 'CALIBRAT.TXT.html';
    const MIMETYPE = 'text/html';
    
    NOTE = f.elements.NOTE.value;

    FW = s.match(/mpmd_marlin[^\)]+\)/);
    M92 = s.match(/^  M92.+/m);
    M665 = s.match(/^  M665.+/m);
    M665_A = s.match(/^  M665 A.+/m);
    M666 = s.match(/^  M666.+/m);
    M851 = s.match(/^  M851.+/m);
    BEDX = s.match(/Bed X.+/gm);
    G29W = s.match(/^  G29 W.+/gm);

    // grab these to preserve the theme in our generated page
    let [ page_upper, , page_lower ] =
	(document.documentElement.innerHTML).split(/<\/?section>/);

    // patch up the script and style urls
    let url = math.print("$0//$1", [ window.location.protocol,
				     window.location.hostname ]);
    page_upper = page_upper.replace(/(href|src)=\"\//g, '$1="' + url + '/');
    page_lower = page_lower.replace(/(href|src)=\"\//g, '$1="' + url + '/');

    let ss;
    ss = BEDX.map(function(u) { return u.match(/[-+.0-9]+/g) });
    let bXY = ss.map(function(u) { return [ +u[0], +u[1] ] });
    let bZ = ss.map(function(u) { return +u[2] });
    ss = G29W.map(function(u) { return u.match(/[-+.0-9]+/g) });
    let gXY = ss.map(function(u) { return [ +u[4], +u[5] ] });
    let gZ = ss.map(function(u) { return +u[3] });

    ss = [];
    function o(u, v=[]) {
        ss.push(math.print(u, v) + "\n");
    }

    o('<!DOCTYPE html>');
    o('<html>');
    o(page_upper);
    o('<section class="monospace">');

    o('<h2>CALIBRAT.TXT</h2>');

    if (FW) o('<h4>FIRMWARE_NAME: $0</h4>', FW);
    if (NOTE) o('<p>NOTE: $0</p>', [ NOTE ]);

    o('<details open>');
    o('<summary>Machine Geometry/ Calibration</summary>');
    o('<ul>');
    if (M92 ) o('<li>$0</li>', M92);
    if (M665) o('<li>$0</li>', M665);
    if (M665_A) o('<li>$0</li>', M665_A);
    if (M666) o('<li>$0</li>', M666);
    if (M851) o('<li>$0</li>', M851);
    o('</ul>');
    o('</details>');

    o('<details class="heatmap">')
    o('<summary>Probed Points</summary>');
    o('<div class="plot">');
    o('<object class="heatmap" data="$0" type="image/svg+xml"></object>',
      new Array(heatmap(bXY, bZ, 'probed points')));
    o('<ul>');
    BEDX.map(function(u) { o('<li>$0</li>', [u]) });
    o('</ul>');
    o('</div>');
    o('</details>');

    o('<details class="heatmap">')
    o('<summary>Bed Level Mesh</summary>');
    o('<div class="plot">');
    o('<object class="heatmap" data="$0" type="image/svg+xml"></object>',
      new Array(heatmap(gXY, gZ, 'bed level mesh')));
    o('<ul>');
    G29W.map(function(u) { o('<li>$0</li>', [u]) });
    o('</ul>');
    o('</div>');
    o('</details>');

    o('</section>');
    o(page_lower);
    o('</html>');
    
    return [ 0, ss, FILENAME, MIMETYPE ];
}
