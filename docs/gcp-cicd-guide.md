# TokTickIT GCP and CI/CD rehearsal guide

Status: **GCP, CI/CD and the core cloud acceptance flows passed** — 21 October 2026 (Asia/Bangkok).

See [Auto Deploy and Rollback](auto-deploy.md) for release instructions and [Cloud acceptance](cloud-acceptance.md) for the final test results and fixes.

The initial review used fork `tikpoptv/Fullfunction_ToctikIT` at source commit `ab3eecb10390fce801f69c422677d13faa239898`. The first deployment used runtime source `b744eed61413c380c188b5ee7d62b8ea2d402798`, which included log redaction and passed CI. For a shorter walkthrough, start with the [first rehearsal](gcp-first-lab.md).

## 1. Responsibilities and milestones

| Work | Lead |
|---|---|
| Application and feature selection for a smaller version | Lookmoo |
| Guides and documentation | Noon, assisted by Bump |
| GCP and CI/CD | Tik |
| Integration and End-to-End Testing | Bom, assisted by Bump |
| Coordination and progress reporting | Bump |

The team's agreed milestones were:

- 22 October: assess the full version and decide whether to reduce scope.
- 25 October: demonstrate the application, GCP deployment and CI/CD working together.
- 28 October: deliver the Student Starter Kit, Setup Instructions and Troubleshooting Guide.
- Lecture Demonstration Materials and Practical Walkthrough: reassess on 22 October.

## 2. Verification status

| Item | Recorded result |
|---|---|
| Rehearsal account | An authorized company Google account was used. |
| Company billing | The user selected the company's My Billing Account; `billingEnabled=true` was verified. |
| Original student Free Trial | Credits were not confirmed: activation was pending and Credits showed “No credits to display”. It was not used for deployment. |
| Deployment project | `tikxd-test-20261021`, display name `tikxd test`. |
| Workstation | macOS. Dependencies and Docker builds were not run locally; GitHub runners and Cloud Build were used. |
| Fork and upstream | GitHub parent and remotes were checked. At the initial fetch, `origin/main` and `upstream/main` differed by 0/0 commits; this is a historical result. |
| Deployment script | Syntax, dry-run, offline regression and initial deployment passed. The public IAM binding produced a warning. |
| Build, tests and Docker | GitHub CI passed and Cloud Build built/pushed the image. These were not local build results. |
| GCP deployment | Migrations passed; revision readiness and 100% traffic were checked after releases as recorded in the workflow evidence. |
| Acceptance | Cloud API/browser tests passed for tickets, roles, actions, dashboards and session/attachment persistence. See the acceptance report. |
| Public access | https://toktickit-zygw3pmwua-as.a.run.app was opened using service-level `--no-invoker-iam-check`, with effective `requireInvokerIam=false`. |
| CI/CD | Reusable CI and Auto Deploy on main passed using WIF, SHA tags/digests, a migration gate and public smoke tests. |

Billing, project and credit details reflect the recorded verification date. Recheck them before use. Each student must inspect their own account and project rather than copy the team's project ID.

## 3. Source architecture

| Component | Technology / file |
|---|---|
| Frontend | React 18, TypeScript, Vite, Bootstrap; `client/` |
| Backend | Express, TypeScript, Prisma 5; `server/` |
| Database | PostgreSQL; Docker Compose uses PostgreSQL 16. |
| Cloud container | The root `Dockerfile` combines UI and API in one container on port 3000. |
| Local environment | `docker-compose.yml`: database, migration/seed, backend and frontend. |
| Cloud provisioning | `deploy/deploy.sh`: Cloud Run, Cloud SQL PostgreSQL 16, Artifact Registry, Cloud Build, Secret Manager and a runtime service account. |
| CI | `.github/workflows/ci-docker.yml` |
| Health / readiness | `/api/health` and `/api/ready` |

The deployment script enables APIs, prepares Registry/database/secrets/IAM, builds the image, deploys and executes the migration job, then deploys the web service only after the job succeeds.

Source defaults are region `asia-southeast1`, Cloud SQL `db-f1-micro` with 10 GB SSD, and Cloud Run min 0 / max 3 instances, 1 CPU and 512 MiB memory. These defaults do not establish available quota or suitability for a full classroom.

## 4. Workspace and fork synchronization

Work in `Fullfunction_ToctikIT/` inside the SE workspace. `origin` points to the fork; `upstream` points to the original repository.

```bash
git remote -v
git status --short --branch
git fetch origin
git fetch upstream
git rev-list --left-right --count origin/main...upstream/main
```

The last command shows fork-only commits on the left and upstream-only commits on the right.

Before syncing, check that the working tree is clean and create a review branch:

```bash
git switch -c sync/upstream-update origin/main
git merge upstream/main
```

Resolve conflicts and test before pushing the branch and opening a PR to the fork's `main`. To abandon an unfinished merge, use `git merge --abort`. Do not force-push or reset away existing work just to synchronize.

Adding an upstream remote and fetching do not synchronize the fork automatically. No automatic synchronization was added.

## 5. Before the rehearsal

1. Ensure sufficient disk space for dependencies, Docker layers and the database. A minimum disk size has not been established or tested.
2. Check Node.js, npm, Docker and Docker Compose for your chosen local setup. The README specifies Node.js >=20 and PostgreSQL >=15.
3. Verify the Google account and actual billing/credits; a billing account alone is insufficient evidence of readiness.
4. Check the target project, IAM permissions, organization policy and region before enabling APIs or creating resources.
5. Agree on a budget and alert recipients before deployment. A budget alert does not automatically stop spending.

## 6. Local rehearsal

### Option A: Docker Compose on a personal machine

```bash
docker compose up --build -d
docker compose ps
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

Open the UI at `http://localhost:5173` and log in using this environment's seed data.

Compose includes fallback passwords and demo seeding for localhost practice as described in the README. Do not expose this setup directly to the public internet. Compose also stores data in Docker volumes; do not delete a volume whose rehearsal data you need to retain.

### Option B: separate Node.js UI and API

Prepare PostgreSQL and configure `DATABASE_URL` in `server/.env` for the rehearsal database. Use separate terminals:

```bash
cd server
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

Edit `.env` before migration or seeding. Keep test databases separate from live data and never commit `.env` or credentials.

## 7. What CI checks

A PR to `main` invokes CI directly. A push to `main` invokes the same reusable CI from the deployment workflow before release:

1. Start PostgreSQL 16 on the GitHub runner.
2. Set up Node.js 20 and check deployment scripts offline without accessing GCP.
3. Backend: `npm ci`, migrations, seed and `npm test`.
4. Frontend: `npm ci`, `npm test` and `npm run build`.
5. Build the unified UI/API Dockerfile.

After CI passes on main, a separate CD job pushes the image, runs migrations, deploys and executes public smoke tests. This sequence passed during the rehearsal; see [Auto Deploy](auto-deploy.md). The existing Playwright specs were not used for cloud verification. Separate API and browser checks established the acceptance results in [Cloud acceptance](cloud-acceptance.md).

## 8. First deployment

The company rehearsal already completed this step. For a new environment, check billing, budget, project, IAM and source first. Replace the example project ID with your own.

Inspect planned commands without calling GCP:

```bash
DRY_RUN=1 PROJECT_ID=tikxd-test-20261021 REGION=asia-southeast1 bash deploy/deploy.sh
```

DRY_RUN prints inspection and creation commands to explain the sequence. It does not verify IAM, quota, billing, prices or whether resources can actually be created.

Review these details before a real deployment:

- `run_cmd` redacts `--password`, and the script no longer prints initial administrator/demo passwords at completion. Offline regression checks cover this; use a version that includes the fix.
- Initial provisioning uses image tag `latest`. Record the image digest and revision. Subsequent CD releases use commit SHA tags resolved to digests for traceability and rollback.
- The provisioning script grants the runtime account project-level Secret Accessor. Review the required scope for your environment.
- `--allow-unauthenticated` attempts to expose the HTTP endpoint. Review application authentication and organization policy first.
- Demo seed is disabled by default. `--demo` seeds only an empty database according to the seed logic; select the mode deliberately.
- Cloud SQL incurs ongoing charges. Check pricing for the actual region/configuration. The historical estimate below is not a current quote.

After readiness checks, deploy as shown in the [first rehearsal](gcp-first-lab.md#5-deploy-after-checking-readiness). Record the operator, time, commit, image digest, migration execution and resulting service revision.

## 9. CD release sequence

CD is implemented using GitHub Actions and Workload Identity Federation:

1. Merge an approved PR into `main`; CI must pass again before release.
2. Authenticate GitHub to GCP through WIF with deployment-specific permissions, without storing a service account key.
3. Build and push an image tagged with the commit SHA, then resolve its digest.
4. Run the migration job successfully before updating the service revision.
5. Run public health, database, UI and category smoke checks. Login is optional in the workflow and was also checked separately.
6. Record the release and keep a compatible rollback image. Rolling back the application does not automatically restore schema or data.

See [Auto Deploy](auto-deploy.md) for environment variables, WIF conditions, the merge gate and rollback instructions.

## 10. Acceptance checks with Bom

- [x] Health and database readiness passed through authenticated access and the public URL.
- [x] UI and API worked through the public Cloud Run URL without localhost.
- [x] All three roles logged in through the browser. Isolated QA accounts passed initial-password enforcement through the API; the original administrator password was left for the user to change.
- [x] Requester created a ticket and opened My Tickets/Details in the browser; ownership isolation passed through the API.
- [x] IT Staff selected an Owner, recorded Actions Taken, then resolved/closed a ticket in the browser. Dropdown and stale-timestamp bugs were fixed with regression tests.
- [x] API checks covered QA dashboard counts and all three roles' access boundaries. Browser checks opened each role's dashboard and User Management.
- [x] Original sessions for all three roles and the original attachment bytes/hash survived rollback and restoration. The requester's browser remained logged in after reload.
- [x] A new commit was released through the pipeline, and the serving revision/image was verified: run 39599526273, attempt 2.
- [x] Rollback was rehearsed with migration limitations documented: run 39600194691; schema/data were not restored.

The repository has `e2e/` specs, but the initial review did not find a root package manifest or Playwright configuration. The inspected specs used localhost URLs and fixed test passwords, so they cannot directly establish cloud acceptance. Configure a runner, test accounts and a base URL before using them against Cloud Run.

## 11. Troubleshooting and teardown

| Symptom | What to check |
|---|---|
| Signup stalls at step 2 | Inspect browser errors and free disk space. The first attempt showed `FILE_ERROR_NO_SPACE`, but this was not proved to be the only cause. |
| Free Trial remains pending | Read the actual Billing message. The rehearsal showed prepayment required/processing and a possible delay of up to 24 hours. Do not repeat a payment without checking the original transaction. |
| Health passes but readiness fails | Check database connectivity, secret mappings and migration logs without copying secret values. |
| Migration job fails | Inspect the execution and logs. The script exits with an error before deploying the web service. |
| Deployment is rejected | Identify the actual IAM, quota or organization-policy error before changing anything; do not add broad permissions experimentally. |
| E2E login fails | Check seed mode, the test account and `mustChangePassword`. Do not assume passwords in a spec apply to Cloud Run. |

`deploy/teardown.sh` deletes the database and resources. Inspect the project/resource list, back up required data and confirm deletion before running it. “Teardown completed” alone does not prove complete removal: commands tolerate errors, so check remaining resources and Billing afterwards.

## 12. Checkout verification record

- Cloned the fork, added upstream and fetched successfully.
- Created `docs/gcp-cicd-guide`, then renamed it `feat/teaching-gcp-ci` when CI and deployment-script changes were added. Those changes were subsequently merged into main.
- `bash -n deploy/deploy.sh deploy/teardown.sh` passed.
- `DRY_RUN=1 ... bash deploy/deploy.sh` exited 0 without calling gcloud or creating resources.
- Redacted password arguments and removed initial administrator/demo passwords from deployment output. Updated the README to retrieve values privately from Secret Manager.
- Offline regression passed for first run, rerun, partial setup, migration failure, demo and dry-run. All gcloud commands were stubbed, so these results do not establish actual GCP behavior.
- Added offline regression to CI, read-only checkout permissions, a timeout and cancellation of superseded branch CI runs.
- Did not install dependencies, run app tests or build Docker locally. GitHub CI passed and Cloud Build built the image.
- Created a new company test project, linked the billing account selected by the user, provisioned resources, migrated and deployed. Verified that the revision image digest matched the build.
- The initial `allUsers` binding failed, so private access was tested first. After the user requested public access, the effective `requireInvokerIam=false` policy was checked and service-level `--no-invoker-iam-check` was applied using Google's documented method. Organization policy was not changed.
- Health/ready/UI/login/me/logout checks passed through private/proxy access and the public URL without a Google IAM token. The original administrator still needed to change the initial password before regular use.
- The detailed activity log, starting with account signup, remains outside Git at `../output/gcp-student-eligibility-2026-10-21/steps-th.txt`. Use the recorded run links and actual GitHub Checks for release evidence.

## 13. First teaching sequence

Use the existing GitHub Actions workflows, Cloud Shell and deployment script. No Terraform, Kubernetes or Jenkins is required for this rehearsal.

### Part A: inspect CI before using Cloud

1. Open a pull request in the fork and inspect Checks.
2. Explain Backend Test → Frontend Test/Build → Docker Build.
3. Read PASS from the actual run. Offline script tests establish deployment control flow, not cloud behavior.

### Part B: deploy manually once

After checking billing readiness and section 8, open Cloud Shell with the intended account and select your project. Clone **your own fork**; the team URL below is an example:

```bash
git clone --branch main https://github.com/tikpoptv/Fullfunction_ToctikIT.git
cd Fullfunction_ToctikIT
```

The log-redaction changes are already on `main`; the old feature branch is no longer needed.

Check the account and project each time:

```bash
gcloud auth list
gcloud config get-value project
```

Inspect commands without creating resources. Replace the example project ID with your own:

```bash
DRY_RUN=1 PROJECT_ID=tikxd-test-20261021 bash deploy/deploy.sh --demo
```

After checking billing, budget, IAM and endpoint access, the deployment command for **the team's project only** is:

```bash
PROJECT_ID=tikxd-test-20261021 bash deploy/deploy.sh --demo
```

This creates billable resources, stores passwords in Secret Manager and attempts to expose the HTTP endpoint. Do not run it while Free Trial activation is pending. Students must replace the project ID with their own.

Open the resulting URL, check health/readiness, retrieve the initial password privately from Secret Manager, log in and change it. Test the ticket flow with Bom and record the actual results.

### Part C: automate the verified deployment

Automate the successful Build → Migration → Deploy sequence in the existing pipeline. Configure GitHub → GCP authentication first. Do not distribute service account keys or grant the pipeline broad IAM/Secrets/database administration just to rerun provisioning.

Auto Deploy passed after merging to main, using a GitHub runner for image builds and WIF for GCP authentication. Health/database/UI/categories were checked automatically. Separate post-deployment login checks passed; workflow login remains optional. Core API/browser acceptance passed as recorded in the report, and the team should still rehearse the presentation together. See [Auto Deploy](auto-deploy.md) for evidence and rollback instructions.

## Student cost estimate — checked 21 October 2026

This historical estimate covers one project using the rehearsal configuration: Singapore, ZONAL `db-f1-micro`, 10 GiB SSD and request-based Cloud Run with 1 CPU / 512 MiB under light classroom use. It is not an invoice or a newly verified price quote.

The rehearsal checked [Cloud SQL pricing](https://cloud.google.com/sql/pricing) for Singapore (`asia-southeast1`):

- `db-f1-micro`: USD 0.0147/hour × 730 = USD 10.731/month.
- SSD: USD 0.000326027/GiB-hour × 10 × 730 = USD 2.380/month.
- SQL compute + disk base: USD 13.111/month before backups and networking.
- Backups: USD 0.000153425/GiB-hour on actual stored backup size, rather than all allocated disk. An average 1–10 GiB adds approximately USD 0.112–1.120/month.
- Cloud Run and Cloud Build may fit within Free Tier under light use if the billing account still has quota. Free use is not guaranteed for every project.
- Three Secret Manager versions fit within the six-version free allowance per account if unused elsewhere. Artifact Registry's free allowance is 0.5 GiB per account, then approximately USD 0.10/GiB-month.

Allow USD 14–18/month per lightly used resource set, approximately THB 490–630 at an **assumed** THB 35/USD. The exchange rate was not verified. Taxes, credits, account-specific discounts and heavy traffic/builds are excluded.

SQL compute + disk alone costs approximately USD 0.1437 for 8 hours, USD 0.4310 for 24 hours, or USD 3.0173 for 7 days. These short-duration figures assume resources are removed afterwards. Closing a browser does not stop SQL billing; even a stopped instance can retain billable storage/backups/IP resources. No resources were stopped or deleted for this estimate.

References: [Cloud Run](https://cloud.google.com/run/pricing), [Cloud Build](https://cloud.google.com/build/pricing), [Artifact Registry](https://cloud.google.com/artifact-registry/pricing), [Secret Manager](https://cloud.google.com/secret-manager/pricing).

### Budget and lab cleanup

| SQL + 10 GiB SSD duration | USD: SQL compute + disk only | THB at assumed 35/USD |
|---|---:|---:|
| 8 hours | 0.1437 | Approximately 5 |
| 24 hours | 0.4310 | Approximately 15 |
| 7 days | 3.0173 | Approximately 106 |
| 730 hours | 13.1110 | Approximately 459 |

The table excludes backups, Cloud Run, Build, Registry, Storage and networking. The USD 14–18 monthly light-use allowance is per resource set, not per website visitor. A group sharing one set shares the database's fixed cost, while traffic usage is aggregated.

If an eligible student's USD 300 Free Trial is active and unexpired, qualifying charges use the available credit first. Check each student's actual balance and expiry; the team's company account does not establish student eligibility.

Include these steps at the end of the lab:

1. Verify your project ID and save assignment data/evidence.
2. Review the deletion list and confirm before teardown; the database will also be deleted.
3. Inspect remaining resources, especially SQL, retained backups, Registry images and Cloud Build buckets.
4. Check Billing after charges have updated. Budgets send alerts; they are not spending caps.

This record documents cost estimation and preparation only. The shared demo resources were not stopped or deleted.
