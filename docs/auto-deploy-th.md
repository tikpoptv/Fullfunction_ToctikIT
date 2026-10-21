# Auto Deploy และ Rollback สำหรับ TokTickIT

## ภาพรวมสำหรับผู้เรียน

ใช้ GitHub Actions สองไฟล์และทรัพยากร GCP ที่เตรียมไว้แล้ว:

1. เปิด PR เข้า `main` → `ci-docker.yml` ทดสอบ backend, frontend, deploy scripts และ Docker build
2. Merge เข้า `main` → `deploy.yml` เรียก CI ซ้ำ → build/push image tag เป็น commit SHA → migration job → Cloud Run → smoke test
3. Actions → Deploy demo → Run workflow บน `main` → ใส่ SHA เก่าจาก run ที่เคยสำเร็จใน `image_tag` → ตรวจ image → deploy → smoke test โดยข้าม test/build/migration

ช่อง `image_tag` ว่างหมายถึงทดสอบและ build main ปัจจุบันใหม่ ไม่ใช่ rollback ต้องใช้ SHA เต็ม 40 ตัว อิมเมจจะถูก resolve เป็น digest ก่อนใช้ เพื่อให้ migration และเว็บใช้ image เดียวกัน

## การเตรียมครั้งเดียว

Deploy ครั้งแรกด้วย `deploy/deploy.sh` เพื่อสร้างฐานข้อมูล, secrets, migration job และเว็บก่อน CD ไม่เรียก provisioning script นี้ซ้ำ และไม่มีสิทธิ์จัดการ IAM/สร้าง SQL

รอบทีมใช้ project `tikxd-test-20261021`, region `asia-southeast1`, service `toktickit`, job `toktickit-migrate` และ environment ชื่อ `demo` นักศึกษาต้องใช้ project และบัญชีของตนเอง

GitHub Environment `demo` อนุญาตเฉพาะ branch `main` ตั้ง variables ดังนี้:

| Variable | ค่ารอบทีม |
|---|---|
| `GCP_PROJECT_ID` | `tikxd-test-20261021` |
| `GCP_REGION` | `asia-southeast1` |
| `WIF_PROVIDER` | `projects/605568267750/locations/global/workloadIdentityPools/github-actions/providers/github-main` |
| `WIF_SERVICE_ACCOUNT` | `toktickit-deployer@tikxd-test-20261021.iam.gserviceaccount.com` |

เปิด IAM Service Account Credentials API และ Security Token Service API แล้วตั้ง Workload Identity Federation ตาม [คู่มือ Google](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account) ไม่ต้องดาวน์โหลด service-account key

ก่อนเขียนเงื่อนไข subject ให้ตรวจรูปแบบ OIDC ของ fork ตัวเอง:

```bash
gh api repos/OWNER/REPO/actions/oidc/customization/sub
```

รอบนี้ `use_immutable_subject=true` และ `sub_claim_prefix` คือ `repo:tikpoptv@41636063/Fullfunction_ToctikIT@1427046719` ต้องต่อท้าย `:environment:demo` ในเงื่อนไข subject หากใช้รูปแบบเดิมที่ไม่มี ID จะถูกปฏิเสธด้วย `The given credential is rejected by the attribute condition` อ่าน [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims) และตรวจค่าจริงของแต่ละ fork ไม่คัดลอก ID ของทีมไปใช้

ขอบเขตสิทธิ์รอบทีม:

- Deployer SA: `roles/run.developer` ในโปรเจกต์ทดสอบ
- Deployer SA: `roles/artifactregistry.writer` เฉพาะ repo `toktickit`
- Deployer SA: `roles/iam.serviceAccountUser` เฉพาะ runtime SA `toktickit-runner`
- Principal จาก WIF: `roles/iam.workloadIdentityUser` เฉพาะ deployer SA
- Provider ตรวจ repository ID `1427046719`, owner ID `41636063`, ref `main`, workflow `deploy.yml` ของ fork และ subject environment `demo` จึงไม่รับ token จาก PR หรือ fork อื่น

Build ใช้ GitHub runner และ push ไป Artifact Registry โดยตรง ขั้น CD นี้ไม่ได้ใช้ Cloud Build เพิ่ม ไม่มีการอ่านค่ารหัสจาก Secret Manager โดย deployer SA ตัว migration/runtime ใช้ secrets ที่เตรียมไว้ผ่าน runtime SA ตามเดิม

## Smoke test

`python3 deploy/smoke_test.py SERVICE_URL` ตรวจ `/api/health`, `/api/ready` (DB connected), HTML `/` และข้อมูล `/api/categories` ต้องผ่านทั้งหมด

Login เป็นขั้นเสริม: ตั้ง environment variable `SMOKE_EMAIL` และ environment secret `SMOKE_PASSWORD` ของบัญชีทดสอบเฉพาะ จึงจะตรวจ login → me → logout หากไม่ตั้งจะแสดง `SKIP login` อย่างชัดเจน ไม่ใส่รหัสผ่าน admin ลง workflow/คู่มือ ไม่ถือว่าผ่าน business E2E เพียงเพราะ smoke ผ่าน

## Merge gate

Settings → Rules → Rulesets → branch `main` → Require a pull request และ Require status checks เลือกชื่อ check จริง `test-and-docker` เปิด Require branches to be up to date before merging และไม่มี bypass actor

ต้องเปิด PR แบบปกติเพื่อพิสูจน์ว่า test ที่ล้มเป็นตัวบล็อก merge จริง เพราะ PR แบบ Draft ถูกห้าม merge อยู่แล้ว ดูผล required check และ mergeability ผ่าน GitHub อย่าดูเฉพาะสวิตช์ ruleset

## Rollback

1. เปิด run ที่สำเร็จครั้งก่อน จด Commit image tag ใน Summary
2. Actions → Deploy demo → Run workflow เลือก `main` แล้วใส่ tag นั้นใน `image_tag`
3. ตรวจว่า test/build ถูก skipped, ตรวจ image และ Deploy ผ่าน, smoke ผ่าน
4. ตรวจ Cloud Run ว่า traffic ไป revision ใหม่ที่ใช้ digest ของ image เก่า

Rollback เปลี่ยนเฉพาะ image แอป ไม่ได้ย้อนฐานข้อมูล ใช้ได้เมื่อ schema ยังเข้ากันกับ image เก่า ต้องใช้แนวทางเพิ่ม schema ก่อน แล้วค่อยลบของเก่าภายหลัง (expand/contract) หาก migration มีการลบหรือเปลี่ยนชื่อคอลัมน์ ต้องประเมินและมีแผนข้อมูลแยกก่อน rollback

Workflow ไม่ rollback อัตโนมัติเมื่อ smoke ล้ม เพื่อไม่เดาว่า schema เข้ากันได้ ให้ดู run/log แล้วเลือกเวอร์ชันที่ตรวจแล้ว การ Deploy เรียงคิวและไม่ cancel กลาง migration

## หลักฐานรอบทีม

ตรวจวันที่ 21 ต.ค. 2026 (Asia/Bangkok):

| รายการ | ผลและหลักฐาน |
|---|---|
| Offline provisioning/release/smoke tests | ผ่าน; รวม migration failure ต้องไม่ update เว็บ และ rollback ต้องไม่รัน migration |
| PR CI | [run 39599347792](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39599347792) ผ่านก่อน merge PR #1 |
| Merge gate จริง | [PR #2](https://github.com/tikpoptv/Fullfunction_ToctikIT/pull/2) เป็น PR ปกติและตรง main; test ล้มพร้อมป้าย Required, mergeable_state=blocked และปุ่ม Merge disabled; ปิดโดยไม่ merge |
| Auto Deploy เมื่อ merge main | [run 39599526273 attempt 2](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39599526273/attempts/2) ผ่าน CI, WIF, build/push, migration และ smoke |
| Rollback จริง | [run 39600194691](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39600194691) ใช้ tag b744eed61413c380c188b5ee7d62b8ea2d402798; test/build ถูก skipped และ smoke ผ่าน |
| Provider read-back หลัง rollback | revision toktickit-00003-8bt traffic100% ใช้ digest dfec78b522432c537b44ea61f25cd38a05e5170ad4893d3cd8ac6feaab10df54 ตรง image แรกที่เคย Deploy สำเร็จ |
| Login หลัง Auto Deploy | ตรวจแยกจาก workflow: login/me/logout ผ่าน; ไม่ได้ใส่รหัส admin ลง GitHub Secrets |

Auto Deploy main commit `88c3dcf7488457eeed87da1335e13cfad6b3ce1c` ใช้ digest `d1426fd2117a0b47c57251669a3557b8a939c86b7b13a7a658bae6fd63a8d002` รอบ rollback เปลี่ยนกลับ image เดิมจริง; revision ล่าสุดให้ดู Console/run ล่าสุด เพราะจะเปลี่ยนเมื่อมี release ถัดไป

อัปเดต: ตรวจ ticket/roles/actions/dashboard และ session/attachment persistence บน Cloud จริงแล้ว รวมถึงพบและแก้ UI regressions สองจุดใน PR #5 ดู [ผล Cloud acceptance](cloud-acceptance-th.md) ส่วน rollback ข้าม destructive schema migration ยังไม่ได้พิสูจน์ ตัวอย่าง PR test ล้มใช้พิสูจน์ merge gate ไม่ได้ merge โค้ดเสียเข้า main เพื่อทดลอง deploy gate
