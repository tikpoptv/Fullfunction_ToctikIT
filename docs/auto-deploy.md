# Auto Deploy and Rollback for TokTickIT

## Overview for students

Two GitHub Actions workflows use resources that have already been provisioned in GCP:

1. Open a PR to `main`: `ci-docker.yml` tests the backend, frontend and deployment scripts, then builds the Docker image.
2. Merge to `main`: `deploy.yml` runs CI again, builds and pushes an image tagged with the commit SHA, runs the migration job, deploys to Cloud Run, then runs smoke tests.
3. For rollback, open Actions → Deploy demo → Run workflow on `main`. Enter a previous successful image SHA in `image_tag`. The workflow checks the image, deploys it and runs smoke tests, skipping tests, builds and migrations.

Leaving `image_tag` empty tests and rebuilds the current `main`; it does not roll back. A rollback tag must be a full 40-character SHA. The image is resolved to a digest so that the migration job and web service use the same image.

## One-time setup

Use `deploy/deploy.sh` for the first deployment to create the database, secrets, migration job and web service. CD does not rerun this provisioning script and has no IAM administration or SQL provisioning permissions.

The team rehearsal used project `tikxd-test-20261021`, region `asia-southeast1`, service `toktickit`, job `toktickit-migrate` and GitHub environment `demo`. Students must use their own authorized accounts and projects.

Restrict the GitHub environment `demo` to branch `main` and configure these variables:

| Variable | Team rehearsal value |
|---|---|
| `GCP_PROJECT_ID` | `tikxd-test-20261021` |
| `GCP_REGION` | `asia-southeast1` |
| `WIF_PROVIDER` | `projects/605568267750/locations/global/workloadIdentityPools/github-actions/providers/github-main` |
| `WIF_SERVICE_ACCOUNT` | `toktickit-deployer@tikxd-test-20261021.iam.gserviceaccount.com` |

Enable the IAM Service Account Credentials API and Security Token Service API. Configure Workload Identity Federation using the [Google authentication guide](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account). Do not download a service account key.

Before configuring the subject condition, inspect the OIDC format of your own fork:

```bash
gh api repos/OWNER/REPO/actions/oidc/customization/sub
```

In the team repository, `use_immutable_subject=true` and `sub_claim_prefix` is `repo:tikpoptv@41636063/Fullfunction_ToctikIT@1427046719`. Append `:environment:demo` in the subject condition. Using the older format without IDs causes `The given credential is rejected by the attribute condition`. Read the [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims) and inspect each fork's actual values; do not copy the team's IDs.

The team deployment used these permissions:

- Deployer service account: `roles/run.developer` in the test project.
- Deployer service account: `roles/artifactregistry.writer` on repository `toktickit` only.
- Deployer service account: `roles/iam.serviceAccountUser` on runtime service account `toktickit-runner` only.
- WIF principal: `roles/iam.workloadIdentityUser` on the deployer service account only.
- The provider checks repository ID `1427046719`, owner ID `41636063`, the `main` ref, the fork's `deploy.yml` workflow and the `demo` environment subject. Tokens from PRs or other forks are rejected.

CD builds on a GitHub runner and pushes directly to Artifact Registry; it does not use Cloud Build. The deployer does not read secret values. The migration job and web service use the existing secrets through the runtime service account.

## Smoke tests

`python3 deploy/smoke_test.py SERVICE_URL` checks `/api/health`, `/api/ready` with a connected database, HTML at `/` and data from `/api/categories`. All checks must pass.

Login testing is optional. Configure environment variable `SMOKE_EMAIL` and environment secret `SMOKE_PASSWORD` for a dedicated test account to check login → me → logout. Otherwise, the workflow explicitly reports `SKIP login`. Do not put an administrator password in a workflow or guide. Passing smoke tests alone does not establish business E2E acceptance.

## Merge gate

In Settings → Rules → Rulesets, target `main`, require a pull request, and require the actual status check `test-and-docker`. Enable “Require branches to be up to date before merging” and leave the bypass list empty.

Use a regular PR to prove that a failing test blocks merging. A draft PR is already blocked by its draft status. Inspect the required check and mergeability in GitHub, rather than relying only on the ruleset settings.

## Rollback

1. Open a previous successful run and copy its commit image tag from the summary.
2. Open Actions → Deploy demo → Run workflow, select `main` and enter that tag in `image_tag`.
3. Confirm that tests and builds are skipped, image verification and deployment succeed, and smoke tests pass.
4. In Cloud Run, confirm that traffic reaches the new revision using the old image's digest.

Rollback changes the application image only; it does not restore the database. The current schema must remain compatible with the old image. Use expand/contract migrations: add compatible schema first and remove old fields later. A migration that deletes or renames columns requires a separate data plan before rollback.

The workflow does not automatically roll back after a smoke-test failure because schema compatibility needs review. Inspect the run and logs, then select a verified version. Deployments are queued and are not cancelled during a migration.

## Team verification record

Verified on 21 October 2026 (Asia/Bangkok):

| Check | Result and evidence |
|---|---|
| Offline provisioning, release and smoke tests | Passed, including preventing a web update after a failed migration and skipping migrations during rollback. |
| PR CI | [Run 39599347792](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39599347792) passed before PR #1 was merged. |
| Actual merge gate | [PR #2](https://github.com/tikpoptv/Fullfunction_ToctikIT/pull/2) was a regular PR up to date with main. Its failing test was marked Required, `mergeable_state=blocked`, and the Merge button was disabled. It was closed without merging. |
| Auto Deploy after merging to main | [Run 39599526273, attempt 2](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39599526273/attempts/2) passed CI, WIF, build/push, migration and smoke tests. |
| Actual rollback | [Run 39600194691](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39600194691) used tag `b744eed61413c380c188b5ee7d62b8ea2d402798`; tests/builds were skipped and smoke tests passed. |
| Provider read-back after rollback | Revision `toktickit-00003-8bt` received 100% of traffic and used digest `dfec78b522432c537b44ea61f25cd38a05e5170ad4893d3cd8ac6feaab10df54`, matching the first successfully deployed image. |
| Login after Auto Deploy | Login/me/logout passed in a separate check. No administrator password was added to GitHub Secrets. |

The Auto Deploy of main commit `88c3dcf7488457eeed87da1335e13cfad6b3ce1c` used digest `d1426fd2117a0b47c57251669a3557b8a939c86b7b13a7a658bae6fd63a8d002`. Rollback restored the earlier image. Consult the latest Console revision and workflow run for the current release.

Ticket, role, action, dashboard, session and attachment persistence checks subsequently passed on the live cloud service. Two UI regressions were found and fixed in PR #5; see [Cloud acceptance results](cloud-acceptance.md). Rollback across a destructive schema migration remains untested. The deliberately failing PR demonstrated the merge gate; broken code was not merged into main to test deployment failure.
