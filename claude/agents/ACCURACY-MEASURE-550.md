# #550 item (44): game accuracy against chess.com over the 196-game answer key

Measured 2026-11-12 on trial bundle 075881d048e1 (3212fb4), 375x761, ct_pool 3, quiet machine, by gates/measure-accuracy-vs-chesscom.js; 194 games read (388 side-readings, 387 reproduced from the recorded inputs). Kunal's Desk answer B9C-GRADE-ACCURACY: measure first. No formula changed.

## Alternatives
```
readings 388
SHIPPED                                      MAE 10.09 signed +5.87 | with<10 MAE 11.85 signed  -6.29 | without MAE  9.61 signed +9.23 | within5  93 within10 220 over15  69
harmonic floor 10                            MAE  9.02 signed +8.39 | with<10 MAE  6.90 signed  +5.36 | without MAE  9.61 signed +9.23 | within5 100 within10 236 over15  53
harmonic floor 20                            MAE 10.04 signed +9.83 | with<10 MAE 10.17 signed +10.16 | without MAE 10.00 signed +9.73 | within5  83 within10 199 over15  67
harmonic floor 30                            MAE 11.13 signed +11.01 | with<10 MAE 12.74 signed +12.74 | without MAE 10.68 signed +10.53 | within5  58 within10 174 over15  90
harmonic floor 40                            MAE 12.12 signed +12.05 | with<10 MAE 14.61 signed +14.61 | without MAE 11.44 signed +11.34 | within5  45 within10 148 over15 114
harmonic floor 50                            MAE 13.09 signed +13.04 | with<10 MAE 16.16 signed +16.16 | without MAE 12.25 signed +12.18 | within5  36 within10 129 over15 137
harmonic floor 20, minus 4                   MAE  6.68 signed +5.83 | with<10 MAE  6.89 signed  +6.16 | without MAE  6.62 signed +5.74 | within5 161 within10 297 over15  22
harmonic floor 20, minus 6                   MAE  5.55 signed +3.83 | with<10 MAE  5.93 signed  +4.16 | without MAE  5.45 signed +3.74 | within5 210 within10 328 over15  12
harmonic floor 20, minus 8                   MAE  4.86 signed +1.83 | with<10 MAE  5.31 signed  +2.16 | without MAE  4.74 signed +1.74 | within5 234 within10 344 over15   8
harmonic floor 30, minus 4                   MAE  7.50 signed +7.01 | with<10 MAE  8.86 signed  +8.74 | without MAE  7.12 signed +6.53 | within5 144 within10 275 over15  34
harmonic floor 30, minus 6                   MAE  6.11 signed +5.01 | with<10 MAE  7.23 signed  +6.74 | without MAE  5.80 signed +4.53 | within5 188 within10 314 over15  21
harmonic floor 30, minus 8                   MAE  5.14 signed +3.01 | with<10 MAE  5.96 signed  +4.74 | without MAE  4.91 signed +2.53 | within5 221 within10 341 over15  10
harmonic floor 40, minus 4                   MAE  8.36 signed +8.05 | with<10 MAE 10.62 signed +10.61 | without MAE  7.74 signed +7.34 | within5 122 within10 252 over15  44
harmonic floor 40, minus 6                   MAE  6.83 signed +6.05 | with<10 MAE  8.78 signed  +8.61 | without MAE  6.29 signed +5.34 | within5 168 within10 292 over15  29
harmonic floor 40, minus 8                   MAE  5.66 signed +4.05 | with<10 MAE  7.18 signed  +6.61 | without MAE  5.24 signed +3.34 | within5 208 within10 327 over15  19
--- split-half: choose on even games, report on odd
chosen floor 25 minus 10 (train MAE 4.53); held-out n=194 MAE 4.72 signed +0.47, with<10 n=42 MAE 5.33 signed +2.21; shipped on the same held-out MAE 9.84 signed +5.71
ALL 388 at the chosen floor 25 minus 10      MAE  4.63 signed +0.44 | with<10 MAE  5.08 signed  +1.59 | without MAE  4.50 signed +0.12 | within5 246 within10 355 over15   7
185163502752 w shipped 41.8 chosen 71.2 chess.com 79.29
185163502752 b shipped 63.9 chosen 72.5 chess.com 79.69
ordering agreement chosen 182 of 193
```

## The shipped analyser
```
games 194 side-readings 388
reproduced shipped number from recorded inputs: 387 of 388
SHIPPED (weighted+harmonic)/2      all: n=388 MAE 10.10 mean signed +5.88 median +7.9
volatility-weighted half alone     all: n=388 MAE 13.14 mean signed +12.99 median +12.7
harmonic half alone                all: n=388 MAE 12.22 mean signed -1.25 median +4.4
plain mean of per-move acc         all: n=388 MAE 15.13 mean signed +15.10 median +14.9
WHAT-IF +1 per-move bonus, same agg all: n=388 MAE 10.05 mean signed +7.34 median +8.8
--- split by whether the side has a move with per-move accuracy < 10 (a blunder-class move)
SHIPPED          with<10: n=84 MAE 11.86 mean signed -6.29 median -3.5   |  without: n=304 MAE 9.62 mean signed +9.24 median +9.3
weighted alone   with<10: n=84 MAE 15.03 mean signed +15.03 median +15.3   |  without: n=304 MAE 12.62 mean signed +12.42 median +12.3
harmonic alone   with<10: n=84 MAE 28.82 mean signed -27.60 median -19.4   |  without: n=304 MAE 7.63 mean signed +6.04 median +6.0
plain mean       with<10: n=84 MAE 18.35 mean signed +18.35 median +18.0   |  without: n=304 MAE 14.24 mean signed +14.20 median +14.1
```
