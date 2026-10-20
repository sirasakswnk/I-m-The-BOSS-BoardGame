# progess.md — บันทึกความคืบหน้า "โต๊ะเจรจาดีล"

> บันทึกผลการลงมือทำจริง เทียบกับ `plan.md` (ทำทีละ Milestone ตามหัวข้อ 10)
> อัปเดตล่าสุด: 20 ต.ค. 2026

## สถานะ Milestone

| Milestone | รายละเอียด | สถานะ |
| --- | --- | --- |
| M0 | Scaffold (Vite + React + TS + Tailwind + design tokens) | ✅ เสร็จ (20/10/2026) |
| M1 | Game Engine (pure TS + tests) | ✅ เสร็จ (20/10/2026) |
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

- Firebase Anonymous Auth + สร้าง/เข้าร่วมห้องด้วยรหัส 6 ตัว
- Lobby: join/leave/seat/reassign, presence ด้วย `onDisconnect`, sync ผ่าน RTDB
- หน้า Home/Room ตาม `design/home.html` + ข้อความจาก `src/i18n/th.ts`
- ยังใช้ `database.rules.json` แบบ deny-all ชั่วคราว; กฎจริง + host loop อยู่ใน M3
