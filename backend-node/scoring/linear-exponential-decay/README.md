# Linear-Exponential Decay Scoring

This folder contains the Mathematical Formulation used by the competition scoring system.

## Scope

This scoring model is only applied to competition submissions.
Practice mode still uses the challenge's normal static `points` value.

## Formula

Solver-based exponential decay:

```text
E(s) = S_min + (S_max - S_min) * e^(-k1 * s)
```

Time-based linear decay:

```text
sc = scale / (1.0 - decay)
L(t) = max((sc - max(0, abs(t - origin) - offset)) / sc, 0)
```

Attempt penalty:

```text
A(a) = e^(-k3 * (a - 1))
```

Weighted hybrid integration:

```text
H = (w1 * E(s) + w2 * S_max * L(t)) * A(a)
```

Final score threshold:

```text
Final Score = max(H, S_min)
```

## Runtime Mapping

- `S_max`: the challenge's stored base points.
- `S_min`: derived from `S_max` using the configured minimum-score ratio and floor.
- `s`: distinct teams that have correctly solved the same challenge in the same competition, including the current successful team.
- `t`: elapsed minutes from `competitions.start_date` to the successful submission time.
- `a`: total attempts made by the team for the same challenge in the same competition, including the current attempt.
- `scale`: competition duration in minutes by default, unless an override is provided through environment variables.

## Environment Variables

- `CTF_SCORING_MIN_SCORE_RATIO`
- `CTF_SCORING_MIN_SCORE_FLOOR`
- `CTF_SCORING_SOLVER_DECAY`
- `CTF_SCORING_ATTEMPT_DECAY`
- `CTF_SCORING_TIME_ORIGIN_MINUTES`
- `CTF_SCORING_TIME_OFFSET_MINUTES`
- `CTF_SCORING_TIME_DECAY`
- `CTF_SCORING_TIME_SCALE_MINUTES`
- `CTF_SCORING_TIME_FALLBACK_MINUTES`
- `CTF_SCORING_SOLVER_WEIGHT`
- `CTF_SCORING_TIME_WEIGHT`

## Code Entry Point

- `calculateScore.js` implements the formula.
- `config.js` centralizes tunable parameters.
- `index.js` exposes the public scoring API.
