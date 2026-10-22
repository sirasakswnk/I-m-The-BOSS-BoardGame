# โต๊ะเจรจาดีล (I'm the BOSS)

บอร์ดเกมต่อรองสำหรับเล่นกับเพื่อนผ่าน Discord 3–6 คน เปิดเว็บ ใส่ชื่อเล่น
แชร์รหัส 5 หลัก หรือลิงก์ห้อง แล้วเล่นได้ทันทีโดยไม่ต้องสมัครสมาชิก

- UI ภาษาไทยทั้งหมด ออกแบบให้ใช้ได้ทั้งเดสก์ท็อป แท็บเล็ต และมือถือ
- Firebase Anonymous Auth + Realtime Database (ไม่ต้องมีเซิร์ฟเวอร์หรือ Cloud Functions)
- เกมทำงานแบบ host-authoritative: host หนึ่งเครื่องรัน engine และเขียนสถานะที่ผ่านการตรวจสอบ
- ถ้า host ปิดแท็บ ผู้เล่นที่เชื่อมต่ออยู่จะรับช่วงเป็น host ภายในประมาณ 10–15 วินาที
- มีระบบขอคืนที่นั่งหลังเปลี่ยนเครื่อง/ล้างข้อมูลเบราว์เซอร์ โดยต้องให้ host อนุมัติ

## Production

เว็บจริง: **https://im-the-boss-boardgame.vercel.app**

Deploy อัตโนมัติจาก branch `main` ของ GitHub ผ่าน Vercel project
`im-the-boss-boardgame` (team `mingmings-projects-c4169f4b`)

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | Vite + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS + design tokens จาก `design/home.html` |
| State | Zustand + React hooks |
| Backend | Firebase Anonymous Auth + Realtime Database |
| Tests | Vitest, Firebase Emulator, Playwright |
| Deploy | Vercel (static SPA) + Firebase Security Rules |

## เริ่มพัฒนาในเครื่อง

ต้องมี Node.js 20 ขึ้นไป

```bash
npm install
cp .env.example .env.local
```

เติมค่า Firebase Web App ใน `.env.local` และเปิด emulator ระหว่างพัฒนา:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_EMULATORS=true
```

เปิด emulator (คนละ terminal):

```bash
npm run emulators
```

แล้วรันเว็บ:

```bash
npm run dev
```

> บน Windows ที่ PowerShell ปิดการรันสคริปต์ ให้ใช้ `npm.cmd run ...`
> แทน `npm run ...`

โหมด emulator ใช้ project demo `demo-im-the-boss-deal` และไม่แตะข้อมูล production
URL ของ Emulator UI คือ `http://localhost:4000`

## ตั้งค่า Firebase สำหรับ Production

1. สร้าง Firebase project และเปิด **Authentication → Sign-in method → Anonymous**
2. สร้าง **Realtime Database** (แนะนำ region `asia-southeast1`)
3. เพิ่ม Web App ใน Project settings แล้วคัดลอกค่า config ลง environment ของ Vercel
4. Deploy security rules จาก repo นี้:

```bash
firebase deploy --only database --project i-m-the-boss
```

`.firebaserc` ตั้ง default เป็น project demo สำหรับ emulator เท่านั้น
จึงต้องระบุ `--project i-m-the-boss` ตอน deploy จริง (หรือเพิ่ม alias ใน `.firebaserc`)

ถ้า sign-in บนโดเมน production ไม่สำเร็จ ให้เพิ่มโดเมน Vercel ใน
**Authentication → Settings → Authorized domains**

## Deploy บน Vercel

โปรเจกต์นี้เป็น SPA, build ด้วย Vite ไปที่ `dist` และมี `vercel.json` rewrite
ทุก path ไป `index.html` แล้ว

1. link repo/project:

```bash
vercel link
```

2. ตั้ง environment variables สำหรับ Production ให้ครบทั้ง 6 ตัว
   (`VITE_FIREBASE_*` และ `VITE_USE_EMULATORS=false`) ผ่าน Vercel Dashboard
   หรือ `vercel env add`
3. Deploy:

```bash
vercel --prod
```

ค่า `VITE_*` ถูกฝังตอน build ดังนั้นต้องตั้งค่าใน Vercel ก่อน build ทุกครั้ง
และห้ามตั้ง `VITE_USE_EMULATORS=true` ใน production

## คำสั่งตรวจคุณภาพ

```bash
npm run typecheck
npm run lint
npm run test
npm run test:rules
npm run build
```

E2E ต้องมี Firebase Emulator สำหรับ Auth + Database:

```bash
firebase emulators:exec --config firebase.emulator.json --only database,auth "npm run test:e2e"
```

บน Windows ใช้ `npm.cmd run test:e2e` ภายในคำสั่งข้างต้น

## โครงสร้างหลัก

```text
src/
  engine/          pure game engine + rules (ไม่รู้จัก React/Firebase)
  net/             Firebase services, host loop, migration, reclaim
  ui/              หน้าเว็บ คอมโพเนนต์โต๊ะเกม และโมดัล
  i18n/th.ts       ข้อความ UI ภาษาไทยทั้งหมด
  store/           Zustand stores
tests/rules/       Firebase Security Rules tests
e2e/               Playwright flows ด้วยหลาย browser context
database.rules.json
```

## ความปลอดภัยและข้อจำกัดที่ตั้งใจไว้

- **Host เห็นข้อมูลส่วนตัวได้**: `private/{uid}` อนุญาตให้เจ้าของและ host อ่าน
  เพราะ host เป็นผู้คำนวณและเขียนสถานะเกมจริง ผู้อื่นอ่านมือ/เงินของคนอื่นไม่ได้
  แต่ host ที่ดัดแปลงเบราว์เซอร์หรืออ่านฐานข้อมูลย่อมเห็นข้อมูลเหล่านี้ได้
  ระบบนี้จึงเหมาะกับกลุ่มเพื่อน ไม่ใช่การแข่งขันที่ต้องป้องกัน host โกง
- **Host migration เป็น client-side**: หลัง `meta/hostConnected = false` นาน 10 วินาที
  ผู้เล่นที่ connected และนั่งต่ำสุดจะ claim host ผ่าน transaction
  ถ้าทุกคนหลุดพร้อมกัน เกมจะหยุดจนมีคนกลับเข้ามา
- **Reclaim ต้องมีคนอนุมัติ**: ผู้เล่นใหม่ต้องเลือกที่นั่งที่ออฟไลน์และรอ host กดอนุมัติ
  ระหว่างรอสามารถยกเลิกคำขอได้
- **ห้องเก่า**: เมื่อสร้างห้องใหม่จากเบราว์เซอร์เดิม ระบบจะลบห้องล่าสุดของผู้นั้น
  ถ้าอายุเกิน 24 ชั่วโมงและไม่มีผู้เล่น connected อยู่ ห้องที่ยังมีคนเล่นจะไม่ถูกลบ
  และไม่มี scheduled job/Cloud Functions ในการล้างห้อง
- **Spark plan**: RTDB ฟรีมีข้อจำกัดประมาณ 100 concurrent connections,
  1 GB stored และ 10 GB/เดือน download เหมาะกับกลุ่มเพื่อนขนาดเล็ก
- **เสียง**: เอฟเฟกต์ใช้ Web Audio และปิดเป็นค่าเริ่มต้น ผู้ใช้เปิดได้จากปุ่มบนโต๊ะ
  เบราว์เซอร์อาจบล็อกเสียงจนกว่าจะมี user gesture
- **ไม่มี persistent account**: การล้าง IndexedDB/localStorage หรือเปลี่ยนเครื่อง
  จะได้ anonymous uid ใหม่ ต้องใช้ reclaim และ host อนุมัติเพื่อกลับที่นั่งเดิม
