"""
Running: skeleton poses for the sprite generator.
Only used by character/core/generator/generate.py, never by the app.

pose(i, frames) returns the joint positions for frame i. Shared drawing code
(body, clothes, hair) lives in the generator, so this file is only the motion.
"""
from generate import polar, interp, FRAME_H

VIEW = 'side'      # running is drawn side on, facing right

THIGH, SHIN = 8, 9

# One leg's stride: (phase 0 to 1, thigh angle, knee bend). 0 degrees = straight down, + = forward.
LEG = [(0.00, 30, 14),    # contact: foot lands ahead
       (0.10, 16, 40),    # loading: knee bends to absorb
       (0.22, -6, 28),    # mid stance
       (0.35, -32, 14),   # toe off, leg extended behind
       (0.50, -28, 115),  # heel kicks high behind
       (0.64, 14, 140),   # leg tucks tight and swings through
       (0.78, 62, 115),   # knee drives high, foot tucked under
       (0.90, 50, 60),    # shin reaches out, foot still in the air
       (1.00, 30, 14)]

STANCE_END = 0.30          # portion of the stride a foot is on the ground


def leg(hip, ph):
    th, kn = interp(LEG, ph)
    knee = polar(hip, th, THIGH)
    ankle = polar(knee, th - kn, SHIN)
    toe = polar(ankle, th - kn + 90, 4)
    return knee, ankle, toe


def arm(shoulder, ph):
    th, _ = interp(LEG, ph)
    upper = -th * 1.25            # arm pumps back when the same side leg goes forward
    elbow = polar(shoulder, upper, 6)
    hand = polar(elbow, upper + 100, 5)
    return elbow, hand


def lowest(hip, ph):
    _, ankle, toe = leg(hip, ph)
    return max(ankle[1], toe[1]) + 2


def pose(i, frames):
    ph = i / frames
    sides = {'near': ph, 'far': (ph + 0.5) % 1.0}
    base = (16, 28)
    stance = lambda p: p % 1.0 <= STANCE_END
    ln, lf = lowest(base, sides['near']), lowest(base, sides['far'])
    # Only the leg on the ground sets the body height. The swinging foot stays
    # at least 2px off the floor so the stride never reads as a walk.
    if stance(sides['near']):
        low = max(ln, lf + 2)
    elif stance(sides['far']):
        low = max(lf, ln + 2)
    else:
        low = max(ln, lf) + 2     # flight: both feet off the floor
    dy = (FRAME_H - 1) - low
    hip = (16, 28 + dy)
    P = {'dy': dy, 'hip': hip, 'neck': (16.5, 16 + dy), 'shoulder': (16, 18 + dy)}
    for side, p in sides.items():
        h = hip if side == 'near' else (hip[0] - 1, hip[1])
        knee, ankle, toe = leg(h, p)
        elbow, hand = arm(P['shoulder'], p)
        P[side] = {'hip': h, 'knee': knee, 'ankle': ankle, 'toe': toe, 'elbow': elbow, 'hand': hand}
    return P
