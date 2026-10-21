# ผลตรวจ Cloud acceptance ของ TokTickIT

วันที่ 21 ต.ค. 2026 (Asia/Bangkok) — โปรเจกต์ `tikxd-test-20261021` — URL https://toktickit-zygw3pmwua-as.a.run.app

ตรวจบนบริการ GCP จริงโดยใช้บัญชี QA แยกจากบัญชีเดิม ไม่ใช้ test suite ที่ต่อ localhost แทนผล Cloud และไม่เปลี่ยนรหัส initial admin เดิม

## ผล API และ persistence

| กลุ่มตรวจ | ผล |
|---|---|
| Public health/DB and unauthenticated API rejection | ผ่าน |
| Five isolated QA accounts: initial password gate and password change API | ผ่าน |
| Requester creates ticket with real categories and systems | ผ่าน |
| RBAC: requester ownership isolation; requester/staff cannot use admin API | ผ่าน |
| Public comments and staff-only internal notes | ผ่าน |
| Attachment upload/download byte equality and cross-requester denial | ผ่าน |
| Staff assignment/actions/edit/resolve/close and requester/staff dashboard counters | ผ่าน |
| Administrator lists/creates/deactivates QA user; inactive login rejected | ผ่าน |
| Live login rate limit: five failures then 429; existing requester session unaffected | ผ่าน |
| Before redeploy: original sessions, closed ticket, actions, notes and attachment bytes survive | ผ่าน |
| After rollback to old image: original sessions, closed ticket, actions, notes and attachment bytes survive | ผ่าน |
| After redeploy current image: original sessions, closed ticket, actions, notes and attachment bytes survive | ผ่าน |
| Logout revokes original QA sessions | ผ่าน |

รอบ API หลักมี 13 กลุ่มตรวจ สร้าง ticket `TKT-2026-000011` และไฟล์ PNG ทดสอบ 68 bytes แล้วเปรียบเทียบไบต์/hash ก่อนและหลังเปลี่ยน revision โดยใช้ session tokens เดิม ไม่ login ใหม่

- [Rollback run 39608264898](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39608264898): เปลี่ยนไป image เดิม SHA `b744eed61413c380c188b5ee7d62b8ea2d402798`, revision `toktickit-00006-b5v`; session/ticket/actions/notes/attachment ผ่าน
- [คืน image ปัจจุบัน run 39608414237](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39608414237): SHA `5b504978dd1c60dca466eaa6e0bdc0e77bfe3951`, revision `toktickit-00007-kmg`; ตรวจข้อมูลและ token เดิมซ้ำผ่าน
- API rate limit: รหัสผิด 5 ครั้ง จากนั้นใช้รหัสถูกได้ 429; session requester คนอื่นยังใช้ได้ ไม่ยิงทดสอบกับบัญชีจริงของผู้ใช้
- บัญชี QA บังคับเปลี่ยนรหัสก่อนใช้ API งานจริง และ logout แล้ว token เดิมได้ 401

## Browser และปัญหาที่พบ

- Requester login → สร้าง ticket `TKT-2026-000013` → เปิด My Tickets/Details ผ่าน URL สาธารณะ
- Reload browser หลัง rollback และคืน image แล้วยังคง login และเห็น ticket `000011` / Actions Taken / attachment เดิม
- IT Staff เปิด dashboard/queue, บันทึก Action และแสดงผลได้; Admin เปิด dashboard/User Management และค้นหาบัญชี active/inactive ได้
- พบ blocker จริง 2 จุดจาก browser ที่ API happy path อย่างเดียวไม่พบ:
  1. IT Staff ไม่มีรายการ Assignee เพราะ client เรียก `/api/admin/users` แล้วได้รับ 403 แก้ด้วย `/api/assignees` เฉพาะ ITStaff/Admin คืนเพียง active eligible `id/name/role`; admin API ยังคงจำกัดเฉพาะ Admin
  2. บันทึก Action แล้ว Resolve ได้ 409 เพราะ client ใช้ `Ticket.updatedAt` เก่า แก้โดย refresh ticket details หลังบันทึก Action และปิด workflow selectors ระหว่างบันทึก โดยยังคงการตรวจ conflict จริงที่ backend

[PR #5](https://github.com/tikpoptv/Fullfunction_ToctikIT/pull/5) เพิ่ม regression tests ฝั่ง backend/frontend และ [CI 39609226201](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39609226201) ผ่านก่อน merge

สถานะ browser retest ของสองจุด: **ผ่านบนเว็บจริงหลัง Deploy แล้ว**

- [Auto Deploy รุ่นแก้ไข 39609562940](https://github.com/tikpoptv/Fullfunction_ToctikIT/actions/runs/39609562940) ใช้ main commit `caad4c11a31062848b16264e0de95b80616c69a5` และผ่าน CI/build/migration/deploy/smoke
- IT Staff เห็นรายชื่อ active staff/admin ใน Assignee dropdown เลือกตัวเองแล้ว Owner บน ticket เปลี่ยนจริง โดยไม่เพิ่มสิทธิ์เข้า admin API
- บันทึก Action ใหม่ใน ticket `000013` แล้วเลือก Resolved ต่อโดยไม่ reload browser ได้ข้อความ “Ticket status updated to Resolved.” จากนั้น Closed สำเร็จ มี Actions Taken 2 รายการ
- API หลังแพตช์ยืนยัน anonymous/requester อ่าน `/api/assignees` ไม่ได้, staff/admin อ่านได้โดยไม่เผยข้อมูลเกิน id/name/role และ IT Staff ยังถูกปฏิเสธ `/api/admin/users`
- การตรวจ concurrent update จริงยังทำงาน: API ที่ส่ง timestamp เก่าได้ 409 และส่งค่าที่ refresh แล้ว resolve/close ได้ ตรวจใน ticket QA `000014`

รายละเอียด JSON: `api-acceptance-result.json`, `post-fix-api-result.json`, `ui-acceptance-result.json` และ screenshot `ui-final-staff-flow.jpg` ในโฟลเดอร์หลักฐาน

## ขอบเขตผลตรวจ

ผลนี้ยืนยัน flow เดโมตามรายการด้านบน ไม่ใช่การรับรองทุกกรณีของแอป ไม่ได้ทดสอบโหลดทั้งห้อง, database outage/recovery หรือ rollback ข้าม destructive schema migration รอบนี้ไม่มี schema migration ใหม่ ภาพเก่าก่อน PR #5 ยังมี UI bugs สองจุดดังกล่าว การเลือก image สำหรับเดโม/rollback ครั้งต่อไปให้เลือกเวอร์ชันที่ผ่าน acceptance ล่าสุด

หลักฐานละเอียดที่เครื่องผู้ทดสอบ: `../output/gcp-student-eligibility-2026-10-21/acceptance/` ประกอบด้วย JSON ผล API, workflow และ screenshots โดยไม่มีรหัสผ่านหรือ session tokens ในรายงาน
