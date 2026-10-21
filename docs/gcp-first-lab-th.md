# บทซ้อมแรก: ใช้ CLI แล้วตรวจผลใน Google Cloud Console

เป้าหมาย: ผู้เรียนระบุได้ว่าใช้บัญชีใด ทำงานในโปรเจกต์ใด และคำสั่ง Deploy จะสร้างอะไร ก่อนสร้างทรัพยากรจริง

ใช้ Google Cloud Shell เพื่อให้ทุกคนใช้เครื่องมือจากสภาพแวดล้อมเดียวกัน เปิด Console คู่กันไว้เพื่อดูผล คู่มือนี้เป็นร่างสำหรับซ้อมของทีม TA ยังไม่ผ่านการสอนกับนักศึกษาจริง

รอบซ้อมจริงของทีมวันที่ 21 ต.ค. 2026 เปลี่ยนมาใช้บัญชีบริษัท เนื่องจาก Free Trial ของบัญชีนักศึกษายังเปิดไม่สำเร็จ รอบบริษัท Deploy แล้วและเปิดลิงก์สาธารณะสำเร็จ ตรวจ health/DB/login ผ่านโดยไม่ใช้ Google IAM token หรือ localhost แล้ว ต่อ CD อัตโนมัติแล้วตาม [คู่มือ Auto Deploy](auto-deploy-th.md)

## 1. ตรวจบัญชีจากหน้าเว็บ

เปิด Google Cloud Console และตรวจรูปบัญชีมุมขวาบน สำหรับรอบซ้อมของทีมนี้ต้องเป็น `supachok.d@riffai.org` แล้วเลือกโปรเจกต์ `tikxd-test-20261021` ชื่อ `tikxd test` ในองค์กร `riffai.org` และตรวจว่า Billing เปิดใช้งานแล้ว

สำหรับนักศึกษา ให้ใช้บัญชีและโปรเจกต์ของตนเอง ไม่ใช้ project ID ของทีมโดยอัตโนมัติ

ตรวจ Billing และเครดิตจากหน้าเว็บด้วย: การมี project หรือ Billing account ยังไม่แปลว่า Free Trial พร้อมใช้ ถ้ายัง Pending ทำบทซ้อมอ่านค่าและ dry-run ได้เมื่อ Cloud Shell ใช้งานได้ แต่ยังไม่ทำข้อ 5

## 2. ตรวจบัญชีและโปรเจกต์ด้วย CLI

เปิด Cloud Shell จากปุ่มรูป terminal บน Console เมื่อเห็น command prompt แล้ว รันทีละคำสั่ง:

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
```

**คำสั่งทำอะไร:** แสดงบัญชีที่ CLI ใช้อยู่

**ตรวจผลใน Console:** ต้องตรงกับบัญชีมุมขวาบน ถ้าไม่ตรงให้เลือกบัญชีให้ถูกก่อนทำต่อ

ตั้งค่าโปรเจกต์ของทีมนี้:

```bash
export PROJECT_ID=tikxd-test-20261021
gcloud config set project "$PROJECT_ID"
gcloud config get-value project
```

**คำสั่งทำอะไร:** กำหนด project เริ่มต้นของ CLI และอ่านค่ากลับ การตั้ง config ยังไม่สร้าง Cloud Run หรือฐานข้อมูล

**ตรวจผลใน Console:** project ID ต้องตรงกับโปรเจกต์ที่เลือกบนแถบด้านบน การเปลี่ยน project ใน CLI ไม่ได้ยืนยันว่า project selector บนเว็บเปลี่ยนตามเสมอ ให้ตรวจทั้งสองจุด

## 3. เตรียม source ที่มีการแก้ไขสำหรับทีม TA

```bash
git clone --branch feat/teaching-gcp-ci https://github.com/tikpoptv/Fullfunction_ToctikIT.git
cd Fullfunction_ToctikIT
git rev-parse --short HEAD
```

**คำสั่งทำอะไร:** ดาวน์โหลด fork เวอร์ชันที่แก้การพิมพ์รหัสผ่านลง log และแสดง commit ที่ใช้

**ตรวจผลบน GitHub:** เปิด branch `feat/teaching-gcp-ci` แล้วเทียบ commit กับ CLI; บันทึก commit จริงในรอบซ้อม เมื่อ PR รวมเข้า main แล้วให้อัปเดตคู่มือให้ใช้ main

ถ้าเคย clone แล้ว ให้ใช้โฟลเดอร์เดิมและตรวจสถานะก่อนอัปเดต ห้าม clone ทับหรือ reset ทิ้งงานที่แก้อยู่

## 4. ดูแผนก่อนสร้างทรัพยากร

```bash
DRY_RUN=1 PROJECT_ID="$PROJECT_ID" bash deploy/deploy.sh --demo
```

**คำสั่งทำอะไร:** แสดงรายการคำสั่งที่จะใช้ โดยไม่เรียก GCP และไม่สร้างทรัพยากร

**สิ่งที่ให้นักศึกษาชี้ให้ได้:**

| ชื่อที่เห็น | หน้าที่ | หน้า Console ที่จะใช้ตรวจหลัง Deploy |
|---|---|---|
| `toktickit` ใน Artifact Registry | เก็บ container image | Artifact Registry → Repositories |
| `toktickit-pg` | ฐานข้อมูล PostgreSQL | SQL → Instances |
| `toktickit-database-url` | เก็บค่าการเชื่อม DB | Secret Manager |
| `toktickit-migrate` | รัน migration และ seed | Cloud Run → Jobs |
| `toktickit` ใน Cloud Run | รันเว็บและ API | Cloud Run → Services |

หลัง dry-run ยังไม่ควรสรุปว่ามีทรัพยากรเหล่านี้อยู่จริง ข้อความ “Deployment Completed!” ใน dry-run เป็นข้อความจำลอง ไม่ใช่หลักฐาน Deploy สำเร็จ และไม่ใช่ผลตรวจ Billing/IAM/quota

## 5. Deploy จริงหลังตรวจความพร้อม

ทำเมื่อเครดิตพร้อมใช้ กำหนดงบประมาณ ตรวจ region/สิทธิ์/การเปิด endpoint แล้ว ตาม [คู่มือฉบับเต็ม](gcp-cicd-guide-th.md#8-เตรียม-deploy-ครั้งแรก) คำสั่งนี้สร้างทรัพยากรที่มีค่าใช้งานและเปิดเว็บให้เข้าถึงจากภายนอก

```bash
PROJECT_ID="$PROJECT_ID" bash deploy/deploy.sh --demo
```

ให้ผู้เรียนดูทีละส่วนจาก output: เตรียม DB และ secrets → Build image → รัน migration job → Deploy เว็บ จากนั้นเปิด Console ตรวจ resource ตามตารางข้อ 4 และบันทึกผลจริง

สิ่งที่พบจากรอบซ้อม:

- โปรเจกต์/API/บัญชีบริการใหม่อาจใช้เวลาจนสิทธิ์มีผล ถ้าคำสั่งถัดไปปฏิเสธสิทธิ์ ให้ตรวจ IAM และ resource จริงก่อนเพิ่มสิทธิ์ รอบนี้รอและรันคำสั่งเดิมต่อจนสำเร็จ
- Cloud Build ของโปรเจกต์นี้เลือก Compute default service account เป็นตัว Build จึงเตรียมบทบาท Cloud Build Service Account ให้บัญชี Build ในโปรเจกต์ทดสอบ โดยไม่ให้ Owner แก่บัญชีบริการ
- ข้อความ Deploy สำเร็จอาจมาพร้อม warning ว่าผูก `allUsers` ไม่ได้ รอบนี้องค์กรปฏิเสธการเพิ่ม `allUsers` จึงใช้การตั้งค่า Allow public access ของ Cloud Run ตามข้อ 6; ห้ามถือว่าเว็บเปิดสาธารณะแล้วเพียงเพราะคำสั่ง exit 0

ถ้าเกิด error ให้หยุดอ่าน error ไม่รันซ้ำทันที โดยเฉพาะ migration และการตั้งค่า credential

## 6. ตรวจเว็บที่ Deploy แล้ว

รอบบริษัทเปิดได้ที่ https://toktickit-zygw3pmwua-as.a.run.app โดยตรง ไม่ต้องเปิด proxy หรือ localhost แต่ยังต้อง login ของ TokTickIT

หากองค์กรจำกัด `allUsers` ให้ตรวจนโยบายก่อน:

```bash
gcloud org-policies describe constraints/run.managed.requireInvokerIam --effective --project="$PROJECT_ID"
```

รอบนี้เปิด Organization Policy API เพื่ออ่านนโยบาย และผล effective คือ `enforce: false` จึงตั้งค่าเฉพาะบริการตาม [วิธีที่ Google แนะนำ](https://docs.cloud.google.com/run/docs/authenticating/public):

```bash
gcloud run services update toktickit --no-invoker-iam-check --project="$PROJECT_ID" --region=asia-southeast1
```

ใน Console: Cloud Run → toktickit → Security → Allow public access แล้วบันทึก การตั้งค่านี้เปิดให้ทุกคนเข้าถึง endpoint ของบริการ หากนโยบายบังคับ IAM ต้องให้ผู้ดูแลพิจารณาก่อน รอบนี้ไม่ได้แก้ org policy

คัดลอก Service URL ที่ได้รับจริง กำหนดเป็นตัวแปร โดยเปลี่ยนข้อความในเครื่องหมายคำพูดเป็น URL นั้น:

```bash
export SERVICE_URL='วาง Service URL จริงที่นี่'
curl --fail --show-error "$SERVICE_URL/api/health"
curl --fail --show-error "$SERVICE_URL/api/ready"
```

เปิด Service URL ใน browser และ Secret Manager เพื่อดู initial password เป็นการส่วนตัว จากนั้น login เปลี่ยนรหัส และทดสอบ ticket flow ร่วมกับบอม ห้ามใส่รหัสผ่านในคู่มือ ภาพหน้าจอ หรือกลุ่มแชต

Health/readiness ผ่านยังไม่ใช่ End-to-End ผ่าน ให้แยกผล CLI, Console และการใช้งานผ่าน browser ในบันทึก

## ผลซ้อมที่ต้องจด

วันเวลา · ผู้ทำ · บัญชี/project · commit · คำสั่งที่รัน · ผล/ข้อความผิดพลาดที่ไม่มี secret · resource/revision ที่ตรวจจาก Console · ผลทดสอบ browser

สถานะก่อนเริ่มบทนี้: CI ของ commit `b744eed61413c380c188b5ee7d62b8ea2d402798` ผ่าน Backend tests, Frontend tests/build, offline deployment regression และ Docker build แล้วใน [run 39574507298](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39574507298) ซึ่งเป็นหลักฐาน CI ในตอนนั้น ต่อมา Deploy สาธารณะ, Auto Deploy และ rollback ผ่านแล้วตาม [หลักฐานรอบทีม](auto-deploy-th.md#หลักฐานรอบทีม) โดย business E2E ยังเหลือ


## งบประมาณและการจบแลบ

ตามสเปกรอบซ้อมนี้ ให้เผื่องบใช้เบา ๆ USD 14–18 ต่อชุด/เดือน (ประมาณ 490–630 บาทที่สมมติ 35 บาท/USD ก่อนภาษีและเครดิต) ค่าใช้จ่ายหลักคือ Cloud SQL ซึ่งยังคิดตามเวลาแม้ไม่มีคนเข้าเว็บ ดูรายละเอียด สมมติฐาน และรายการตรวจหลังจบแลบในหัวข้อประมาณค่าใช้จ่ายของ [คู่มือฉบับเต็ม](gcp-cicd-guide-th.md)

ปิดแท็บเว็บไม่หยุดค่าใช้จ่าย ต้องเก็บงาน ตรวจ project และรายการทรัพยากรให้ตรงก่อนยืนยันการลบ อย่ารัน teardown กับโปรเจกต์เดโมที่ยังต้องใช้
