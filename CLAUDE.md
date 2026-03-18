## Git workflow rules

- **Never push to `main` or `master`.**
- **Before any push**, verify you are on a feature branch:
  - If on `main`/`master` (or detached HEAD), create a new feature branch and switch to it **before** committing or pushing.
  - Use a descriptive branch name (e.g. `feat/aging-report-chart`, `fix/prisma-client`, `chore/pnpm-migration`).
- **Push using the current branch name**, and set upstream on first push (e.g. `git push -u origin HEAD`).
- **Never force-push** to `main`/`master`.
- Prefer small, focused commits with clear messages.

## Safe push checklist

1. `git status` is clean (or only intended changes).
2. `git branch --show-current` is **not** `main`/`master`.
3. `git log -1` looks correct.
4. Push: `git push -u origin HEAD` (first time) or `git push`.

