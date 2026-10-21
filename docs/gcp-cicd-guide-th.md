# คู่มือเตรียม GCP และ CI/CD สำหรับ TokTickIT

สถานะ: **Deploy สาธารณะและ Auto Deploy ผ่านแล้ว; business E2E ยังไม่ครบ** — 21 ตุลาคม 2026 (Asia/Bangkok)

คู่มือ Auto Deploy และ Rollback อยู่ที่ [Auto Deploy](auto-deploy-th.md)

เริ่มสำรวจจาก source commit `ab3eecb10390fce801f69c422677d13faa239898` ของ fork `tikpoptv/Fullfunction_ToctikIT` แล้วใช้ runtime source `b744eed61413c380c188b5ee7d62b8ea2d402798` ที่แก้ log และผ่าน CI สำหรับ Deploy ครั้งแรก อ่านบทซ้อมตามขั้นตอนสั้นได้ที่ [บทซ้อมแรก](gcp-first-lab-th.md)

## 1. ผู้รับผิดชอบและเป้าหมาย

| งาน | ผู้รับผิดชอบหลัก |
|---|---|
| Application และคัด feature สำหรับเวอร์ชันเล็ก | ลูกหมู |
| คู่มือและเอกสาร | นุ่น โดยบั๊มพ์ช่วย |
| GCP และ CI/CD | ติ้ก |
| Integration และ End-to-End Testing | บอม โดยบั๊มพ์ช่วย |
| ประสานงานและรายงานความคืบหน้า | บั๊มพ์ |

- 22 ต.ค.: ประเมินการใช้เวอร์ชันเต็มและตัดสินใจเรื่อง scope
- 25 ต.ค.: Application, GCP Deployment และ CI/CD ทำงานร่วมกัน พร้อม Demo
- 28 ต.ค.: Student Starter Kit, Setup Instructions และ Troubleshooting Guide
- Lecture Demonstration Materials และ Practical Walkthrough: ประเมินอีกครั้ง 22 ต.ค.

## 2. สิ่งที่ตรวจแล้วและสิ่งที่ยังต้องทำ

| รายการ | ผลตรวจ |
|---|---|
| บัญชี Google สำหรับรอบซ้อมบริษัท | `student@example.invalid` |
| Billing รอบบริษัท | ผู้ใช้เลือก `My Billing Account` ของบริษัท; ตรวจ `billingEnabled=true` แล้ว |
| Free Trial บัญชีนักศึกษาเดิม | ยังไม่ยืนยันเครดิต: pending และ Credits แสดง No credits to display จึงไม่ได้ใช้ Deploy |
| Project สำหรับ Deploy จริง | `tikxd-test-20261021` ชื่อ `tikxd test` ภายใต้ `example.invalid` |
| เครื่องสำหรับทำงาน | macOS; ไม่ติดตั้ง dependency หรือ Build Docker บนเครื่อง ใช้ GitHub runner/Cloud Build |
| Fork และ upstream | ตรวจ GitHub parent แล้วและตั้ง remote; ตอน fetch `origin/main` กับ `upstream/main` ต่างกัน 0/0 commits |
| Deploy script | syntax, dry-run, offline regression และ Deploy ครั้งแรกผ่าน; public IAM มี warning |
| Build / tests / Docker | GitHub CI ผ่านครบ และ Cloud Build สร้าง/push image สำเร็จ; ไม่ใช่ผล Local build |
| GCP Deployment | migration job ผ่าน; ตรวจ revision Ready และ traffic 100% หลังแต่ละ release ตามหลักฐาน run |
| Acceptance | health/DB/UI/login/me/logout ผ่าน URL สาธารณะโดยไม่ใช้ Google IAM token; business E2E ยังไม่ทดสอบ |
| Public access | เปิด https://toktickit-zygw3pmwua-as.a.run.app แล้ว ด้วย `--no-invoker-iam-check` เฉพาะบริการ; effective requireInvokerIam=false |
| CI/CD | reusable CI + Auto Deploy บน main ผ่านจริง; ใช้ WIF, SHA tag/digest, migration gate และ public smoke |

ค่า Billing account, project และสถานะเครดิตเป็นผลตรวจในวันที่ระบุ ต้องตรวจใหม่ก่อนใช้ คู่มือนักศึกษาต้องให้แต่ละคนตรวจบัญชีและ project ของตนเอง ไม่คัดลอก project ของทีมไปใช้โดยไม่ตรวจ

## 3. โครงสร้างที่พบใน source

| ส่วน | เทคโนโลยี / ไฟล์ |
|---|---|
| Frontend | React 18, TypeScript, Vite, Bootstrap; `client/` |
| Backend | Express, TypeScript, Prisma 5; `server/` |
| Database | PostgreSQL; Docker Compose ใช้ PostgreSQL 16 |
| Container สำหรับ Cloud | `Dockerfile` ที่ root รวม UI และ API ใน container เดียว พอร์ต 3000 |
| Local environment | `docker-compose.yml`: DB, migration/seed, backend, frontend |
| Cloud deployment | `deploy/deploy.sh`: Cloud Run, Cloud SQL PostgreSQL 16, Artifact Registry, Cloud Build, Secret Manager, runtime service account |
| CI | `.github/workflows/ci-docker.yml` |
| Health / readiness | `/api/health` และ `/api/ready` |

ลำดับใน deploy script คือเปิด API → เตรียม Registry/DB/Secrets/IAM → Build image → Deploy และ execute migration job → Deploy service เมื่อ job สำเร็จ

สคริปต์ตั้ง region เริ่มต้น `asia-southeast1`, Cloud SQL `db-f1-micro`, SSD 10 GB และ Cloud Run min 0 / max 3, CPU 1, memory 512 MiB ค่านี้คือค่าที่พบใน source ยังไม่ได้ยืนยัน quota ความเหมาะสมหรือต้นทุนจริงของบัญชีนี้

## 4. การทำงานใน workspace และซิงค์ fork

ทำงานใน `Fullfunction_ToctikIT/` ภายใน workspace SE โดย `origin` เป็น fork ของเรา และ `upstream` เป็นต้นฉบับ

```bash
git remote -v
git status --short --branch
git fetch origin
git fetch upstream
git rev-list --left-right --count origin/main...upstream/main
```

ผลของคำสั่งสุดท้าย: ตัวเลขซ้ายคือ commit เฉพาะ fork ตัวเลขขวาคือ commit เฉพาะต้นฉบับ

เมื่อจะรับ update ให้ตรวจว่า working tree สะอาดก่อน แล้วเปิด branch สำหรับรีวิวการซิงค์:

```bash
git switch -c sync/upstream-update origin/main
git merge upstream/main
```

ถ้ามี conflict ให้แก้และทดสอบก่อน push branch และเปิด PR เข้า `main` ของ fork หากต้องยกเลิก merge ที่ยังไม่จบ ใช้ `git merge --abort` ห้ามใช้ force push หรือ reset ทิ้งงานเพื่อซิงค์โดยไม่ได้ตรวจงานเดิม

การตั้ง upstream/fetch ไม่ได้ซิงค์ fork อัตโนมัติ ปัจจุบันยังไม่ได้เพิ่มระบบ auto-sync

## 5. เตรียมก่อนซ้อม

1. คืนพื้นที่เครื่องให้เพียงพอกับ dependency, Docker layers และฐานข้อมูลก่อนติดตั้ง (ยังไม่ได้กำหนดหรือทดสอบขนาดขั้นต่ำ)
2. ตรวจ Node.js, npm, Docker และ Docker Compose ตามแนวทางที่เลือก; README ระบุ Node.js >=20 และ PostgreSQL >=15
3. ตรวจบัญชี Google ที่เลือกและ Billing/เครดิตจริง อย่าสรุปจากการมี Billing account เพียงอย่างเดียว
4. ตรวจ project เป้าหมาย สิทธิ์ IAM นโยบายขององค์กรและ region ก่อนเปิด API หรือสร้างทรัพยากร
5. ระบุงบประมาณและผู้รับแจ้งเตือนก่อน Deploy; budget alert ไม่ใช่การหยุดค่าใช้จ่ายอัตโนมัติ

## 6. ซ้อม Local ก่อนขึ้น Cloud

### ทางเลือก A: Docker Compose สำหรับเครื่องส่วนตัว

```bash
docker compose up --build -d
docker compose ps
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

เปิด UI ที่ `http://localhost:5173` และทดสอบเข้าสู่ระบบตามข้อมูล seed ของ environment นี้

Compose มี fallback password และเปิด demo seed เพื่อการซ้อมบน localhost ตาม README ต้องไม่ใช้ไฟล์นี้เปิดบริการสู่สาธารณะโดยตรง การเริ่ม Compose ยังสร้างข้อมูลบน Docker volume; ห้ามลบ volume หากต้องการเก็บข้อมูลซ้อม

### ทางเลือก B: Node.js แยก UI/API

เตรียม PostgreSQL และแก้ `DATABASE_URL` ใน `server/.env` ให้ตรงกับฐานสำหรับซ้อม แล้วเปิด terminal แยกกัน:

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

แก้ `.env` ก่อน migrate/seed เสมอ และอย่าใช้ฐานจริงร่วมกับชุดทดสอบ ไม่ commit `.env` หรือ credentials

## 7. สิ่งที่ CI ปัจจุบันทำ

เมื่อเปิด PR เข้า `main` จะเรียก CI โดยตรง ส่วน push เข้า `main` จะเรียก CI เดียวกันจาก Deploy workflow ก่อนปล่อยรุ่น โดย CI จะ:

1. เปิด PostgreSQL 16 service บน GitHub runner
2. ใช้ Node.js 20
   และตรวจ deploy script แบบ offline โดยไม่เข้าถึง GCP
3. Backend: `npm ci`, migrate, seed และ `npm test`
4. Frontend: `npm ci`, `npm test` และ `npm run build`
5. Build Dockerfile รวม UI/API

CI job ตรวจ test/build ตามรายการนี้ หลัง CI ผ่านบน main จึงมี CD job แยกสำหรับ push image, migration, Deploy และ public smoke ซึ่งทดสอบผ่านจริงแล้ว ดู [คู่มือ Auto Deploy](auto-deploy-th.md) ส่วน Playwright/business E2E ยังไม่ได้ทดสอบบน Cloud

## 8. เตรียม Deploy ครั้งแรก

รอบบริษัทได้รันแล้วตามผลด้านบน สำหรับ environment ใหม่ให้ตรวจ Billing, งบประมาณ, project, IAM และ source ก่อนเสมอ

ตรวจคำสั่งที่สคริปต์จะใช้ได้โดยไม่เรียก GCP:

```bash
DRY_RUN=1 PROJECT_ID=tikxd-test-20261021 REGION=asia-southeast1 bash deploy/deploy.sh
```

DRY_RUN แสดงทั้งคำสั่งตรวจและคำสั่งสร้างเพื่ออธิบาย flow ไม่ใช่การตรวจ IAM, quota, Billing, ราคา หรือยืนยันว่า resource จะสร้างได้

ก่อนเรียกจริง ต้องจัดการประเด็นจาก source ต่อไปนี้:

- แก้แล้วใน branch นี้: `run_cmd` ปิดบัง `--password` และไม่พิมพ์ initial admin/demo password ท้ายงาน มี offline regression ตรวจ output; ต้องใช้เวอร์ชันที่มีการแก้ไขนี้
- image ใช้ tag `latest`: ต้องกำหนดวิธีผูก image/revision กับ commit และ rollback ให้ตรวจสอบย้อนหลังได้
- runtime ได้ Secret Accessor ระดับ project: ตรวจขอบเขตสิทธิ์ที่จำเป็นก่อนใช้งาน
- `--allow-unauthenticated` เปิด HTTP endpoint ให้เข้าถึงได้จากภายนอก: ตรวจ app authentication และนโยบายองค์กรก่อนทำ
- default ไม่เปิด demo seed; `--demo` seed ข้อมูลเฉพาะเมื่อ DB ว่างตาม logic seed จึงต้องเลือกให้ตรงกับรอบซ้อม
- Cloud SQL มีค่าใช้งานต่อเนื่อง ต้องตรวจราคาตาม configuration/region จริง; ตัวเลขประมาณการใน README ยังไม่ได้ยืนยันในงานนี้

เมื่อข้อข้างต้นพร้อม คู่มือฉบับซ้อมจะระบุคำสั่ง Deploy จริง พร้อมผู้ทำ เวลา commit, image digest, migration execution และ revision ที่ได้

## 9. งานที่จะเติมเพื่อให้เป็น CD

ยังไม่ได้เลือกรูปแบบการยืนยันตัวตนหรือสร้างสิทธิ์ใหม่ ให้กำหนดร่วมกันก่อนลงมือ:

1. กำหนด trigger สำหรับ Deploy จาก branch/environment ที่ทีมตกลง
2. ตั้งการยืนยันตัวตน GitHub → GCP และสิทธิ์เฉพาะงาน โดยไม่เก็บ credentials ใน source/log
3. ทดสอบและ Build image ที่ผูกกับ commit
4. migration job ต้องสำเร็จก่อนสลับ service revision
5. ตรวจ health/readiness และทดสอบ browser ตาม role
6. บันทึกผล deploy และเตรียม rollback; การย้อน app revision ไม่ย้อน schema/data โดยอัตโนมัติ

## 10. Acceptance ที่ต้องเก็บร่วมกับบอม

- [x] Health ผ่าน และ readiness เชื่อม DB ผ่าน ทั้ง authenticated และ URL สาธารณะ
- [x] UI โหลดและ API ทำงานจาก Cloud Run URL สาธารณะโดยไม่ใช้ localhost
- [ ] Login และเปลี่ยนรหัสเริ่มต้นสำเร็จ
- [ ] Requester สร้าง ticket และติดตาม ticket ของตนได้
- [ ] IT Staff บันทึก Actions Taken และปรับสถานะตามสิทธิ์ได้
- [ ] Dashboard และการจำกัดสิทธิ์แต่ละ role ตรงกับ specification
- [ ] attachment และ session ทำงานหลัง redeploy ตามที่ระบบออกแบบ
- [x] deploy commit ใหม่ผ่าน pipeline และพิสูจน์ revision/image ที่ได้รับ traffic (run 39599526273 attempt 2)
- [x] ซ้อม rollback พร้อมระบุข้อจำกัดของ migration (run 39600194691; ไม่ย้อน schema/data)

E2E specs มีใน `e2e/` แต่ยังไม่พบ root package manifest หรือ Playwright config; specs ที่ตรวจมี localhost URL และรหัสทดสอบตายตัว จึงยังใช้ยืนยัน Cloud acceptance โดยตรงไม่ได้ ต้องเตรียม runner, test accounts และ base URL ก่อน

## 11. Troubleshooting และการเลิกใช้งาน

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| Signup ขั้น 2 ค้าง | ตรวจข้อความ browser และพื้นที่เครื่อง; รอบแรกพบ FILE_ERROR_NO_SPACE แต่ไม่ได้พิสูจน์ว่าเป็นสาเหตุเดียว |
| Free Trial pending | อ่านข้อความ Billing; ล่าสุดแจ้ง prepayment needed หรือ processing และอาจจำกัดบริการถึง 24 ชั่วโมง อย่าชำระซ้ำโดยยังไม่ทราบผลรายการเดิม |
| Health ผ่านแต่ readiness ไม่ผ่าน | ตรวจ DB connectivity, secret mapping และ migration logs โดยไม่คัดลอก secret |
| migration job ล้มเหลว | ตรวจ execution/logs; script ออกด้วย error ก่อน Deploy service |
| Deploy ถูกปฏิเสธ | อ่าน error ของ IAM, quota หรือ organization policy ตามจริงก่อนแก้ ไม่เพิ่มสิทธิ์กว้างเพื่อทดลอง |
| E2E login ไม่ผ่าน | ตรวจ seed mode, test account และ mustChangePassword; อย่าถือว่ารหัสใน spec ใช้ได้กับ Cloud |

มี `deploy/teardown.sh` แต่สคริปต์นี้ลบฐานข้อมูลและทรัพยากร ต้องตรวจ project/รายการ resource สำรองข้อมูลที่ต้องเก็บ และยืนยันการลบก่อนรันจริง คำว่า Teardown completed ของสคริปต์ไม่ใช่หลักฐานว่าลบครบ เพราะแต่ละคำสั่งยอมให้ error ผ่าน ต้องตรวจ resource คงเหลือและ Billing หลังทำ

## 12. บันทึกผลการตรวจใน checkout นี้

- clone fork สำเร็จ; เพิ่ม upstream และ fetch สำเร็จ
- สร้าง branch `docs/gcp-cicd-guide` สำหรับคู่มือ แล้วเปลี่ยนชื่อเป็น `feat/teaching-gcp-ci` เมื่อเพิ่มการแก้ CI และ deploy script
- `bash -n deploy/deploy.sh deploy/teardown.sh`: ผ่าน
- `DRY_RUN=1 ... bash deploy/deploy.sh`: ผ่าน exit 0; ไม่เรียก gcloud และไม่สร้างทรัพยากร
- แก้ deploy script ให้ปิดบัง argument รหัสผ่านและไม่พิมพ์ initial admin/demo password ลง output พร้อมแก้ README ให้เปิด Secret Manager ดูค่าเป็นการส่วนตัว
- Offline regression: first run, rerun, partial setup, migration failure, demo และ dry run ผ่าน; ทุกคำสั่ง gcloud ถูกแทนด้วย stub จึงไม่ใช่ผลทดสอบ GCP จริง
- เพิ่ม offline regression ใน CI, สิทธิ์ checkout แบบอ่านอย่างเดียว, timeout และยกเลิก CI ของ branch เดิมเมื่อมี push ใหม่
- ไม่ติดตั้ง dependency, ไม่รัน app tests หรือ Build Docker บนเครื่องนี้; GitHub CI ผ่านและ Cloud Build สร้าง image สำเร็จ
- รอบบริษัทสร้างโปรเจกต์ใหม่ ผูก Billing ตามที่ผู้ใช้เลือก เตรียม resources, migrate และ Deploy สำเร็จ ตรวจ revision image digest ตรงกับ Build แล้ว
- เริ่มแรกเพิ่ม allUsers ไม่ผ่าน จึงทดสอบ private service ก่อน ต่อมาผู้ใช้ขอเปิดสาธารณะ ตรวจ effective requireInvokerIam=false แล้วตั้ง --no-invoker-iam-check เฉพาะบริการตามวิธีของ Google; ไม่เปลี่ยน org policy
- Smoke ผ่าน health/ready/UI/login/me/logout ทั้ง private, proxy และ URL สาธารณะโดยไม่ใช้ Google IAM token; initial admin ยังต้องเปลี่ยนรหัสเองก่อนใช้งานจริง
- บันทึกกิจกรรมตั้งแต่สมัครบัญชีอยู่ที่ `../output/gcp-student-eligibility-2026-10-21/steps-th.txt` นอก repo; ผล GitHub run และ PR ให้ยึดบันทึกนี้และหน้า Checks จริง

## 13. ลำดับสำหรับใช้สอนรอบแรก

ใช้ GitHub Actions เดิม, Cloud Shell และ deploy script เดียว โดยยังไม่เพิ่ม Terraform, Kubernetes หรือ Jenkins

### ช่วง A: ดู CI ก่อนใช้ Cloud

1. เปิด Pull Request ใน fork แล้วไปแท็บ Checks
2. อธิบาย Backend Test → Frontend Test/Build → Docker Build
3. ผล PASS ต้องดูจาก run จริง; สคริปต์ offline test ยืนยันเพียง flow ของ deployment ไม่ได้ทดสอบ Cloud

### ช่วง B: Deploy ด้วยตนเองหนึ่งครั้ง

ทำหลังตรวจ Billing พร้อมใช้และค่าตั้งต้นในข้อ 8 แล้ว เปิด Cloud Shell จากบัญชีที่ใช้ในรอบนั้น เลือก project ของตนเอง จากนั้น clone **fork ของตนเอง**:

```bash
git clone https://github.com/tikpoptv/Fullfunction_ToctikIT.git
cd Fullfunction_ToctikIT
```

ก่อน merge PR นี้ ต้อง checkout branch `feat/teaching-gcp-ci` เพื่อใช้สคริปต์ที่แก้ log แล้ว หลัง merge ใช้ `main` ที่รวมการแก้ไขนี้

```bash
git switch feat/teaching-gcp-ci
```

ตรวจบัญชีและ project ใน Cloud Shell ก่อนทุกครั้ง:

```bash
gcloud auth list
gcloud config get-value project
```

ขั้นทดลองอ่านคำสั่ง (ไม่สร้าง resource):

```bash
DRY_RUN=1 PROJECT_ID=tikxd-test-20261021 bash deploy/deploy.sh --demo
```

เมื่อ Billing, งบประมาณ, IAM และการเปิด endpoint พร้อมแล้ว คำสั่ง Deploy สำหรับ **project ทีมนี้เท่านั้น** คือ:

```bash
PROJECT_ID=tikxd-test-20261021 bash deploy/deploy.sh --demo
```

คำสั่งจริงนี้สร้างทรัพยากรที่มีค่าใช้งาน ใช้ Secret Manager เก็บรหัส และเปิด HTTP endpoint ภายนอก ห้ามรันขณะ Free Trial ยัง pending; สำหรับนักศึกษาแต่ละคนต้องเปลี่ยน project ให้ตรงกับของตน

เปิด URL ที่ได้รับ → ตรวจ health/readiness → เปิด Secret Manager ดู initial password โดยส่วนตัว → login และเปลี่ยนรหัส → ทดสอบ ticket flow กับบอม แล้วจดผลจริง

### ช่วง C: เติม CD เมื่อช่วง B ผ่าน

นำลำดับ Build → Migration → Deploy ที่ซ้อมสำเร็จไปทำอัตโนมัติใน pipeline เดิม โดยต้องเลือกและตั้ง GitHub → GCP authentication ก่อน ไม่แจก service-account key ให้ผู้เรียน และไม่ใส่สิทธิ์จัดการ IAM/Secrets/DB ทั้งหมดไว้ใน pipeline เพียงเพื่อเรียก provisioning script ซ้ำ

สถานะช่วงนี้: Auto Deploy ผ่านจริงหลัง merge main แล้ว ใช้ GitHub runner build image และ WIF เชื่อม GCP ตรวจ health/DB/UI/categories อัตโนมัติ ส่วน login ตรวจแยกหลัง Deploy ผ่าน; login ใน workflow ยังเป็น optional และ business E2E ต้องทดสอบกับบอมต่อ ดูหลักฐานและวิธี rollback ใน [คู่มือ Auto Deploy](auto-deploy-th.md)


## ประมาณค่าใช้จ่ายสำหรับนักศึกษา — ตรวจ 21 ต.ค. 2026

ต่อหนึ่งโปรเจกต์ตามสเปกจริง สิงคโปร์ ZONAL db-f1-micro / SSD 10 GiB และ Cloud Run 1 CPU / 512 MiB แบบ request-based ใช้เบา ๆ ในห้องเรียน ไม่ใช่ยอดใบแจ้งหนี้จริง

ตรวจหน้า https://cloud.google.com/sql/pricing โดยเลือก Singapore (asia-southeast1):

- db-f1-micro: USD 0.0147/ชั่วโมง × 730 = USD 10.731/เดือน
- SSD: USD 0.000326027/GiB-hour × 10 × 730 = USD 2.380/เดือน
- ฐาน SQL compute+disk รวม USD 13.111/เดือน ก่อน backup/network
- Backup: USD 0.000153425/GiB-hour คิดตามขนาดที่เก็บจริง ไม่ได้คิดจากดิสก์ที่จองทั้งหมด สมมติ backup เฉลี่ย 1–10 GiB จะเพิ่มประมาณ USD 0.112–1.120/เดือน
- Cloud Run และ Cloud Build อาจอยู่ใน Free Tier หากใช้เบาและโควตา Billing ยังเหลือ ไม่ใช่การรับประกันว่าทุกโปรเจกต์ฟรี
- Secret Manager 3 versions อยู่ในโควตาฟรี 6 versions/account หากยังไม่ได้ใช้ร่วมกับโปรเจกต์อื่น; Registry ฟรี 0.5 GiB/account แล้วประมาณ USD 0.10/GiB-month

งบประมาณใช้งานเบาต่อโปรเจกต์: USD 14–18/เดือน หรือประมาณ 490–630 บาท ที่สมมติ USD 1 = 35 บาท (ไม่ใช่อัตราแลกเปลี่ยนที่ยืนยัน) ยังไม่รวมภาษี เครดิต ส่วนลดเฉพาะบัญชี หรือ traffic/build จำนวนมาก

เฉพาะ SQL compute+disk: 8 ชั่วโมง USD 0.1437; 24 ชั่วโมง USD 0.4310; 7 วัน USD 3.0173 ต้องลบทรัพยากรหลังจบจึงจะใช้ตัวเลขช่วงสั้นนี้ได้ การปิดแท็บเว็บไม่หยุด SQL และ stop instance ยังมี storage/backup/IP บางส่วนที่อาจคิดต่อ ไม่ลบหรือหยุดทรัพยากรในการประเมินนี้

อ้างอิง: https://cloud.google.com/run/pricing ; https://cloud.google.com/build/pricing ; https://cloud.google.com/artifact-registry/pricing ; https://cloud.google.com/secret-manager/pricing


### สรุปงบและการจบแลบ

| ระยะเวลาเปิด SQL + SSD 10 GiB | USD เฉพาะ SQL compute + disk | บาทที่อัตราสมมติ 35 บาท/USD |
|---|---:|---:|
| 8 ชั่วโมง | 0.1437 | ประมาณ 5 |
| 24 ชั่วโมง | 0.4310 | ประมาณ 15 |
| 7 วัน | 3.0173 | ประมาณ 106 |
| 730 ชั่วโมง | 13.1110 | ประมาณ 459 |

ตัวเลขตารางยังไม่รวม backup, Cloud Run, Build, Registry, Storage และ network; งบรวมใช้งานเบารายเดือนให้ใช้ USD 14–18 ต่อหนึ่งชุดทรัพยากร ไม่ใช่ต่อผู้เข้าเว็บ หากแต่ละกลุ่มใช้ชุดเดียวกัน ค่าใช้จ่ายฐานข้อมูลประจำชุดนั้นแชร์กันได้ แต่ traffic จะรวมตามการใช้งาน

ถ้า Free Trial USD 300 เปิดใช้จริงและเครดิตยังไม่หมดอายุ ค่าบริการที่เข้าเงื่อนไขจะหักจากเครดิตก่อน ต้องตรวจยอดและวันหมดอายุในบัญชีของผู้เรียน ไม่ใช้สถานะบัญชีบริษัทของทีมยืนยันแทนนักศึกษา

ลำดับที่ต้องใส่ในบทเรียนหลังจบแลบ:

1. ตรวจ project ID ของตนเองและเก็บข้อมูล/หลักฐานที่ต้องใช้ส่งงาน
2. ตรวจรายการที่จะลบและยืนยันก่อนใช้ teardown เพราะฐานข้อมูลจะถูกลบด้วย
3. ตรวจทรัพยากรคงเหลือ โดยเฉพาะ SQL, backup ที่เก็บไว้, image ใน Registry และ bucket ของ Cloud Build
4. ตรวจ Billing หลังระบบอัปเดตยอด; การตั้ง Budget เป็นการแจ้งเตือน ไม่ใช่เพดานหยุดค่าใช้จ่าย

บันทึกรอบนี้เป็นการประเมินและจัดทำคู่มือเท่านั้น ยังไม่ได้ลบหรือหยุดทรัพยากรเดโม
