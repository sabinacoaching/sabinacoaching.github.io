# Our House Hunt: Recovery and Safe-Change Procedure

## Exact project (do not search for a separate `our-house-hunt` repository)

- GitHub: `sabinacoaching/sabinacoaching.github.io`, branch `main`.
- Application: **only** folder `our-house-hunt/` within that repository. The rest of the repository hosts another site and MUST NOT be reset, reverted, overwritten, or redeployed wholesale.
- Published site: `https://sabinacoaching.github.io/our-house-hunt/`
- Data: Supabase project `ficnuovumurmhzdujjvj` (House hunt); application data in `public.properties`, `public.notes` and supporting `public.house_hunt_*` tables; private `property-photos` Storage bucket. Data are **not stored in GitHub**.
- Preservation checkpoint, made on 2026-10-30: branch `house-hunt-checkpoint-2026-10-30-v41`, exact commit `2561c2f2270dc89c2e8675fd479b54cab40534e8`. This records the deployed v41 source, **not independently browser-verified as working**.
- In the incident on 2026-10-30, the site showed 21 properties, but Table was blank while Cards and Map were not the problem. Root cause: use of `entry.children.some(...)` on an HTMLCollection in `comparison.js`. Fixed to `entry.querySelector(...)` and a row-by-row error boundary was added. A count in the UI does not prove the table rendered.

## Emergency diagnosis, without destructive changes

1. Read THIS document and the **live files and recent commits**, not a stale chat summary. Use the GitHub connector on the correct repo/folder. Check `our-house-hunt/index.html`, `comparison.js`, `comparison.css`, `station-commutes.js` and relevant imported modules.
2. Identify what actually fails: sign-in / load / Table / Cards / Map / saved edits. If the count is nonzero and Cards works but Table is blank, investigate the table renderer first; do not migrate, reimport or overwrite the Supabase data.
3. Check Supabase read-only: number of property records, status distribution, important property fields and relevant query/edge logs. A successful HTTP 200 does not itself prove nonempty rows are visible to the current user.
4. Compare the failing commit with the preceding working commit. Inspect runtime exceptions and newly changed lines. Do not claim the cause is known until supported by code/logs.
5. Make a minimal targeted fix; avoid changing any unrelated behavior or files.

## Release rules (mandatory for every future change)

1. Before modifying production, save the current branch HEAD as a NEW dated checkpoint branch; never rewrite any existing checkpoint.
2. Change only task-relevant files. Inspect the unified diff before committing; no changes to the professional website elsewhere in this repository.
3. At minimum, check JS syntax and test a **nonempty** Table, Cards and Map with real or representative records, sign-in and existing comments, and that times/notes survive a refresh. A deployment without runtime verification must be reported as unverified, NOT 'fixed'.
4. Bump cache version in `our-house-hunt/index.html` when a module changes, to prevent a cached script masking the release.
5. On regression, roll back **only** changed files in `our-house-hunt/` to the chosen checkpoint, not the entire shared `main` branch. Preserve data and report exact files/commits.
6. Never reset Supabase, delete/reimport properties, change passwords, RLS or schema, or overwrite saved comments/times while diagnosing a UI failure.
7. Protect user-entered fields against automatic enrichment. Do not invent missing floor plans, measurements, or route times.
8. Do not stop at a connector 404 before checking the exact repository and file paths here. Do not ask the user to recreate work or reconfirm details already documented.

## How to restore application code without affecting the other website

In an environment with Git installed, after inspecting `git status` and obtaining explicit permission to revert newer House Hunt changes:

```bash
git fetch origin
git switch main
git pull --ff-only
git switch -c house-hunt-restore-YYYYMMDD
git restore --source=origin/house-hunt-checkpoint-2026-10-30-v41 -- our-house-hunt/
git diff -- our-house-hunt/
# Confirm only the intended House Hunt files would change.
# Commit, test, and merge ONLY after approval.
```

This restores the entire House Hunt folder to the checkpoint, thereby losing any **later House Hunt code changes** if merged. For a single regression, restore only the affected file(s). Do **not** execute these commands automatically: confirm the chosen rollback target and the diffs.

## What backup does / does not cover

The GitHub checkpoint preserves application code. It does NOT back up Supabase rows, Supabase Auth users, Storage image bytes, or future edits. Any database snapshot stored in the same Supabase project protects against many accidental row edits but not deletion/loss of the entire project. A separate, secure external export is required for disaster recovery, including private Storage files.

## Emergency prompt (paste into a new ChatGPT chat)

> Восстанови Our House Hunt. Сначала прочитай `sabinacoaching/sabinacoaching.github.io/our-house-hunt/RECOVERY.md` через подключённый GitHub и сравни рабочие файлы с резервной веткой `house-hunt-checkpoint-2026-10-30-v41` (коммит `2561c2f`). Данные в Supabase `ficnuovumurmhzdujjvj`; не меняй их, пока не выявлена необходимость. Разберись в конкретном сбое и исправь ТОЛЬКО файлы `our-house-hunt/`. Не говори, что доступа нет, пока не проверил правильный репозиторий. Сохрани новую резервную ветку перед правкой, протестируй Table/Cards/Map и сообщи, что проверено на практике. Не трогай другие папки сайта.
