/* 
 * curvefit-inv_dist_wgt.js
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

function curvefit(str, form) {

    const R = 55;
    const N = 7;

    function grid(n) {
        return math.round(((2 * n - (N - 1)) * R) / (N - 1));
    }

    const FILENAME = 'G29_BEDFIX.gcode';
    const MIMETYPE = 'text/x-gcode';

    let NOTE = form.elements.NOTE.value;

    let FW = str.match(/FIRMWARE_NAME:[^\)]+\)/);
    let M92  = str.match(/M92.+/);
    let M665 = str.match(/M665.+/);
    let M665_A = str.match(/M665 A.+/);
    let M666 = str.match(/M666.+/);
    let M851 = str.match(/M851.+/);

    let BEDX = str.match(/Bed X.+/gm);
    let G29W = str.match(/G29 W.+/gm);

    if (! (BEDX || G29W))
	return ['No probe measurements or bed mesh found. Aborting.'];

    let ss, XY, Z;
    if (BEDX) {
	ss = BEDX.map(u => u.match(/[-+.0-9]+/g));
	XY = ss.map(u => [+u[0], +u[1]]);
	Z  = ss.map(u => +u[2]);
    }
    else {
	ss = G29W.map(u => u.match(/[-+.0-9]+/g));
	XY = ss.map(u => [+u[4], +u[5]]);
	Z  = ss.map(u => +u[3]);
	if (ss[0].length < 6)
	    // x, y are missing, so guess using mesh indices
	    XY = ss.map(u => [grid(+u[1]), grid(+u[2])]);
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

    function z(x, y) {
        return interpolate(x, y, XY, Z);
    }

    function pv(v, p) {
        return ((v < 0) ? '' : '+')
	    + math.format(v, {notation: 'fixed', precision: p})
	    + ((math.abs(v) < 10) ? ' ' : '');
    }

    ss = [];
    function s(u, v=[], f={}) {
	ss.push(math.print(u, v, f) + "\n")
    }

    s(';;;');
    if (NOTE) {
	// limit lines to 60 characters; word wrap
        NOTE = NOTE.replace(/(?![^\n]{1,60}$)([^\n]{1,60})\s/g, '$1\n');
	s('; NOTE');
        s(NOTE.replace(/^(.)/gm, '; $1'));
	s('; ');
    }
    if (FW) {
	// shorten the firmware string a little bit
	FW = FW.map(u => u.replace('_NAME:Marlin', ':'));
	s('; $0', FW);
    }
    if (M92 ) s('; $0', M92);
    if (M665) s('; $0', M665);
    if (M665_A) s('; $0', M665_A);
    if (M666) s('; $0', M666);
    if (M851) s('; $0', M851);
    if (BEDX)
	BEDX.forEach(u => s('; $0', [u]));
    else
	G29W.forEach(u => s('; $0', [u]));
    s('; ');
    s('; interpolated bed level mesh, inverse distance weight');
    //s('G28 ; MUST home before using G29 code');
    s('G29 L$0 R$1 B$0 F$1 C0 ; $2 x $2', [-R, R, N]);
    for (let j = 0; j < N; j++) {
        let y = grid(j);
        for (let i = 0; i < N; i++) {
            let x = grid(i);
            s('G29 W I$0 J$1 Z$2; X$3 Y$4',
	      [i, j, pv(z(x, y), 5), pv(x, 2), pv(y, 2)]);
        }
    }
    s('M400#');
    s('M118 {TQ\\:100}{SYS\\:STARTED}#');
    s('M118 {E\\:MESH applied}#');

    return [ 0, ss, FILENAME, MIMETYPE ];
}
