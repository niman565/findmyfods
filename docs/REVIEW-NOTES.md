# Review notes

One section per phase, appended as each phase finishes.

## B0: Fix Prisma tooling and update CLAUDE.md (2026-11-16)

### Files changed
- `backend/package.json`: `prisma` `^6.19.3` -> `^7.10.1`; `@prisma/client` and `@prisma/adapter-pg` `^7.4.2` -> `^7.10.1`. No other ranges changed.
- `backend/package-lock.json`: large diff (61 packages changed version, 111 added, 10 removed). Most of the additions are Prisma 7 CLI dependencies that the 6.x CLI did not have.
- `CLAUDE.md`: Tags section now lists all 35 tags with their stored categories (this note first said 36, a miscount corrected in T0); API section notes which routes do not exist yet and that auth paths are targets until B1; Status section rewritten from the audit. Note: `CLAUDE.md` is ignored by the uncommitted `.gitignore` change, so these edits will not appear in a commit.
- `docs/REVIEW-NOTES.md`: created.
- No source code changed. `backend/src/generated/prisma` was regenerated (it is gitignored).

### Decisions and why
- **All three Prisma packages on 7.10.1, not 8.** npm's `latest` tag for `prisma` points at `8.0.0-rc.33`, a release candidate. 7.10.1 is the newest stable release and the three packages must be on the same version. Commit `818b619` had downgraded only the CLI to 6.x, which made `migrate`, `generate` and `db seed` fail with `P1012`.
- **`npm audit fix` without `--force`.** It updated packages inside the existing version ranges. Notable ones: `zod` 4.3.6 -> 4.6.7, `body-parser` 2.2.2 -> 2.4.0, `qs` 6.15.0 -> 6.17.1, `proxy-addr` 2.0.7 -> 2.0.8, `eslint` 10.2.0 -> 10.15.0, `typescript-eslint` 8.58.0 -> 8.72.2, `brace-expansion` 5.0.5 -> 5.0.13.
- **`--force` deliberately not used.** Its remaining "fixes" are downgrades of `nodemon` (to 3.1.11) and `typescript-eslint` (to 8.36.0). A forced fix is what broke Prisma in the first place.

### Verified
- `npx prisma migrate status`: works again; 1 migration, dev database up to date.
- `npx prisma generate`: client 7.10.1 generated.
- `tsc --noEmit`, `npm run lint`, `npm run build`: all pass.
- `npm audit --omit=dev`: 0 vulnerabilities in production dependencies (was 1 critical and several high).
- Server started and every existing endpoint exercised with curl; behaviour identical to before the upgrade:
  - recipes list (6), `?tags=vegan,dinner`, `?search=beef fish`, detail, missing id 404, `abc` 400
  - register: bad email 400, short password 400, success 201, duplicate 409
  - login: wrong password 401, unknown user 401, by email 200, by username 200
  - favorites: no cookie 401, add 201, add again 409, list, delete 200, delete again 404
  - logout 200
- The smoke test registered one throwaway user in the dev database and deleted it afterwards. Dev database ended as it started: 6 recipes, 0 users, 0 favorites.

### Edge cases handled
- **A mismatched Prisma install.** Checked the installed version of all three packages and the generated client after `npm install`, rather than trusting `package.json`, since a CLI/client mismatch was the original fault.
- **Skipped install scripts.** npm warned that install scripts for `argon2` and the Prisma packages were not on its allow-list. Confirmed the native argon2 binding still hashes and the Prisma CLI still runs before continuing.
- **`npm audit fix` changing behaviour.** It upgraded `zod` and the express internals, so the curl run covered validation errors (zod), body parsing and the full register/login/favorites write path, not only read endpoints.
- **Smoke-test data in the dev database.** The throwaway user was deleted by its exact username, and row counts were checked afterwards.
- **No tests were run.** No test tooling exists until T0, and no backend source changed in this phase.

### Edge cases noticed but NOT handled
- **8 moderate `npm audit` findings remain, all in dev tooling.** They are one `minimatch` advisory reached through `nodemon` and `typescript-eslint`. Neither runs in production. They will clear when those packages release versions with a patched `minimatch`.
- **npm reports install scripts "not yet covered by allowScripts"** for `argon2`, `fsevents`, `prisma` and `@prisma/engines`. Everything works (argon2 hashes, the Prisma CLI runs), so nothing was changed. If a fresh `npm install` on another machine ever fails to build argon2, run `npm approve-scripts` in `backend/`.
- **The tag `food processor` contains a space**, unlike every other tag (which use hyphens). It works in `?tags=` only when URL-encoded. Left as is; worth deciding in B3 whether to rename it to `food-processor`.
- **Tag categories are stored in title case** ("Meal Type", "Protein Type"), only names are lowercased. CLAUDE.md now documents them as stored.
- **Frontend `npm audit` not run yet.** Planned for F1.
- All the backend behaviour gaps from the audit (no `/api/tags`, no `/api/auth/me`, CORS without credentials, 401 for unknown routes, and so on) are untouched here by design; they belong to B1 and B2.
- Deferred idea, out of scope: log the user out after 30 minutes of inactivity. Sessions will be a fixed 7 days (B1), and a JWT cannot be revoked before it expires.

## T0: Test harness and baseline recipe tests (2026-11-16)

### Files created
- `backend/vitest.config.mts`: test runner config.
- `backend/tsconfig.test.json`: typechecks `src/`, `test/` and the Vitest config together.
- `backend/src/app.ts`: builds the Express app (moved out of `index.ts`, unchanged).
- `backend/test/globalSetup.ts`: runs once before anything else; aborts the run unless `.env.test` points at a `_test` database that differs from the dev one.
- `backend/test/setup.ts`: runs before each test file; sets `DATABASE_URL` from `.env.test`, repeats the guard, disconnects Prisma afterwards.
- `backend/test/helpers/assertTestDatabase.ts`: the `_test` guard.
- `backend/test/helpers/testEnv.ts`: reads `DATABASE_URL` out of `.env.test` and `.env`.
- `backend/test/helpers/factories.ts`: creates tags and recipes for a test file and deletes exactly those rows.
- `backend/test/recipes.test.ts`: 18 tests.
- `backend/test/guard.test.ts`: 5 tests.

### Files changed
- `backend/src/index.ts`: now only loads dotenv, imports the app and listens.
- `backend/package.json`: dev dependencies `vitest ^5.1.0`, `supertest ^7.3.2`, `@types/supertest ^7.2.1`; new scripts `test`, `test:watch`, `typecheck`; `lint` and `lint:fix` now cover `src test`.
- `backend/package-lock.json`: the three packages above and their dependencies.
- `CLAUDE.md`: Status updated; tag count corrected from 36 to 35 (the list itself was already right).
- `docs/REVIEW-NOTES.md`: this section; the same 36 -> 35 correction in the B0 section.

### Files deleted
- `backend/prisma/test-seed.ts` and `backend/prisma/test-seed-relational-fields.ts` (approved). The second one ran the seed against whatever `DATABASE_URL` was set, which was the dev database. B3 adds a seed-data check that replaces them.

### Files provided by the user, not changed
- `setup-test-db.sh`, `backend/.env.test`, the `.env.test` line in the root `.gitignore`.

### Decisions and why
- **Vitest + Supertest** (approved). Vitest runs the TypeScript directly; Supertest calls the app in memory, so tests need no running server or port.
- **`DATABASE_URL` is set by `test/setup.ts` from `.env.test`, overwriting the environment.** A `DATABASE_URL` exported in the shell therefore cannot redirect a test run. Checked by running the tests with the shell variable pointing at `recipe_app`: they still ran against `recipe_app_test`.
- **The app does not load dotenv; only `index.ts` does.** During tests `backend/.env` is never read by the app, so no dev setting can leak in.
- **`SECRET_KEY` for tests is a fixed test-only value in the Vitest config.** `.env.test` only holds `DATABASE_URL`, and the dev key should not be used by tests.
- **The guard runs twice** (once for the whole run, once per test file) and has its own unit tests, since it is what keeps tests off the dev database.
- **Migrations are not applied by the test setup.** Changed from the plan: `./setup-test-db.sh` does that, as instructed.
- **The config file is `.mts`, not `.ts`.** With `.ts`, Vite warned that the config uses ES module syntax in a CommonJS package.
- **Test data is scoped by a random token per test file.** Every tag name, title and ingredient the tests create carries the token, so a filter or search in a test can only match that file's rows.
- **Cleanup is per file, in `afterAll`,** because the recipe tests only read their fixtures. Files that change data between tests (auth, favorites, from B1) will clean up after each test.
- **The logged-in test helper was deferred to B1.** Changed from the plan: nothing in T0 needs it, and it would have been written against login paths that B1 changes.
- **`typecheck` script added** so tests are typechecked; Vitest itself does not typecheck.

### Edge cases handled
- Guard rejects: the dev database name, `test_recipe_app`, `recipe_app_testing`, a `_test` host or user with a non-test database, and a missing, empty or malformed URL.
- Guard also rejects `.env.test` holding the same URL as `.env`.
- Tag filter: single tag, all-of-several, no recipe with every tag, unknown tag, spaces and empty entries in the list.
- Search: title word, partial title, case-insensitive title and ingredient, any-of-several terms, title plus ingredient, no match.
- Tags and search combined, including a search hit excluded by its tags.
- Detail: found, a guaranteed-missing id (a recipe created and deleted in the test), non-numeric id.
- Empty `tags=` and `search=` parameters behave as no filter.

### Verified
- `npm test`: 23 passed (2 files), run three times in a row.
- Row counts before and after the runs: test database 0 rows in every table; dev database unchanged (6 recipes, 35 tags, 56 recipe-tag links, 0 users, 0 favorites).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- `npm audit --omit=dev`: 0 vulnerabilities. Full audit: the same 8 moderate dev-only findings as B0.
- Curl against the dev server after the app split, same results as B0: recipes list and filters, detail 200/404/400, register 400/400/201/409, login 401/200, favorites 401/201/404, logout 200. One throwaway dev user was created and deleted.

### Edge cases noticed but NOT handled
- **A malformed JSON request body returns 500, not 400.** Found during the curl run (`register` with a cut-off body). Existing behaviour, not caused by this phase. The error handler does not recognise the body parser's error. Proposed for B1.
- **Favoriting a recipe that does not exist returns 500.** Known from the audit; fixed in B2.
- **Searching for part of an ingredient name finds nothing** (`kal` does not match `kale`), although part of a title does match. Deliberately not asserted in the tests, so they do not lock that behaviour in.
- **Rows left by a crashed test run are not removed automatically.** The per-file token keeps them from affecting later runs. To clear them, empty the tables in `recipe_app_test` by hand.
- **The test setup does not check that the test database has every migration.** If a migration is added and `./setup-test-db.sh` is not run, tests fail with a "column does not exist" error.
- **B0 and T0 changes are both uncommitted**, so `git diff` on `backend/package.json` and the lockfile shows the two phases together.

## B1: Auth routes and session (2026-11-16)

### Files created
- `backend/src/lib/session.ts`: the one place that signs the token, sets and clears the cookie, and checks a token.
- `backend/src/routes/auth.ts`: groups login, logout, me and register; mounted at `/api/auth`.
- `backend/src/routes/me.ts`: `GET /api/auth/me`.
- `backend/test/auth.test.ts`: 47 tests.
- `backend/test/helpers/auth.ts`: registers a user and returns a logged-in Supertest agent; cookie and token helpers.

### Files changed
- `backend/src/routes/login.ts`, `register.ts`: use the session helper; respond with `{ user }`.
- `backend/src/routes/logout.ts`: public, no database lookup, always clears the cookie.
- `backend/src/routes/unprotected.ts`: mounts the auth router at `/auth`, plus recipes.
- `backend/src/routes/protected.ts`: applies the login check to `/favorites` only.
- `backend/src/middleware/auth_middleware.ts`: uses the shared token check.
- `backend/src/app.ts`: JSON 404 for unknown `/api` routes; 400 for a malformed JSON body; corrected endpoint list on `/`.
- `backend/test/helpers/factories.ts`: `credentials()` builds unique user details; `cleanup()` also deletes this file's users.
- `CLAUDE.md`: API and Status sections.
- `docs/REVIEW-NOTES.md`: this section.

### Decisions and why
- **Paths moved to `/api/auth/*`; the old `/api/login`, `/api/register`, `/api/logout` now return 404.** Checked beforehand that nothing in the repo called them.
- **Separate route files kept** (`login.ts`, `register.ts`, `logout.ts`, `me.ts`), with `auth.ts` only grouping them, as agreed.
- **Register, login and me all respond with `{ user: { id, username, email } }`.** One shape for the frontend to handle. The previous `message` field on login and register was dropped; nothing used it.
- **Session is 7 days** for both the token and the cookie (was 1 hour), so users stay logged in between visits.
- **Cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production.** `SameSite` was previously left to the browser default; it is now explicit. The same attributes are used to clear it, which browsers require for the cookie to actually be removed.
- **Logout is public and does no database lookup.** Before, a user with an expired or invalid cookie got a 401 and the cookie stayed.
- **The login check is mounted on `/favorites` only.** Before, it sat on all of `/api`, so every unknown path returned 401.
- **`me` looks the user up in the database** instead of trusting the token alone, so a deleted user is logged out (401, cookie cleared).
- **Token contents are validated with Zod and only the HS256 algorithm is accepted.** A correctly signed token with unexpected contents, or an unsigned one, is rejected.
- **Malformed JSON returns 400** `Request body is not valid JSON` (approved addition; it was a 500).
- **Ambiguity settled:** the plan described `me` as returning `{id, username, email}` and login/register as returning "the user". Chose the wrapped `{ user }` form for all three.

### Edge cases handled
- Register: invalid email, 7-character password (and exactly 8 accepted), empty or missing username, missing email, missing password, no body, malformed JSON, duplicate username, duplicate email. Failed attempts set no cookie and create no user.
- Login: by username, by email; wrong password and unknown user return the identical 401, so the response does not reveal which usernames exist; missing fields, invalid email, empty body, malformed JSON.
- Me: no cookie, a token that is not a JWT, expired token, token signed with another key, unsigned token, valid signature with wrong contents, user deleted after login.
- Logout: with a valid cookie, without a cookie, with an invalid or expired cookie; logging in again afterwards works.
- Favorites routes still return 401 without a cookie or with an expired token, and work with a valid one.
- Unknown `/api` paths, including under `/api/auth`, return a JSON 404.
- The password and its hash never appear in any response; the stored hash is Argon2id.

### Verified
- `npm test`: 70 passed (3 files), three runs in a row. Test database empty before and after; dev database unchanged.
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Curl against the dev server (output in the phase summary): register 400/400/400/400/201/409, me 200/401/401, login 401/401/400/200/200, favorites 401/401/201/200, logout 200 with the cookie cleared and me then 401, logout without or with a bad cookie 200, unknown and old paths 404. One throwaway dev user was created and deleted.

### Edge cases noticed but NOT handled
- **A session cannot be revoked.** Logout clears the cookie, but a copied token stays valid for up to 7 days. Changing a password (not a feature) would not end existing sessions either.
- **No logout after inactivity** (the 30-minute idea). Sessions are a fixed 7 days and are not extended by activity.
- **`SameSite=Lax` will not work if the frontend and backend are deployed on different sites** (for example Vercel and Railway). That needs `SameSite=None; Secure` or a shared domain. Deployment is deferred, so left for then.
- **Emails and usernames are case-sensitive and not trimmed.** `Sam@x.com` and `sam@x.com` can both register, and logging in needs the exact case used at registration.
- **The duplicate error does not say which field clashed** (username or email); it is one generic 409 message.
- **Login validation messages are vague.** A missing password returns `Invalid input` with no field name, because of how the username-or-email schema is written.
- **Sending both `username` and `email` to login returns 400.** The frontend will send one.
- **No rate limiting on login or register**, and usernames have no length or character rules beyond "not empty".
- **A user who is already logged in can register or log in again**; the cookie is simply replaced.
- **CORS is still the bare `cors()`**, so a browser on `localhost:5173` cannot send the cookie yet. That is B2.

## B2: CORS, GET /api/tags, API hardening (2026-11-16)

### Files created
- `backend/src/routes/tags.ts`: `GET /api/tags`.
- `backend/src/routes/validation_schemas/Id.ts`: one shared rule for ids taken from the URL.
- `backend/test/tags.test.ts` (4 tests), `backend/test/favorites.test.ts` (24), `backend/test/cors.test.ts` (9).

### Files changed
- `backend/src/app.ts`: CORS limited to the frontend origin, with credentials; `tags` added to the endpoint list on `/`.
- `backend/src/routes/unprotected.ts`: mounts the tags router.
- `backend/src/routes/recipes.ts`: tag filter lowercased; list sorted by title.
- `backend/src/routes/favorites.ts`: flat recipe list with tags, newest first; adding is repeatable; missing recipe returns 404.
- `backend/src/routes/validation_schemas/Recipe.ts`, `User.ts`: use the shared id rule.
- `backend/src/middleware/auth_middleware.ts`: confirms the token's user still exists (not in the plan; see Decisions).
- `backend/src/routes/me.ts`: uses the user the middleware already loaded.
- `backend/src/types/Request.d.ts`: `req.user` now also carries `email`.
- `backend/vitest.config.mts`: sets `CLIENT_ORIGIN` for the tests.
- `backend/test/recipes.test.ts` (+6 tests), `backend/test/auth.test.ts` (+1 test).
- `CLAUDE.md`, `docs/REVIEW-NOTES.md`.

### Decisions and why
- **CORS allows exactly one origin**, `CLIENT_ORIGIN`, defaulting to `http://localhost:5173`, with `credentials: true`. A browser will not send cookies to an API that answers with a wildcard origin. Other origins get no `Access-Control-Allow-Origin` header, so browsers block them from reading responses.
- **`CLIENT_ORIGIN` is not yet in `backend/.env`**; the default is in effect. Add it only if the frontend runs somewhere other than port 5173.
- **`GET /api/tags` returns `id`, `name`, `category` only**, sorted by category then name. `createdAt` is left out because nothing needs it.
- **Ids must be whole numbers from 1 to 2147483647** (the largest value the database column holds). Before, `1.5` was silently treated as `1`, and a huge number caused a 500.
- **Recipes are sorted by title, then id.** Before, the order was whatever the database returned.
- **`GET /api/favorites` returns recipes in exactly the shape of `/api/recipe/:id`**, so the frontend can use one recipe type and one card component everywhere.
- **Adding a favorite twice is not an error.** First time 201, after that 200 `Recipe was already favorited`. It was a 409, which the frontend would have had to treat as success anyway. Done with one `createMany(..., skipDuplicates)` so two simultaneous requests cannot create a duplicate or fail.
- **Removing a favorite that is not there stays a 404**, as planned.
- **NOT IN THE PLAN: the login check now looks the user up in the database, matching id and username.** Two reasons. First, in B1 `/me` matched on id alone; after a database reset ids start again at 1, so an old cookie could have logged a browser in as a different, new user. The B3 reset would have triggered exactly that. Second, favorites needs to tell "recipe missing" (404) from "user missing" (401). It costs one small query per logged-in request. `req.user` now includes `email`, so `/me` needs no second query.
- **The recipe list and detail keep their existing tag shape** (`tags: [{ recipeId, tagId, tag: {...} }]`). Flattening it was not in the plan.

### Edge cases handled
- CORS: preflight and normal requests from the allowed origin; no allow header for another host, another port, `https` instead of `http`, or a look-alike host (`localhost:5173.evil.example.com`); requests with no `Origin` header (curl) still work.
- Ids on recipe detail, add favorite and remove favorite: `abc`, `1.5`, `0`, `-1`, `99999999999` all return 400.
- Tag filter: uppercase and mixed-case tag names match.
- Favorites: empty list; add; add twice; missing recipe; newest first; a user sees only their own; removing one of several; removing twice; removing one that was never added; one user cannot remove another's; all three routes return 401 once the user is deleted; a favorite disappears when its recipe is deleted.
- Auth: a token whose username does not belong to its id is rejected and the cookie cleared.

### Verified
- `npm test`: 114 passed (6 files), three runs in a row. Test database empty before and after; dev database unchanged (6 recipes, 35 tags, 0 users, 0 favorites).
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Curl against the dev server (output in the phase summary): CORS headers for allowed and disallowed origins; 35 tags in 5 categories; recipes in title order; `?tags=VEGAN,Dinner`; ids 404/400 x5; favorites 401/401/200/201/201/200/404/400 x3, list newest first with tags, delete 200/404/400. One throwaway dev user was created and deleted.

### Edge cases noticed but NOT handled
- **CORS does not stop a request from being processed**, it only stops a browser on another origin from reading the answer. Requests from other origins still get a 200 from public routes. That is how CORS works; noted so the "blocked" wording is not misread.
- **`Access-Control-Allow-Credentials: true` is still sent to disallowed origins.** The `cors` package adds it unconditionally. Without an allow-origin header it has no effect.
- **Only one allowed origin.** A deployed frontend plus local development at the same time would need a list.
- **No protection against cross-site form posts beyond `SameSite=Lax`.** Lax stops the cookie being sent on cross-site POSTs, which covers the state-changing routes.
- **Sort order of titles depends on the database's language settings** (for example how capitals and accents are ordered). Fine for English titles.
- **Searching for part of an ingredient name still finds nothing** (`kal` does not match `kale`). Unchanged; not in the plan.
- **`/api/recipes` query parameters are parsed by hand, not with Zod.** Existing code; they are cleaned up rather than rejected, so there is nothing to return a 400 for.
- **Ids such as `1e2` or `0x10` are accepted** as 100 and 16, because of how number conversion works. Harmless: they are valid ids.
- **No limit on how many recipes the list returns** (no paging). Fine for a seed of 15-20.
- **`RecipeGeneralSchema` in `validation_schemas/Recipe.ts` is unused.** Left in place.
- **The tag `food processor` still contains a space.** Decision due in B3.

### Addendum: full B2 verification (2026-11-17 and 2026-11-18)

#### Code review of the B2 diff
- Re-read every B2 source change against the plan. No logic errors found. Two claims had not actually been tested and were checked against the running server:
  - **`CLIENT_ORIGIN` with a trailing slash silently broke CORS.** Confirmed: with `http://localhost:5173/` the real frontend got no `Access-Control-Allow-Origin` header, so a browser would have blocked every request. **Fixed** in `backend/src/app.ts` by removing trailing slashes from the setting. New test in `backend/test/cors.test.ts`; confirmed it fails without the fix and passes with it.
  - **Simultaneous favorites.** The notes claimed two requests at the same moment cannot create a duplicate or fail. Now verified: 5 simultaneous requests for the same recipe gave one 201 and four 200s, and the recipe appears once.

#### Files changed in this addendum
- `backend/src/app.ts`: trailing-slash fix (one line).
- `backend/test/cors.test.ts`: +1 test (115 tests in total now).
- `verify-api.sh` (yours): one line. The repeated-favorite check now expects 200 `already favorited` instead of 409. Nothing else changed; it passes 39 of 39.
- `scripts/verify-backend.sh`: created and then rewritten (below). **Not to be committed yet**, at your request, until it is confirmed to work for anyone running the project.
- Removed `backend/.vitest/`, a stray report file from a Vitest JSON-report run I made at the end of B2.

#### `scripts/verify-backend.sh`
- **Run from anywhere:** `./scripts/verify-backend.sh`. Requirements are listed at the top of the file, and each one is checked first with a message saying how to fix it.
- **Nothing machine-specific:**
  - database names, port and allowed origin come from `backend/.env` and `backend/.env.test`
  - recipe and tag counts come from the dev database
  - the tags, search words and recipe ids used in the checks are chosen from the live API data, and expected results are worked out from the documented rules
- **Inputs are chosen to match some recipes but not all**, so a filter or search that wrongly returns everything, or nothing, fails. The first version picked `low-fodmap` and `Low`, which match every placeholder recipe and so proved little.
- **Works after B3 reseeds** with different recipes, as long as there are at least 2 recipes and one has 2 or more tags.
- **Runs:**
  - typecheck, lint, build, and the tests twice
  - 114 endpoint and database checks, including CORS, two-user isolation, simultaneous favorites, and a deleted user's cookie
  - cleanup of its own throwaway users, also on interrupt
  - before-and-after row counts for both databases
- **Bug found and fixed in the script:** the simultaneous-favorites step used a bare `wait`, which also waited for the backend the script had started itself, so it hung forever. It now waits only for its own requests, and every request has a 30-second limit. The interrupted run cleaned up correctly (2 users deleted, its backend stopped).
- **Results:**
  - against your running backend: 129 passed, 0 failed
  - deliberate failure (the script starting its own backend with a different allowed origin): exactly the 2 expected CORS checks failed, exit code 1
  - both databases ended with the same row counts every time
- **Reads the dev `SECRET_KEY`** inside Node to sign two test tokens (an expired one, and one whose username does not match its id). It never prints the key or any connection string.

#### Edge cases noticed but NOT handled
- **A recipe deleted between the existence check and the insert in `POST /api/favorites/:recipeId` returns 500**, not 404. A database foreign-key error in a very small window, only reachable while recipes are being deleted. Recipes are only changed by the seed, so left alone.
- **When the script uses a backend that is already running, it cannot scan that backend's log for errors.** It only checks the log of a backend it started itself.
- **The script needs bash, so it does not run on Windows without WSL or Git Bash.**
