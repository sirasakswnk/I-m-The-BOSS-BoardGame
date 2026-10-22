# progess.md — บันทึกความคืบหน้า "โต๊ะเจรจาดีล"

> บันทึกผลการลงมือทำจริง เทียบกับ `plan.md` (ทำทีละ Milestone ตามหัวข้อ 10)
> อัปเดตล่าสุด: 22 ต.ค. 2026 (M9 เสร็จครบ + deploy production แล้ว)

## สถานะ Milestone

| Milestone | รายละเอียด | สถานะ |
| --- | --- | --- |
| M0 | Scaffold (Vite + React + TS + Tailwind + design tokens) | ✅ เสร็จ (20/10/2026) |
| M1 | Game Engine (pure TS + tests) | ✅ เสร็จ (20/10/2026) |
| M2 | Firebase: Auth, Lobby, Presence, Home | ✅ เสร็จ (20/10/2026) |
| M3 | Host Loop + Security Rules | ✅ เสร็จ (20/10/2026) |
| M4 | Tabletop UI (Desktop) | ✅ เสร็จ (20/10/2026) |
| M5 | Offers & Deal Flow | ✅ เสร็จ (21/10/2026) |
| M6 | Action Cards & Interrupt Window | ✅ เสร็จ (21/10/2026) |
| M7 | End of Turn & Game End | ✅ เสร็จ (22/10/2026) |
| M8 | Mobile Responsive | ✅ เสร็จ (22/10/2026) |
| M9 | Resilience, Polish, Deploy | ✅ เสร็จ + deploy production (22/10/2026) |

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

## M4 — Tabletop UI (Desktop) ✅ (20/10/2026, visual parity 21/10/2026)

### สิ่งที่ทำ

- เปลี่ยน `GameRoom` จากหน้าจอเริ่มเกมแบบง่ายเป็น **โต๊ะเจรจาเต็มรูปแบบ** ตามภาษาภาพของ `table.html` โดยซ่อน header ของห้องระหว่าง `playing` และใช้ top bar ของโต๊ะแทน
- สร้างคอมโพเนนต์ใต้ `src/ui/table/` แยกความรับผิดชอบ: `TableScreen`, `TableTopBar`, `DealBoard`, `DealPanel`, `TableSeat`, `HandFan`, `GameLog`, `TableBits` และ helper บริสุทธิ์ใน `tableUtils.ts`
- **กระดาน 16 ช่อง** แสดงหมายเลข, เงินปันผล, กลุ่มนักลงทุนที่ต้องการ, สีประจำช่อง, ช่องที่ปิดแล้วพร้อมเลขแผ่นดีล, ช่องปัจจุบัน, หมาก และ tooltip บน hover/focus
- **ขยายพื้นที่โต๊ะตามผลรีวิว:** ขยาย table container เป็น 1520px, กระดานสูงสุด 1080px, ใช้ `aspect-ratio: 1.45` ให้บอร์ดกว้างขึ้นโดยไม่เตี้ยเกินไป, ลดความกว้าง side panel เป็น 184px และขยายเลข/สัญลักษณ์ในช่อง; ที่ viewport 1440px กระดานใหญ่ขึ้นจากประมาณ 722×570px เป็นประมาณ 970×677px
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
- **Visual parity pass (21/10/2026)** — เก็บรายละเอียดและ texture ให้ตรง `table.html` มากขึ้น:
  - เพิ่ม texture จุดบนผ้า/โซนมือ, เส้น grid บนกระดาน, ลายทแยงบนแผงดีล และ hard ink shadow ให้ทุกพื้นผิว
  - ช่องปกติโปร่งแสงพร้อมเลข mono ขนาดใหญ่และ dividend chip; เฉพาะช่องปัจจุบันจึงแสดงกลุ่มเงื่อนไขแบบ inline, ช่องปิดใช้พื้น ink + เลขช่อง/เลขแผ่น/✓ ซ้อนกลาง, หมากและวงแหวนน้ำเงินอยู่บนช่องปัจจุบัน, tooltip เงื่อนไขทำงานด้วย hover/focus
  - แผงดีลจัดหัวเรื่องกับ badge inline, ส่วนแบ่ง 30px (บอสสีทอง/เจ้าของสีตระกูล), แถวเงื่อนไข 13px, label “เลือก N”, แถวข้อเสนอรอแบบ dashed พร้อม chip “รอข้อเสนอ”, ปุ่มขนาดใหญ่ และ reserve ที่ว่างสำหรับ stamp
  - ที่นั่ง/แผงข้างโปร่งแสงขอบ ink, crown ไม่มี badge วงกลม, investor เป็น mini card, มีป้ายการ์ดคว่ำ/พักร้อน และ chip เงินส่วนตัวแบบล็อก
  - มือการ์ดขยายเป็น **112×160** ตาม `table (1).html` v6 (overlap 52px), padding 5/radius 14, face radius 9, action icon 46px, ตราตระกูล 52px/ไอคอน 32px, compact circle 30px/ไอคอน 20px, compact label 13px, tag ญาติ 12px, ชื่อการ์ด 18px (ญาติ)/15px (action), sub 13px และ strip 14px; ปรับเฉพาะระยะ hand/mine/lip ให้การ์ดใหญ่พอดีโดยไม่แตะองค์ประกอบอื่น
  - คง compact label ฝั่งซ้าย, ไอคอน action สีตามต้นฉบับ, tag ญาติ และการเรียงชนิดการ์ด (ญาติ → พักร้อน → หยุด → ซื้อตัว → แย่งบอส) เพื่อให้การ์ดบอสใบขวาสุดเห็นเต็มใบ; hover ดันการ์ดข้างเคียง 26px
  - top bar แสดงรหัสห้อง/เฟส/ดีลที่ปิด/บอส/เทิร์น และ pip ของผู้เล่นตามภาษาภาพต้นฉบับ
  - ตรวจ deal panel ไม่มี internal scroll ที่ 1440/1280/1024px (376/376, 310/310, 324/324)

### ไฟล์หลัก

- `src/ui/table/TableScreen.tsx`, `DealBoard.tsx`, `DealPanel.tsx`, `TableSeat.tsx`, `HandFan.tsx`, `GameLog.tsx`, `TableTopBar.tsx`, `TableBits.tsx`
- `src/ui/table/tableUtils.ts`, `tableUtils.test.ts`, `gameLogFormat.ts`
- `src/ui/pages/GameRoom.tsx`, `Room.tsx`, `Preview.tsx`
- `src/styles/global.css`, `src/i18n/th.ts`
- `e2e/table.spec.ts`, `e2e/preview.spec.ts`
- `review/m4/01-start-space.jpg`, `02-turn-start.jpg`, `03-after-move.jpg`, `04-deal-open.jpg`, `05-card-faces.jpg`

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน (หลัง hand-card enlargement)
- `npm run lint`: ผ่าน (หลัง hand-card enlargement)
- `npm run test`: ผ่าน 126/126 tests (12 files)
- `npm run test:rules`: ผ่าน 12/12 tests
- `npm run build`: ผ่าน; มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- e2e ผ่าน `firebase emulators:exec --config firebase.emulator.json --only database,auth "npm.cmd run test:e2e"`: **6/6 tests** ครอบคลุม lobby/start game, preview ทุกหน้าจอ, เทิร์นว่าง (เปิดดีล → ล้มดีล) และเทิร์นทอยเต๋า → จั่ว 3 ใบ (รันหลัง hand-card enlargement)
- ตรวจภาพที่ 1440px, deal panel ไม่มี internal scroll ที่ 1440/1280/1024px, การ์ดชุดใหญ่ไม่ทับกระดาน และ refresh screenshot หลักทั้ง 5 รูปเมื่อ 21/10/2026

### Definition of Done (M4)

- [x] โต๊ะเกม desktop ใช้ภาษาภาพเดียวกับ `table.html`
- [x] กระดาน 16 ช่องพร้อมช่องปิด/ช่องปัจจุบัน/หมาก/เงื่อนไขและเงินปันผล
- [x] ที่นั่งผู้เล่นหมุนตามตัวเอง แสดงเงิน นักลงทุน สถานะพักร้อน และการ์ดคว่ำ
- [x] มือของผู้เล่นเห็นเฉพาะตัวเอง พร้อมการ์ดครบ 5 ชนิดและการ์ดนักลงทุน
- [x] แผงดีลปัจจุบัน + บันทึกเกม + top bar แสดงเฟส/เทิร์น/ดีลที่ปิด/บอส
- [x] ผู้เล่นเลือกช่องเริ่มต้นและเห็นการอัปเดตของโต๊ะ
- [x] ทอยเต๋า → เดินหมาก → เปิดดีล/จั่ว 3 ใบ ทำงานผ่าน UI จริง
- [x] เทิร์นว่าง: เปิดดีลแล้วล้มดีลและจบเทิร์นผ่าน UI จริง
- [x] มี screenshot ของหน้าจอหลักให้ตรวจก่อนเริ่ม M5 (refresh 21/10/2026)
- [x] ไม่แก้ไฟล์ prototype (`design/home.html`, `table.html`, `lobby.html`)
- [x] ไม่เปลี่ยนกติกา engine; `LOCK_DEAL`/interrupt window และกติกาอื่นที่ lock ไว้ยังอยู่ครบ

### ข้อจำกัด / รู้ไว้ก่อน M5

- ปุ่ม **ยื่นข้อเสนอ**, **ลงการ์ด** และ **ล็อกดีล** ยัง disabled โดยตั้งใจ; งานจริงอยู่ใน M5/M6 (มี tooltip บอก)
- แผงดีลเป็นพื้นที่ scroll ได้เมื่อมีข้อเสนอ/เงินปันผลจำนวนมาก; การจัดวางแบบละเอียดจะปรับอีกครั้งเมื่อ flow ข้อเสนอครบ
- จอ ≤1023px ใช้ single-column fallback เพื่อไม่ให้แตก; mobile responsive เต็มรูปแบบอยู่ใน M8
- การ์ดมือ 112×160 ใช้ overlap 52px คงที่; มือ 12 ใบที่ความกว้าง ≤1180px อาจแน่นหรือล้นกรอบ จะทำ overlap responsive ใน M8
- Preview ใช้ผู้เล่น 4 คนและ seed 66 เพื่อให้เห็นการ์ดครบทุกชนิด; overfill picker ถูกทดสอบด้วย unit tests และ e2e เมื่อ engine สร้างสถานะนั้นจริง
- ช่องปิดจะแสดงหลัง engine ส่ง event `dealResolved`; preview ทั้ง 3 state ยังอยู่ก่อนปิดดีล จึงไม่เห็นช่องปิดใน screenshot ชุดนี้ (สไตล์ช่องปิดพร้อมแล้ว)

### ขั้นถัดไป

Milestone ถัดไปคือ **M5 — Offers & Deal Flow** — รอคำสั่ง

---

## Card face redesign — influence cards ✅ (21/10/2026)

### สิ่งที่ทำ

- สร้างชุด shared component สำหรับการ์ดอิทธิพลทั้ง 5 ชนิดและหลังการ์ดภายใต้ `src/ui/common/influence/` ตาม `design/cards.html` โดยใช้กรอบฐาน **150×210** และหน่วยภายใน `--u = width / 150`; การ์ดในมือเดสก์ท็อปยังคง **112×160**
- เพิ่ม `ClanCard` (หน้าสีตระกูลเต็มใบ, ลายทแยง, ตราสัญลักษณ์ใหญ่, ชื่อไทย, ป้าย `ญาติ`), `TravelCard` (ตั๋วเครื่องบิน, หัวเข้ม, ถุง/คำใบ้, ปลายตั๋วสีตระกูล และ wild หกสี `สีใดก็ได้`), `RecruitmentCard` (ภาพจับมือเดียวแบ่ง viewBox 1/3–3/3), `StopCard` (ป้ายแปดเหลี่ยมบนกรอบลายเตือน), `BossCard` (มงกุฎ+รัศมี+ตราประทับเอียง) และ `CardBack`
- ใช้ SVG sprite ชุดเดียวสำหรับรูปทรงตระกูล 6 แบบและไอคอน bag/coin/stop/crown; mount ครั้งเดียวที่ `App` และแก้ `FamilySymbol` ให้อ้าง symbol จาก sprite
- การ์ดทุกใบมีไอคอนวงกลม+ชื่อสั้นมุมซ้ายบน, `aria-label` ภาษาไทย, ไม่พึ่งสีอย่างเดียว, มี focus-visible และ transition ที่เคารพ `prefers-reduced-motion`
- แทนที่การ์ดมือเดิมใน `HandFan` โดยคงการเรียงชนิด, การหมุนพัด, สถานะ up/down/hot, `data-card-id` และการเลือกด้วยลูกศรซ้าย–ขวา
- เปลี่ยนหลังการ์ดสีน้ำเงินในที่นั่งและกองจั่วเป็น `CardBack` ใหม่; การ์ดนักลงทุนยังใช้ `FamilyCard` เดิม และตัด clan variant ออกจาก `FamilyCard`
- เพิ่ม `--stop`/Tailwind `stop` และ `--gold-deep`/Tailwind `gold-deep` สำหรับสีหยุดและรัศมีบอส
- เพิ่มหน้า review `/preview/cards` แสดงตระกูลทั้ง 6 สี, travel wild, recruitment 1/3–3/3, stop, boss, หลังการ์ด และตัวอย่างพัดในมือ
- เพิ่ม unit tests ครอบคลุมการ์ดทุกใบใน deck config 3.2, aria-label, หลังการ์ด และ recruitment-part mapping; เพิ่ม e2e ของหน้า gallery

### ไฟล์ที่สร้าง/แก้

- `src/ui/common/influence/` — `CardFrame`, `CardSymbols`, `ClanCard`, `TravelCard`, `RecruitmentCard`, `StopCard`, `BossCard`, `CardBack`, `InfluenceCard`, `recruitmentParts`, `index` และ unit test
- `src/ui/pages/CardsPreview.tsx` — gallery หน้า `/preview/cards`
- `src/ui/table/HandFan.tsx`, `TableBits.tsx`, `TableScreen.tsx` — ใช้การ์ด/หลังการ์ดใหม่
- `src/ui/common/FamilySymbol.tsx`, `FamilyCard.tsx` — ใช้ sprite และแยกบทบาท investor/clan
- `src/App.tsx`, `src/ui/pages/Preview.tsx`, `src/i18n/th.ts`, `src/styles/global.css`, `tailwind.config.ts`, `e2e/preview.spec.ts`
- `review/cards/01-gallery-desktop.jpg`, `02-game-table.jpg`, `03-hand-fan.png`, `04-deck-back.png`, `05-seat-card-backs.png`, `06-reference-compare.jpg`
- `progess.md`

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน **131/131 tests** (13 files)
- `npm run build`: ผ่าน; มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- `npm run test:rules`: ผ่าน **12/12 tests**
- `firebase emulators:exec --config firebase.emulator.json --only database,auth "npm.cmd run test:e2e"`: ผ่าน **6/6 tests**
- ตรวจภาพจริงที่ 1440px เทียบ `design/cards.html`; หน้า gallery/มือ/กองจั่ว/ที่นั่งใช้งานได้ และไม่มีการแก้ `design/` หรือ `src/engine/`

### ASSUMPTION / ข้อจำกัด

- `// ASSUMPTION:` recruitment parts เรียงตาม card id แบบ natural และมือที่มีเกิน 3 ใบจะวนกลับไปเริ่ม 1/3; ไม่กระทบ engine
- `// ASSUMPTION:` หลังการ์ดที่เล็กกว่า 90px (ที่นั่ง/กองจั่ว) ซ่อนชื่อเกมเพื่อให้โลโก้และกรอบทองอ่านได้; หลังการ์ดขนาดฐานยังมีชื่อเกมครบ
- เลือกใช้ route `/preview/cards` แทน `/dev/cards` เพื่อรวมกับ preview gallery เดิม
- flow ปัจจุบันยังไม่มีการ render หน้าการ์ดในแผงดีล (แผงสรุปผู้เข้าร่วมใช้ `FamilyChip` ตามเดิม); `ClanCard` พร้อมใช้เมื่อ M5 เริ่มมี UI วางการ์ดในดีล

### ขั้นถัดไป

Milestone ถัดไปคือ **M5 — Offers & Deal Flow** — รอคำสั่ง

---

## M5 — Offers & Deal Flow ✅ (21/10/2026)

### สิ่งที่ทำ

- เพิ่ม `Modal` กลางสำหรับโต๊ะ: portal, focus trap, ปิดด้วย Escape/คลิก backdrop, ล็อก scroll และคืน focus ให้ปุ่มที่เปิด modal
- เพิ่ม `OfferModal` สำหรับยื่นข้อเสนอจากนักลงทุนหน้าตักหรือการ์ดญาติในมือ เลือกสี/จำนวนได้ จำกัดจำนวนไม่เกิน dividend ของดีล และแสดงรายการข้อเสนอของตัวเอง
- ข้อเสนอจากนักลงทุนหน้าตักแก้จำนวนหรือถอนได้ก่อนบอสรับ; ข้อเสนอจากการ์ดญาติถอนได้ (การ์ดกลับเข้ามือ) แต่แก้จำนวนไม่ได้หลังยื่น
- เพิ่ม offer bubble ที่ที่นั่งผู้เล่น รองรับหลายข้อเสนอต่อคน; บอสกดรับ/ยกเลิกข้อเสนอได้จาก bubble พร้อมสถานะ accepted และการ์ดที่ถูกใช้
- เพิ่ม `ClanPlaceModal` ให้บอสเลือกการ์ดญาติที่ไม่ซ้ำสีกับนักลงทุน/ข้อเสนอที่รับแล้วและยังอยู่ในเงื่อนไขดีล; ปุ่มวางการ์ดจะเปิดเฉพาะเมื่อมีใบที่วางได้
- เพิ่มแถบความจุ `รับแล้ว N/D ส่วน` ตาม dividend ของดีล, คำใบ้การรับข้อเสนอสำหรับบอส และปุ่ม `ล็อกดีล` ที่เปิดเมื่อผู้เข้าร่วมครบตามเงื่อนไขเท่านั้น
- เพิ่ม animation เงินส่วนตัว (`money-delta`) แสดงเฉพาะเจ้าของ state; รองรับ `prefers-reduced-motion`
- ปรับ state การรอ action ของโต๊ะให้ reset เมื่อ phase/turn/boss/deal space เปลี่ยน และเมื่อ offers, accepted offers, boss clans, lock/window, ขนาดมือ หรือเงินเปลี่ยน
- เพิ่ม e2e 3 ผู้เล่นปิดดีลแรก: เริ่มช่อง 3, ยื่นข้อเสนอจากนักลงทุนหน้าตัก, บอสรับ, ยกเลิกหนึ่งรายการแล้วรับใหม่, ล็อก, resolve และตรวจเงินบอส/ผู้เสนอตาม engine
- ไม่แก้ `src/engine/` หรือ security rules; ใช้ action `SUBMIT_OFFER`, `WITHDRAW_OFFER`, `ACCEPT_OFFER`, `UNACCEPT_OFFER`, `BOSS_ADD_CLAN`, `LOCK_DEAL` ที่มีอยู่

### ไฟล์ที่สร้าง/แก้

- `src/ui/common/Modal.tsx` — accessible modal shell
- `src/ui/table/OfferModal.tsx` — ตัวแก้ไข/จัดการข้อเสนอจากโต๊ะและมือ
- `src/ui/table/ClanPlaceModal.tsx` — UI วางการ์ดญาติของบอส
- `src/ui/table/TableScreen.tsx` — wiring, validation, pending state, money delta
- `src/ui/table/TableSeat.tsx` — offer bubbles, boss accept/unaccept
- `src/ui/table/DealPanel.tsx` — capacity, clan button, lock button/hint
- `src/ui/table/TableBits.tsx` — `data-family` ของ investor tile
- `src/ui/table/tableUtils.ts` — ใช้ helper ที่มีอยู่; ไม่เปลี่ยนกติกา
- `src/i18n/th.ts` — ข้อความ offer/deal/modal/money
- `src/styles/global.css` — modal, offer, clan, money animation
- `e2e/table.spec.ts` — helper `startSpace`, offer/accept helpers และ e2e ปิดดีลแรก
- `review/m5/01-offer-modal.png`, `02-boss-clan-modal.png`, `03-boss-offers.png`, `04-boss-accepted.png`, `05-money-animation.png` — ภาพตรวจ UI
- `progess.md` — บันทึกสถานะ M5

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน **131/131 tests** (13 files)
- `npm run build`: ผ่าน; มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- `npm run test:rules`: ผ่าน **12/12 tests**
- `firebase emulators:exec --config firebase.emulator.json --only database,auth "npm.cmd run test:e2e"`: ผ่าน **7/7 tests** (เพิ่ม deal-close e2e)
- ตรวจภาพ UI ที่ 1440px: offer modal, clan modal, boss offer bubbles, accepted state และ private money delta

### Definition of Done (M5)

- [x] Offer modal และ offer bubble รองรับหลายข้อเสนอต่อคน
- [x] บอสรับและยกเลิกข้อเสนอได้
- [x] บอสวางการ์ดญาติในดีลได้
- [x] ล็อกดีล, resolve และ animation เงินส่วนตัวทำงาน
- [x] e2e 3 ผู้เล่นปิดดีลแรกสำเร็จ
- [x] เงินบอสและเงินผู้เสนอถูกต้องตาม engine
- [x] e2e ผ่านครบ

### ASSUMPTION / ข้อจำกัด

- ข้อเสนอจากการ์ดญาติยัง **แก้จำนวนหลังยื่นไม่ได้** เพราะ public projection ไม่ส่ง `card.id`; ผู้เล่นถอนเพื่อรับการ์ดคืนแล้วยื่นใหม่ได้ ส่วนข้อเสนอจากนักลงทุนหน้าตักแก้จำนวนได้
- ปุ่มรับข้อเสนอของบอสจะ disabled สำหรับสีที่ไม่ต้องใช้ สีที่บอสเข้าร่วมแล้ว หรือข้อเสนอที่จะทำให้ส่วนแบ่งเกิน dividend
- การวางการ์ดญาติตรวจจาก state ฝั่ง UI ให้ตรงกับเงื่อนไข engine; modal วางการ์ดในภาพ review สร้างจาก `/preview/game` (seed 66) เพราะการ์ดในมือของเกม e2e ไม่รับประกันว่าจะมีใบที่วางได้
- เงินใน animation อ่านจาก `PrivateState` เท่านั้น จึงไม่รั่วไปยังผู้เล่นคนอื่น
- ไม่มีการเปลี่ยนกติกา การเงิน หรือ action ใดใน `src/engine/`

### ขั้นถัดไป

Milestone ถัดไปคือ **M6 — Action Cards & Interrupt Window** — รอคำสั่ง

---

## M6 — Action Cards & Interrupt Window — เสร็จสมบูรณ์ (21/10/2026)

### สถานะ

- งาน UI/integration ของ M6 เสร็จและผ่าน final gate ครบทุกข้อ
- commit M6 ในรอบนี้; commit ก่อนหน้าคือ `373c783 feat(M5): implement offers and deal flow`
- ไม่แก้ `src/engine/reducer.ts` หรือกติกา engine; M6 เป็นงาน UI/net integration ทั้งหมด
- engine ใช้ `action.ts` (server timestamp) ใน `applyAction` อยู่แล้ว จึงไม่ต้องแก้ host loop สำหรับ grace period

### สิ่งที่ทำ

- เพิ่ม `ActionCardModal` เดียวรองรับทั้ง 4 flow: travel, recruitment (เลือกการ์ดครบ 3 ใบ), stop และ im-the-boss พร้อม target picker, disabled reason และ test IDs คงที่
- เพิ่ม `InterruptBar` แบบ sticky เหนือโต๊ะ: ชื่อผู้เล่นที่ลงการ์ด, countdown จาก server time, PLAY, PASS, จำนวนคนผ่าน และปุ่ม `CANCEL_LOCK` สำหรับบอส
- เพิ่ม `PendingQueue` ใน `DealPanel` แสดงการ์ดที่รอผลแบบ public (ไม่เปิดเผยตัวการ์ด) พร้อม target และสถานะ stopped
- เพิ่มปุ่ม PLAY/PASS ด้านล่างโต๊ะ และ sync เวลากับ Firebase `serverTimeOffset` ทุก 100ms; preview mode ข้าม clock sync
- ผูก `PLAY_*`, `PASS_WINDOW`, `CANCEL_LOCK` กับ engine ผ่าน action queue เดิม
- เพิ่ม Thai copy, CSS responsive และ review screenshots
- เพิ่ม unit tests ของ `actionUtils` และ projection/host-state normalization
- เพิ่ม e2e M6: เปิดดีล, ลงการ์ด, ตรวจ countdown ลดลง, ลงการ์ดใบที่สองแล้ว deadline reset, หน่วงเน็ตเวิร์กของผู้เล่นอีกคน 450ms แล้วให้ทั้งสองคน PASS, ตรวจว่า window ปิดทันทีเมื่อคนที่ไม่ trigger ผ่านครบ
- ขยาย e2e M5 ให้ตรวจ `CANCEL_LOCK` แล้ว re-lock ได้

### บั๊กที่พบและแก้ในรอบนี้

- `PublicPendingCard` และ `PendingCardState` มี optional fields เป็น `undefined`; Firebase RTDB ปฏิเสธ `update` ที่มีค่า `undefined` ทำให้ action แรกผ่านแต่ action ที่สองที่ stacking ไม่ถูกเขียนลง public/hostState
- แก้ `project()` ให้ omit `target`/`stoppedBy` เมื่อไม่มีค่า และแก้ `normalizeHostState()` ให้ไม่เติม optional keys กลับมาเป็น `undefined`
- เพิ่มเทสต์ `src/net/__tests__/gameState.test.ts` และอัปเดต projection test เพื่อกันการถอยหลัง

### ไฟล์ที่สร้าง/แก้

- `src/ui/table/ActionCardModal.tsx`, `InterruptBar.tsx`, `PendingQueue.tsx`
- `src/ui/table/actionUtils.ts`, `actionCopy.ts`, `actionUtils.test.ts`
- `src/ui/table/TableScreen.tsx`, `DealPanel.tsx`
- `src/engine/project.ts`, `src/net/gameState.ts`
- `src/engine/__tests__/project.test.ts`, `src/net/__tests__/gameState.test.ts`
- `e2e/table.spec.ts`
- `src/i18n/th.ts`, `src/styles/global.css`
- `review/m6/01-action-modal-travel.png`, `01-action-modal-stop.png`, `02-interrupt-window.png`
- `progess.md`

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน **142/142 tests** (15 files)
- `npm run test:e2e`: ผ่าน **8/8 tests** รวม M6 action-stack/deadline-reset/latency-pass และ M5 cancel-lock/re-lock
- `npm run build`: ผ่าน — JS 726.12 kB (gzip 217.62 kB), CSS 84.88 kB (gzip 16.06 kB); มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- `npm run test:rules`: ผ่าน **12/12 tests**; ไม่มีการแก้ `database.rules.json`
- ตรวจภาพ UI ที่ 1280px: action modal (travel/stop), interrupt bar + pending queue; ไม่พบ layout แตก

### Definition of Done (M6)

- [x] การ์ดทั้ง 4 ชนิดเล่นได้ผ่าน UI
- [x] มี pending queue แบบ public และ interrupt bar พร้อม countdown
- [x] PASS ครบทุกคนที่ไม่ใช่ trigger แล้วปิด window ทันที
- [x] ลงการ์ดซ้อนระหว่าง window แล้ว deadline reset
- [x] action ที่ส่งทันเวลาแต่มาช้าตาม latency ยังถูกนับ (ทดสอบด้วย delayed PASS)
- [x] บอส cancel lock และ re-lock ได้
- [x] e2e ผ่านครบ 8 tests
- [x] final build + rules tests + commit

### ขั้นถัดไป

- Milestone ถัดไปคือ **M7 — End of Turn & Game End**
- M9 ยังติดเรื่องผูก Firebase project จริง, เปิด Anonymous Auth และตัดสินใจ GitHub Pages vs Vercel

## M7 — End of Turn & Game End — เสร็จสมบูรณ์ (22/10/2026)

### สถานะ

- งาน UI, integration, animation และเทสต์ของ M7 เสร็จและผ่าน final gate ครบทุกข้อ
- engine มี `DISCARD`, `END_CHECK`, `finalScores` และ `REMATCH` อยู่แล้ว จึงไม่แก้กติกาใน `reducer.ts`; งานรอบนี้อยู่ที่การเชื่อม state เข้ากับ UI, host cleanup และการพิสูจน์เส้นทางจบเกม
- ไม่แตะ `agent.md` หรือไฟล์ออกแบบใน `design/`

### สิ่งที่ทำ

- เพิ่ม `endgameUtils` สำหรับคำนวณจำนวนการ์ดที่ต้องทิ้ง, เลือกเหตุการณ์ end-check ที่ควรแสดงตาม transition, สร้าง key กัน overlay เล่นซ้ำ และจัดอันดับคะแนนแบบ competition rank (1, 1, 3)
- เพิ่ม `DiscardModal` บังคับเลือกทิ้งให้เหลือ 12 ใบพอดี ปิดด้วย Escape/backdrop ไม่ได้ แสดงการ์ดทั้งมือเรียงตามชนิด และปุ่มยืนยันจะเปิดเมื่อเลือกครบ
- เพิ่ม `EndCheckOverlay` แสดงผลทอยเต๋าอัตโนมัติเมื่อปิดดีลที่ 10–14: อนิเมชัน 1 วินาที, ผลลัพธ์ค้าง 2.2 วินาที, ปุ่มไปต่อ/ดูคะแนน และรองรับ reduced motion
- เพิ่ม `GameOverOverlay` เปิดเงินของผู้เล่นทีละคน, ปุ่มเปิดทั้งหมด, อันดับ, ผู้ชนะ/ผู้ชนะร่วม และปุ่ม REMATCH สำหรับ host พร้อมข้อความรอ host สำหรับคนอื่น
- เชื่อม overlay ทั้งสามเข้ากับ `TableScreen` โดยให้ end-check แสดงก่อน แล้วจึงเปิด discard หรือ game-over ตามสถานะจริง
- เปลี่ยน `DiscardPanel` ให้ใช้ทั้ง public state และมือของผู้เล่น เพื่อแสดงความคืบหน้าการทิ้งและรายชื่อผู้เล่นที่ค้าง
- ทำ preview โต๊ะเกมให้กดเล่นได้จริงผ่าน `applyAction` พร้อม fixture สำหรับบังคับทิ้ง, จบจากเต๋า และจบที่ดีล 15
- host loop ก่อน REMATCH จะอ่านรายชื่อในห้อง, ตัดผู้เล่นที่ offline หรือไม่มีที่นั่งออก, เริ่มเกมใหม่ด้วยผู้เล่นที่เหลือ, อัปเดตที่นั่งใน room record และลบ player/private ของคนที่ถูกถอด
- เพิ่มการลบ private projection ที่ค้างอยู่ของผู้เล่นซึ่งไม่อยู่ใน state ใหม่ เพื่อไม่ให้ข้อมูลมือเกมก่อนหลุดค้างในฐานข้อมูล
- เพิ่ม unit tests ของ `endgameUtils` และ `prepareRematchState`, เพิ่ม `endReason` ใน bot simulation แล้วยืนยันว่าเกม 200 seed มีทั้งจบจากเต๋าและจบที่ดีล 15
- เพิ่ม e2e: ผู้เล่นจริงจั่วครบ 3 เทิร์นจนมือเกิน 12 ใบแล้วถูกบังคับทิ้ง 2 ใบ; preview ตรวจอนิเมชันเต๋า, reveal คะแนน, ผู้ชนะร่วม และ REMATCH; preview ตรวจจบเกมที่ดีล 15 โดยไม่มี end-check overlay
- เพิ่ม Thai copy, CSS ของ discard/die/game-over และ review screenshots ที่ 1440px

### บั๊กที่พบและแก้ในรอบนี้

- `Preview` ใช้ตาราง `th.errors` กับ reject reason ของ engine ทำให้ typecheck fail; เปลี่ยนไปใช้ `th.rejections`
- `GameOverOverlay` อ่านชื่อ host จาก `bossUid` ทำให้ข้อความรอ host ผิดคน; เปลี่ยนไปใช้ `hostUid`
- การจัดอันดับเดิมให้คะแนนเท่ากันเป็น 1, 1, 2; แก้เป็น competition rank 1, 1, 3 ให้ตรงกับความหมายของอันดับ
- `DiscardModal` ต้องรักษารายการที่เลือกเมื่อ hand projection เปลี่ยน แต่ต้องไม่ set state ซ้ำเมื่อไม่มีอะไรเปลี่ยน เพื่อกัน render เกินจำเป็น
- host rematch ต้องไม่อัปเดต `players/{uid}/seat` ของผู้เล่นที่ไม่มี room record แล้ว เพื่อไม่ให้ Firebase validation ล้มจาก record ที่ขาด field บังคับ
- ต้องลบ private projection ของผู้เล่นที่ถูกถอดใน REMATCH; เพิ่ม deletion pass ใน `writeProjection`
- toast แจ้ง error เดิมอยู่ใต้ modal ทำให้ไม่เห็นข้อความเมื่อ DISCARD/REMATCH ถูกปฏิเสธ; ยก z-index ของ toast ให้อยู่เหนือ modal

### ไฟล์ที่สร้าง/แก้

- `src/ui/table/DiscardModal.tsx`, `EndCheckOverlay.tsx`, `GameOverOverlay.tsx`, `endgameUtils.ts`
- `src/ui/table/endgameUtils.test.ts`, `src/net/host/rematch.ts`, `src/net/host/rematch.test.ts`
- `src/ui/table/TableScreen.tsx`, `DealPanel.tsx`
- `src/net/host/hostLoop.ts`
- `src/ui/common/Modal.tsx`
- `src/ui/pages/Preview.tsx`
- `src/engine/__tests__/bot.ts`, `simulation.test.ts`
- `e2e/table.spec.ts`, `e2e/preview.spec.ts`
- `src/i18n/th.ts`, `src/styles/global.css`
- `review/m7/01-discard.png`, `02-discard-selected.png`, `03-endcheck-rolling.png`, `04-endcheck-result.png`, `05-gameover-die.png`, `06-gameover-fifteen.png`
- `progess.md`

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน **150/150 tests** (17 files)
- `npm run test:e2e`: ผ่าน **11/11 tests** รวม forced discard จากห้องจริง และ preview end-check/game-over/rematch
- `npm run build`: ผ่าน — JS 739.71 kB (gzip 221.08 kB), CSS 91.71 kB (gzip 17.17 kB); มี warning เดิมเรื่อง bundle ใหญ่กว่า 500 kB
- `npm run test:rules`: ผ่าน **12/12 tests**; ไม่มีการแก้ `database.rules.json`
- ตรวจภาพ UI ที่ 1440px: discard modal, end-check ระหว่างทอย/ผลลัพธ์, game-over จากเต๋าและดีล 15; ไม่พบ layout แตก

### Definition of Done (M7)

- [x] ผู้เล่นที่มือเกิน 12 ใบถูกบังคับทิ้งก่อนเริ่มเทิร์นถัดไป
- [x] ปิดดีลที่ 10–14 แล้วทอยเช็กจบเกมอัตโนมัติพร้อมอนิเมชัน และเล่นต่อได้เมื่อไม่จบ
- [x] GAME_OVER เผยเงินครบทุกคน แสดงอันดับและผู้ชนะ/ผู้ชนะร่วม
- [x] REMATCH ใช้ห้องเดิม ที่นั่งถูก normalize ใหม่ เงิน/มือ/กระดาน/ดีลถูกรีเซ็ต และเลือกผู้เล่นเริ่มคนใหม่
- [x] host ถอดผู้เล่นที่ offline หรือไม่มีที่นั่งออกก่อนเริ่มรอบใหม่ และลบ player/private record ที่ค้าง
- [x] เล่นจบได้ทั้งจากเต๋าและจากการปิดดีลที่ 15; simulation 200 เกมยืนยันว่าทั้งสองเส้นทางเกิดขึ้นจริง
- [x] typecheck, lint, unit, e2e, build และ rules tests ผ่านครบ
- [x] commit M7

### ขั้นถัดไป

- Milestone ถัดไปคือ **M8 — Mobile Responsive**
- M9 ยังติดเรื่องผูก Firebase project จริง, เปิด Anonymous Auth และตัดสินใจ GitHub Pages vs Vercel

---

## M8 — Mobile Responsive — เสร็จสมบูรณ์ (22/10/2026)

### สถานะ

- โต๊ะเกมมีเลย์เอาต์มือถือ/แท็บเล็ตของตัวเองตามหัวข้อ 9.2 และเล่นได้ครบ flow บนจอ 375×667 โดยไม่ต้อง zoom และไม่มี horizontal scroll ของทั้งหน้า
- ไม่แตะ engine/กติกา ไม่แตะ `database.rules.json` และไม่แตะ `design/`

### สิ่งที่ทำ

- **สลับเลย์เอาต์ด้วย media query เดียวกันทั้ง JS และ CSS** — `useMediaQuery` + `COMPACT_TABLE_QUERY` (`max-width: 1023px`) ใน `src/ui/common/useMediaQuery.ts`; `TableScreen` แยก JSX เป็น compact (< 1024) กับ desktop (≥ 1024) แต่ใช้ state, handler, modal และ `DealPanel` ชุดเดียวกัน จึงไม่มีลอจิกซ้ำ และเดสก์ท็อปไม่เปลี่ยน
- **บน: แถบผู้เล่นคนอื่น** — `TableSeat` variant `strip`; มือถือเป็นแถวเลื่อนซ้ายขวา (scroll-snap) แท็บเล็ตเป็น grid ห่อบรรทัด; bubble ข้อเสนอยังกดรับ/ยกเลิกได้ (สูง ≥ 36px)
- **กลาง: แผนที่กระดานย่อ + แผงดีล** — `MiniBoardMap` (กรอบ 5×5 ตามตำแหน่งจริง หมาก `$` สีทอง ช่องปิดทึบ) กดแล้วเปิด `BoardSheet` (bottom sheet รายการ 16 ช่อง: ส่วนแบ่ง เงื่อนไขกลุ่มสี สถานะปิด/เลขแผ่น และเลื่อนไปช่องที่หมากอยู่อัตโนมัติ); `DealPanel` ออกจาก grid กระดานมาเต็มความกว้างและสูงตามเนื้อหา; แท็บเล็ตวางแผนที่ไว้ข้างแผงดีล
- **ล่าง: มือของฉันเป็น bottom sheet** — `HandDock` ติดล่างจอ แถบย่อแสดงจำนวนไพ่ x/12, เงิน (พร้อม animation รับ/จ่าย) และปุ่มแอ็กชันใหญ่ 3 ปุ่ม (สูง 50px); แตะหรือปัดขึ้นที่ handle เพื่อดึงขึ้น เห็นที่นั่ง/นักลงทุน/เงิน และไพ่ทุกใบเป็น grid (`HandFan layout="grid"` การ์ด 78×111); ปิดด้วยแตะฉากหลัง ปัดลง หรือ Escape; มี spacer กันเนื้อหาสุดท้ายโดนบัง และตั้ง `--mdock-h` ให้ toast ลอยเหนือ dock
- **Interrupt bar** — sticky บนสุดของจอ (z เหนือ dock) และสั่นด้วย `navigator.vibrate` บนจอ < 1024 เมื่อคนอื่นเปิดหน้าต่าง/ลงการ์ดเพิ่ม (ไม่สั่นถ้าเราเป็นคน trigger, ข้ามเงียบ ๆ ถ้าเบราว์เซอร์ไม่รองรับ)
- **Top bar** — จอ < 768 ซ่อน pips 15 ช่อง (เหลือข้อความ x/15) ชิปเล็กลงและขึ้นบรรทัดใหม่ ปุ่มนำทางสูง 44px
- **Touch target** — ปุ่มทอยเต๋า/เปิดดีล/ล้มดีล/ล็อก/วางการ์ดญาติ ≥ 48px, ปุ่มเลือกช่องเริ่มต้น 48px, handle ของ dock 54px
- **Preview** — แถบเครื่องมือของ `/preview` ไม่ sticky บนจอ < 768 เพื่อไม่กินพื้นที่ครึ่งจอ
- ลบ CSS fallback ≤ 1023px เดิมของ M4 (เดิมจัดเลย์เอาต์เดสก์ท็อปให้เป็นคอลัมน์เดียว) เพราะส่วนนั้นไม่ถูก render บนจอเล็กแล้ว

### บั๊กที่พบและแก้ในรอบนี้

- **ช่องที่ปิดแล้วหายจากกระดานเมื่อเกมยาว** (กระทบเดสก์ท็อปด้วย) — `getClosedTileMap` เดิมอ่านจาก `public.log` ซึ่งเก็บแค่ 50 event ล่าสุด ดีลแรก ๆ จึงหลุดออกจาก log แล้วช่องกลับมาแสดงเป็นช่องเปิด; เปลี่ยนไปใช้ `public.closedSpaces` (engine push ตามลำดับการวางแผ่น ตำแหน่ง = เลขแผ่น) พร้อม unit test กรณีปิด 12 ช่อง
- swipe ที่ handle ไม่ทำงานเมื่อลากเมาส์/ปากกาออกนอกปุ่ม — ใช้ `setPointerCapture` ตอน pointerdown
- toast บังปุ่มแอ็กชันใน dock — ยก toast ขึ้นตามความสูง dock (`--mdock-h`)

### ไฟล์ที่สร้าง/แก้

- ใหม่: `src/ui/common/useMediaQuery.ts`, `src/ui/table/CompactBoard.tsx`, `src/ui/table/HandDock.tsx`, `e2e/mobile.spec.ts`
- แก้: `src/ui/table/TableScreen.tsx`, `TableSeat.tsx`, `HandFan.tsx`, `InterruptBar.tsx`, `tableUtils.ts`, `tableUtils.test.ts`
- แก้: `src/i18n/th.ts` (`th.game.table.compact`), `src/styles/global.css` (ส่วน "M8 phone + tablet table"), `src/ui/pages/Preview.tsx`
- แก้: `playwright.config.ts` — เพิ่ม project `mobile` (375×667, `isMobile`, `hasTouch`) รัน `table`, `preview`, `mobile` specs; project เดสก์ท็อปข้าม `mobile.spec.ts`
- `review/m8/01-phone-turn.png` … `08-tablet-deal.png`
- `progess.md` (แก้ตารางสถานะ M7 ที่ค้างเป็น ⬜ และวันที่อัปเดตด้วย)

### ผลการรันคำสั่ง

- `npm run typecheck`: ผ่าน
- `npm run lint`: ผ่าน
- `npm run test`: ผ่าน **151/151 tests** (17 files)
- `npm run test:rules`: ผ่าน **12/12 tests**
- `npm run test:e2e`: ผ่าน **25/25 tests** — เดสก์ท็อป 11 (เดิมทั้งหมด) + mobile 14 (table 5 flow จริงผ่าน Firebase Emulator 3 ผู้เล่น, preview 3, mobile layout 6)
- หมายเหตุการรันใน cloud container: ไม่มี Chrome/`.env` จึงรันด้วย config ชั่วคราวนอก repo ที่ชี้ Chromium ที่ติดตั้งไว้ + ค่า Firebase demo สำหรับ Emulator; บนเครื่อง Windows ใช้คำสั่งเดิมได้ตามปกติ

### Definition of Done (M8)

- [x] เล่นได้ครบบนจอ 375×667 โดยไม่ต้อง zoom — flow จริง 3 ผู้เล่นทั้ง 5 สถานการณ์ใน `table.spec.ts` (ดีลล้ม, ปิดดีลด้วยข้อเสนอ + เงินถูกต้อง, ลงการ์ดซ้อน/หน้าต่างขัดจังหวะ, ทอยเต๋า-จั่ว, บังคับทิ้งไพ่) ผ่านที่ 375×667
- [x] ไม่มี horizontal scroll ของทั้งหน้า — ตรวจทุกหน้าใน preview (home, join, lobby, status, cards, setup) และโต๊ะเกมทั้ง 6 สถานะ รวม discard/end-check/game-over
- [x] แท็บเล็ต 768–1023 ใช้เลย์เอาต์มือถือแบบกว้าง (แถบผู้เล่นเป็น grid, แผนที่ข้างแผงดีล) และ ≥ 1024 กลับเป็นโต๊ะเดสก์ท็อป
- [x] ปุ่มสัมผัส ≥ 44px, interrupt bar sticky + สั่น

### ข้อจำกัด / รู้ไว้

- การสลับเลย์เอาต์ทำตอน render ตามความกว้างจอ ถ้าหมุนจอข้าม 1024px ระหว่างเปิด modal อยู่ modal ยังเปิดต่อได้ปกติ แต่ dock/แผนที่จะ mount ใหม่ (สถานะดึงขึ้นของ dock รีเซ็ตเป็นย่อ)
- `navigator.vibrate` ไม่มีบน iOS Safari — iPhone จะเห็นแค่แถบ sticky ไม่สั่น
- การ์ดในมือบนมือถือไม่มีโหมดขยายดูใบเดียว (ขนาด 78×111 อ่านชื่อและไอคอนได้); ถ้าต้องการ zoom การ์ดค่อยเพิ่มใน M9 polish

### ขั้นถัดไป

- Milestone ถัดไปคือ **M9 — Resilience, Polish, Deploy**
- M9 ยังติดเรื่องผูก Firebase project จริง, เปิด Anonymous Auth และตัดสินใจ GitHub Pages vs Vercel

---

## Dice roll animation — งานย่อยก่อน M9 (22/10/2026)

- ทอยเต๋าเดินหมาก (`ROLL_DICE`) มีอนิเมชันที่**ทุกคนเห็น** ไม่ใช่แค่บอส: `DiceRollOverlay` แสดงเต๋ากลิ้ง 0.8 วินาที (ใช้ keyframes เดียวกับเต๋าเช็กจบเกม) หยุดที่หน้าจริง แล้วหมาก `$` เดินทีละช่องตามแต้ม (ข้ามช่องที่ปิดแล้ว) ทั้งบนกระดานเดสก์ท็อปและแผนที่ย่อ/กระดานเต็มบนมือถือ จากนั้นป้ายหายเอง (~2–3.5 วินาที)
- ป้ายไม่รับการคลิก (`pointer-events: none`) จึงไม่บังปุ่ม; ระหว่างกลิ้ง เต๋าในแผงของบอสขึ้น "กำลังทอยเต๋า…" แทนผล
- เล่นเฉพาะการทอยที่เกิดขึ้นหลังเปิดโต๊ะ — การทอยที่อยู่ใน log ตอนโหลด/รีเฟรชถือว่าเห็นแล้ว จึงไม่เล่นซ้ำ
- `prefers-reduced-motion`: ไม่กลิ้ง แสดงผลทันทีและหมากไปช่องปลายทางเลย
- ใช้ event `diceRolled` (`face`, `from`, `to`) ที่มีอยู่แล้ว ไม่แก้ engine; `getPawnPath` มี unit test เทียบกับ `movePawn` ของ engine ทุกช่องทุกแต้ม
- ไฟล์: ใหม่ `src/ui/table/DiceRollOverlay.tsx`, `diceRollUtils.ts`, `diceRollUtils.test.ts`; แก้ `TableScreen.tsx`, `DealPanel.tsx`, `TableBits.tsx` (`DiceFace` รับ `testId`), `th.ts` (`th.game.table.diceRoll`), `global.css`, `e2e/table.spec.ts` (ทุกคนเห็นหน้าเต๋าเดียวกัน + รีเฟรชไม่เล่นซ้ำ), `e2e/preview.spec.ts` (หมากเดินทีละช่อง)
- ผล: `typecheck` ✅ `lint` ✅ unit **156/156** ✅ e2e **27/27** ✅ (เดสก์ท็อป 12 + mobile 15)

### รอบ 2 — ดีไซน์ทอยเต๋าใหม่ (22/10/2026)

ปรับตามข้อเสนอที่ผู้ใช้เลือก (เต๋า 3 มิติโยนจากที่นั่ง + นับก้าว + ไฮไลต์ช่องปลายทาง + แตะเพื่อข้าม):

- **เต๋า 3 มิติโยนจากที่นั่งคนทอย** — ลูกบาศก์ CSS 3D (framer-motion) พุ่งจากที่นั่งจริงของคนทอยบนจอ กระดอน 2–3 ครั้ง แล้วหมุนหยุดที่หน้าจริงกลางกระดาน (มือถือลงกลางแผนที่ย่อ); ถ้ากระดานไม่อยู่ในจอทั้งหมด จะลงกลางพื้นที่ที่มองเห็นเหนือ dock แทน
- **นับก้าวบนกระดาน** — ช่องที่หมากเหยียบขึ้นเลขก้าว ①②③, ช่องที่ปิดแล้วซึ่งถูกข้ามขึ้นตรา "ข้าม" ขีดฆ่า, หมาก `$` กระโดดทีละช่อง (ทั้งกระดานเดสก์ท็อปและแผนที่ย่อ)
- **ช่องปลายทาง** — ขอบทองเรืองขึ้น และป้ายบอก "ถึงช่อง 11 · ใช้ 4 ตระกูล ×5"
- **แตะเพื่อข้าม** — แตะตรงไหนก็ได้หรือกด Escape ข้ามไปผลทันที โดยการแตะนั้นยังไปถึงปุ่มที่กดตามปกติ (ไม่บล็อก input)
- เวลารวมประมาณ 2–3 วินาที; reduced motion: เต๋าวางที่ผลทันที หมากอยู่ช่องปลายทางพร้อมไฮไลต์
- แก้บั๊กที่เจอระหว่างทดสอบ: เฟรมแรกหลังทอย หมากแวบไปช่องปลายทางก่อนจะกลับมาเริ่มเดิน — ตอนนี้ค้างที่ช่องเริ่มจนอนิเมชันรับช่วง และผูกสถานะการเดินกับการทอยครั้งนั้นเท่านั้น
- ไฟล์: `DiceRollOverlay.tsx` (เขียนใหม่), `diceRollUtils.ts` (`getPawnWalk`, `PawnWalkState`), `DealBoard.tsx`, `CompactBoard.tsx`, `TableScreen.tsx`, `TableBits.tsx` (`DiePips`), `th.ts`, `global.css`, `e2e/preview.spec.ts`, `review/dice/01–04`
- ผล: `typecheck` ✅ `lint` ✅ unit **158/158** ✅ e2e **29/29** ✅ (ชุดทดสอบเต๋ารันซ้ำ 8 รอบ × 2 project = 32/32) `build` ✅

---

## Draw cards animation — งานย่อยก่อน M9 (22/10/2026)

ทำตามข้อเสนอที่ผู้ใช้เลือก (1 + 3 + 4 + 6 แบบไม่ดึง dock ขึ้นเอง + 7 + 8):

- **คนอื่นเห็นหลังการ์ด** — การ์ด 3 ใบบินจากกองจั่วไปที่นั่งคนจั่วทีละใบ (เว้น 0.12 วิ) ตัวเลข ×5 → ×8 ใต้ที่นั่งนับขึ้นตามใบที่ลงจริงและเด้ง; ไพ่ยังเป็นความลับ
- **คนจั่วเห็นการ์ดพลิกเปิด** — การ์ดบินจากกองจั่ว พลิกหน้าแบบ 3 มิติกลางทาง แล้วลงช่องจริงของมันในพัดไพ่ (ช่องเว้นไว้ระหว่างบิน); มือถือบินเข้า dock ที่ handle เรืองทอง และตัวเลข x/12 นับขึ้นทีละใบ (ไม่ดึง dock ขึ้นเอง)
- **ป้าย "ใหม่"** — ใบที่เพิ่งจั่วมีริบบิ้นทอง (มุมซ้ายบนในพัดไพ่ เพราะใบถัดไปทับขอบขวา) หายเมื่อชี้/แตะ/โฟกัสใบนั้น หรือเมื่อถึงเทิร์นถัดไปของเรา
- **สับกองใหม่** — กองจั่วหมดกลางการจั่ว: กองทิ้งสองกองสลับเข้าหากัน (riffle) ที่กองจั่วพร้อมตรา "สับกองใหม่!" ก่อนการ์ดบิน; engine ไม่มี event นี้ UI จึงอนุมานจากกองจั่ว/กองทิ้งก่อนจั่ว (`didReshuffle`)
- **ไพ่ล้นมือ** — ถ้าจั่วแล้วเกิน 12 ใบ ใบใหม่ขอบแดงสั่น ตัวเลขเป็นสีแดง และขึ้นป้าย "ไพ่ล้นมือ! ต้องทิ้ง n ใบ" ประมาณ 1 วินาที ก่อนหน้าต่างบังคับทิ้งจะเปิด
- เหมือนเต๋า: ไม่บล็อก input, แตะ/Escape เพื่อข้าม, reduced motion = ไม่บิน, รีเฟรชไม่เล่นซ้ำ; ใช้เวลาประมาณ 0.8–1.2 วินาที (+0.85 ถ้าสับกอง, +1 ถ้าล้นมือ)
- ไม่แก้ engine: ใช้ event `cardsDrawn` + มือของตัวเอง + จำนวนกองจั่ว/กองทิ้ง
- รีแฟกเตอร์: ตัวช่วยตำแหน่งบนจอของเต๋าย้ายเป็น `overlayGeometry.ts` ใช้ร่วมกัน; ลำดับไพ่ในพัดย้ายเป็น `sortHandForDisplay` ใน `drawUtils.ts`
- ไฟล์: ใหม่ `DrawCardsOverlay.tsx`, `drawUtils.ts`, `drawUtils.test.ts`, `overlayGeometry.ts`; แก้ `TableScreen.tsx`, `HandFan.tsx`, `HandDock.tsx`, `TableSeat.tsx`, `TableBits.tsx`, `DiceRollOverlay.tsx`, `th.ts` (`th.game.table.draw`), `global.css`, `e2e/table.spec.ts`, `e2e/preview.spec.ts`, `review/draw/01–06`
- ผล: `typecheck` ✅ `lint` ✅ unit **162/162** ✅ e2e **31/31** ✅ (ชุดจั่วการ์ดรันซ้ำ 3 รอบ × 2 project = 18/18) `build` ✅

---

## M9 — Resilience, Polish, Deploy ✅ (22/10/2026)

> **สถานะ: เสร็จสมบูรณ์** ผ่าน gate ครบทุกชุด, deploy Firebase Rules + Vercel production
> และ smoke test บนเว็บจริงแล้ว

### สิ่งที่ทำ

**Host migration**
- ใหม่ `src/net/host/migration.ts` + `migration.test.ts`
  - `findHostCandidate()` เลือกผู้เล่น connected ที่ seat ต่ำสุด (ตัดสินเสมอด้วย joinedAt/uid)
  - `claimHost()` ใช้ transaction บน `meta/hostUid` แล้วตั้ง `meta/hostConnected = true`
  - `isHostOffline()`, `HOST_MIGRATION_DELAY_MS = 10_000`
- ใหม่ `src/net/useHostMigration.ts` — รอ 10 วิ เฉพาะ candidate เรียก claim
  - สถานะ `online/waiting/claiming/claimed`; host เดิมที่กลับมาก่อน transaction สำเร็จยังชนะเพราะ rules บังคับ `hostConnected === false`
- `src/ui/room/HostMigrationNotice.tsx` — แบนเนอร์แจ้งทุกคนระหว่างรอ/กำลังย้าย
- `src/net/host/hostLoop.ts` — hydrate ของ host ใหม่ขยาย interrupt deadline อย่างน้อย 5 วินาที
- `database.rules.json` — อนุญาต claim `hostUid` เฉพาะสมาชิกที่เขียนเป็นตัวเองและ host เดิมถูกทำเครื่องหมาย offline
- `tests/rules/security.test.ts` — เทสต์โอน host, claim หลังหลุด และกัน claim ขณะ host ยัง online

**Seat reclaim**
- ใหม่ `src/net/host/reclaim.ts` + `reclaim.test.ts`
  - `replaceUids()` เปลี่ยน uid ทั้ง key/value ทุกชั้น (players, offers, pending cards, logs, finalScores)
  - `migratePlayerUid()` ย้ายชื่อ/ที่นั่งโดยกัน target ซ้ำหรือหาย
  - `SeatReclaimRequest`, `SeatReclaims`, `findReclaimablePlayer()`
- ใหม่ `src/net/reclaims.ts` + `src/net/useSeatReclaims.ts`
  - ขอ/ยกเลิก/ติดตามคำขอของตัวเอง และ subscription คำขอสำหรับ host
- `src/net/host/hostLoop.ts`
  - action ระดับห้อง `RECLAIM_SEAT` แยกจาก engine (host-only)
  - ตรวจว่ามีคำขอจริง, ที่นั่งเดิม offline, uid ใหม่ยังว่าง
  - เขียน `hostState`, public/private projection, player เก่า/ใหม่, ลบ request และ action ใน update เดียว
- ใหม่ `src/ui/room/ReclaimViews.tsx`
  - guest ที่ยังไม่มีที่นั่งเลือกที่นั่ง offline + ตั้งชื่อ + รอ/ยกเลิกคำขอ
  - host เห็นคิวคำขอและกดอนุมัติ/ปฏิเสธ
- `database.rules.json` — `reclaims/$uid` เขียนได้เฉพาะ guest ที่ยังไม่เป็นสมาชิก ขอที่นั่ง offline ตอน playing; host อ่าน/ลบ; เจ้าของอ่าน/ยกเลิกของตัวเอง
- `src/net/gameTypes.ts`, `src/net/actions.ts` — `SeatReclaimAction`, `sendSeatReclaim()`

**Polish / resilience**
- ใหม่ `src/ui/table/HostRecoveryBar.tsx` — host ข้ามเทิร์นบอสที่ offline ≥ 60 วิ ผ่าน `SKIP_DISCONNECTED_BOSS`
- ใหม่ `src/ui/common/HowToPlay.tsx` — modal วิธีเล่น เข้าถึงได้จาก Home/Lobby/TableTopBar
- ใหม่ `src/ui/common/sound.ts`, `SoundToggle.tsx`, `src/store/uiStore.ts`
  - Web Audio synth สำหรับ dice/draw/win/toggle, default off, จำค่าใน localStorage
  - ปุ่มใน TableTopBar ใช้ `aria-pressed` และ label ภาษาไทย
- `src/net/rooms.ts` + ใหม่ `src/net/roomCleanup.ts` + test
  - สร้างห้องใหม่แล้วลบห้องล่าสุดของเบราว์เซอร์เดิมเมื่ออายุ >24 ชม. และไม่มีใคร connected
- `src/i18n/th.ts` — เพิ่มข้อความ M9 ครบ (how-to-play, migration, reclaim, sound, recovery)
- `README.md` — วิธีติดตั้ง Firebase, env, deploy rules/Vercel, ข้อจำกัด host privacy, cleanup, Spark plan
- `.env.example` — อธิบาย local vs Vercel production

### Gate ผลจริง (22/10/2026)

- `typecheck` ✅
- `lint` ✅
- unit **172/172** (22 ไฟล์) ✅
- rules **16/16** ✅
- e2e **35/35** ทั้ง desktop และ mobile (3.0 นาที) ✅
  - host tab migration ผ่านใน **14.0–14.6 วินาที** และมือ/เงิน/เฟสเดิมอยู่ครบ
  - reclaim จาก browser ใหม่ผ่านหลัง host อนุมัติ (4.9 วินาที)
  - how-to-play modal และ sound toggle ผ่านทั้งสอง project
- `build` ✅ — JS `788.66 kB` (gzip `234.27 kB`), CSS `107.65 kB` (gzip `20.09 kB`), Preview chunk แยก `16.15 kB`; ยังมี warning chunk >500 kB ตามเดิม

### Deploy production (22/10/2026)

- [x] commit + push `main` (implementation `01ee6ba`, Vercel config `67e48e9`)
- [x] deploy `database.rules.json` สำเร็จที่ database `i-m-the-boss-default-rtdb`
      (`firebase deploy --only database --project i-m-the-boss`)
- [x] Vercel project `im-the-boss-boardgame` เชื่อม GitHub repo
      `sirasakswnk/I-m-The-BOSS-BoardGame` และ deploy จาก `main`
- [x] ตั้ง Production env ครบ 5 `VITE_FIREBASE_*` + `VITE_USE_EMULATORS=false`
- [x] production URL: **https://im-the-boss-boardgame.vercel.app**
- [x] smoke test บน production ด้วย Chrome 3 browser contexts:
      สร้างห้อง → join 3 คน → เริ่มเกม → เปิดดีล → ปิดแท็บ host
      → host migration สำเร็จและมือของผู้เล่นไม่เปลี่ยน
- [x] SPA deep link (`/12345`) ตอบ 200 และโหลดแอปผ่าน rewrite
- [x] ลบห้อง smoke test (`60017`, `32827`) ออกจาก Realtime Database แล้ว

**DoD M9:** ปิดแท็บ host แล้วผู้เล่นคนอื่นเล่นต่อได้ใน ~14 วินาที
โดย state ไม่หาย — ผ่านทั้ง Firebase Emulator (desktop/mobile) และ production

---

## Post-M9 — Invite join gate (22/10/2026)

### อาการที่พบ

เปิดลิงก์คำเชิญใน browser context ใหม่ (incognito) แล้วเห็นหน้ารวมข้อมูลห้อง
เช่น รหัสห้องและรายชื่อผู้เล่น แต่ไม่เห็นช่องกรอกชื่อในจอแรก
ทำให้ดูเหมือน "เข้าห้องได้แล้วแต่ยังไม่มีตัวตน" ทั้งที่จริงยังไม่ได้เป็นสมาชิก
และยังไม่สามารถเริ่มเกมได้

### สาเหตุ

`JoinRoomView` แสดงการ์ดกรอกชื่อไว้ **หลัง** แผงรหัสห้องและรายการที่นั่ง
บน viewport 900px ช่องชื่ออยู่ที่ตำแหน่ง y≈1131px และบนมือถือ 375×667
อยู่ที่ y≈1388px จึงอยู่นอกจอแรกทั้งสองขนาด — ไม่ใช่การ join อัตโนมัติ

### การแก้ไข

- ย้ายการ์ด "ตั้งชื่อก่อนนั่งโต๊ะ" และการ์ดข้อมูลห้องขึ้นมาก่อน
  `RoomCodePanel` และ `SeatSection` เพื่อให้ช่องชื่อและปุ่ม join อยู่ในจอแรก
- ปรับข้อความให้ชัดว่า **"คุณยังไม่ได้อยู่ในห้องนี้"** และต้องกด
  **"นั่งโต๊ะนี้"** ก่อนจึงจะเข้าร่วม
- เพิ่ม `data-testid="join-action-card"` และ e2e assertion ว่า
  ช่องชื่ออยู่ใน viewport รวมถึงปุ่ม join มองเห็นเต็มปุ่มทั้ง desktop และ mobile

### Gate หลังแก้ไข

- `typecheck` ✅
- `lint` ✅
- unit **172/172** (22 ไฟล์) ✅
- rules **16/16** ✅
- e2e **35/35** ทั้ง desktop และ mobile ✅
- `build` ✅

### Deploy

- [x] commit + push `main` (commit `af1c07c`) และ Vercel auto-deploy สำเร็จ
- [x] ตรวจ production ด้วย browser context ใหม่ทั้ง desktop 1280×900
      และ mobile 375×667: ช่องชื่อและปุ่ม join มองเห็นเต็มปุ่มในจอแรก
      โดยไม่ต้องเลื่อนหน้า
- [x] ทดสอบกรอกชื่อแล้ว join จริงจากลิงก์คำเชิญบน production สำเร็จ
      (เห็น lobby และชื่อผู้เล่นหลัง join)
- [x] ลบห้องที่สร้างระหว่างตรวจ production (`53862`) แล้ว

