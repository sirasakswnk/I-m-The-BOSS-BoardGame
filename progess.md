# progess.md — บันทึกความคืบหน้า "โต๊ะเจรจาดีล"

> บันทึกผลการลงมือทำจริง เทียบกับ `plan.md` (ทำทีละ Milestone ตามหัวข้อ 10)
> อัปเดตล่าสุด: 20 ต.ค. 2026

## สถานะ Milestone

| Milestone | รายละเอียด | สถานะ |
| --- | --- | --- |
| M0 | Scaffold (Vite + React + TS + Tailwind + design tokens) | ✅ เสร็จ (20/10/2026) |
| M1 | Game Engine (pure TS + tests) | ⬜ ยังไม่เริ่ม |
| M2 | Firebase: Auth, Lobby, Presence, Home | ⬜ |
| M3 | Host Loop + Security Rules | ⬜ |
| M4 | Tabletop UI (Desktop) | ⬜ |
| M5 | Offers & Deal Flow | ⬜ |
| M6 | Action Cards & Interrupt Window | ⬜ |
| M7 | End of Turn & Game End | ⬜ |
| M8 | Mobile Responsive | ⬜ |
| M9 | Resilience, Polish, Deploy | ⬜ |

---

## M0 — Scaffold ✅ (20/10/2026)

### สิ่งที่ทำ

- ตั้งโปรเจกต์ **Vite + React 18 + TypeScript (strict)** + Tailwind CSS + PostCSS
- ติดตั้งครบตาม Tech Stack (หัวข้อ 2): `react-router-dom` v6, `zustand`, `framer-motion`, `lucide-react`, `firebase` (รอใช้ M2+), `@fontsource` (Kanit / Sarabun / IBM Plex Mono), Vitest, ESLint 9+ flat config, Prettier
- วาง **design tokens** จาก plan.md หัวข้อ 9.0 → `tailwind.config.ts` + `src/styles/global.css` (สี 6 ตระกูล, เงาแข็ง, รัศมี, ฟอนต์)
- `global.css`: ลาย halftone พื้นหลัง, paper grain (`.grain-overlay` — ใช้เฉพาะหน้าแรก/ล็อบบี้), ลายเส้นเฉียง (`.stripes`), `:focus-visible` วง accent, `prefers-reduced-motion`, ปุ่มกดจม 5px (`.btn`), หัวข้อสไตล์แสตมป์เอียง -2° (`.stamp`)
- คอมโพเนนต์พื้นฐานตาม M0: `Button` (54px, light/dark/gold, disabled opacity .55), `Panel`, `Chip`, `FamilyCard` (+ `FamilySymbol` วาด SVG เอง 6 รูปทรง) — ข้อความไทยทั้งหมดดึงจาก `src/i18n/th.ts`
- หน้า placeholder ภาษาไทยในธีมเดียวกัน: `Home` (`/`) และ `Room` (`/:code`) + routing ด้วย react-router v6
- Config พร้อม: `tsconfig` (strict + alias `@/*`), `eslint.config.js`, `.prettierrc`, `firebase.json` + emulator (auth 9099 / database 9000 / ui 4000), `.firebaserc`, `vercel.json` (SPA rewrite), `.env.example`, `.gitignore`, `public/favicon.svg`
- npm scripts ครบตามแผน + เสริม: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:rules`, `emulators`, `test:e2e`
- โครงโฟลเดอร์ตามหัวข้อ 11 ครบ (โฟลเดอร์ที่ยังว่างใส่ `.gitkeep` ไว้)

### ผลการตรวจสอบ (Definition of Done ของ M0)

| คำสั่ง | ผลลัพธ์ |
| --- | --- |
| `npm run typecheck` | ✅ ผ่าน (tsc ไม่มี error) |
| `npm run lint` | ✅ ผ่าน (eslint ไม่มี error/warning) |
| `npm run test` | ✅ ผ่าน 3/3 tests (`src/__tests__/app-config.test.ts`) |
| `npm run build` | ✅ ผ่าน — bundle 172.61 kB (gzip 57.33 kB), CSS 13.61 kB (gzip 3.84 kB) |
| `npm run dev` | ✅ บูตได้ — VITE v8.3.4 ready in 173 ms ที่ http://localhost:5173/ |

### เวอร์ชันที่ติดตั้งจริง (ณ วันนี้)

Node v24.20.0 (ตามหัวข้อ 12) | React 18.3.1 | react-router-dom 6.30.6 | firebase 13.0.0 | framer-motion 12.43.0 | zustand 5.0.15 | lucide-react 1.60.0 | vite 8.3.4 | vitest 5.0.5 | typescript 6.0.3 | tailwindcss 3.4.19 | eslint 10.13.0 | prettier 3.9.10 | @fontsource/* 5.3.0

### การตัดสินใจ / จุดที่ต่างจากแผน (รับทราบ)

1. **`design/home.html` ยังไม่มีในโปรเจกต์** → ดึง design tokens จากตารางหัวข้อ 9.0 ของ plan.md แทน (ค่าสี/เงา/รัศมี/ฟอนต์ครบตามตาราง) — เมื่อได้ไฟล์ต้นแบบจริง จะเทียบความเหมือนและปรับตอนพอร์ต `Home.tsx` ใน M2
2. เลือก **Tailwind CSS v3.4** (ตามแผนที่อ้างถึง `tailwind.config`) ไม่ใช่ v4
3. ใช้ **tsconfig ไฟล์เดียว** ไม่ใช้ project references — `typecheck` = `tsc --noEmit` (ง่ายกว่า ไม่กระทบแผน)
4. เพิ่มไฟล์เกินโครงในแผนเล็กน้อย: `src/ui/common/families.ts` (ข้อมูลตระกูลฝั่ง UI), `FamilySymbol.tsx`, `src/__tests__/app-config.test.ts`, `.firebaserc`, `public/favicon.svg`
5. `.firebaserc` ตั้ง `demo-im-the-boss-deal` (โหมด offline ของ Firebase CLI สำหรับรัน Emulator) — **ต้องเปลี่ยนเป็น Firebase project จริงก่อน Deploy (M9)**
6. `database.rules.json` ตอนนี้เป็น **deny-all ชั่วคราว** — กฎจริงตามหัวข้อ 6 ทำใน M3
7. ติดตั้ง `firebase`, `zustand`, `framer-motion` ไว้แล้วแต่ยังไม่ถูกเรียกใช้ใน M0 (เริ่มใช้ M2 เป็นต้นไป) — `lucide-react` ใช้แล้ว 1 ไอคอน (`Lock`)
8. ฟอนต์โหลดเฉพาะ subset **thai + latin** (ตามแผน) — IBM Plex Mono ไม่มี subset ไทย (ฟอนต์ไม่มี glyph ไทย) ใช้ latin (เพียงพอสำหรับรหัสห้อง/ตัวเลข) ส่วนข้อความไทยที่ใช้ mono จะ fallback ตามระบบ
9. **หมายเหตุเครื่อง dev (Windows):** PowerShell บล็อก `npm.ps1` (execution policy) — ใช้ `npm.cmd` แทนได้ปกติ (`npm run ...` ทุกคำสั่งยังใช้ได้เหมือนเดิมใน terminal อื่น) และ TypeScript 6 deprecate `baseUrl` จึงใช้ `paths` แบบไม่มี `baseUrl`

### ผล `npm audit` (บันทึกไว้ ยังไม่แก้)

- Production deps 6 รายการ (2 moderate / 4 high):
  - `@grpc/grpc-js` ผ่าน `firebase` (ใช้โดย **Firestore** เท่านั้น — โปรเจกต์นี้ใช้แค่ RTDB + Auth ไม่ได้ import Firestore; ระดับความเสี่ยงจริงต่ำ)
  - `react-router` 6.x (moderate: open-redirect/SSR hydration — โปรเจกต์นี้เป็น SPA ไม่มี SSR; แผนล็อก v6 ไว้ การแก้ต้องข้ามเป็น v7 ซึ่งเป็น breaking change)
- ตัวเลือกแก้ (`npm audit fix --force`) จะ **ดาวน์เกรด firebase ถึง v9 / อัป react-router เป็น v7** — ขัดกับแผน จึงยังไม่ทำ รอพิจารณาตอน M9

### งานค้าง / รอผู้ใช้

- [ ] วางไฟล์ต้นแบบ `design/home.html` (index.html ที่ให้มา) — ต้องใช้ตอนพอร์ตหน้าแรกใน M2
- [ ] ยืนยัน **Firebase project id จริง** เพื่อแทน demo project ใน `.firebaserc` (+ กรอก `.env.local` จาก `.env.example`)
- [ ] โดเมน Vercel (ยังไม่ตัดสินใจ — ต้องก่อน M9)
- [x] Push ไป GitHub — ✅ สำเร็จ (commit `1cd12ed` → branch `main`, ตั้ง `origin` = `https://github.com/sirasakswnk/I-m-The-BOSS-BoardGame.git` แล้ว)

### ขั้นถัดไป — M1 Game Engine (ไม่มี UI / ไม่มี Firebase)

- types + config ครบหัวข้อ 3: `families.ts`, `influenceCards.ts` (98 ใบ), `dealBoard.ts` (16 ช่อง), `dealTiles.ts` (15 แผ่น), `rules.ts`
- seeded RNG (mulberry32), deck builder, setup, validators, `applyAction`, `tick`, `project`
- ชุดเทสต์ตาม DoD M1: ข้อมูลกระดาน/การ์ด, กติกาทุกข้อ, simulation 200 เกม, `project()` ไม่รั่วข้อมูลลับ
- รายงานรายการ `ASSUMPTION` (หัวข้อ 3.6) ให้ผู้ใช้ตอนจบ M1
