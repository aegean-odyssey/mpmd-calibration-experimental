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

    const is_probe = t.includes("robe");

    function find_radius(xy) {
	return math.max(math.abs(math.min(xy)), math.abs(math.max(xy)));
    }
	
    function gradient(z) {
	function f(v) {
	    let r = math.floor(v * 0x400);
	    let c = math.bitAnd(r, 0xff);
	    let n = math.bitNot(c);
	    switch(math.bitAnd(r, 0x300)) {
	    case 0x000: return [ 0, c, 255 ];
	    case 0x100: return [ 0, 255, n ];
	    case 0x200: return [ c, 255, 0 ];
	    case 0x300: return [ 255, n, 0 ];
	    }
	}
	return math.print('rgb($0, $1, $2)', f(z));
    }

    let XY, Z, R, N;
    if (is_probe)
	[ XY, Z, R, N ] = mesh(xy, z);
    else
	[ XY, Z, R, N ] = mesh(xy, z, find_radius(xy), 7);

    let zavg = math.mean(Z);
    let zmin = math.min(Z);
    let zmax = math.max(Z);
    let zlow = math.max(zavg - zmin, zmax - zavg);

    let ss = [];
    function s(u, v=[]) {
	ss.push(math.print(u, v));
    }

    function pf(v) {
	let s = (v < 0) ? '' : '+';
	return s + String(math.fix((v * 1000) + 1/2) / 1000);
    }

    const CC = '<circle cx="$0" cy="$1" r="$2"><title>$3 mm</title></circle>';
    const RR = ('<rect x="$0" y="$1" height="$2" width="$2" fill="$3">' +
		'<title>$4 mm</title></rect>');

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
    s('<g id="KEY" transform="scale(1,-1) translate(0,700)" font-size="28">');
    s('<rect x="-350" y="-80" width="700" height="50"');
    s(' stroke="white" stroke-width="8" fill="url(#gradient)"/>');
    s('<text text-anchor="start" x="-350" y="-3">$0</text>', [pf(zavg-zlow)]);
    s('<text text-anchor="middle" x="0" y="-3">$0</text>', [pf(zavg)]);
    s('<text text-anchor="end" x="350" y="-3">$0</text>', [pf(zavg+zlow)]);
    s('</g>');
    s('<g id="BED">');
    s('<circle cx="0" cy="0" r="550" stroke="black" fill="none"/>');
    s('<line id="T" x1="0" y1="535" x2="0" y2="580" stroke-width="13"/>');
    s('<g transform="rotate(120)"><use href="#T"/></g>');
    s('<g transform="rotate(240)"><use href="#T"/></g>');
    s('</g>');
    s('</defs>');
    s('<g transform="scale(1,-1)" stroke-width="2" stroke="black">');
    s('<g stroke="white" stroke-width="1">');
    XY.forEach(function(u, i) {	let o = R/(N-1), w = 20.0 * o;
				let [ x, y ] = u.map(n => (n - o) * 10.0);
				let z = (Z[i] - (zavg - zlow)) /zlow /2.0;
				s(RR, [x, y, w, gradient(z), pf(Z[i])]) });
    s('</g>');
    if (is_probe) {
	s('<g stroke="none" fill="black" fill-opacity="0.5">');
	xy.forEach(function (u, i) { let [x, y] = u.map(n => n * 10.0);
				     s(CC, [x, y, 15, pf(z[i])]) });
	s('</g>');
    }
    s('<use href="#BED"/>');
    s('<use href="#KEY"/>');
    s('</g>');
    s('</svg>');
    return 'data:image/svg+xml;base64,' + window.btoa(ss.join(''));
}

function xy_from_grid(n) {
    const R = 55, N = 7;
    return math.round(((2 * n - (N - 1)) * R) / (N - 1));
}

function curvefit(str, form) {

    const FILENAME = 'CALIBRAT.TXT.html';
    const MIMETYPE = 'text/html';
    
    NOTE = form.elements.NOTE.value;

    FW = str.match(/mpmd_marlin[^\)]+\)/);
    M92 = str.match(/^  M92.+/m);
    M665 = str.match(/^  M665.+/m);
    M665_A = str.match(/^  M665 A.+/m);
    M666 = str.match(/^  M666.+/m);
    M851 = str.match(/^  M851.+/m);
    BEDX = str.match(/Bed X.+/gm);
    G29W = str.match(/^  G29 W.+/gm);

    let ss;
    ss = BEDX.map(u => u.match(/[-+.0-9]+/g));
    let bXY = ss.map(u => [+u[0], +u[1]]);
    let bZ = ss.map(u => +u[2]);
    ss = G29W.map(u => u.match(/[-+.0-9]+/g));
    let gXY = ss.map(u => [+u[4], +u[5]]);
    let gZ = ss.map(u => +u[3]);

    if (ss[0].length < 6)
	// x, y are missing, so guess using mesh indices
	gXY = ss.map(u => [xy_from_grid(+u[1]), xy_from_grid(+u[2])]);
    
    ss = [];
    function s(u, v=[]) {
        ss.push(math.print(u, v) + "\n");
    }

    s('<!DOCTYPE html>');
    s('<html>');

    s('<head>');
    s('<meta charset="UTF-8">');
    s('<title>CALIBRAT.TXT</title>');
    s('<link rel="stylesheet" href="$0//$1/$2/assets/css/report.css"/>',
      [ window.location.protocol,
	window.location.hostname,
	window.location.pathname.split('/').slice(0,-1).join('/') ]);
    s('</head>');

    s('<body>');
    s('<header></header>');
    s('<section>');

    s('<h2>CALIBRAT.TXT</h2>');

    if (FW) s('<h4>FIRMWARE_NAME: $0</h4>', FW);
    if (NOTE) s('<p>NOTE: $0</p>', [NOTE]);

    s('<details open>');
    s('<summary>Machine Geometry/ Calibration</summary>');
    s('<ul>');
    if (M92 ) s('<li>$0</li>', M92);
    if (M665) s('<li>$0</li>', M665);
    if (M665_A) s('<li>$0</li>', M665_A);
    if (M666) s('<li>$0</li>', M666);
    if (M851) s('<li>$0</li>', M851);
    s('</ul>');
    s('</details>');

    s('<details class="heatmap">')
    s('<summary>Probed Points</summary>');
    s('<div class="plot">');
    s('<object class="heatmap" data="$0" type="image/svg+xml"></object>',
      [heatmap(bXY, bZ, 'probed points')]);
    s('<ul>');
    BEDX.forEach(u => s('<li>$0</li>', [u]));
    s('</ul>');
    s('</div>');
    s('</details>');

    s('<details class="heatmap">')
    s('<summary>Bed Level Mesh</summary>');
    s('<div class="plot">');
    s('<object class="heatmap" data="$0" type="image/svg+xml"></object>',
      [heatmap(gXY, gZ, 'bed level mesh')]);
    s('<ul>');
    G29W.forEach(u => s('<li>$0</li>', [u]));
    s('</ul>');
    s('</div>');
    s('</details>');

    s('</section>');
    s('<footer></footer>');
    s('</body>');
    s('</html>');
    
    return [ 0, ss, FILENAME, MIMETYPE ];
}
