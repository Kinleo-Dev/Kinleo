"""
Waving: skeleton poses for the sprite generator.
Only used by character/core/generator/generate.py, never by the app.

Front view: the character faces the viewer, stands still and waves the hand
on the viewer's right above the shoulder. The other arm hangs relaxed.
pose(i, frames) returns the joints for frame i.
"""
import math
from generate import polar

VIEW = 'front'
WAVE = 25            # degrees the forearm swings either side


def pose(i, frames):
    swing = math.sin(i / frames * 2 * math.pi)   # -1 to 1, one full wave per cycle
    dy = 0
    P = {'dy': dy}
    for side, hx in (('left', 12.5), ('right', 18.5)):   # 4px legs with a 2px gap
        hip = (hx, 28 + dy)
        P[side] = {'hip': hip, 'knee': (hx, 36 + dy), 'ankle': (hx, 44)}

    # viewer's left arm: relaxed by the side
    ls = (9.5, 17 + dy)
    le = polar(ls, -6, 5)
    P['left'].update({'shoulder': ls, 'elbow': le, 'hand': polar(le, 4, 5)})

    # viewer's right arm: raised, forearm up and waving
    rs = (21.5, 17 + dy)
    re = polar(rs, 125, 6)                             # upper arm out and up
    P['right'].update({'shoulder': rs, 'elbow': re, 'hand': polar(re, 180 + WAVE * swing, 6)})
    return P
