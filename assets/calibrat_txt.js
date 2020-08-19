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

var BM_Z = [];
var BM_N = 7;
var BM_gfx = 0.0;
var BM_gfy = 0.0;

function BM_init(ss) {
    let dx = 2 * 55;
    let dy = 2 * 55;
    if (! (ss[0].length < 6)) {
	dx = ss.map(u => +u[4]);
	dy = ss.map(u => +u[5]);
	dx = math.max(dx) - math.min(dx);
	dy = math.max(dy) - math.min(dy);
    }
    BM_N = 7;
    BM_gfx = (BM_N - 1) / dx;
    BM_gfy = (BM_N - 1) / dy;
    BM_Z = [];
    for (let n = 0; n < ss.length; n++) {
	let [i, j, z]  = [+(ss[n])[1], +(ss[n])[2], +(ss[n])[3]];
	BM_Z[(j * BM_N) + i] = z;
    }
}

function BM_zoff(xy) {
    function get(i, j) {
	return BM_Z[(j * BM_N) + i];
    }
    let [x, y] = xy;

    let halfx = (BM_N - 1) /2;
    let halfy = (BM_N - 1) /2;

    let h1x = 0.001 - halfx;
    let h2x = halfx - 0.001;
    let h1y = 0.001 - halfy;
    let h2y = halfy - 0.001;

    let grid_x = math.max(h1x, math.min(h2x, x * BM_gfx));
    let grid_y = math.max(h1y, math.min(h2y, y * BM_gfy));

    let floor_x = math.floor(grid_x);
    let floor_y = math.floor(grid_y);

    let ratio_x = grid_x - floor_x;
    let ratio_y = grid_y - floor_y;
    let z1 = get(floor_x + halfx, floor_y + halfy);
    let z2 = get(floor_x + halfx, floor_y + halfy + 1);
    let z3 = get(floor_x + halfx + 1, floor_y + halfy);
    let z4 = get(floor_x + halfx + 1, floor_y + halfy + 1);
    let left = (1 - ratio_y) * z1 + ratio_y * z2;
    let right = (1 - ratio_y) * z3 + ratio_y * z4;
    let offset = (1 - ratio_x) * left + ratio_x * right;

    return offset;
}

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

function analyses(xy, z) {

    let [ XY, Z, R, N ] = mesh(xy, z);
    Z = Z.map((u, i) => u - BM_zoff(XY[i]));

    let W = 0.045;

    function distribution(d, w) {
	let ss = [];
	function s(u, v=[]) { ss.push(math.print(u, v)) }
	s('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"');
	s(' width="100%" height="100%" viewBox="-100 0 200 14"');
	s(' preserveAspectRatio="xMidYMid meet">');
	s('<defs>');
	s('<linearGradient id="n" gradientTransform="scale($0,1)">', [w/d/3]);
	s('<stop offset="0%"  stop-color="#0f0"/>');
	s('<stop offset="50%" stop-color="#0ff"/>');
	s('<stop offset="99%" stop-color="#00f"/>');
	s('<stop offset="99%" stop-color="#339"/>');
	s('</linearGradient>');
	s('<linearGradient id="p" gradientTransform="scale($0,1)">', [w/d/3]);
	s('<stop offset="0%"  stop-color="#0f0"/>');
	s('<stop offset="50%" stop-color="#ff0"/>');
	s('<stop offset="99%" stop-color="#f00"/>');
	s('<stop offset="99%" stop-color="#c03"/>');
	s('</linearGradient>');
	s('<rect id="b" x="0" y="2" width="100" height="10"/>');
	s('</defs>');
	s('<g stroke="none">');
	s('<g fill="url(#n)" transform="scale(-1,1)"><use href="#b"/></g>');
	s('<g fill="url(#p)" transform="scale(+1,1)"><use href="#b"/></g>');
	s('</g>');
	s('</svg>');
	ss = window.btoa(ss.join(''));
	return '<img src="data:image/svg+xml;base64,' + ss + '"/>';
    }

    function pf(v) {
	return String(math.floor(v * 1000) / 1000);
    }

    function rating(d, W) {
	if (d > (3*W/9)) return 'POOR';
	if (d > (2*W/9)) return 'FAIR';
	if (d > (1*W/9)) return 'GOOD';
	return 'VERY_GOOD';
    }

    function stats(Z, R) {
	let Q = Z.filter((u, i) => ! (math.hypot(XY[i]) > R));
	let std = math.std(Q);
	let avg = math.mean(Q);
	let min = math.min(Q);
	let max = math.max(Q);
	let N = Q.length;

	let ss = [];
	function s(u, v=[]) { ss.push(math.print(u, v)) }
	let u = 'mm', d3 = pf(3*std), r = rating(std, W);
	s('<h4 style="margin-top:4em">R-$0 SAMPLE</h4>', [R]);
	s('<p>sample radius: $1$0 ($2 samples)<p>', [u, R, N]);
	s('<p>min/ avg/ max: $1/ $2/ $3$0</p>', [u, pf(min),pf(avg),pf(max)]);
	s('<p>std.deviation: $1$0 (3&sigma;: $2$0)</p>', [u, pf(std), d3]);
	s('<h5 style="float:left;text-align:left;width:1in">-$0</h5>',[d3]);
	s('<h5 style="float:right;text-align:right;width:1in">+$0</h5>',[d3]);
	s('<h5 style="clear:both">$0</h5>', [distribution(std, W)]);
	s('<p>rating: <b>$1</b> (based on a &plusmn;$2$0 limit)', [u,r,pf(W)]);
	return ss.join('');
    }

    let ss = [];
    ss.push(stats(Z, 55));
    ss.push(stats(Z, 27));
    return ss;
}

function heatmap(xy, z, t) {

    const is_probe = t.includes("robe");
    const is_zcomp = t.includes("correction");

    function find_radius(xy) {
	return math.max(math.abs(math.min(xy)), math.abs(math.max(xy)));
    }

    function gradient(z) {
	if (z < 0.0) return '#339';
	if (z > 1.0) return '#c03';
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

    let [ XY, Z, R, N ] = (is_probe || is_zcomp)
	? mesh(xy, z)
	: mesh(xy, z, find_radius(xy), 7);

    if (is_zcomp)
	Z = Z.map((u, i) => u - BM_zoff(XY[i]));

    let zavg = math.mean(Z);
    let zmin = math.min(Z);
    let zmax = math.max(Z);
    let zlow = math.max(zavg - zmin, zmax - zavg);

    if (is_zcomp) zlow = 0.045;

    let ss = [];
    function s(u, v=[]) {
	ss.push(math.print(u, v));
    }

    function pf(v) {
	let s = (v > 0) ? '+' : '';
	return s + String(math.floor(v * 1000) / 1000);
    }

    const with_corners = ! (is_probe || is_zcomp);

    function within_R(x, y, w) {
	const Ro = 550;
	let c = [[x, y], [x, y+w], [x+w, y], [x+w, y+w]];
	let d = math.min(c.map(u => math.hypot(u)));
	return ! (d > Ro);
    }

    const CC = '<circle cx="$0" cy="$1" r="$2"><title>$3 mm</title></circle>';
    const RR = ('<rect x="$0" y="$1" height="$2" width="$2" fill="$3">' +
		'<title>$4 mm</title></rect>');

    s('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"');
    s(' width="100%" height="100%" viewBox="-700 -700 1400 1400"');
    s(' preserveAspectRatio="xMidYMid meet">');
    s('<defs>');
    s('<linearGradient id="gradient">');
    if (is_zcomp) {
	s('<stop offset="2%"  stop-color="#339"/>');
	s('<stop offset="2%"  stop-color="#00f"/>');
	s('<stop offset="25%" stop-color="#0ff"/>');
	s('<stop offset="50%" stop-color="#0f0"/>');
	s('<stop offset="75%" stop-color="#ff0"/>');
	s('<stop offset="98%" stop-color="#f00"/>');
	s('<stop offset="98%" stop-color="#c03"/>');
    }
    else {
	s('<stop offset="0%"   stop-color="#00f"/>');
	s('<stop offset="25%"  stop-color="#0ff"/>');
	s('<stop offset="50%"  stop-color="#0f0"/>');
	s('<stop offset="75%"  stop-color="#ff0"/>');
	s('<stop offset="100%" stop-color="#f00"/>');
    }
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
    if (is_zcomp) {
	s('<circle cx="0" cy="0" r="270" stroke="gray" fill="none"/>');
    }
    s('<line id="T" x1="0" y1="535" x2="0" y2="580" stroke-width="13"/>');
    s('<g transform="rotate(120)"><use href="#T"/></g>');
    s('<g transform="rotate(240)"><use href="#T"/></g>');
    s('</g>');
    s('</defs>');
    s('<g transform="scale(1,-1)" stroke-width="2" stroke="black">');
    s('<g stroke="white" stroke-width="1">');
    XY.forEach(function(u, i) {	let o = R/(N-1), w = 20.0 * o;
				let [ x, y ] = u.map(n => (n - o) * 10.0);
				if (with_corners || within_R(x, y, w)) {
				    let z = (Z[i] - (zavg - zlow)) /zlow /2.0;
				    s(RR, [x, y, w, gradient(z), pf(Z[i])]);
				}});
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

    let NOTE = form.elements.NOTE.value;
    let FNAM = form.elements.FILE.files[0].name;

    let FW = str.match(/FIRMWARE_NAME:[^\)]+\)/);
    let M92 = str.match(/^  M92.+/m);
    let M665 = str.match(/^  M665.+/m);
    let M665_A = str.match(/^  M665 A.+/m);
    let M666 = str.match(/^  M666.+/m);
    let M851 = str.match(/^  M851.+/m);
    let BEDX = str.match(/Bed X.+/gm);
    let G29W = str.match(/^  G29 W.+/gm);
    let G33 = str.match(/^(\..+)|((Iteration|Checking|Calibration).+)/gm);

    if (! (FW || M92 || M665 || M665_A || M666 || M851 || BEDX || G29W || G33))
	return ['Found nothing to report. Aborting.'];

    let ss;

    let gXY, gZ;
    if (BEDX) {
	ss = BEDX.map(u => u.match(/[-+.0-9]+/g));
	let bXY = ss.map(u => [+u[0], +u[1]]);
	let bZ = ss.map(u => +u[2]);
    }

    let gXY, gZ
    if (G29W) {
	ss = G29W.map(u => u.match(/[-+.0-9]+/g));
	gXY = ss.map(u => [+u[4], +u[5]]);
	gZ = ss.map(u => +u[3]);
	if (ss[0].length < 6)
	    // x, y are missing, so guess using mesh indices
	    gXY = ss.map(u => [xy_from_grid(+u[1]), xy_from_grid(+u[2])]);
	BM_init(ss);
    }

    ss = [];
    function s(u, v=[]) {
        ss.push(math.print(u, v) + "\n");
    }

    s('<!DOCTYPE html>');
    s('<html>');

    s('<head>');
    s('<meta charset="UTF-8">');
    s('<title>$0</title>', [FNAM]);
    s('<link rel="stylesheet" href="$0//$1/$2/assets/css/report.css"/>',
      [ window.location.protocol,
	window.location.hostname,
	window.location.pathname.split('/').slice(0,-1).join('/') ]);
    s('</head>');

    s('<body>');
    s('<header></header>');
    s('<section>');

    s('<h2>$0</h2>', [FNAM]);

    if (! FW) FW = ['NOT_FOUND'];
    // shorten the firmware string a little bit
    FW = FW.map(u => u.replace('FIRMWARE_NAME:Marlin ', ''));

    s('<h4>FIRMWARE: $0</h4>', FW);
    if (NOTE) s('<p>NOTE: $0</p>', [NOTE]);

    if (M92 || M665 || M665_A || M666 || M851) {
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
    }
    if (G33) {
	s('<details>');
	s('<summary>G33 auto calibration</summary>');
	s('<ul>');
	G33.forEach(u => s('<li>$0</li>', [u]));
	s('</ul>');
	s('</details>');
    }
    if (BEDX) {
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
    }
    if (G29W) {
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
    }
    if (BEDX && G29W) {
	s('<details class="heatmap" open>')
	s('<summary>Results/ Statistics</summary>');
	s('<div class="plot">');
	s('<object class="heatmap" data="$0" type="image/svg+xml"></object>',
	  [heatmap(bXY, bZ, 'mesh correction')]);
	s('<ul>');
	let Q = analyses(bXY, bZ);
	Q.forEach(u => s('<li>$0</li>', [u]));
	s('</ul>');
	s('</div>');
	s('</details>');
    }
    s('</section>');
    s('<footer></footer>');
    s('</body>');
    s('</html>');

    return [ 0, ss, FILENAME, MIMETYPE ];
}
