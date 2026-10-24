# First rehearsal: use the CLI and verify in Google Cloud Console

Goal: identify the active account, target project and resources that deployment will create before provisioning anything.

Use Google Cloud Shell for a consistent tool environment, with Console open alongside it to inspect results. This is a TA rehearsal guide; it has not yet been validated in a student classroom.

During the team's rehearsal on 21 October 2026, the student account's Free Trial was not ready, so testing moved to an authorized company account. Deployment and public access succeeded, with health, database and login checks passing without a Google IAM token or localhost proxy. Automatic CD was then completed; see [Auto Deploy](auto-deploy.md).

## 1. Check the account in Console

Open Google Cloud Console and inspect the account at the top right. Select the authorized account for your rehearsal and check the project selector. The team used project `tikxd-test-20261021`, display name `tikxd test`, with active company billing.

Students must select their own accounts and projects; do not use the team's project ID by default.

Check Billing and credits in Console too. Having a project or billing account does not establish that Free Trial is ready. If activation is pending, you can inspect configuration and run the dry-run when Cloud Shell is available, but do not proceed to step 5.

## 2. Check the CLI account and project

Open Cloud Shell using the terminal button in Console. Run each command separately:

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
```

**Purpose:** show the account used by the CLI.

**Console check:** it should match the intended account at the top right. Resolve any mismatch before continuing.

Set the project. This example uses the team's project; replace it with your own project ID:

```bash
export PROJECT_ID=tikxd-test-20261021
gcloud config set project "$PROJECT_ID"
gcloud config get-value project
```

**Purpose:** set and read back the CLI's default project. This does not create Cloud Run or a database.

**Console check:** compare the project ID with the project selected in the top bar. Changing CLI configuration does not necessarily change the web project selector; inspect both.

## 3. Get the source

The teaching changes have been merged into `main`. Use your own fork URL if you have forked the repository:

```bash
git clone --branch main https://github.com/tikpoptv/Fullfunction_ToctikIT.git
cd Fullfunction_ToctikIT
git rev-parse --short HEAD
```

**Purpose:** download the source, including deployment-log redaction, and identify the checked-out commit.

**GitHub check:** compare the commit with `main` on GitHub and record the actual commit used in your rehearsal.

If you already have a clone, inspect its status before updating it. Do not overwrite the directory or reset away local changes.

## 4. Inspect the plan before creating resources

```bash
DRY_RUN=1 PROJECT_ID="$PROJECT_ID" bash deploy/deploy.sh --demo
```

**Purpose:** print planned commands without calling GCP or creating resources.

Ask students to identify each resource:

| Name | Purpose | Console location after deployment |
|---|---|---|
| `toktickit` in Artifact Registry | Store the container image | Artifact Registry → Repositories |
| `toktickit-pg` | PostgreSQL database | SQL → Instances |
| `toktickit-database-url` | Store the database connection string | Secret Manager |
| `toktickit-migrate` | Run migrations and seed | Cloud Run → Jobs |
| `toktickit` in Cloud Run | Run the web UI and API | Cloud Run → Services |

A dry-run does not establish that these resources exist. Its “Deployment Completed!” message is simulated, not evidence of a successful deployment, working billing, IAM permissions or quota.

## 5. Deploy after checking readiness

Proceed after checking billing/credits, budget, region, permissions and public endpoint access as described in the [full guide](gcp-cicd-guide.md#8-first-deployment). This command creates billable resources and attempts to expose the service publicly:

```bash
PROJECT_ID="$PROJECT_ID" bash deploy/deploy.sh --demo
```

Follow the output: prepare the database and secrets → build the image → run the migration job → deploy the web service. Inspect the resources in Console using the table in step 4 and record the actual results.

Lessons from the team rehearsal:

- New project, API and service account permissions can take time to propagate. Inspect IAM and resources before adding permissions. The team waited and retried the same command after checking the cause.
- Cloud Build selected the Compute default service account in this project. The team granted the build account the Cloud Build Service Account role in the test project, without granting Owner.
- Deployment can finish with a warning that binding `allUsers` failed. The team's organization rejected that binding, so public access was configured as described in step 6. Exit code 0 alone does not prove public access.

Read errors before retrying, especially for migrations and credential setup.

## 6. Verify the deployed website

The team service is https://toktickit-zygw3pmwua-as.a.run.app. It can be opened directly without a proxy or localhost, but still requires TokTickIT login.

If the organization restricts `allUsers`, inspect the effective policy first:

```bash
gcloud org-policies describe constraints/run.managed.requireInvokerIam --effective --project="$PROJECT_ID"
```

The team enabled the Organization Policy API to read the policy. With effective `enforce: false`, the service was configured using [Google's public access instructions](https://docs.cloud.google.com/run/docs/authenticating/public):

```bash
gcloud run services update toktickit --no-invoker-iam-check --project="$PROJECT_ID" --region=asia-southeast1
```

In Console: Cloud Run → toktickit → Security → Allow public access → Save. This makes the endpoint reachable by anyone. If policy requires IAM, consult the administrator. The team did not change organization policy.

Copy your actual Service URL and replace the placeholder below:

```bash
export SERVICE_URL='PASTE_ACTUAL_SERVICE_URL'
curl --fail --show-error "$SERVICE_URL/api/health"
curl --fail --show-error "$SERVICE_URL/api/ready"
```

Open the Service URL in a browser. Retrieve the initial password privately from Secret Manager, log in, change the password and test the ticket flow with Bom. Do not put passwords in guides, screenshots or group chats.

Passing health/readiness checks does not establish E2E acceptance. Record CLI, Console and browser results separately.

## Rehearsal record

Record the date/time, operator, account/project, commit, commands, results/errors without secrets, resources/revisions inspected in Console and browser results.

Before this rehearsal, CI for commit `b744eed61413c380c188b5ee7d62b8ea2d402798` had passed backend tests, frontend tests/build, offline deployment regression and Docker build in [run 39574507298](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39574507298). Public deployment, Auto Deploy and rollback subsequently passed; see the [team verification record](auto-deploy.md#team-verification-record) and [Cloud acceptance results](cloud-acceptance.md).

## Budget and lab cleanup

The rehearsal configuration has a historical light-use estimate of USD 14–18 per resource set per month, approximately THB 490–630 at an assumed THB 35/USD, before taxes and credits. Cloud SQL is the main recurring cost and continues accruing charges without website traffic. See the assumptions and cleanup steps in the [full guide](gcp-cicd-guide.md#student-cost-estimate--checked-21-october-2026).

Closing the browser does not stop costs. Save your work, verify the project and resource list, then confirm deletion when appropriate. Do not run teardown against the shared demo project while it is still needed.
