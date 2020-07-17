/* 
 * curvefit-parabolic.js
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
    
    s = s.split("\n");
    s = s.filter(function(u) { return u.includes('Bed X') });
    s = s.map(function(u) { return u.match(/[-+.0-9]+/g) });

    function datum(x, y) {
        return [ x*x, y*y, x*y, x, y, 1.0 ];
    }

    var XY = s.map(function(u) { return datum(+u[0], +u[1]) });
    var Z  = s.map(function(u) { return +u[2] });

    var b = math.transpose(math.matrix(Z));
    var A = math.matrix(XY);
    var A_T = math.transpose(A);
    var A_I = math.multiply(math.inv(math.multiply(A_T, A)), A_T);
    var FIT = math.multiply(A_I, b);
    var ERR = math.subtract(b, math.multiply(A, FIT));
    var RES = math.sqrt(math.sum(math.square(ERR)));

    function z(x, y) {
        return math.multiply(FIT, math.transpose(datum(x,y)));
    }

    const R = 55;
    const N = 7;

    function grid(n) {
        return math.round(((2 * n - (N - 1)) * R) / (N - 1));
    }

    var s = [];

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

    o('G28');
    o('; bilinear bed level mesh, least-square fit to a paraboloid');
    o('; z = $0 x^2 + $1 y^2 + $2 x y + $3 x + $4 y + $5', a(FIT));
    o('; residual = $0', [ n(RES,5) ]);
    o('G29 L$0 R$1 B$0 F$1 C0 ; $2 x $2', [ -R, R, N ]);
    for (var j = 0; j < N; j++) {
        var y = grid(j);
        for (var i = 0; i < N; i++) {
            var x = grid(i);
            o('G29 W I$0 J$1 Z$2  ; X$3 Y$4',
	      [ i, j, n(z(x, y),5), n(x,1), n(y,1) ]);
        }
    }
    o('M400#');
    o('M118 {TQ\\:100}{SYS\\:STARTED}#');
    o('M118 {E\\:BEDFIX mesh applied}#');

    return [ 0, s, FILENAME, MIMETYPE ];
}
