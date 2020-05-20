#!/usr/bin/env python3
# Copyright (c) 2019 Aegean Associates, Inc. All rights reserved.

# BEDFIX-PARABOLIC.PY - output a G-code script to set the bed-level mesh
# computes a least squares fit of the existing bed-level mesh to a parabaloid
#
# SYNOPSIS:
# bedfix-parabolic.py CALIBRAT.TXT|BEDLEVEL.TXT 


import sys
import re
import numpy

R = 55
N = 7

def grid(n):
    return round(((2 * n - (N - 1)) * R) / (N - 1))

FILE = sys.argv[1]

DATA = [ re.findall(r'[-+.0-9]+', s)
         for s in open(FILE) if re.match(r'Bed', s) ]

def datum(x, y):
    return [ x*x, y*y, x*y, x, y, 1.0 ]

XY = [ datum(float(x), float(y)) for x,y,z in DATA ]
Z  = [ float(z) for x,y,z in DATA ]

b = numpy.matrix(Z).T
A = numpy.matrix(XY)
FIT = (A.T * A).I * A.T * b
ERR = b - A * FIT
RES = numpy.linalg.norm(ERR)

COEF = [ n[0] for n in FIT.tolist() ]

def Z(x, y):
    a, b, c, d, e, zo = COEF
    return (a * x*x) + (b * y*y) + (c * x*y) + (d * x) + (e * y) + zo 

print('; bilinear bed level mesh, least-square fit to a paraboloid')
print('; z = {:.6e} x^2 + {:.6e} y^2 + {:.6e} x y + {:.6e} x + {:.6e} y + {:.6e}'.format(*COEF))
print('; residual = {:.5f}'.format(RES))
print('G28#  ; MUST home before using G29 code')
s = 'G29 W I{:d} J{:d} Z{:+.5f}  ; X{:0=+5.1f} Y{:0=+5.1f}'
for j in range(N):
    y = grid(j)
    for i in range(N):
        x = grid(i)
        print(s.format(i, j, Z(x, y), x, y))
print('M400#')
print('M118 {TQ\\:100}{SYS\\:STARTED}#')
print('M118 {E\\:BEDFIX mesh applied}#')
