# Clinching & Elimination Scenarios — calculation notes

This site implements a schedule-aware, eight-team, 14-week regular-season clinching scenario engine. It does not use the Playoff Machine's projected picks, scores, or Monte Carlo odds to compute its public upcoming-week scenarios.

## Before Week 14

For each possible combination of the next week's wins, losses and ties, the engine checks the best and worst final seed each team could attain under every *jointly feasible* remaining matchup result. It fixes only the candidate team's own remaining games to its best or worst outcome as appropriate, and searches all other relevant games together. This accounts for teams playing one another: a single game cannot be counted as a win for both teams. Mathematical bounds prune impossible threats, and games between teams unable to catch the candidate are skipped.

Record is computed from wins and ties (two points for a win; one for a tie), since all eight teams complete the same regular-season game count. A tied-record group is compared using its completed/potential intra-group head-to-head results when every member has played an equal number of games within that group. The highest H2H winning percentage selects the next seeded team; after that team is removed, H2H restarts with the new group. If H2H cannot select a unique next team, all unknown Points For/Against and possible ESPN coin outcomes remain unresolved. The engine does not claim a clinch that depends on those unknowns.

## Week 14

The final week is analyzed with exact *integer hundredths* of a point. Each unplayed team score is an integer from 1,000 to 99,999 hundredths (10.00–999.99). The algorithm uses difference-bound constraints to partition every feasible score combination according to the actual last-week matchup results and the applicable Points For / Points Against comparisons. Scores are never guessed or sampled. Within tied records, the ordering is: H2H (with recursive multi-team restart), season Points For (higher wins), season Points Against (higher wins), and unresolved ESPN coin flip. A coin flip is not predicted.

All feasible combinations of the upcoming week's results are checked, and each mathematical milestone is verified across all remaining possibilities. The UI lists minimal AND-only combinations of next-week match outcomes and, where necessary, exact PF/PA scoring thresholds. All distinct milestone levels are shown, avoiding identical weaker-claim duplicates and milestones already guaranteed.

If a pathological Week 14 tie creates more symbolic branches than can be safely handled by the browser, the engine displays a calculation error rather than silently guessing, truncating, or claiming a clinch.

## Implementation

- `scenario-core.js`: pure, testable exact schedule/H2H calculator.
- `scenario-final.js`: pure symbolic Week 14 score constraint solver.
- `scenario-worker.js`: runs the exact analyses off the main UI thread and reports progress.
- `app.js`: renders actual scenarios and separately calculates projected Playoff Picture markers.

The original Playoff Machine game selections and Monte Carlo odds remain available.
