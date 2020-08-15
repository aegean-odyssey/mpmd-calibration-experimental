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

function curvefit(s, f) {

    const FILENAME = 'G29_BEDFIX.gcode';
    const MIMETYPE = 'text/x-gcode';

    NOTE = f.elements.NOTE.value;

    FW = s.match(/FIRMWARE_NAME:[^\)]+\)/);
    M92  = s.match(/M92.+/);
    M665 = s.match(/M665.+/);
    M665_A = s.match(/M665 A.+/);
    M666 = s.match(/M666.+/);
    M851 = s.match(/M851.+/);

    s = s.split("\n");
    s = s.filter(function(u) { return u.includes('Bed X') });
    var SS = s.map(function(u) { return u.match(/[-+.0-9]+/g) });

    var XY = SS.map(function(u) { return [ +u[0], +u[1] ] });
    var Z  = SS.map(function(u) { return +u[2] });

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

    const R = 55;
    const N = 7;

    function grid(n) {
        return math.round(((2 * n - (N - 1)) * R) / (N - 1));
    }

    s = [];

    function o(u, v) {
        s.push(((v === undefined) ? u : math.print(u, v)) + "\n");
    }

    function a(v) {
        const w = { notation: 'auto', precision: 6 };
        return v.map(function(u) { return math.format(u, w) });
    }

    function n(v, p) {
        const w = { notation: 'fixed', precision: p };
        const s = (v < 0) ? '' : '+';
        const f = (math.abs(v) < 10) ? ' ' : '';
        return s + math.format(v, w) + f;
    }

    if (NOTE) {
        NOTE = NOTE.replace(/(?![^\n]{1,60}$)([^\n]{1,60})\s/g, '$1\n');
	o('; NOTE');
        o(NOTE.replace(/^(.)/gm, '; $1'));
	o('; ');
    }

    if (FW  ) o('; $0', FW);
    if (M92 ) o('; $0', M92);
    if (M665) o('; $0', M665);
    if (M665_A) o('; $0', M665_A);
    if (M666) o('; $0', M666);
    if (M851) o('; $0', M851);
    SS.forEach(function(xyz) { o('; Bed X: $0 Y: $1 Z: $2', xyz) });

    o('; ');
    o('; interpolated bed level mesh, inverse distance weight');
    //o('G28 ; MUST home before using G29 code');
    o('G29 L$0 R$1 B$0 F$1 C0 ; $2 x $2', [ -R, R, N ]);
    for (var j = 0; j < N; j++) {
        var y = grid(j);
        for (var i = 0; i < N; i++) {
            var x = grid(i);
            o('G29 W I$0 J$1 Z$2; X$3 Y$4',
	      [ i, j, n(z(x, y),5), n(x,1), n(y,1) ]);
        }
    }
    o('M400#');
    o('M118 {TQ\\:100}{SYS\\:STARTED}#');
    o('M118 {E\\:MESH applied}#');

    return [ 0, s, FILENAME, MIMETYPE ];
}
