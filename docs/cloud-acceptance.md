# TokTickIT cloud acceptance results

21 October 2026 (Asia/Bangkok) · Project `tikxd-test-20261021` · Service: https://toktickit-zygw3pmwua-as.a.run.app

Tests ran against the actual GCP service with isolated QA accounts. Localhost test results were not used as cloud evidence, and the original initial administrator password was not changed.

## API and persistence results

| Check | Result |
|---|---|
| Public health/DB and unauthenticated API rejection | Passed |
| Five isolated QA accounts: initial password gate and password change API | Passed |
| Requester creates ticket with real categories and systems | Passed |
| RBAC: requester ownership isolation; requester/staff cannot use admin API | Passed |
| Public comments and staff-only internal notes | Passed |
| Attachment upload/download byte equality and cross-requester denial | Passed |
| Staff assignment/actions/edit/resolve/close and requester/staff dashboard counters | Passed |
| Administrator lists/creates/deactivates QA user; inactive login rejected | Passed |
| Live login rate limit: five failures then 429; existing requester session unaffected | Passed |
| Before redeploy: original sessions, closed ticket, actions, notes and attachment bytes survive | Passed |
| After rollback to old image: original sessions, closed ticket, actions, notes and attachment bytes survive | Passed |
| After redeploy current image: original sessions, closed ticket, actions, notes and attachment bytes survive | Passed |
| Logout revokes original QA sessions | Passed |

The main API run covered 13 groups of checks. It created ticket `TKT-2026-000011` and a 68-byte PNG attachment, then compared bytes and hashes before and after revision changes using the original session tokens without logging in again.

- [Rollback run 39608264898](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39608264898) restored image SHA `b744eed61413c380c188b5ee7d62b8ea2d402798`, revision `toktickit-00006-b5v`. Sessions, the ticket, actions, notes and attachment checks passed.
- [Restore run 39608414237](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39608414237) deployed SHA `5b504978dd1c60dca466eaa6e0bdc0e77bfe3951`, revision `toktickit-00007-kmg`. Rechecks of the original data and tokens passed.
- Login rate limiting: five incorrect passwords followed by the correct password returned 429. Another requester's existing session remained usable. The test did not target the user's real account.
- QA accounts had to change their initial passwords before accessing business APIs. After logout, their original tokens returned 401.

## Browser tests and issues found

- A requester logged in, created ticket `TKT-2026-000013`, and opened My Tickets and Details through the public URL.
- After rollback and restoration, a browser reload preserved the requester's login and access to ticket `000011`, Actions Taken and the original attachment.
- IT Staff opened the dashboard and queue and recorded an action. Admin opened the dashboard and User Management and searched active and inactive accounts.
- Browser testing found two blockers that API happy-path tests had missed:
  1. IT Staff could not load assignees because the client requested `/api/admin/users` and received 403. The fix added `/api/assignees` for ITStaff/Admin, returning only eligible active users' `id/name/role`. The admin API remained restricted to Admin.
  2. Resolving a ticket after recording an action returned 409 because the client held a stale `Ticket.updatedAt`. The fix refreshes ticket details after saving an action and disables workflow selectors during saving, while preserving genuine backend conflict detection.

[PR #5](https://github.com/tikpoptv/Fullfunction_ToctikIT/pull/5) added backend and frontend regression tests. [CI run 39609226201](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39609226201) passed before merging.

Both browser fixes **passed retesting on the deployed website**:

- [Auto Deploy run 39609562940](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39609562940) used main commit `caad4c11a31062848b16264e0de95b80616c69a5` and passed CI, build, migration, deployment and smoke tests.
- IT Staff could see active staff/admin assignees, select themselves and confirm that the ticket Owner changed, without gaining access to the admin API.
- After recording a new action on ticket `000013`, IT Staff selected Resolved without reloading. The UI showed “Ticket status updated to Resolved.” Closing the ticket also succeeded, with two Actions Taken entries recorded.
- Post-fix API checks denied anonymous/requester access to `/api/assignees`, allowed staff/admin access with only `id/name/role`, and continued to reject IT Staff access to `/api/admin/users`.
- Genuine concurrent-update detection remained intact: a stale timestamp returned 409, while a refreshed timestamp allowed resolve/close on QA ticket `000014`.

Detailed evidence includes `api-acceptance-result.json`, `post-fix-api-result.json`, `ui-acceptance-result.json` and `ui-final-staff-flow.jpg` in the local evidence folder. The API test scripts already emit English check names and JSON results; this Markdown report was compiled from those results and browser observations, rather than generated by a repository report generator.

## Scope and limitations

These results cover the demo flows listed above, rather than every application case. Full-class load, database outage/recovery and rollback across destructive schema migrations were not tested. No new schema migration was introduced in this round. Images from before PR #5 still contain the two UI bugs; select a version that passed the latest acceptance checks for future demos or rollback.

Detailed evidence remains on the tester's machine at `../output/gcp-student-eligibility-2026-10-21/acceptance/`, including API JSON, workflow records and screenshots. Passwords and session tokens are excluded from this report.
