# progess.md — บันทึกความคืบหน้า "โต๊ะเจรจาดีล"

> บันทึกผลการลงมือทำจริง เทียบกับ `plan.md` (ทำทีละ Milestone ตามหัวข้อ 10)
> อัปเดตล่าสุด: 20 ต.ค. 2026 (M4)

## สถานะ Milestone

| Milestone | รายละเอียด | สถานะ |
| --- | --- | --- |
| M0 | Scaffold (Vite + React + TS + Tailwind + design tokens) | ✅ เสร็จ (20/10/2026) |
| M1 | Game Engine (pure TS + tests) | ✅ เสร็จ (20/10/2026) |
| M2 | Firebase: Auth, Lobby, Presence, Home | ✅ เสร็จ (20/10/2026) |
| M3 | Host Loop + Security Rules | ✅ เสร็จ (20/10/2026) |
| M4 | Tabletop UI (Desktop) | ✅ เสร็จ (20/10/2026) |
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

1. ~~**`design/home.html` ยังไม่มีในโปรเจกต์** → ใช้ tokens จากตารางหัวข้อ 9.0 แทน~~ → **อัปเดต:** ได้รับต้นแบบแล้ว (20/10/2026) ย้ายไป `design/home.html` ตรวจแล้ว tokens ตรงกับต้นแบบ **ทุกค่า** และปรับรายละเอียดคอมโพเนนต์เพิ่มให้ตรงต้นแบบ (ดูหัวข้อ "อัปเดต M0 รอบ 2")
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

### อัปเดต M0 รอบ 2 (20/10/2026) — รับต้นแบบ `design/home.html` + ค่า `.env`

- ได้รับไฟล์ต้นแบบจากผู้ใช้ (วางไว้ที่รากชื่อ `home.html`) → **ย้ายไป `design/home.html` ตามแผนแล้ว** (ไฟล์นี้ห้ามแก้)
- **ตรวจเทียบ tokens ทั้งหมด: ตรงกับที่วางไว้ใน M0 ทุกค่า** (สี 15 ตัว, `--radius-card` 14px, panel 18px, ปุ่ม/input 12px, กระดาน 24px, เงา hard/press) — ไม่ต้องแก้ค่าสีใด ๆ
- ปรับรายละเอียดคอมโพเนนต์ให้ตรงต้นแบบเพิ่ม:
  - `.stamp` → ไฮไลต์คำในหัวเรื่อง (พื้น accent ตัวอักษรขาว ขอบ 3px เอียง -2° เหมือนคำ "บอส" ในต้นแบบ) + ปรับหน้า Home ให้ใช้ hero แบบเดียวกับต้นแบบ (หัวเรื่อง/lead/ชิป/แบรนด์มาร์ก 6 สี)
  - `.btn` → อักษร 18px, hover (light → gold, dark → #33304A), disabled มีเงา 2px, transition ตามต้นแบบ
  - halftone ปรับเป็น 1.2px/1.3px, grain overlay ตามต้นแบบ (opacity 0.18, noise ย้อมสี ขนาด 220, z 100), ลิงก์สี accent + hover `#1C3F94`
  - `FamilyCard` ตามต้นแบบ: กรอบขาวขอบ ink, หน้าการ์ดลายเฉียง, วงกลมสัญลักษณ์ขาวโปร่ง 0.92, ป้ายชื่อตระกูล (เหลืองใช้พื้นขาวโปร่ง+ตัวอักษร ink), ป้ายชื่อมุมบน/ล่าง (ซ่อนบนมือถือ), แถบริบบิ้น "ญาติ" เฉพาะการ์ดญาติ
  - `Chip` (15px น้ำหนัก 500 ตามต้นแบบ), `Panel` (padding 20×22), เพิ่ม `shadow-card` ใน tailwind config
- `.env` — ตรวจแล้ว: มีคีย์ครบทั้ง 5 ตัว และถูก `.gitignore` กันไว้ (ยืนยันด้วย `git check-ignore`)
- ผลตรวจซ้ำหลังปรับ: `typecheck` ✅ / `lint` ✅ / `test` ✅ 3/3 / `build` ✅ (CSS 15.15 kB gzip 4.28, JS 174.03 kB gzip 57.71)

### งานค้าง / รอผู้ใช้

- [x] วางไฟล์ต้นแบบ — ✅ ได้รับแล้ว (ย้ายไป `design/home.html`, tokens ตรงกันทั้งหมด — ดูหัวข้อ "อัปเดต M0 รอบ 2")
- [x] กรอกค่า Firebase ใน `.env` — ✅ ครบทั้ง 5 คีย์ และไม่หลุดขึ้น git
- [ ] Firebase project id จริงใน `.firebaserc` (ตอนนี้เป็น demo project) — ใช้ตอนรัน Emulator (M3) และ Deploy (M9)
- [ ] Deploy — ผู้ใช้เลือกทาง **GitHub** และจะ deploy ทีหลัง (รอสรุปวิธีตอน M9; ถ้าเป็น GitHub Pages ต้องปรับจาก `vercel.json`)
- [x] Push ไป GitHub — ✅ สำเร็จ (commit `1cd12ed` → branch `main`, ตั้ง `origin` = `https://github.com/sirasakswnk/I-m-The-BOSS-BoardGame.git` แล้ว)

## M1 — Game Engine ✅ (20/10/2026)

### สิ่งที่ทำ

- สร้าง `src/engine/` เป็น **pure TypeScript** ทั้งหมด — ไม่มี import React/Firebase/UI, ไม่แตะ DOM และไม่เรียก `Date.now()` ในลอจิก (รับ `now`/`at` จากผู้เรียก)
- **Config ตามหัวข้อ 3**
  - `config/families.ts` — 6 ตระกูลตาม `FAMILY_ORDER` (A–F), 3–6 ผู้เล่น
  - `config/influenceCards.ts` — การ์ด 98 ใบ: clan 24, travel 21 (18 + wild 3), recruitment 33, stop 10, imTheBoss 10 + type `ClanCard`
  - `config/dealBoard.ts` — กระดาน 16 ช่อง, กลุ่มสี/`pick`/`requiredInvestors`/`dividends` ตรง plan ทุกช่อง
  - `config/dealTiles.ts` — 15 แผ่น, `valuePerDividend` 2/3/4/5 ตามช่วงดีล, `endCheckFaces` ของ #10–#14, #15 `autoEnd`
  - `config/rules.ts` — `STARTING_MONEY=0`, `STARTING_HAND_SIZE=5`, `HAND_LIMIT=12`, `INTERRUPT_MS=5000`, `GRACE_MS=300`, `DEAL_TILE_COUNT=15`, `DRAW_COUNT=3`, `END_CHECK_FIRST_DEAL=10`, `HOST_CLOSE_BUFFER_MS=200`, log limits
- **RNG / deck** — mulberry32 เก็บ `rngState` ใน state (reproducible), `randomInt`/`shuffle`, deck 98 ใบ, จั่วจากบนสุด, reshuffle discard เมื่อเด็คหมด
- **Setup** — `createInitialState`, `startGame`: แจก investor ตามจำนวนผู้เล่น (3 คน = 2 คน, 4–6 คน = 1 คน), ที่เหลือเป็น `unclaimedInvestors`, แจกการ์ดคนละ 5, หา first player จาก investor ที่อยู่ใน `FAMILY_ORDER` ก่อน, ผู้เล่นทางขวาเลือกช่องเริ่ม (`SET_START_SPACE`)
- **Validators** — กติกาครบ: turn/space/card, offers (source/card/amount, `OFFER_SOURCE_MISMATCH`, `OFFER_ACCEPTED`), accept (required color, free participation, dividends), exclusions, travel/stop/recruitment targets, lock, `isDealComplete`
- **Reducer** — `applyAction` โคลน state, คืน `{ state, events }` หรือ `{ error }`; handlers ครบทุก action; `FAIL_DEAL`; `LOCK_DEAL` + interrupt window; resolve pending ตาม `ts` แล้ว `seq`; `imTheBoss` เปลี่ยนบอส; เงิน `dividends × valuePerDividend`; ส่งเทิร์นซ้าย; hand limit/discard; END_CHECK
- **Tick** — ปิด window ที่ `deadline + GRACE_MS + HOST_CLOSE_BUFFER_MS` (5.5 วินาที)
- **Endgame** — `runEndCheck` ตาม `endCheckFaces`, `finishGame` (finalScores + winners ร่วมเมื่อเงินเท่ากัน), rematch ผ่าน `REMATCH`
- **Projection** — `project(state, viewerUid)`: ซ่อนมือ/เงิน/deck/`cardId`, offers ตัดการ์ด, `bossClans` เป็นสี, pending ไม่มี `cards`; เปิดเงินเมื่อ `gameOver`; log สาธารณะ 50 รายการ
- **เทสต์ 10 ไฟล์ / 106 tests** — config, setup, turn, deal, cards, window, endgame, project, simulation 200 เกม + bot/invariants

### ผลการตรวจสอบ (Definition of Done ของ M1)

| คำสั่ง / รายการ | ผลลัพธ์ |
| --- | --- |
| `npm run typecheck` | ✅ ผ่าน (tsc ไม่มี error) |
| `npm run lint` | ✅ ผ่าน (eslint ไม่มี error/warning) |
| `npm run test` | ✅ ผ่าน **106/106 tests** (10 files) |
| Simulation 200 seeds | ✅ ไม่ throw, การ์ดครบ 98 ใบ, เงินรวมตรง `dealResolved.totalPaid`, จบเกม/ชนะร่วม/rematch ถูกต้อง |
| `npm run build` | ✅ ผ่าน — JS 174.03 kB (gzip 57.71 kB), CSS 15.43 kB (gzip 4.36 kB) |

**ตรวจตาม DoD M1 แล้ว:**

- seeded RNG, deck 98, setup 3–6 คน, first player, movement, validators, `applyAction`, `tick`, `project`
- `isDealComplete` เทสต์ช่อง 4, 7, 12, 14 (รวมกลุ่มเดียวและหลายกลุ่ม)
- overfill/exclusions, lock + interrupt window, เงิน `dividends × valuePerDividend`, `FAIL_DEAL`
- travel / recruitment (`onVacation` คงอยู่หลังถูก recruit) / `imTheBoss` / stop / pending ตามลำดับ `ts` + `seq`
- hand limit 12, END_CHECK 10–15, เงินเท่ากันชนะร่วม, project privacy (ไม่รั่วมือ/เงิน/deck/การ์ด)
- pending target หายก่อน resolve → fizzle (`cardFizzled`) ไม่ throw

### การตัดสินใจ / ASSUMPTION (หัวข้อ 3.6)

1. **เพิ่ม action `SET_EXCLUDED_COLORS`** — plan ไม่มี action นี้ แต่จำเป็นเมื่อบอสเปลี่ยนกลางดีลแล้วนักลงทุนบอสใหม่ overfill กลุ่ม ใช้ได้ระหว่าง `dealOpen` และต้องไม่ล็อก/ไม่เปิด window; exclusion ต้องเป็นสีของบอสในกลุ่มที่ overfill จริง และหลังหักแล้ว auto-join ต่อกลุ่มต้อง ≤ `pick`; นักลงทุน `onVacation` ไม่ auto-join — ฝ่าฝืน reject `INVALID_EXCLUSION`
2. **Stop** — ทิ้งการ์ดทันที, mark `stoppedBy` ทันที, reset deadline และ stopper เป็น `triggeredBy`; ผลของ target เป็นโมฆะเมื่อ window ปิด; stop หนึ่งใบหยุด pending ได้หนึ่งรายการ
3. **`imTheBoss`** — clan ที่บอสใหม่วางไว้กลายเป็น `bossClanCards` ฟรีถ้าสีจำเป็น; นักลงทุนบอสเดิม → table offer amount 1; clan บอสเดิม → hand offer amount 1; ล้าง accepted/exclusions/lock; บอสใหม่ต้องแก้ overfill เองด้วย `SET_EXCLUDED_COLORS`
4. **Pending target หายก่อน resolve** — fizzle (`cardFizzled`) และการ์ดที่ใช้ยังถูกทิ้ง; ผลของ target ไม่ย้อนหลัง (เช่น travel หลัง recruitment ที่ย้าย investor ไปแล้ว)
5. **ตัวแทนสีซ้ำ** — boss investor + clan ของสีเดียวกันยุบเป็นสีเดียว; ตอน resolve investor บอสมีสิทธิ์เหนือ clan, clan ที่ไม่ใช้คืนมือ; ถ้ามี accepted offer สีนั้น clan ของบอสคืนมือ
6. **Recruitment + onVacation** — investor ที่ถูก recruit ยัง `onVacation`; ถ้าบอส recruit investor ที่ vacationing และมี accepted offer สีนั้นอยู่ ให้เก็บ offer ไว้ (investor ไม่ free จึงไม่ควรลบตัวแทน)
7. **Offer update** — แก้ได้เฉพาะ `amount`; `source`/`card` ต้องเดิม; offer ที่ accept แล้วแก้ไม่ได้; accept ซ้ำ reject `OFFER_ACCEPTED` แต่เปลี่ยน target ที่ accept แทนได้ถ้า dividends ยังพอ
8. **Boss clan** — บอสวาง clan สีที่ตัวเองถือ investor ไม่ได้ เว้นแต่ investor สีนั้น `onVacation`; accept offer สีที่มี free participation อยู่แล้วไม่ได้
9. **Host-only / leave** — `SKIP_DISCONNECTED_BOSS`, `REASSIGN_SEAT`, `REMATCH` เป็นสิทธิ์ host ที่ room layer (M3) ไม่ใช่ engine; `LEAVE` ได้เฉพาะ lobby (ห้ามออกถาวรกลางเกม); `REASSIGN_SEAT` ย้ายไปที่นั่งว่างเท่านั้น (ไม่สลับที่นั่ง)
10. **เวลา** — ไม่มีเวลาจำกัดช่วงเจรจา; เฉพาะ interrupt window 5,000 ms + grace 300 ms + host buffer 200 ms; action หลัง `deadline + GRACE_MS` reject `TOO_LATE`
11. **เงิน/เสมอ** — บอสได้ `(dividends − Σaccepted.amount) × valuePerDividend`, ผู้เสนอได้ `amount × valuePerDividend`; รวมเท่า `dividends × valuePerDividend`; เงินเท่ากันชนะร่วม; `dealResolved` มี `totalPaid`
12. **Reject reasons ใหม่** — `INVALID_EXCLUSION`, `OFFER_ACCEPTED` (accept offer เดิมซ้ำ), `OFFER_SOURCE_MISMATCH` (นอกเหนือจากชุดใน plan)

### จุดที่ต่างจากแผน (รับทราบ)

- เพิ่ม type `ClanCard`, `DealState.bossClanCards`, `OfferState.card`/`ValidatedOffer.card` และ event `cardResolved`/`cardFizzled`/`bossStolen`/`dealUnlocked`
- เพิ่ม action `SET_EXCLUDED_COLORS` (ข้อ 1 ด้านบน) — ยังไม่แตะ UI/ Firebase
- `dealResolved` เก็บ `dividends`, `valuePerDividend`, `bossDividends` (จำนวน ไม่ใช่เงิน), `accepted`, `totalPaid` (ไม่มี `bossPaid`)
- ไฟล์เทสต์เสริม: `helpers.ts`, `bot.ts`, `simulation.test.ts` (ไม่ได้ระบุชื่อใน plan แต่จำเป็นต่อ DoD)
- `test:rules` จะเริ่มใช้จริงตอน M3 — M1 ยังไม่มี security rules ให้ทดสอบ

### งานค้าง / รอผู้ใช้

- [ ] Firebase project id จริงใน `.firebaserc` (ตอนนี้เป็น demo project) — ใช้ตอน Emulator (M3) และ Deploy (M9)
- [ ] สรุปวิธี Deploy/โดเมน (GitHub Pages หรือ Vercel) ตอน M9
- [x] Engine M1 ผ่าน DoD ครบ — ไม่มี bug ค้างที่ทราบ

### ขั้นถัดไป — M2 Firebase: Auth, Lobby, Presence, Home

- Firebase Anonymous Auth + สร้าง/เข้าร่วมห้องด้วยรหัส 5 หลัก (ไม่ขึ้นต้นด้วย 0)
- Lobby: join/leave/seat/reassign, presence ด้วย `onDisconnect`, sync ผ่าน RTDB
- หน้า Home/Room ตาม `design/home.html` + ข้อความจาก `src/i18n/th.ts`
- ยังใช้ `database.rules.json` แบบ deny-all ชั่วคราว; กฎจริง + host loop อยู่ใน M3

---

## M2 — Firebase: Auth, Lobby, Presence, Home ✅ (20/10/2026)

### สิ่งที่ทำ

- **Firebase/Auth** — `src/net/firebase.ts` initializes Firebase lazily (อ่าน env ตอนเรียกครั้งแรก), ตรวจว่ามีครบ 5 คีย์, ใช้ Anonymous Auth ร่วมกันผ่าน promise เดียว, และเชื่อม Emulator เฉพาะ `import.meta.env.DEV && VITE_USE_EMULATORS === 'true'` (production build จึงไม่ต่อ Emulator แม้ `.env.local` จะเปิด flag)
- **Room code / nickname** — `src/net/roomCode.ts`: รหัส 5 หลัก `10000–99999` (ไม่ขึ้นต้นด้วย 0), สุ่มด้วย `crypto.getRandomValues` + rejection sampling, normalize ชื่อ (trim/ยุบช่องว่าง), จำกัด 16 ตัวอักษร, เติม ` 2`, ` 3` แบบ case-insensitive เมื่อชื่อซ้ำ, และเลือกที่นั่งว่างต่ำสุด
- **Room service** — `src/net/rooms.ts`: `createRoom`, `joinRoom`, `leaveRoom`, `peekRoom`, `subscribeRoom`, `ensurePresence`, `markRoomOffline`, `findRejoinRoom`, `getRoomUrl`, `copyText` + `RoomServiceError` ที่ map เป็นรหัสข้อความใน `th.errors`
- **Persistence/state** — `storage.ts` เก็บ `lastNickname`/`lastRoomCode`; `roomStore.ts` เก็บ uid, auth state, snapshot `meta`/`players`; `uiStore.ts` + `Toast` สำหรับข้อความแจ้งผล; `useAnonymousAuth` และ `useRoom` ผูก Firebase กับ React
- **Home** — port จาก `design/home.html`: สร้างห้อง, join ด้วยรหัส, preview ชื่อจริง/ชื่อซ้ำ/ห้องเต็ม/เริ่มแล้ว/จบแล้ว/เป็นสมาชิกอยู่แล้ว, banner “ห้อง … ยังรอ …” สำหรับกลับเข้าโต๊ะ, prefill `?room={code}`, ปุ่ม copy/status ต่าง ๆ และแจ้ง error ผ่าน toast
- **Room/Lobby** — ผู้เล่น 6 ที่นั่ง + สถานะ online/offline, ป้ายเจ้าของห้อง/“คุณ”, ชวนเพื่อนด้วยรหัสและลิงก์ `/{code}`, copy link, leave (host โอนให้ผู้เล่น connected ที่นั่งต่ำสุด; คนสุดท้ายออกแล้วลบห้อง), หน้า join จาก invite link, และ status pages: loading / invalid code / not found / full / playing / finished / error
- **Start game** — แสดงปุ่ม “เริ่มเกม” พร้อมเงื่อนไข 3–6 คน แต่ยังไม่เริ่มจริง (disable/hint) เพราะ host loop อยู่ใน M3
- **UI/i18n/theme** — เพิ่ม `Brand`, `TextInput`, `Pawn`, `Toast`; ขยาย `th.ts` ครบทุกข้อความ UI; เพิ่ม `.text-input`, `.field-label`, `.fan`, `.track`, `.toast` ใน `global.css`; ทุกข้อความ UI ยังอยู่ใน `src/i18n/th.ts`
- **Emulator/test setup** — `firebase.emulator.json` (auth 9099 / database 9000 / ui 4000) + `database.rules.emulator.json` แบบ permissive สำหรับ dev เท่านั้น; `npm run emulators` ใช้ config นี้; `.env.example` เพิ่ม `VITE_USE_EMULATORS=false`; `.env.local` (gitignored) เปิด flag ระหว่างทดสอบ
- **Playwright** — เพิ่ม `@playwright/test` + `playwright.config.ts` + `e2e/lobby.spec.ts` (2 tests) เพื่อตรวจ DoD M2 จริงในเบราว์เซอร์ Chrome

### ผลการตรวจสอบ (Definition of Done ของ M2)

| คำสั่ง / รายการ | ผลลัพธ์ |
| --- | --- |
| `npm run typecheck` | ✅ ผ่าน (รวม `e2e` + `playwright.config.ts` แล้ว) |
| `npm run lint` | ✅ ผ่าน (ไม่มี error/warning) |
| `npm run test` | ✅ ผ่าน **114/114 tests** (11 files) |
| `npm run test:e2e` | ✅ ผ่าน **2/2 tests** (Chrome, ใช้ Firebase Emulator) |
| `npm run build` | ✅ ผ่าน — JS 446.18 kB (gzip 137.11 kB), CSS 24.72 kB (gzip 6.26 kB) |
| ตรวจภาพ desktop 1440px / mobile 390px | ✅ Home, join view และ lobby เรียงตัวถูก, ไม่มี overflow แนวนอน |

**ตรวจตาม DoD M2 แล้ว:**

- เปิด 3 browser contexts (anonymous uid คนละคน) เข้าห้องเดียวกันได้ — ผ่านใน e2e
- refresh แล้วกลับที่นั่งเดิม (Firebase Auth persistence + uid เดิม) — ผ่านใน e2e
- ปิดแท็บแล้วอีกฝั่งเห็นเป็น offline ผ่าน `onDisconnect` — ผ่านใน e2e
- ชื่อซ้ำถูกต่อท้าย ` 2` ทั้งใน preview ก่อน join และชื่อจริงหลัง join — ผ่านใน e2e
- host ออกจาก lobby คนสุดท้าย → ลบห้อง และเปิดรหัสเดิมแล้วเห็น “ไม่พบห้องนี้” — ผ่านใน e2e
- กลับหน้าแรกแล้วมี banner กลับเข้าโต๊ะ พร้อมรหัสห้อง — ผ่านใน e2e
- join จาก invite link `/{code}` และ copy invite link ลง clipboard — ผ่านใน e2e

### การตัดสินใจ / ASSUMPTION (M2)

1. **รหัสห้อง** — 5 หลักและไม่ขึ้นต้นด้วย 0 ตาม plan; ใช้ crypto + rejection sampling; createRoom retry สูงสุด 10 ครั้งถ้า transaction ชนรหัส (`CODE_RETRY`)
2. **ชื่อซ้ำ** — เติม ` 2`, ` 3`, … โดยเทียบแบบ case-insensitive และตัด stem ให้ชื่อสุดท้ายไม่เกิน 16 ตัวอักษร; Home preview ใช้ `dedupeNickname` ตัวเดียวกับ service เพื่อให้เห็นชื่อจริงก่อนกด join
3. **Invite link** — ใช้ path `/{code}` (ไม่ใช้ query) และอ่าน `?room={code}` เป็น prefill บน Home; `getRoomUrl` เคารพ `BASE_URL` เพื่อรองรับ deploy แบบ subpath ใน M9
4. **Data exposure** — M2 อ่านเฉพาะ `rooms/{code}/meta` และ `rooms/{code}/players`; ไม่แตะ `private` หรือ `hostState` (ยังไม่มีใน M2) และ projection ของเกมจะเริ่ม M3
5. **Host transfer** — host ออกจาก lobby แล้วโอนให้ผู้เล่นที่ connected ก่อน; ถ้าไม่มี connected เลยให้ที่นั่งต่ำสุด; ถ้าไม่มีใครเหลือให้ลบ `rooms/{code}` ทั้งห้อง
6. **Start game** — ปุ่มเริ่มเกมยังไม่ทำงานจริงใน M2 (disabled เมื่อยังไม่ครบ 3 คน; เมื่อครบแล้วกดได้แต่แจ้งว่ารอ M3); ไม่มี host loop/state machine ของเกมใน M2
7. **Presence** — `ensurePresence` ลงทะเบียน `onDisconnect` (connected=false, lastSeen=serverTimestamp) และ cleanup ตอนออกจากหน้าแบบ debounce 150 ms เพื่อไม่ให้ React StrictMode ยกเลิก handler ที่เพิ่งลงทะเบียน; เป็น best-effort ถ้าเน็ตขาดจะฟื้นเมื่อกลับเข้า room
8. **Host ที่ offline** — M2 ยังไม่ auto-migrate host เมื่อ host หลุด; แสดงป้าย host offline และให้ host กลับมาเอง (auto-migrate/host-only skip อยู่ใน M3/M9)
9. **Leave** — leave ได้เฉพาะ lobby; host ที่ออกก่อนจะโอนสิทธิ์; ผู้เล่นทั่วไปลบเฉพาะ record ของตัวเอง; การออกกลางเกมจะล็อกใน M3+
10. **Production rules** — `database.rules.json` ยังเป็น deny-all; `database.rules.emulator.json` เปิดกว้างเฉพาะ Emulator. M3 ต้องเขียน rules จริงและเพิ่ม `test:rules` ครอบคลุม create/join/leave/host-transfer/root-delete และกันการแย่งที่นั่ง
11. **Project binding** — `.firebaserc` ยังเป็น `demo-im-the-boss-deal` สำหรับ Emulator แต่ `.env` ชี้ project `i-m-the-boss`; ก่อน deploy ต้องตัดสินใจ/ผูก project จริงและเปิด Anonymous Auth ใน Firebase Console (M3/M9)
12. **Playwright ก่อนกำหนด** — ติดตั้ง `@playwright/test` ตั้งแต่ M2 เพื่อใช้ตรวจ DoD (แผนเดิมระบุ M5); `test:e2e` ต้องรัน `npm run emulators` ไว้อีก terminal เพราะ Playwright start เฉพาะ Vite dev server

### งานค้าง / ความเสี่ยงที่รับรู้

- [ ] M3: host loop, `private`/`hostState`, security rules จริง + `test:rules`, เริ่มเกมจาก lobby
- [ ] M3 rules ต้องอนุญาต self-delete ตอน leave, host transfer, root delete และจัดการ race ของการ join พร้อมกัน (M2 ใช้ read-then-set; ยังไม่ transactional ทุกกรณี)
- [ ] ตัดสินใจ Firebase project จริง + เปิด Anonymous Auth สำหรับ production
- [ ] Bundle โตขึ้นเป็น ~446 kB เพราะ Firebase SDK — พิจารณา code-split/optimize ตอน M9
- [ ] Host offline auto-migration / host-only recovery controls ตาม plan M3/M9

## M3 — Host Loop + Security Rules ✅ (20/10/2026)

### สิ่งที่ทำ

- **Host loop** — `src/net/host/hostLoop.ts` écoute `rooms/{code}/actions`, queue actions, เรียก engine `applyAction`/`tick`, เขียน `public`, `private/{uid}`, `hostState` ด้วย multi-path update, ลบ action ที่ประมวลผลแล้ว และเขียน rejection ไปที่ `public/rejections/{uid}`
- **Start game** — host ใช้ transaction เปลี่ยน `meta/status` จาก `lobby` → `playing` ก่อนอ่านรายชื่อ เพื่อ freeze สมาชิก lobby กันคน join/leave แข่งกับจังหวะเริ่ม, กัน start ซ้ำ, แล้วสร้าง `FullGameState` จากผู้เล่นเรียงตาม `joinedAt`, แจกไพ่/เขียน projection ให้ทุกคน
- **Host authorization** — บังคับ host-only สำหรับ `START_GAME`, `SKIP_DISCONNECTED_BOSS`, `REMATCH`, `REASSIGN_SEAT`; engine ยังคง pure และไม่รู้จัก Firebase
- **Server clock** — `src/net/clock.ts` sync `.info/serverTimeOffset` เพื่อใช้ deadline ของ interrupt window (เตรียมต่อ M6)
- **RTDB normalization** — `src/net/gameState.ts` เติม empty arrays/objects ที่ Realtime Database ตัดทิ้ง (เช่น `closedSpaces: []`, `deal: null`) ก่อนส่งเข้า engine/UI
- **Minimal in-game view** — `src/ui/pages/GameRoom.tsx` แสดงเฟส, บอส, ดีลที่ปิด, หมาก, กองจั่ว/กองทิ้ง, ผู้เล่น, นักลงทุน, จำนวนการ์ด, ไพ่และเงินเฉพาะตัวเอง และตัวเลือกช่องเริ่มต้น 1–16
- **Security rules** — `database.rules.json` ใช้จริง: meta/players อ่านได้เมื่อ auth, public อ่านได้เฉพาะสมาชิก, private อ่านได้เฉพาะเจ้าของ/host, hostState เฉพาะ host, actions เขียนได้เฉพาะ self และ host เท่านั้นที่อ่าน/ลบได้; รองรับ create/join/leave, presence, host transfer, room deletion
- **Rules tests** — `tests/rules/security.test.ts` 12 tests ครอบคลุม auth, lobby create/join, presence, host ownership, game status, public/private/hostState, actions และ room deletion
- **E2E** — เพิ่ม test เริ่มเกม 3 คน, ตรวจว่าทุกคนเห็นไพ่ 5 ใบของตัวเอง, ตรวจ privacy note และเลือกช่องเริ่มต้นแล้วทุกคนเห็น phase เปลี่ยนเป็น `turnStart`
- **Emulator** — `firebase.emulator.json` เปลี่ยนมาใช้ `database.rules.json` จริง; ลบ `database.rules.emulator.json` แบบ permissive ที่ไม่ใช้แล้ว
- **Progress** — อัปเดต `progess.md` เป็น M3

### ไฟล์ที่สร้าง/แก้

- `src/net/host/hostLoop.ts` — host loop, action queue, start game, projection writes, rejection, tick
- `src/net/useHostLoop.ts` — React hook สำหรับเปิด/ปิด host loop ตามเจ้าของห้อง
- `src/net/actions.ts` — `sendAction`/`sendStartGame` เขียน action พร้อม uid และ server timestamp
- `src/net/clock.ts` — server time offset จาก RTDB
- `src/net/gameState.ts` — normalize `hostState`/`public`/`private` หลังอ่านจาก RTDB
- `src/net/gameTypes.ts` — types ของ stored action, rejection และ snapshot
- `src/net/useGameState.ts` — subscribe public, private ของตัวเอง และ rejection feedback
- `src/ui/pages/GameRoom.tsx` — หน้าจอเกมขั้นต้นสำหรับ M3
- `src/ui/pages/Room.tsx` — เปิด host loop, game state, start button จริง และแสดง GameRoom
- `src/i18n/th.ts` — ข้อความเกม, การ์ด, rejection reasons และสถานะเริ่มเกม
- `src/net/rooms.ts` — export `asRoomError` ให้ชั้น action/game ใช้ mapping เดียวกัน
- `database.rules.json` — security rules จริงสำหรับ M3
- `tests/rules/security.test.ts` — rules tests 12 tests
- `e2e/lobby.spec.ts` — เพิ่ม e2e เริ่มเกม/ไพ่ส่วนตัว/เลือกช่องเริ่มต้น
- `firebase.emulator.json` — ใช้ production rules ใน emulator
- `vitest.rules.config.ts`, `package.json`, `package-lock.json` — rules test config และ `@firebase/rules-unit-testing` (dev dependency)
- `src/ui/pages/Home.tsx`, `src/ui/common/FamilyCard.tsx` — งานปรับการ์ดหน้า Home ที่ค้างจาก M2 (ชื่อตระกูลสีขาวทั้งหมด, เอา ribbon “ญาติ” ออกจาก fan) รวมใน commit M3

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน 114/114 tests (11 files)
- `npm run test:rules`: ผ่าน 12/12 tests
- `npm run build`: ผ่าน — JS 507.38 kB (gzip 153.77 kB), CSS 26.44 kB (gzip 6.52 kB); มี warning bundle ใหญ่กว่า 500 kB
- e2e (รันผ่าน `firebase emulators:exec --config firebase.emulator.json --only database,auth "npm.cmd run test:e2e"`): ผ่าน 3/3 tests

### Definition of Done (M3)

- [x] rules tests ผ่านทั้งหมด (12/12)
- [x] ผู้เล่น 3 คนเริ่มเกมจาก lobby ได้จริง
- [x] ทุกคนเห็นไพ่ในมือของตัวเอง 5 ใบ และ UI/DB แยก private ตาม uid
- [x] DevTools/rules ป้องกันการอ่าน `private` ของคนอื่น (host อ่านได้ตาม authoritative design)
- [x] host loop เขียน state/projection และลบ action หลังประมวลผล
- [x] rejection feedback ไปที่ `public/rejections/{uid}`
- [x] e2e เริ่มเกม + เลือกช่องเริ่มต้นผ่าน

### ASSUMPTION / ปัญหา / สิ่งที่ต้องให้ผู้ใช้ตัดสินใจ

- **RTDB rules ไม่มี `numChildren()`/`size()`** จึงบังคับเพดาน 6 คนและ seat uniqueness ใน rules โดยตรงไม่ได้; ตอนนี้ `rooms.ts` เป็นผู้บังคับเพดาน และ rules ตรวจแค่ seat อยู่ 0–5. ถ้าต้องการบังคับที่ rules จริง ๆ ต้องเปลี่ยน schema เป็น seat slots หรือใช้ Cloud Function
- **Empty arrays/objects** — RTDB ตัด `[]`/`{}` ทิ้ง จึงต้อง normalize ก่อนใช้ engine/UI; ถ้าเพิ่ม field ใหม่ใน state ต้องอัปเดต `gameState.ts` ด้วย
- **Host เป็นผู้เขียน private ของทุกคน** — ผู้เล่นอื่นอ่าน private คนอื่นไม่ได้ แต่ host อ่านได้ตาม authoritative design; ไม่มี server-side secret ต่อ host
- **`public/rejections`** อยู่ใต้ `public` ที่สมาชิกทุกคนอ่านได้; rejection ไม่ใช่ข้อมูลลับ จึงยอมรับได้ใน M3
- **Dependency เพิ่ม** — `@firebase/rules-unit-testing` เป็น dev dependency สำหรับ Firebase Emulator rules tests; ไม่ได้อยู่ใน runtime bundle
- **E2E command** — `npm run test:e2e` ยังต้องมี emulator รันอยู่; การรันที่ใช้ตรวจ M3 ห่อด้วย `firebase emulators:exec` เพื่อให้ start/stop อัตโนมัติ
- **M3 UI ยังเป็นขั้นต้น** — โต๊ะเกมเต็มรูปแบบ, board 16 ช่อง, hand/seat/log และ interaction หลักเป็นงาน M4

### ขั้นถัดไป

Milestone ถัดไปคือ M4 (Tabletop UI — Desktop) — รอคำสั่ง

---

## M4 — Tabletop UI (Desktop) ✅ (20/10/2026)

### สิ่งที่ทำ

- เปลี่ยน `GameRoom` จากหน้าจอเริ่มเกมแบบง่ายเป็น **โต๊ะเจรจาเต็มรูปแบบ** ตามภาษาภาพของ `table.html` โดยซ่อน header ของห้องระหว่าง `playing` และใช้ top bar ของโต๊ะแทน
- สร้างคอมโพเนนต์ใต้ `src/ui/table/` แยกความรับผิดชอบ: `TableScreen`, `TableTopBar`, `DealBoard`, `DealPanel`, `TableSeat`, `HandFan`, `GameLog`, `TableBits` และ helper บริสุทธิ์ใน `tableUtils.ts`
- **กระดาน 16 ช่อง** แสดงหมายเลข, เงินปันผล, กลุ่มนักลงทุนที่ต้องการ, สีประจำช่อง, ช่องที่ปิดแล้วพร้อมเลขแผ่นดีล, ช่องปัจจุบัน, หมาก และ tooltip บน hover/focus
- **ที่นั่ง 4–6 คน** หมุนตามผู้เล่นท้องถิ่น (ซ้าย/บน/ขวา) แสดงเงิน, นักลงทุน, สถานะพักร้อน, จำนวนการ์ดคว่ำ, host, boss และสถานะออนไลน์/ออฟไลน์
- **มือผู้เล่น** เป็น fan การ์ดพร้อม hover/ลูกศรซ้าย–ขวา, ช่องการ์ด 12 ใบ และแสดงการ์ด 5 ชนิด: ญาติ, ส่งไปพักร้อน, ซื้อตัวนักลงทุน, หยุด!, แย่งเป็นบอส รวมถึงการ์ด wild และพื้นหน้านักลงทุนบนที่นั่ง
- **แผงดีลปัจจุบัน** แสดงช่อง, มูลค่า, เงินปันผล, ส่วนแบ่ง, เงื่อนไขกลุ่ม, สถานะครบ/ขาด, ผู้เข้าร่วม, ข้อเสนอที่ถูกตอบรับ และปุ่มเปิด/ล้มดีล
- **ตัวเลือกตระกูลเกินเงื่อนไข (overfill)** เป็น chip ในแผงดีล; ปุ่มเปิดดีลจะเปิดได้เมื่อเลือกตระกูลที่จะกันออกครบตามที่ engine ต้องใช้ และส่ง `excludeColors` ไปกับ `OPEN_DEAL`
- **ทอยเต๋า/เดินหมาก/จั่ว 3 ใบ** ทำงานกับ engine จริงผ่าน `ROLL_DICE` และ `DRAW_CARDS`; เมื่อจั่วเสร็จ engine จบเทิร์นทันทีตามกติกา
- **ตัวเลือกช่องเริ่มต้น** ใช้ร่วมกับ flow เริ่มเกมเดิม; ผู้เล่นที่ไม่ใช่ผู้เลือกจะเห็นสถานะรอ
- **บันทึกเกม** แปลง event จาก engine เป็นข้อความไทยและแสดงรายการล่าสุด
- เพิ่ม **preview states จาก engine จริง** (seed 66): `ต้นเทิร์น`, `เปิดดีล`, `หลังทอยเต๋า` พร้อมสลับ state; ปุ่มใน preview แสดง toast แบบไม่เขียน Firebase
- เพิ่ม responsive fallback สำหรับช่วง 1024–1180px และหน้าจอแคบกว่า 1024px; งาน mobile polish ยังอยู่ใน M8
- เพิ่ม unit tests ของ table helper และ e2e ของโต๊ะจริง

### ไฟล์หลัก

- `src/ui/table/TableScreen.tsx`, `DealBoard.tsx`, `DealPanel.tsx`, `TableSeat.tsx`, `HandFan.tsx`, `GameLog.tsx`, `TableTopBar.tsx`, `TableBits.tsx`
- `src/ui/table/tableUtils.ts`, `tableUtils.test.ts`, `gameLogFormat.ts`
- `src/ui/pages/GameRoom.tsx`, `Room.tsx`, `Preview.tsx`
- `src/styles/global.css`, `src/i18n/th.ts`
- `e2e/table.spec.ts`, `e2e/preview.spec.ts`
- `review/m4/01-start-space.jpg`, `02-turn-start.jpg`, `03-after-move.jpg`, `04-deal-open.jpg`, `05-card-faces.jpg`

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน 126/126 tests (12 files)
- `npm run test:rules`: ผ่าน 12/12 tests
- `npm run build`: ผ่าน; มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- e2e ผ่าน `firebase emulators:exec --config firebase.emulator.json --only database,auth "npm.cmd run test:e2e"`: **6/6 tests** ครอบคลุม lobby/start game, preview ทุกหน้าจอ, เทิร์นว่าง (เปิดดีล → ล้มดีล) และเทิร์นทอยเต๋า → จั่ว 3 ใบ
- ตรวจภาพที่ 1440px และทดสอบ layout ที่ 1280/1024px

### Definition of Done (M4)

- [x] โต๊ะเกม desktop ใช้ภาษาภาพเดียวกับ `table.html`
- [x] กระดาน 16 ช่องพร้อมช่องปิด/ช่องปัจจุบัน/หมาก/เงื่อนไขและเงินปันผล
- [x] ที่นั่งผู้เล่นหมุนตามตัวเอง แสดงเงิน นักลงทุน สถานะพักร้อน และการ์ดคว่ำ
- [x] มือของผู้เล่นเห็นเฉพาะตัวเอง พร้อมการ์ดครบ 5 ชนิดและการ์ดนักลงทุน
- [x] แผงดีลปัจจุบัน + บันทึกเกม + top bar แสดงเฟส/เทิร์น/ดีลที่ปิด/บอส
- [x] ผู้เล่นเลือกช่องเริ่มต้นและเห็นการอัปเดตของโต๊ะ
- [x] ทอยเต๋า → เดินหมาก → เปิดดีล/จั่ว 3 ใบ ทำงานผ่าน UI จริง
- [x] เทิร์นว่าง: เปิดดีลแล้วล้มดีลและจบเทิร์นผ่าน UI จริง
- [x] มี screenshot ของหน้าจอหลักให้ตรวจก่อนเริ่ม M5
- [x] ไม่แก้ไฟล์ prototype (`design/home.html`, `table.html`, `lobby.html`)
- [x] ไม่เปลี่ยนกติกา engine; `LOCK_DEAL`/interrupt window และกติกาอื่นที่ lock ไว้ยังอยู่ครบ

### ข้อจำกัด / รู้ไว้ก่อน M5

- ปุ่ม **ยื่นข้อเสนอ**, **ลงการ์ด** และ **ล็อกดีล** ยัง disabled โดยตั้งใจ; งานจริงอยู่ใน M5/M6 (มี tooltip บอก)
- แผงดีลเป็นพื้นที่ scroll ได้เมื่อมีข้อเสนอ/เงินปันผลจำนวนมาก; การจัดวางแบบละเอียดจะปรับอีกครั้งเมื่อ flow ข้อเสนอครบ
- จอ ≤1023px ใช้ single-column fallback เพื่อไม่ให้แตก; mobile responsive เต็มรูปแบบอยู่ใน M8
- Preview ใช้ผู้เล่น 4 คนและ seed 66 เพื่อให้เห็นการ์ดครบทุกชนิด; overfill picker ถูกทดสอบด้วย unit tests และ e2e เมื่อ engine สร้างสถานะนั้นจริง

### ขั้นถัดไป

Milestone ถัดไปคือ **M5 — Offers & Deal Flow** — รอคำสั่ง
