# plan.md — Web Board Game: "โต๊ะเจรจาดีล" (Boss / Investor Deal Game)

> เอกสารนี้คือ spec สำหรับให้ ai agent  พัฒนาทีละ Milestone
> ภาษา UI: **ไทย** | โค้ด, ชื่อตัวแปร, คอมเมนต์: **อังกฤษ**
> ชื่อเกม: **โต๊ะเจรจาดีล** (ตั้งใน `src/config/app.ts` เป็น `APP_NAME`) | สโลแกน: "ใครเป็นบอส ใครบลัฟ เดี๋ยวก็รู้"
> กติกาอ้างอิง: บอร์ดเกมต้นฉบับ *I'm the Boss!* (ผู้ใช้ยืนยัน) — หัวข้อ 3 คือกติกาฉบับที่ใช้พัฒนา ถ้าเอกสารส่วนอื่นขัดกับหัวข้อ 3 ให้ยึดหัวข้อ 3
> ต้นแบบภาพ: `design/home.html` (คือ `index.html` ที่ผู้ใช้ให้มา) — ดูหัวข้อ 9.0

---

## 0. วิธีทำงานสำหรับ ai agent (อ่านก่อนเริ่ม)

1. ทำงาน **ทีละ Milestone ตามลำดับในหัวข้อ 10** ห้ามข้าม ห้ามทำหลาย Milestone พร้อมกัน
2. จบแต่ละ Milestone ต้องผ่าน: `npm run typecheck`, `npm run lint`, `npm run test` (และ `npm run test:rules` ตั้งแต่ M3) และเช็ก Definition of Done ของ Milestone นั้นครบ
3. **Game engine (`src/engine/`) ต้องเป็น pure TypeScript** — ห้าม import Firebase, React หรืออะไรที่มี side effect
4. หัวข้อ 3 เป็นกติกาที่ตัดสินใจแล้ว **ห้ามเดาเพิ่มหรือเปลี่ยนเอง** จุดที่ต้นฉบับไม่ได้ระบุรายละเอียด ผู้เขียนแผนเลือกค่าไว้แล้วและติดป้าย `ASSUMPTION` (รวมอยู่ในหัวข้อ 3.6) ถ้าเจอกรณีที่หัวข้อ 3 ไม่ครอบคลุม ให้ใส่ค่า placeholder ที่ชัดเจน + คอมเมนต์ `// ASSUMPTION:` แล้วสรุปรายการทั้งหมดให้ผู้ใช้ตอนจบ Milestone
5. ข้อความภาษาไทยทั้งหมดอยู่ใน `src/i18n/th.ts` ห้าม hardcode ข้อความไทยใน component (รวมข้อความที่ย้ายมาจาก `design/home.html`)
6. ห้ามใช้ asset/โลโก้/ชื่อการค้าของบอร์ดเกมต้นฉบับ ใช้ชื่อ สี ไอคอน และภาพที่ทำขึ้นเอง (กติกาใช้ได้ แต่ห้ามคัดลอกข้อความ rulebook ต้นฉบับ ให้เขียนเป็นภาษาของเราเอง)
7. Commit แยกตาม Milestone, ข้อความ commit เป็นอังกฤษ
8. **ภาพและธีมยึด `design/home.html` เป็นหลัก** (สี ฟอนต์ เงา ขอบหนา ลาย halftone ลายเส้นเฉียง ปุ่มกดลึก) หน้าใหม่ทุกหน้าต้องใช้ภาษาภาพเดียวกัน ห้ามนำสไตล์ใหม่มาปน ดูหัวข้อ 9.0
9. ข้อมูลกระดานและแผ่นดีล (หัวข้อ 3.3) เก็บแยกใน config เท่านั้น ห้ามฝังตัวเลขใน engine และต้องมี unit test ตรวจความสอดคล้องของข้อมูล

---

## 1. เป้าหมายและขอบเขต

### เป้าหมาย
- เว็บบอร์ดเกมเจรจาต่อรอง/บลัฟ เล่นกับเพื่อน **3–6 คน** โดยคุยเสียงกันผ่าน Discord
- UI แบบ "โต๊ะบอร์ดเกม": ผู้เล่นนั่งล้อมกระดานดีลตรงกลาง เน้น Desktop, รองรับมือถือ
- เข้าเล่นแบบ anonymous: ชื่อเล่น + รหัสห้อง
- รีเฟรช/เน็ตหลุดแล้วกลับเข้าที่นั่งเดิมพร้อมไพ่และเงินเดิม
- กติกาและอุปกรณ์ครบตามต้นฉบับ: การ์ดอิทธิพล 98 ใบ, การ์ดนักลงทุน 6 ใบ, กระดานดีล 16 ช่อง, แผ่นดีล 15 แผ่น, ทอยเต๋าเช็กจบเกม

### ไม่ทำ (Non-goals)
- ไม่มีแชท/เสียงในเว็บ (ใช้ Discord)
- ไม่มีบัญชีผู้ใช้ถาวร, ไม่มี matchmaking, ไม่มี ranking
- ไม่มี Cloud Functions / backend server (ใช้ Firebase Spark plan)
- ไม่ป้องกันการโกงระดับจริงจัง — ออกแบบสำหรับเล่นกับเพื่อนที่ไว้ใจกัน (ดูหัวข้อ 4.4)

---

## 2. Tech Stack

| ส่วน | เลือกใช้ | หมายเหตุ |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict) | SPA ล้วน ไม่ใช้ Vercel Functions |
| Routing | `react-router-dom` v6 | `/` = Home, `/:code` = Room (ล็อบบี้/โต๊ะเกม) |
| Styling | Tailwind CSS + `src/styles/global.css` | tokens จาก `design/home.html` ใน `tailwind.config`; ลาย halftone/ลายเส้นเฉียงอยู่ใน global.css |
| Fonts | `@fontsource` (self-host) | Kanit 500/700/800, Sarabun 400/500/600, IBM Plex Mono 500/600 พร้อม subset ไทย, fallback `system-ui` |
| Icons | `lucide-react` + SVG วาดเอง | สัญลักษณ์ตระกูลและการ์ดวาด SVG เอง |
| Animation | Framer Motion | จั่ว/ลงการ์ด, offer bubble, แถบนับถอยหลัง (ต้องเคารพ `prefers-reduced-motion`) |
| State (client) | Zustand | store แยก: `roomStore`, `uiStore` |
| Backend | Firebase Realtime Database + Anonymous Auth | Spark plan, region `asia-southeast1` |
| Test | Vitest (engine), Firebase Emulator Suite (rules), Playwright (e2e 1 สถานการณ์ ใน M5) | |
| Lint/Format | ESLint + Prettier | |
| Deploy | Vercel (static) | SPA rewrite ทุก path → `index.html` |
| Runtime | Node ≥ 20 LTS, npm, Java (สำหรับ Emulator), Firebase CLI | |

npm scripts ที่ต้องมี: `dev`, `build`, `typecheck`, `lint`, `test`, `test:rules`, `emulators`, `test:e2e`

ข้อจำกัด Spark plan ที่ต้องรู้: RTDB 100 concurrent connections, 1 GB stored, 10 GB/เดือน download — เพียงพอสำหรับกลุ่มเพื่อน แต่ต้องไม่เขียน state ทั้งก้อนทุก tick (ดูหัวข้อ 4.3) และต้องมีการลบห้องเก่า (ดูหัวข้อ 8.5)

---

## 3. กติกาเกม (Game Data & Rules) — ฉบับที่ใช้พัฒนา

เก็บตัวเลขเป็น config แยกจาก logic ทั้งหมด เพื่อแก้ได้โดยไม่แตะ engine ศัพท์เกม: **นักลงทุน** (investor card, หน้าตัก, 1 ตระกูล = 1 ใบ), **การ์ดญาติ** (`clan`, อยู่ในมือ), **การ์ดอิทธิพล** (influence cards: clan/travel/recruitment/stop/imTheBoss), **ดีล** (deal = ช่องบนกระดาน), **แผ่นดีล** (deal tile), **ส่วนแบ่ง** (dividend)

### 3.1 `src/engine/config/families.ts`
- ผู้เล่น: **3 ถึง 6 คน** (`MIN_PLAYERS = 3`, `MAX_PLAYERS = 6`)
- 6 ตระกูลนักลงทุน เรียงตามลำดับนี้เท่านั้น (ใช้เป็นลำดับ A–F และลำดับตัดสินผู้เล่นคนแรก):

| ลำดับ | `FamilyColor` | ชื่อไทย | สัญลักษณ์ (SVG `em-*`) | สี token |
|---|---|---|---|---|
| A | `red` | แดง | circle | `--red` #C8382D |
| B | `blue` | น้ำเงิน | square | `--blue` #2B59C3 |
| C | `green` | เขียว | triangle | `--green` #2E8B57 |
| D | `yellow` | เหลือง | diamond | `--yellow` #E8B730 (ตัวอักษรบนการ์ดใช้สี `--ink`) |
| E | `purple` | ม่วง | star | `--purple` #7B4FB3 |
| F | `black` | ดำ | hex | `--black` #26252B |

```ts
export const FAMILY_ORDER = ['red', 'blue', 'green', 'yellow', 'purple', 'black'] as const;
export type FamilyColor = (typeof FAMILY_ORDER)[number];
```
- นักลงทุน (Permanent Investor Cards) แจกตอนเริ่มเกม สุ่มด้วย seeded RNG:
  - **3 คน:** คนละ 2 ใบ (ไม่เหลือ)
  - **4 คน:** คนละ 1 ใบ (เหลือ 2 ใบเป็น `unclaimedInvestors`)
  - **5 คน:** คนละ 1 ใบ (เหลือ 1 ใบเป็น `unclaimedInvestors`)
  - **6 คน:** คนละ 1 ใบ (ไม่เหลือ)
- นักลงทุนแต่ละตระกูลมี **ใบเดียวเท่านั้น** (ถือบนโต๊ะ เปิดหงาย) จึงเก็บเป็นรายการสี `FamilyColor[]` ต่อผู้เล่นได้ ไม่ต้องใช้ตัวนับ
- `unclaimedInvestors`: ไม่มีเจ้าของ นำมาร่วมดีลโดยตรงไม่ได้ จนกว่าจะมีผู้เล่นใช้ `recruitment` 3 ใบดึงมา (ระหว่างนั้นต้องใช้การ์ดญาติ `clan` สีเดียวกันจากมือแทน)

### 3.2 `src/engine/config/influenceCards.ts` (รวม 98 ใบ — ยืนยันตรงต้นฉบับแล้ว)
```ts
type InfluenceCard =
  | { id: string; kind: 'clan'; color: FamilyColor }               // การ์ดญาติ: 24 ใบ (สีละ 4 x 6 สี)
  | { id: string; kind: 'travel'; color: FamilyColor | 'wild' }    // ส่งไปพักร้อน: 21 ใบ (สีละ 3 x 6 = 18 + wild 3)
  | { id: string; kind: 'recruitment' }                            // ซื้อตัวนักลงทุน: 33 ใบ (ต้องลงพร้อมกันชุดละ 3)
  | { id: string; kind: 'stop' }                                   // หยุด!: 10 ใบ
  | { id: string; kind: 'imTheBoss' };                             // แย่งเป็นบอส: 10 ใบ
```
- ผลรวม `24 + 21 + 33 + 10 + 10 = 98` — ต้องมี unit test ตรวจจำนวนแต่ละชนิดและผลรวม

### 3.3 `src/engine/config/dealBoard.ts` และ `dealTiles.ts`

**โครงสร้างตามต้นฉบับ:** กระดานมี **16 ช่อง** แต่มีแผ่นดีล **15 แผ่น** (#1–#15) ทุกครั้งที่ปิดดีลสำเร็จ จะวางแผ่นดีลใบบนสุดคว่ำทับช่องนั้น (ปิดช่อง) เมื่อปิดครบ 15 เกมจบทันที จึงเหลือช่องว่างอย่างน้อย 1 ช่องเสมอ

- เงินรวมของดีล = `space.dividends × tile.valuePerDividend` โดย `tile` คือแผ่นดีลใบที่กำลังจะวาง = **แผ่น #`(dealsClosed + 1)`** (ค่าต่อส่วนแบ่งเพิ่มขึ้นตามลำดับดีลที่ปิด ไม่ได้ตายตัวต่อช่อง)
- ทุกช่อง `dividends = requiredInvestors + 1`
- ช่อง 1–16 เรียงตามเข็มนาฬิกา เริ่มจากมุมซ้ายบน (ตำแหน่งบนจอดูหัวข้อ 9.1)

```ts
export interface DealRequirementGroup {
  pick: number;
  colors: FamilyColor[]; // pick === colors.length  => ทุกสีในกลุ่มเป็นสีบังคับ
                         // pick <  colors.length  => เลือกพอดี `pick` สีจากกลุ่มนี้
}

export interface DealSpace {
  index: number;             // 1..16
  requiredInvestors: number; // จำนวนนักลงทุนที่ต้องใช้พอดี
  dividends: number;         // = requiredInvestors + 1
  groups: DealRequirementGroup[]; // กลุ่มในช่องเดียวกันไม่ซ้อนทับกัน และ sum(pick) = requiredInvestors
}

// ข้อมูลทั้ง 16 ช่องตามกระดานต้นฉบับ (สี 'black' ของเราแทนสีส้มของต้นฉบับ)
export const DEAL_BOARD_SPACES: DealSpace[] = [
  { index: 1,  requiredInvestors: 5, dividends: 6, groups: [{ pick: 2, colors: ['red', 'blue'] }, { pick: 3, colors: ['yellow', 'green', 'purple', 'black'] }] },
  { index: 2,  requiredInvestors: 4, dividends: 5, groups: [{ pick: 4, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'black'] }] },
  { index: 3,  requiredInvestors: 3, dividends: 4, groups: [{ pick: 3, colors: ['red', 'blue', 'black'] }] },
  { index: 4,  requiredInvestors: 4, dividends: 5, groups: [{ pick: 2, colors: ['red', 'blue', 'green'] }, { pick: 2, colors: ['yellow', 'purple', 'black'] }] },
  { index: 5,  requiredInvestors: 5, dividends: 6, groups: [{ pick: 2, colors: ['green', 'purple'] }, { pick: 3, colors: ['red', 'blue', 'yellow', 'black'] }] },
  { index: 6,  requiredInvestors: 3, dividends: 4, groups: [{ pick: 2, colors: ['green', 'purple'] }, { pick: 1, colors: ['red', 'blue', 'yellow'] }] },
  { index: 7,  requiredInvestors: 3, dividends: 4, groups: [{ pick: 1, colors: ['blue', 'yellow'] }, { pick: 1, colors: ['red', 'purple'] }, { pick: 1, colors: ['green', 'black'] }] },
  { index: 8,  requiredInvestors: 2, dividends: 3, groups: [{ pick: 2, colors: ['green', 'yellow'] }] },
  { index: 9,  requiredInvestors: 5, dividends: 6, groups: [{ pick: 1, colors: ['blue'] }, { pick: 4, colors: ['red', 'green', 'yellow', 'purple', 'black'] }] },
  { index: 10, requiredInvestors: 2, dividends: 3, groups: [{ pick: 2, colors: ['red', 'black'] }] },
  { index: 11, requiredInvestors: 4, dividends: 5, groups: [{ pick: 4, colors: ['red', 'green', 'yellow', 'purple', 'black'] }] },
  { index: 12, requiredInvestors: 3, dividends: 4, groups: [{ pick: 2, colors: ['blue', 'yellow', 'black'] }, { pick: 1, colors: ['green', 'purple'] }] },
  { index: 13, requiredInvestors: 5, dividends: 6, groups: [{ pick: 3, colors: ['red', 'blue', 'yellow'] }, { pick: 2, colors: ['green', 'purple', 'black'] }] },
  { index: 14, requiredInvestors: 3, dividends: 4, groups: [{ pick: 1, colors: ['yellow'] }, { pick: 1, colors: ['red', 'blue'] }, { pick: 1, colors: ['green', 'purple'] }] },
  { index: 15, requiredInvestors: 2, dividends: 3, groups: [{ pick: 2, colors: ['purple', 'black'] }] },
  { index: 16, requiredInvestors: 3, dividends: 4, groups: [{ pick: 3, colors: ['red', 'blue', 'yellow', 'black'] }] },
];
```

```ts
// dealTiles.ts — แผ่นดีล #1..#15 (valuePerDividend หน่วย: ล้าน)
export interface DealTile {
  number: number;            // 1..15
  valuePerDividend: number;
  endCheckFaces: number[];   // หน้าเต๋าที่ทำให้เกมจบหลังปิดดีลที่ใช้แผ่นนี้ ([] = ไม่เช็ก)
  autoEnd?: boolean;         // true = จบเกมทันที (แผ่น #15)
}
// #1–#3: 2 | #4–#6: 3 | #7–#9: 4 | #10–#15: 5
// endCheckFaces: #10 [1] | #11 [1,2] | #12 [1,2,3] | #13 [1,2,3,4] | #14 [1,2,3,4,5] | #15 autoEnd
```

**unit test ตรวจข้อมูล (ต้องมี):** กระดานมี 16 ช่อง index 1..16 ไม่ซ้ำ, แผ่นดีลมี 15 แผ่น, ทุกช่อง `sum(pick) === requiredInvestors`, `dividends === requiredInvestors + 1`, `pick <= colors.length`, กลุ่มในช่องเดียวกันไม่ซ้อนทับกัน, ทุกสีเป็น `FamilyColor` ที่ถูกต้อง, `valuePerDividend` ไม่ลดลงตามเลขแผ่น

### 3.4 `src/engine/config/rules.ts` และลำดับขั้นของเกม

ค่าคงที่: `STARTING_MONEY = 0`, `STARTING_HAND_SIZE = 5`, `HAND_LIMIT = 12`, `INTERRUPT_MS = 5000`, `GRACE_MS = 300`, `DEAL_TILE_COUNT = 15`

**เริ่มเกม (`SETUP`)**
- สับการ์ดอิทธิพล 98 ใบ, แจกนักลงทุนตามหัวข้อ 3.1, แจกการ์ดอิทธิพลคนละ 5 ใบ (ลับ), ทุกคนมีเงิน 0, กองที่เหลือเป็นกองจั่ว
- **ผู้เล่นคนแรก** สุ่มด้วย seeded RNG จากผู้เล่นทุกคนด้วยโอกาสเท่ากัน ก่อนแจกการ์ด เพื่อไม่ให้สีนักลงทุนมีผล และสุ่มใหม่ทุกเกม/รีแมตช์
- หมาก `$` ของทุกคนเริ่มที่ **ช่อง 1** และเข้าสู่ `TURN_START` เทิร์นที่ 1 ทันที ไม่มีขั้นตอนเลือกช่องเริ่มต้น

**ต้นเทิร์น (`TURN_START`)** — ผู้เล่นที่ถึงเทิร์นเป็นบอส ต้อง **ทอยเต๋า 1 ลูก (1–6)** (`ROLL_DICE`) ทุกเทิร์น รวมถึงเทิร์นแรก แล้วเดินหมากตามเข็มนาฬิกาครบแต้ม **ข้ามช่องที่ปิดแล้ว (ไม่นับเป็นก้าว)** วนมาหยุดช่องเดิมได้ ถือเป็น "ช่องใหม่" เมื่อหมากหยุด เลือก 1 อย่าง:
1. **จั่วการ์ดอิทธิพล 3 ใบ** (`DRAW_CARDS`) → เช็กไพ่เกิน 12 → จบเทิร์น
2. **ประกาศเปิดดีลที่ช่องใหม่** (`OPEN_DEAL`) — หมาก `$` ต้องอยู่บนช่องที่ยังไม่ปิดเสมอ ไม่มีข้อจำกัดเรื่องช่องที่เพิ่งล้ม ผู้เล่นคนถัดไปเปิดช่องเดิมได้ทันที

**การเปิดดีล (`DEAL_OPEN`)**
- นักลงทุนหน้าตักของบอสทุกใบที่สีอยู่ในเงื่อนไขของช่องถือว่าร่วมดีลโดยอัตโนมัติ (ยกเว้นติดพักร้อน) บอสวางการ์ดญาติจากมือได้ตอนประกาศเปิดดีล (`OPEN_DEAL { clanCardIds }`) และเพิ่มภายหลังได้ (`BOSS_ADD_CLAN`) แต่ถอนคืนไม่ได้
- ผู้เล่นอื่นยื่นข้อเสนอ ต่อ 1 ตระกูล: `(สี, source, amount)` โดย `amount` คือ **จำนวนส่วนแบ่ง (dividends) เป็นจำนวนเต็ม ≥ 1** (ไม่ใช่จำนวนเงินดิบ) ผู้เล่น 1 คนยื่นได้หลายข้อ ข้อละ 1 ตระกูล (เกม 3 คนมีนักลงทุนคนละ 2 ใบ)
  - `source = 'table'`: เสนอนักลงทุนหน้าตัก (ด้วยวาจา) ถอน/แก้ได้ (`WITHDRAW_OFFER`)
  - `source = 'hand'`: เสนอการ์ดญาติ วางหงายบนโต๊ะ **ถอนคืนไม่ได้จนจบดีล** (แม้ไม่ได้ข้อตกลง) ต่อรองได้เฉพาะจำนวนส่วนแบ่งที่ขอ
  - แก้จำนวนที่ขอได้เฉพาะข้อเสนอที่บอสยังไม่ได้รับ
  - การจ่ายต่อรองได้เฉพาะ "ส่วนแบ่งจากดีลนี้" ห้ามจ่ายล่วงหน้า ห้ามจ่ายจากเงินส่วนตัว
- บอสรับข้อเสนอได้ **1 ข้อต่อตระกูล** (รับข้อใหม่ในสีเดิมจะแทนข้อเก่า) และผลรวม `amount` ของข้อเสนอที่รับต้องไม่เกิน `space.dividends`
- **เงื่อนไขปิดดีลได้ (`isDealComplete`)**: ชุดสีที่ร่วมดีล (นักลงทุนของบอสที่อัตโนมัติ + การ์ดญาติของบอส + ข้อเสนอที่รับแล้ว) ต้อง **พอดีตามเงื่อนไขช่อง**: ทุกกลุ่มมีสีของกลุ่มนั้นร่วมครบ `pick` สีพอดี, ไม่มีสีนอกกลุ่ม, รวม `requiredInvestors` ใบ, แต่ละตระกูล 1 ใบ
- บอสกด `LOCK_DEAL` เมื่อเงื่อนไขครบ → เข้าหน้าต่างขัดจังหวะ (หัวข้อ 3.5) ถึงหมดเวลาหรือทุกคนผ่านจึงปิดดีล

**การปิดดีล (`DEAL_RESOLVE`)** — ลำดับ:
1. เงินที่บอสได้ = `(space.dividends − Σ amount ของข้อเสนอที่รับ) × tile.valuePerDividend` ธนาคารจ่ายให้ ส่วนแต่ละผู้เสนอได้ `amount × tile.valuePerDividend` จากบอส ทุกการจ่ายต้องเป็นไปตามข้อตกลง
2. การ์ดญาติที่ถูกใช้ปิดดีลลง `discardPile`; **การ์ดญาติที่วางไว้แต่ไม่ถูกใช้ กลับเข้ามือเจ้าของ**; การ์ดแอ็กชันที่ลงในดีลทั้งหมดลง `discardPile`; นักลงทุนหน้าตักยังอยู่กับเจ้าของ; `onVacation` ล้างทั้งหมด
3. วางแผ่นดีล #(`dealsClosed + 1`) ทับช่อง → ช่องปิด → `dealsClosed++`
4. **หมาก `$` เลื่อนตามเข็มนาฬิกาไปยังช่องที่ยังไม่ปิดช่องถัดไปทันที**
5. `END_CHECK` (หัวข้อ 3.4 ท้ายสุด)
6. เทิร์นถัดไป = **ผู้เล่นทางซ้ายของบอสที่ปิดดีล** (ถ้าถูกแย่งบอส ใช้บอสคนปัจจุบัน ไม่ใช่เจ้าของเทิร์นเดิม)

**ดีลล้ม (`FAIL_DEAL`)** — บอสปัจจุบันกดได้ในช่วง `DEAL_OPEN` (ถ้า lock อยู่ต้อง `CANCEL_LOCK` ก่อน):
- ช่อง **ไม่ปิด** ไม่วางแผ่นดีล หมาก `$` **อยู่ที่ช่องเดิม**
- การ์ดญาติที่วางในดีลและยังไม่ถูกทิ้ง กลับเข้ามือเจ้าของ; การ์ดแอ็กชันทั้งหมดที่ลงในดีลลง `discardPile`; `onVacation` ล้าง
- บอสไม่ได้ทอยเต๋าหรือจั่วเพิ่ม → เช็กไพ่เกิน 12 → เทิร์นไปทางซ้ายของบอสปัจจุบัน

**เช็กจบเกม (`END_CHECK`)** — หลังปิดดีลสำเร็จทุกครั้ง ใช้แผ่นดีลที่เพิ่งวาง (#`dealsClosed`):
- `dealsClosed < 10`: เล่นต่อ
- `10 ≤ dealsClosed ≤ 14`: ระบบทอยเต๋า 1 ลูกอัตโนมัติ (seeded) ถ้าแต้มอยู่ใน `endCheckFaces` ของแผ่นนั้น เกมจบ (#10 → `[1]`, #11 → `[1,2]`, #12 → `[1,2,3]`, #13 → `[1,2,3,4]`, #14 → `[1,2,3,4,5]`)
- `dealsClosed === 15`: จบทันที ไม่ต้องทอย
- ผู้ชนะ: เงินรวมมากที่สุด **ถ้าเท่ากัน ชนะร่วมกัน** (ไม่นับไพ่ในมือ)

**กองจั่ว/ไพ่ในมือ:** กองจั่วหมดให้สับ `discardPile` เป็นกองจั่วใหม่ด้วย seeded RNG (ถ้ากองทิ้งว่างด้วย จั่วได้เท่าที่มี) ผู้เล่นถือการ์ดอิทธิพลได้ไม่เกิน 12 ใบ ถ้าเกินหลังจั่วต้องเลือกทิ้งจนเหลือ 12 (`DISCARD`) มือเติมได้ทางเดียวคือ `DRAW_CARDS` (ไม่มีการจั่วเพิ่มหลังปิดดีล)

### 3.5 การ์ดแอ็กชันและหน้าต่างขัดจังหวะ (`Interrupt Rules`)

- การ์ดแอ็กชันทุกชนิดลงได้เฉพาะช่วง `DEAL_OPEN` (รวมหน้าต่างขัดจังหวะ) เท่านั้น และไม่มีใครลงได้หลังดีลปิดแล้ว
- ผู้เล่นทุกคนรวมบอสลงการ์ดได้ ไม่มีลำดับเทิร์นระหว่างเจรจา

**`travel` (ส่งไปพักร้อน, 1 ใบ)** — เป้าหมายคือนักลงทุนหน้าตักของผู้เล่นอื่น หรือการ์ดญาติที่วางในดีล โดยสีต้องตรงกับการ์ด (`wild` = สีใดก็ได้)
- เป้าหมายเป็นนักลงทุนหน้าตัก → ตระกูลนั้นติด `onVacation` จนจบการเจรจา (สำเร็จหรือล้ม) ห้ามใช้ใบนั้นในดีลนี้ แต่ใช้การ์ดญาติสีเดียวกันจากมือแทนได้ การ์ด `travel` ลงกองทิ้งตอนจบการเจรจา ข้อเสนอที่ใช้นักลงทุนใบนั้นถูกลบ
- เป้าหมายเป็นการ์ดญาติในดีล → **ทั้งสองใบลงกองทิ้งทันที** ข้อเสนอนั้นถูกลบ

**`recruitment` (ซื้อตัวนักลงทุน, ต้องลงพร้อมกัน 3 ใบ)** — ย้ายนักลงทุน 1 ใบมาเป็นของตัวเองถาวร แล้วการ์ดทั้ง 3 ใบลงกองทิ้ง
- ถ้ายังมี `unclaimedInvestors` (เกม 4–5 คน) **ต้องเลือกจากข้างกระดานก่อน** จนกว่าจะหมด หลังจากนั้นเลือกจากผู้เล่นอื่นได้
- ถ้านักลงทุนใบนั้นติด `onVacation` สถานะพักร้อน **ยังคงอยู่จนจบดีลปัจจุบัน** (ไม่หายทันที) ข้อเสนอที่ผูกกับนักลงทุนใบนั้นของเจ้าของเดิมถูกลบ เจ้าของใหม่ยื่นข้อเสนอใหม่ได้

**`imTheBoss` (แย่งเป็นบอส, 1 ใบ)** — ผู้ลงเป็น `bossUid` ทันที บอสเดิมกลายเป็นผู้เล่นที่ยังต่อรองได้ การ์ดญาติและ `travel` ที่ลงไว้ยังอยู่บนโต๊ะ ลงซ้อนหลายใบในดีลเดียวได้
- ข้อตกลงเดิมรักษาไว้หรือยกเลิกก็ได้ตามบอสใหม่ → ใน engine: ยกเลิก lock, เก็บข้อเสนอไว้ แต่ล้างสถานะ "รับแล้ว" ให้บอสใหม่เลือกใหม่ (`ASSUMPTION`)
- การ์ดของบอสใหม่ที่อยู่ในดีลกลายเป็นการร่วมดีลฟรี; การ์ดของบอสเดิมที่ร่วมดีลฟรีอยู่ กลายเป็นข้อเสนอที่ต้องกำหนดจำนวนส่วนแบ่ง (ยังไม่ถูกรับ) (`ASSUMPTION`)
- เทิร์นถัดไปนับจากบอสคนปัจจุบันตอนดีลจบ (หัวข้อ 3.4)

**`stop` (หยุด!, 1 ใบ)** — ลงได้ทันทีหลังการ์ด `travel`, `recruitment` หรือ `imTheBoss` ใบนั้น ยกเลิกผลของการ์ดใบนั้น (ทั้งคู่ลงกองทิ้ง; ถ้าเป็น `recruitment` ทั้ง 3 ใบลงกองทิ้งโดยไม่มีผล)
- **ห้ามใช้ `stop` สกัด `stop`** และไม่สกัดการ `LOCK_DEAL`
- ผู้เล่นคนใดก็ได้ที่ไม่ใช่ผู้ลงการ์ดใบนั้นลงได้ ผูกกับการ์ดเป้าหมาย 1 ใบ (`PLAY_STOP { targetPendingId }`)
- ถ้า A ลง `travel` แล้ว B ลง `stop` ถือว่า `travel` ถูกยกเลิก (ถ้า A ต้องการต่อ ต้องลง `travel` ใบใหม่จากมือ)

**กลไกการประมวลผล (ค่าที่ตัดสินใจแล้ว):**
- การ์ดที่ลง **ไม่มีผลทันที** แต่เข้าคิว `pendingCards` และแสดงบนโต๊ะเป็น "รอผล" ผลเกิดเมื่อหน้าต่างปิดโดยไม่มีใครลง `stop` (ไม่ต้องย้อนสถานะ) ลงซ้อนได้หลายใบ ประมวลผลตามลำดับ `ts` แล้วตาม push key
- ทุกการ์ดที่ลงรีเซ็ต `deadline = now + INTERRUPT_MS`
- **หน้าต่างขัดจังหวะ** เปิดเมื่อ (ก) บอสกด `LOCK_DEAL` (`reason: 'dealLocked'`) หรือ (ข) มีคนลงการ์ดแอ็กชัน (`reason: 'cardPlayed'`)
- ระหว่างหน้าต่างเปิด **ห้ามยื่น/ถอน/รับ/ยกเลิกรับข้อเสนอ** ทำได้เฉพาะลงการ์ด, `PASS_WINDOW` และบอสกด `CANCEL_LOCK`
- ถ้าผลการ์ดทำให้ดีลไม่ครบเงื่อนไข → ยกเลิก lock กลับ `DEAL_OPEN`
- **ค่าที่ต่างจากต้นฉบับโดยตั้งใจ (การตัดสินใจของผู้ใช้):** แม้บอสถือนักลงทุนครบเองตั้งแต่เปิดดีล ก็ต้องกด `LOCK_DEAL` และผ่านหน้าต่างขัดจังหวะเสมอ (ต้นฉบับปิดดีลทันที) เพื่อให้ผู้เล่นอื่นยังลงการ์ดป่วนได้ — ถ้าไม่มีใครป่วน ทุกคนกด `PASS_WINDOW` หน้าต่างก็ปิดทันที

### 3.6 รายการ `ASSUMPTION` (ต้นฉบับไม่ลงรายละเอียด — agent ต้องรายงานตอนจบ M1)
1. บอสถือนักลงทุนเกินจำนวนที่กลุ่มต้องการ (overfill) → บอสต้องเลือกว่าจะไม่ใช้ตระกูลใด (`OPEN_DEAL { excludeColors }`); นักลงทุนของบอสที่สีไม่อยู่ในเงื่อนไขช่องไม่นับ
2. ผลของ `imTheBoss` ต่อข้อเสนอ/การรับ/การ์ดของบอสเดิม-ใหม่ (หัวข้อ 3.5)
3. `travel` เล็งได้เฉพาะนักลงทุนของผู้เล่นอื่นหรือการ์ดญาติในดีล และเล็งนักลงทุนที่ติดพักร้อนอยู่แล้วไม่ได้
4. `stop` ลงได้โดยผู้เล่นที่ไม่ใช่ผู้ลงการ์ดเป้าหมาย และการ์ดมีผลตอนหน้าต่างปิด (กลไกคิว)
5. `onVacation` คงอยู่เมื่อนักลงทุนถูกแย่งด้วย `recruitment` (การตัดสินใจของผู้ใช้)
6. เงินเท่ากันตอนจบ = ชนะร่วม
7. แก้จำนวนส่วนแบ่งของข้อเสนอได้เฉพาะก่อนถูกรับ และข้อเสนอการ์ดญาติถอนไม่ได้
8. ผู้เล่นที่หลุด ถือเป็น `PASS_WINDOW` อัตโนมัติ

---

## 4. สถาปัตยกรรม

### 4.1 หลักการ: Single Host Authority + Action Queue
- **"Host" = เครื่องเดียวในห้อง** (เริ่มต้นคือผู้สร้างห้อง) เป็นผู้เดียวที่รัน engine และเขียน state
  - ไม่ใช้ "บอสของเทิร์น" เป็นผู้คำนวณ เพราะบอสเปลี่ยนบ่อย (รวมถึงโดน `imTheBoss` แย่ง) จะเกิด race condition และต้องย้ายข้อมูลลับทุกเทิร์น
- ผู้เล่นทุกคน (รวม host เอง) **ส่งเจตนา (Action)** ลง `actions/` เท่านั้น
- Host ฟัง `actions/` ตามลำดับ push key → validate → `applyAction()` → เขียน projection ลง `public/`, `private/{uid}`, `hostState/` → ลบ action ที่ประมวลผลแล้ว
- Action ที่ไม่ผ่าน validate: host เขียน `public/rejections/{uid}` = `{ reason, actionId }` เพื่อให้ UI ของคนนั้นแสดง toast

```
Client (ทุกคน) --push--> rooms/{code}/actions
                              |
Host: listen -> validate -> engine.applyAction(fullState, action) -> project()
                              |
     +------------------------+-----------------------------+
     v                        v                             v
rooms/{code}/public    rooms/{code}/private/{uid}     rooms/{code}/hostState
(ทุกคนอ่าน)            (เจ้าของ + host อ่าน)           (host อ่านเท่านั้น)
```

### 4.2 Engine (pure)
```ts
applyAction(state: FullGameState, action: GameAction, now: number): {
  state: FullGameState;
  events: GameEvent[];          // สำหรับ log + animation
} | { error: RejectReason };

tick(state: FullGameState, now: number): { state; events } // ปิดหน้าต่างขัดจังหวะเมื่อหมดเวลา
project(state: FullGameState): { public: PublicState; private: Record<Uid, PrivateState> };
```
- RNG แบบ seeded (เช่น mulberry32) เก็บ `rngState` ใน `FullGameState` → สับไพ่/ทอยเต๋า reproducible, ทดสอบได้, และ host ใหม่ทำต่อได้
- ทุก rule check อยู่ใน `validators.ts` (เช่น ผู้เล่นมีการ์ดนั้นจริงไหม, phase ถูกไหม, ใช่บอสไหม, `isDealComplete`)
- `DEAL_RESOLVE` และ `END_CHECK` เป็นขั้นตอนภายในที่เกิดต่อเนื่องในการประมวลผลเดียว (ไม่ใช่ phase ที่ผู้เล่นรอ) และปล่อย `GameEvent` ให้ UI เล่น animation
- ห้ามฝังตัวเลขกติกาใน engine ต้องอ่านจาก `engine/config/*`

### 4.3 การเขียนข้อมูล (ประหยัด bandwidth)
- เขียนเฉพาะ path ที่เปลี่ยน ด้วย multi-path `update()` ครั้งเดียวต่อ action
- `public.log` เก็บแค่ 50 event ล่าสุด
- ห้ามเขียนตัวนับเวลาลง DB ทุกวินาที — เขียนแค่ `deadline` (server time) ครั้งเดียว แล้วให้ client นับถอยหลังเอง

### 4.4 ข้อมูลลับและระดับความปลอดภัย (สำคัญ)
- ถ้าเก็บไพ่ในมือ/เงินไว้ใน path ที่ทุกคนอ่านได้ ใครเปิด DevTools ก็เห็นหมด → **ต้องแยก path และบังคับด้วย Security Rules** (หัวข้อ 6)
- ข้อจำกัดที่ยอมรับ: **Host เห็นข้อมูลทุกอย่างได้ทางเทคนิค** (ไม่มี server กลาง) — เหมาะกับเล่นกับเพื่อน ให้แสดงข้อความนี้ใน README
- เงินของทุกคน: อยู่ใน `private/{uid}.money` จนจบเกม แล้ว host คัดลอกไป `public.finalScores` พร้อมกันทีเดียว
- การ์ดญาติที่วางหงายบนโต๊ะในดีล เป็นข้อมูลสาธารณะระดับ "สี" (ไม่เปิดเผย `cardId`)

---

## 5. Data Model (RTDB)

```jsonc
rooms/{roomCode}/
  meta: {
    hostUid: string,
    hostConnected: boolean,
    status: "lobby" | "playing" | "finished",
    createdAt: number,          // ServerValue.TIMESTAMP
    schemaVersion: 1
  }
  players/{uid}: {
    name: string,               // 1–16 ตัวอักษร (ชื่อซ้ำจะต่อท้ายอัตโนมัติ เช่น "Fern 2")
    seat: number,               // 0..5 — host กำหนดจริงตอน START_GAME (เรียงตาม joinedAt)
    connected: boolean,         // presence ผ่าน onDisconnect
    lastSeen: number,
    joinedAt: number
  }
  public: {
    phase: Phase,
    turnNumber: number,
    bossUid: string,                                  // ต้นเทิร์น = ผู้เล่นที่ถึงเทิร์น; ระหว่างดีล = บอสปัจจุบัน
    pawnSpace: number,                                // 1..16 ตำแหน่งหมาก $ (เริ่มที่ 1)
    closedSpaces: number[],                           // ช่องที่ปิดแล้ว (ถูกทับด้วยแผ่นดีล)
    dealsClosed: number,                              // 0..15
    tableInvestors: { [uid]: FamilyColor[] },         // นักลงทุนหน้าตัก (เปิดหงาย)
    unclaimedInvestors: FamilyColor[],                // นักลงทุนข้างกระดาน (เกม 4–5 คน)
    onVacation: FamilyColor[],                        // ตระกูลที่ติดพักร้อน (ผูกกับสี ไม่ผูก uid)
    handCounts: { [uid]: number },                    // จำนวนการ์ดในมือ (โชว์การ์ดคว่ำ)
    deckCount: number,
    discardCount: number,
    deal: PublicDeal | null,                          // null เมื่อไม่มีดีลเปิด
    pendingCards: PendingCard[],                      // การ์ดแอ็กชันที่ลงแล้วรอผล
    window: InterruptWindow | null,
    lastDice: number[] | null,
    log: GameEvent[],
    finalScores: { [uid]: number } | null,
    rejections: { [uid]: { reason: string, actionId: string } }
  }
  private/{uid}: {
    hand: InfluenceCard[],
    money: number
  }
  hostState: FullGameState      // รวม deck, discard, rngState, cardId ทั้งหมด, ทุกอย่าง
  actions/{pushId}: {
    uid: string,
    type: ActionType,
    payload: object,
    ts: number                  // ServerValue.TIMESTAMP
  }
```

```ts
type Phase =
  | 'lobby'
  | 'turnStart'        // เลือก OPEN_DEAL หรือ ROLL_DICE
  | 'afterMove'        // หมากหยุดช่องใหม่ เลือก DRAW_CARDS หรือ OPEN_DEAL
  | 'dealOpen'         // เจรจา (หน้าต่างขัดจังหวะเป็น overlay ซ้อน ดู public.window)
  | 'turnEndDiscard'   // บังคับทิ้งไพ่จนเหลือ 12
  | 'gameOver';

interface PublicDeal {
  space: number;                                      // 1..16
  requirements: DealSpace;                            // สำเนาเงื่อนไขช่อง (จาก config)
  tileNumber: number;                                 // แผ่นดีลที่จะใช้ = dealsClosed + 1
  bossClans: FamilyColor[];                           // การ์ดญาติของบอสที่วางในดีล (สีเท่านั้น)
  offers: { [uid]: { [color in FamilyColor]?: Offer } };
  acceptedOffers: { [color in FamilyColor]?: string };// สี -> uid ที่บอสเลือก
  excludedColors: FamilyColor[];                      // ตระกูลของบอสที่ไม่ใช้ (กรณี overfill)
  locked: boolean;
}

interface Offer {
  color: FamilyColor;
  source: 'table' | 'hand';     // นักลงทุนหน้าตัก หรือ การ์ดญาติในมือ (วางหงายบนโต๊ะ)
  cardId?: string;              // ถ้า source = 'hand' — อยู่เฉพาะ hostState/ห้ามเขียนลง public
  amount: number;               // จำนวนส่วนแบ่ง (dividends) ที่ขอ เป็นจำนวนเต็ม >= 1
  submittedAt: number;
}

interface PendingCard {
  id: string;                   // pending id ใช้เป็นเป้าหมายของ stop
  kind: 'travel' | 'recruitment' | 'imTheBoss';
  playerUid: string;
  target?: { color: FamilyColor; uid?: string; inDeal?: boolean };  // รายละเอียดเป้าหมาย
  stoppedBy?: string;           // uid ผู้ลง stop
}

interface InterruptWindow {
  reason: 'dealLocked' | 'cardPlayed';
  triggeredBy: string;          // uid
  deadline: number;             // server time (ms)
  passed: string[];             // uid ที่กด "ผ่าน" แล้ว
}
```
หมายเหตุ: `public.deal.offers` ห้ามมี `cardId` — `project()` ต้องตัดทิ้ง และ `public` ห้ามมี `hand`, `money`, `deck`

---

## 6. Firebase Security Rules (`database.rules.json`) — โครงร่าง

> โครงร่างนี้ต้องทดสอบจริงใน Emulator (Milestone 3) ไม่ใช่ของพร้อมใช้ ระวัง: `.write` ที่ระดับพ่อแม่จะ cascade ลงลูกและเพิกถอนที่ระดับลูกไม่ได้ ต้องเขียนเงื่อนไขให้แคบ

```jsonc
{
  "rules": {
    "rooms": {
      "$code": {
        // helper ที่ใช้ซ้ำ (เขียนเต็มในไฟล์จริง):
        // isHost   = auth.uid === root.child('rooms/'+$code+'/meta/hostUid').val()
        // isMember = root.child('rooms/'+$code+'/players/'+auth.uid).exists()
        // inLobby  = root.child('rooms/'+$code+'/meta/status').val() === 'lobby'

        // ลบทั้งห้องได้เฉพาะ host หรือห้องที่เก่ากว่า 24 ชั่วโมง (ไม่มี Cloud Functions ให้ล้างห้องเก่า)
        // เงื่อนไขกว้างเฉพาะการลบ (newData ไม่มี) จึงไม่ cascade เป็นสิทธิ์เขียนลูก
        ".write": "!newData.exists() && data.exists() && (isHost || data.child('meta/createdAt').val() < now - 86400000)",

        "meta": {
          ".read": "auth != null",
          ".write": "auth != null && !data.exists()",           // สร้างห้องครั้งแรก
          "hostUid": {
            // เปลี่ยน host ได้เมื่อ host เดิมหลุด และต้องตั้งเป็นตัวเอง
            ".write": "isMember && newData.val() === auth.uid && data.parent().child('hostConnected').val() === false"
          },
          "hostConnected": { ".write": "isHost" },
          "status": { ".write": "isHost" }
        },
        "players": {
          ".read": "auth != null",
          ".validate": "newData.numChildren() <= 6",             // ไม่เกิน 6 คน
          "$uid": {
            // สร้างได้เฉพาะตัวเอง ตอนล็อบบี้ หรือ host (reclaim/ย้ายที่นั่ง) — เข้าห้องหลังเริ่มเกมไม่ได้
            ".write": "isHost || (auth.uid === $uid && !data.exists() && inLobby)",
            ".validate": "newData.child('name').isString() && newData.child('name').val().length >= 1 && newData.child('name').val().length <= 16 && newData.child('seat').val() >= 0 && newData.child('seat').val() <= 5",
            // แก้ presence รายฟิลด์ได้เสมอ; ชื่อ/ที่นั่งแก้ได้เฉพาะ host หรือเจ้าของตอนล็อบบี้
            "connected": { ".write": "auth.uid === $uid || isHost" },
            "lastSeen":  { ".write": "auth.uid === $uid || isHost" },
            "name":      { ".write": "isHost || (auth.uid === $uid && inLobby)" },
            "seat":      { ".write": "isHost || (auth.uid === $uid && inLobby)" }
          }
        },
        "public":    { ".read": "isMember", ".write": "isHost" },
        "private": {
          "$uid": { ".read": "auth.uid === $uid || isHost", ".write": "isHost" }
        },
        "hostState": { ".read": "isHost", ".write": "isHost" },
        "actions": {
          ".read": "isHost",
          "$id": {
            ".write": "(isMember && !data.exists() && newData.child('uid').val() === auth.uid) || (isHost && !newData.exists())"
          }
        }
      }
    }
  }
}
```
- ความไม่ซ้ำของ `seat` ไม่ตรวจใน rules (ทำไม่ได้) — host กำหนด seat จริงตอน `START_GAME` ตามลำดับ `joinedAt`
- Rules tests ที่ต้องมี: ผู้เล่น A อ่าน `private/B` ไม่ได้; ผู้เล่นทั่วไปอ่าน `hostState` ไม่ได้; ส่ง action ปลอม uid คนอื่นไม่ได้; แย่ง host ไม่ได้ถ้า host ยัง connected; คนที่ 7 เข้าห้องไม่ได้; เขียน `players/$uid` ใหม่หลังเริ่มเกมไม่ได้ (ยกเว้น host); ผู้เล่นแก้ `seat`/`name` ตัวเองหลังเริ่มเกมไม่ได้; ลบห้องของคนอื่นที่อายุไม่เกิน 24 ชั่วโมงไม่ได้; ลบห้องเก่าเกิน 24 ชั่วโมงได้

---

## 7. Game Flow (State Machine)

```
LOBBY
  └─ START_GAME (host, ผู้เล่น ≥ 3) → SETUP (สับไพ่, แจกนักลงทุน/ไพ่, กำหนด seat, สุ่มผู้เล่นคนแรก, วางหมากช่อง 1)
TURN_START  (บอสคือผู้เล่นที่ถึงเทิร์น; ต้องทอยก่อนทุกเทิร์น)
  └─ ROLL_DICE → เดินหมากครบแต้ม ข้ามช่องที่ปิด → AFTER_MOVE
AFTER_MOVE
  ├─ DRAW_CARDS (จั่ว 3) → TURN_END
  └─ OPEN_DEAL (ช่องใหม่) → DEAL_OPEN
DEAL_OPEN  (ไม่มีเวลาจำกัด)
  ├─ ผู้เล่นอื่น SUBMIT_OFFER / WITHDRAW_OFFER (table เท่านั้น)
  ├─ บอส ACCEPT_OFFER / UNACCEPT_OFFER / BOSS_ADD_CLAN
  ├─ ใครก็ได้ลงการ์ดแอ็กชัน → เปิด INTERRUPT WINDOW (cardPlayed)
  ├─ บอส LOCK_DEAL (isDealComplete ต้องจริง) → INTERRUPT WINDOW (dealLocked)
  └─ บอส FAIL_DEAL (ต้อง CANCEL_LOCK ก่อนถ้า lock อยู่) → TURN_END (ดีลล้ม)
INTERRUPT WINDOW (overlay ซ้อนบน DEAL_OPEN)
  ├─ มีคนลงการ์ด (travel / recruitment / stop / imTheBoss) → เข้าคิว pendingCards, รีเซ็ต deadline = now + 5000
  ├─ ทุกคนที่ไม่ใช่ผู้ trigger กด PASS ครบ (ผู้เล่นที่หลุดนับเป็น pass) → ปิดทันที
  ├─ บอส CANCEL_LOCK → กลับ DEAL_OPEN
  └─ หมดเวลา (host tick) → ประมวลผล pendingCards ที่ไม่ถูก stop ตามลำดับ
        ├─ ผลการ์ดทำให้ดีลไม่ครบ/ imTheBoss → ยกเลิก lock กลับ DEAL_OPEN
        └─ ยัง lock อยู่และครบ → DEAL_RESOLVE
DEAL_RESOLVE (ภายใน)
  └─ จ่ายเงิน, ทิ้ง/คืนการ์ดญาติ, วางแผ่นดีล, ปิดช่อง, dealsClosed++, หมากเลื่อนไปช่องว่างถัดไป → END_CHECK
END_CHECK (ภายใน)
  ├─ dealsClosed === 15 → GAME_OVER
  ├─ 10 ≤ dealsClosed ≤ 14 → ทอยเต๋าอัตโนมัติ (แสดง animation) → หน้าเต๋าอยู่ใน endCheckFaces ของแผ่นนั้น → GAME_OVER
  └─ อื่นๆ → TURN_END
TURN_END
  └─ ผู้เล่นที่ถือการ์ด > 12 ใบ ต้อง DISCARD จนเหลือ 12 (UI บังคับเลือก) → บอสคนถัดไป (ซ้ายของบอสปัจจุบัน) → TURN_START
GAME_OVER
  └─ เปิดเผยเงินทุกคนพร้อมกัน, จัดอันดับ (เงินเท่ากัน = ชนะร่วม), ปุ่ม "เล่นอีกรอบ" (host)
```

### 7.1 Action types
`JOIN`, `LEAVE` (ล็อบบี้เท่านั้น), `START_GAME`, `ROLL_DICE`, `OPEN_DEAL` (`{ clanCardIds, excludeColors? }`), `DRAW_CARDS`, `SUBMIT_OFFER` (`{ color, source, cardId?, amount }`), `WITHDRAW_OFFER` (`{ color }` — table เท่านั้น), `ACCEPT_OFFER` (`{ color, uid }`), `UNACCEPT_OFFER` (`{ color }`), `BOSS_ADD_CLAN` (`{ cardId }`), `LOCK_DEAL`, `CANCEL_LOCK`, `FAIL_DEAL`, `PLAY_TRAVEL` (`{ cardId, target }`), `PLAY_RECRUITMENT` (`{ cardIds[3], targetColor }`), `PLAY_STOP` (`{ cardId, targetPendingId }`), `PLAY_IM_THE_BOSS` (`{ cardId }`), `PASS_WINDOW`, `DISCARD` (`{ cardIds }`), `SKIP_DISCONNECTED_BOSS` (host), `REMATCH` (host), `REASSIGN_SEAT` (host)

### 7.2 Interrupt timing (ความยุติธรรมเรื่องเวลา)
- `deadline` คำนวณจาก server time; client ใช้ `.info/serverTimeOffset` แปลงเป็นเวลาเครื่องตัวเองเพื่อวาดแถบนับถอยหลัง
- Host ตัดสินจาก `action.ts` (server timestamp) ไม่ใช่เวลาที่ host ได้รับ: action ที่ `ts <= deadline + GRACE_MS (300)` ถือว่าทัน
- Host ปิดหน้าต่างหลัง `deadline + GRACE_MS + 200ms` เพื่อรอ action ที่กำลังเดินทาง
- หลายคนลงการ์ดพร้อมกัน → ประมวลผลตามลำดับ `ts` แล้วตาม push key

---

## 8. การเชื่อมต่อ, Reconnection, Host Migration

### 8.1 เข้าห้อง
- หน้าแรก: ช่อง "ชื่อเล่น" (1–16 ตัวอักษร) + ปุ่ม "สร้างห้อง" / ช่อง "รหัสห้อง" + "เข้าร่วม" (ตามต้นแบบ `design/home.html`)
- รหัสห้อง **5 หลักตัวเลข** สุ่มด้วย `crypto.getRandomValues` **ไม่ขึ้นต้นด้วย 0** แล้วเช็กชนด้วย transaction บน `meta`
- ลิงก์ชวนเพื่อน: `/{roomCode}` (กดคัดลอกไปวางใน Discord ได้) หน้าแรกรองรับ prefill รหัสจาก `/{code}` และ `?room={code}`
- **ชื่อเล่นซ้ำในห้อง**: ต่อท้ายอัตโนมัติ เช่น "Fern 2" (ไม่สนตัวพิมพ์เล็กใหญ่) และบอกผู้ใช้ก่อนยืนยัน
- เก็บ `localStorage['lastNickname']` เพื่อเติมชื่อให้อัตโนมัติ
- ห้องเริ่มเกมแล้ว: คนใหม่เข้าไม่ได้ ยกเว้น reclaim ที่นั่ง (8.3) ห้องเต็ม (6 คน) เข้าไม่ได้

### 8.2 Reconnection
- Firebase Anonymous Auth เก็บ session ใน IndexedDB อยู่แล้ว → รีเฟรชได้ `uid` เดิม = ได้ที่นั่ง ไพ่ เงินเดิมอัตโนมัติ
- `localStorage['lastRoomCode']` ใช้ auto-rejoin และแสดงแบนเนอร์ "ห้อง X ยังรอ Y อยู่" ในหน้าแรก โดยแสดงเมื่อ **ห้องนั้นยังอยู่ (`status !== 'finished'`) และ uid ปัจจุบันอยู่ใน `players` ของห้อง** ถ้าไม่ผ่านให้ลบ `lastRoomCode` ทิ้งเงียบ ๆ
- Presence: `players/{uid}/connected` ตั้ง `onDisconnect().set(false)`; UI แสดงที่นั่งคนหลุดเป็นสีเทา + ไอคอน
- เกมไม่หยุดเมื่อมีคนหลุด ผู้เล่นที่หลุดนับเป็น `PASS_WINDOW` อัตโนมัติ
- **ข้ามเทิร์นบอสที่หลุด**: ถ้าบอสหลุด > 60 วินาที เฉพาะ **host** มีปุ่ม "ข้ามเทิร์น" (`SKIP_DISCONNECTED_BOSS`) ถือเป็นดีลล้ม (ถ้ามีดีลเปิดค้าง ใช้ผลเดียวกับ `FAIL_DEAL` คือคืนการ์ดญาติที่ยังไม่โดน travel เข้ามือ) แล้วส่งเทิร์นไปทางซ้ายของบอส ถ้าอยู่ที่ `turnStart` ให้ข้ามไปผู้เล่นถัดไปโดยไม่มีผลอื่น
- **ไม่มีเวลาจำกัดช่วงเจรจา** (`DEAL_OPEN`) — คุยกันใน Discord มีแค่ 5 วินาทีของหน้าต่างขัดจังหวะและปุ่มข้ามเทิร์นของ host
- **ห้ามออกจากห้องถาวรหลังเริ่มเกม** ปุ่มออกใช้ได้เฉพาะตอน `lobby`

### 8.3 Reclaim ที่นั่ง (กรณีล้างข้อมูลเบราว์เซอร์/เปลี่ยนเครื่อง)
- uid ใหม่จะไม่ตรง → ผู้เล่นเลือก "กลับเข้าที่นั่งเดิม" จากรายชื่อที่นั่งที่ disconnected → ส่งคำขอ → host กดอนุมัติ → host ย้ายข้อมูลจาก uid เก่าไป uid ใหม่ (`REASSIGN_SEAT`)

### 8.4 Host Migration
- Host ตั้ง `meta/hostConnected` = true และ `onDisconnect().set(false)`
- ทุก client ฟัง `meta`; ถ้า `hostConnected === false` นานเกิน 10 วินาที → client ที่ connected และ seat ต่ำสุด เรียก transaction ตั้ง `hostUid = ตัวเอง` แล้ว `hostConnected = true`
- Host ใหม่อ่าน `hostState` (rules อนุญาตเพราะตอนนี้เป็น host) แล้วรัน host loop ต่อ — ทำได้เพราะ engine pure + rngState อยู่ใน state
- ถ้า InterruptWindow ค้างระหว่างย้าย host → ขยาย deadline ใหม่ +5000ms

### 8.5 การลบห้องเก่า (Spark plan จำกัด 1 GB, ไม่มี Cloud Functions)
- host ลบห้องเมื่อกด "ปิดห้อง" หลังจบเกม
- ตอนสร้างห้องใหม่ client ตรวจและลบห้องของตัวเองที่ `createdAt` เกิน 24 ชั่วโมง (rules อนุญาตตามหัวข้อ 6)
- ระบุข้อจำกัดนี้ใน README

---

## 9. UI/UX

### 9.0 Design System (ยึด `design/home.html` เป็นต้นแบบ — ห้ามแก้ไฟล์ต้นแบบ)

เก็บ `index.html` ที่ผู้ใช้ให้มาไว้ที่ `design/home.html` เป็นต้นแบบภาพ พอร์ตเป็น `Home.tsx` ใน M2 และ **ดึง design tokens ไปไว้ใน `tailwind.config` + `src/styles/global.css` ตั้งแต่ M0**

**Tokens**

| token | ค่า | ใช้กับ |
|---|---|---|
| `--paper` / `--paper-deep` / `--board` | #FFF6E6 / #F6E6C6 / #F3DFB8 | พื้นหลังหน้า / พื้นเข้ม / พื้นกระดาน |
| `--ink` / `--ink-soft` / `--line` | #1D1B2E / #4A4760 / #D6CBB3 | ตัวอักษร+ขอบหนา / ตัวอักษรรอง / เส้นอ่อน |
| `--white` / `--accent` / `--gold` | #FFFFFF / #2B59C3 / #FFE08A | พื้นการ์ด / สีเน้น+focus / ไฮไลต์ ปุ่มกด หมาก |
| `--red` `--blue` `--green` `--yellow` `--purple` `--black` | #C8382D #2B59C3 #2E8B57 #E8B730 #7B4FB3 #26252B | 6 ตระกูล (หัวข้อ 3.1) |
| `--radius-card` | 14px | การ์ด (panel 18px, ปุ่ม/input 12px, กระดาน 24px) |
| `--shadow-hard` / `--shadow-press` | `4px 4px 0 ink` / `0 5px 0 ink` | เงาแข็งแบบพิมพ์ / ปุ่มกดลึก |

**ภาษาภาพ:** ขอบหนา 2–3px สี ink ทุกชิ้น, เงาแข็งไม่เบลอ, พื้นหลังลาย halftone (`radial-gradient` จุด ink 7%, 14px) พร้อมลาย paper grain (SVG noise + `mix-blend-mode: multiply`, ใช้เฉพาะหน้าแรกและล็อบบี้ — ในโต๊ะเกมใช้ halftone ล้วนเพื่อประสิทธิภาพมือถือ), ลายเส้นเฉียง `repeating-linear-gradient(135deg, rgba(255,255,255,.10) 0 6px, transparent 6px 12px)` บนการ์ดและหัวการ์ด, หัวข้อหลักมีป้าย "stamp" เอียง -2°, ปุ่มกดแล้วจมลง 5px (`:active translateY(5px)`)

**ฟอนต์:** Kanit (หัวข้อ/ปุ่ม/ตัวเลขเด่น, น้ำหนัก 500/700/800), Sarabun (เนื้อความ 16px/1.5), IBM Plex Mono (รหัสห้อง ตัวเลขดีล ส่วนแบ่ง)

**คอมโพเนนต์ที่ต้องทำให้ตรงต้นแบบ:** `Button` (สูง 54px, `btn-light`/`btn-dark`, disabled opacity .55), `TextInput` (สูง 56px ขอบ `--line` โฟกัสขอบ ink + วง accent 35%), `Panel`, `Chip` (pill ขอบ 2px), `Tag` ริบบิ้นมุมการ์ด, `Toast`, `FamilyCard` (ขนาด 104×146 / มือถือ 58×84 ขอบขาวด้านใน หน้าการ์ดสีตระกูล วงกลมสัญลักษณ์), `Pawn` (หมาก `$` สีทองตามต้นแบบ), `Dice` (ลูกเต๋า SVG ตามต้นแบบ)

**การเข้าถึง:** `:focus-visible` วง accent 3px offset 3px, เคารพ `prefers-reduced-motion` (ปิด transition/Framer Motion ที่ไม่จำเป็น), ปุ่มสัมผัส ≥ 44px, สีตระกูลต้องมีสัญลักษณ์รูปทรง + ชื่อไทยกำกับเสมอ (circle/square/triangle/diamond/star/hex) เพื่อผู้ที่ตาบอดสี

**ข้อความหน้าแรกที่ต้องปรับจากต้นแบบ:**
- chip "ไพ่และเงินเห็นเฉพาะคุณ" → "ไพ่และเงินของคุณ เพื่อนมองไม่เห็นบนหน้าจอ" (ให้ตรงกับหัวข้อ 4.4 ที่ host เห็นได้ทางเทคนิค)
- ป้าย "เจ้าของห้อง" คงไว้
- ข้อความทั้งหมดย้ายเข้า `src/i18n/th.ts`
- ปรับ breakpoint ในต้นแบบให้ตรงกับหัวข้อ 9.2 (ต้นแบบใช้ 640px)

### 9.1 Desktop (≥ 1024px) — โต๊ะบอร์ดเกม

**กระดานดีลเป็นกรอบสี่เหลี่ยมล้อมกลางโต๊ะ 16 ช่อง** เรียงตามเข็มนาฬิกาจากมุมซ้ายบน: บน 5 ช่อง (1–5), ขวา 3 ช่อง (6–8), ล่าง 5 ช่อง (9–13 จากขวาไปซ้าย), ซ้าย 3 ช่อง (14–16 จากล่างขึ้นบน) มุมกระดานคือช่อง 1, 5, 9, 13

```
┌──────────────────────────────────────────────────────────────┐
│ [ห้อง 48213 📋]   ปิดดีลแล้ว 7/15        บอส: Fern 👑  [📜 log]│
├──────────────────────────────────────────────────────────────┤
│        [Seat 2]          [Seat 3]          [Seat 4]           │
│   ┌────┬────┬────┬────┬────┐                                   │
│ [S1] 1 │ 2  │ 3  │ 4  │ 5  │ [S5]                              │
│   ├────┼────┴────┴────┼────┤                                   │
│   │ 16 │  แผงดีลปัจจุบัน │ 6  │                                   │
│   ├────┤  ช่อง 7        ├────┤                                   │
│   │ 15 │  ต้องการ: 🔴🔵🟢 │ 7◉ │                                   │
│   ├────┤  6 ส่วน × 3 ล้าน├────┤                                   │
│   │ 14 │  ═ แถบ 5 วิ ═  │ 8  │                                   │
│   ├────┼────┬────┬────┼────┤                                   │
│   │ 13 │ 12 │ 11 │ 10 │ 9  │                                   │
│   └────┴────┴────┴────┴────┘                                   │
│                    [ที่นั่งของฉัน — ล่างสุดเสมอ]                 │
│  มือของฉัน: [การ์ด][การ์ด][การ์ด] ...    เงิน: 23 ล้าน (ลับ)      │
│  [ยื่นข้อเสนอ] [ลงการ์ด] [ผ่าน]                                  │
└──────────────────────────────────────────────────────────────┘
```
- **ช่องบนกระดาน**: เลขช่อง (IBM Plex Mono) + จำนวนส่วนแบ่ง (`×6`) + สัญลักษณ์ตระกูลขนาดเล็กตามกลุ่มเงื่อนไข (สีบังคับเป็นชิปทึบ, กลุ่มเลือกเป็นชิปขอบเปล่าอยู่ในวงเล็บเดียวกัน พร้อมจำนวน pick) ช่องปัจจุบันมีหมาก `$` สีทอง ช่องที่ปิดแล้วแสดงเป็นแผ่นดีลคว่ำทึบ + เครื่องหมาย ✓ + เลขแผ่น ช่อง hover/แตะแสดงเงื่อนไขเต็ม
- **แผงดีลปัจจุบัน (กลางกระดาน)**: เงื่อนไขครบทุกกลุ่ม, สถานะแต่ละสี (มีแล้ว/ขาด/พักร้อน), เงินรวมของดีล (`dividends × valuePerDividend`), ผลรวมส่วนแบ่งที่บอสรับไปแล้ว, สถานะ lock และแถบนับถอยหลัง; ก่อนเปิดดีลแสดงตัวเลือกต้นเทิร์น (เปิดดีล / ทอยเต๋า) และเต๋า
- ที่นั่งของตัวเองอยู่ล่างเสมอ หมุนตำแหน่งคนอื่นตาม seat
- **Seat component** แสดง: ชื่อ, สถานะ online, มงกุฎถ้าเป็นบอส, นักลงทุนหน้าตัก (ชิปสี + สัญลักษณ์), นักลงทุนที่ติดพักร้อน (จาง + ไอคอนกระเป๋า), การ์ดคว่ำตามจำนวนในมือ (ซ้อนเป็นพัด ถ้าเกิน 6 แสดง "+n")
- **Offer bubble** เด้งเหนือ Seat: ชิปสี + "ขอ 2 ส่วน" + ป้าย "จากมือ" ถ้า source = hand (การ์ดญาติวางหงายบนโต๊ะ); ขอบเขียวเมื่อบอสรับแล้ว ผู้เล่นที่มีหลายข้อเสนอแสดงหลาย bubble
- บอสคลิก bubble เพื่อรับ/ยกเลิก; แผงกลางแสดงสีที่ยังขาด
- **Interrupt bar**: แถบยาวลดลงใน 5 วิ (Framer Motion), สีส้ม→แดง, ข้อความ "Fern ล็อกดีล! มีใครจะป่วนไหม?" + ปุ่มลงการ์ดที่ใช้ได้ตอนนั้น + ปุ่ม "ผ่าน"; การ์ดที่ลงแล้วรอผลแสดงเป็นคิวบนแผงกลาง
- เมื่อมีคนลงการ์ด: การ์ดบินจากที่นั่งไปกลางโต๊ะ + log บรรทัดใหญ่ชั่วคราว 2 วิ
- ปุ่มที่ใช้ไม่ได้ใน phase ปัจจุบันให้ disabled พร้อม tooltip บอกเหตุผล
- Log ด้านข้าง (ย่อ/ขยายได้) — สำคัญมากเพราะทุกคนคุย Discord แล้วต้องย้อนดูว่าเกิดอะไรขึ้น
- **การแสดงเงิน**: ตัวเลขตามด้วย "ล้าน" ไม่ใส่สกุลเงิน; ข้อเสนอแสดงเป็น "ส่วนแบ่ง" และมีบรรทัดรอง "(= n × v ล้าน)" เมื่อรู้ค่าแผ่นดีล

### 9.2 Mobile (< 768px) และแท็บเล็ต (768–1023px)
- breakpoint: `< 768` มือถือ, `768–1023` แท็บเล็ต (ใช้เลย์เอาต์มือถือแบบกว้าง), `≥ 1024` เดสก์ท็อป
- บน: แถบผู้เล่นอื่นเลื่อนแนวนอน (avatar การ์ดย่อ + bubble ข้อเสนอ)
- กลาง: แผงดีลปัจจุบัน + ความคืบหน้า x/15 และแผนที่กระดาน 16 ช่องแบบย่อ (กดดูเต็มใน bottom sheet)
- ล่าง: มือของฉันเป็น bottom sheet ดึงขึ้นได้, ปุ่มแอ็กชันใหญ่ (touch target ≥ 44px)
- Interrupt bar ติดบนสุดของจอ (sticky) + สั่น (`navigator.vibrate`) ถ้ารองรับ

### 9.3 Modal และหน้าจอ
- **ยื่นข้อเสนอ**: เลือกสี (แสดงเฉพาะสีที่เงื่อนไขช่องต้องการและผู้เล่นมี) → เลือกแหล่ง (หน้าตัก/มือ; ถ้ามือ ต้องแจ้งว่า "ถอนคืนไม่ได้จนจบดีล") → ตัวเลขส่วนแบ่ง (stepper, ≥ 1, แสดงส่วนแบ่งที่เหลือของดีล) → ยืนยัน
- **เปิดดีล (บอส)**: เลือกการ์ดญาติจากมือที่จะลงตอนประกาศ + (ถ้านักลงทุนเกินเงื่อนไข) เลือกตระกูลที่ไม่ใช้
- **Recruitment**: เลือกการ์ด recruitment 3 ใบ → เลือกเป้าหมาย (ถ้ายังมีข้างกระดาน ให้เลือกได้เฉพาะข้างกระดาน)
- **Travel**: เลือกเป้าหมาย (ผู้เล่น + สี หรือการ์ดญาติในดีล)
- **ทิ้งการ์ด**: บังคับเลือกจนเหลือ 12, ปิดไม่ได้
- **จบเกม**: เปิดเงินทีละคนแบบ reveal animation, ตารางอันดับ (เงินเท่ากัน = อันดับเดียวกัน)
- **ล็อบบี้** (ออกแบบเองในธีม — M2): รายชื่อผู้เล่นพร้อมสถานะ online, ปุ่มคัดลอกลิงก์เชิญ, ปุ่มเริ่มเกม (host, ≥ 3 คน), ปุ่มออก
- **หน้าสถานะ**: ห้องไม่พบ / ห้องเต็ม / เกมเริ่มแล้ว (พร้อมทางไป reclaim) / แบนเนอร์เน็ตหลุด / popup อนุมัติ reclaim ของ host
- **หน้า/โมดัล "วิธีเล่น"**: สรุปกติกาภาษาไทยเข้าใจง่ายจากหัวข้อ 3 (เขียนใหม่ด้วยภาษาของเราเอง)

### 9.4 ดีไซน์การ์ดและชิ้นส่วนเกม (agent ออกแบบเป็น SVG ในธีม design system)
- **นักลงทุน/การ์ดญาติ**: หน้าการ์ดสีตระกูล ลายเส้นเฉียง สัญลักษณ์รูปทรงตระกูล ชื่อไทย; การ์ดญาติมีป้าย "ญาติ" ให้แยกจากนักลงทุนได้ชัด
- **ส่งไปพักร้อน (`travel`)**: ไอคอนกระเป๋าเดินทาง/เครื่องบิน สีตามตระกูล, ใบ `wild` ใช้หลายสี
- **ซื้อตัวนักลงทุน (`recruitment`)**: ไอคอนจับมือ/เหรียญ สีกลาง (ลงพร้อมกัน 3 ใบ แสดงเป็นชุดที่ยกขึ้นพร้อมกัน)
- **หยุด! (`stop`)**: ป้ายแปดเหลี่ยมสีแดงเข้ม
- **แย่งเป็นบอส (`imTheBoss`)**: มงกุฎสีทอง
- ทุกการ์ดต้องมีไอคอน + ชื่อไทย ไม่พึ่งสีอย่างเดียว; ชิปเงินและเหรียญใช้สี `--gold` ขอบ ink; เสียงประกอบ: สังเคราะห์ด้วย Web Audio API (ไม่มีไฟล์เสียง) ค่าเริ่มต้น **ปิด** มีปุ่มเปิดในแถบบน

### 9.5 ข้อความ UI ที่ต้องมีใน `th.ts` (ชื่อหลัก)
การ์ดญาติ / ส่งไปพักร้อน / ซื้อตัวนักลงทุน / หยุด! / แย่งเป็นบอส, "ช่วงป่วนดีล" (InterruptWindow), "ผ่าน" (PASS), "ส่วนแบ่ง" (dividend), "ล้าน", ชื่อตระกูลไทยทั้ง 6, ข้อความจากหน้าแรกทั้งหมด

---

## 10. Milestones

### M0 — Scaffold
- Vite + React + TS strict, Tailwind, Framer Motion, Zustand, react-router-dom, Vitest, ESLint/Prettier, `@fontsource` (Kanit/Sarabun/IBM Plex Mono)
- ดึง design tokens จาก `design/home.html` ไปไว้ใน `tailwind.config` และ `src/styles/global.css` (halftone, paper grain, ลายเส้นเฉียง, focus, reduced-motion) พร้อมคอมโพเนนต์พื้นฐาน `Button`, `Panel`, `Chip`, `FamilyCard`
- `.env.example` (VITE_FIREBASE_*), `firebase.json` + emulator config, `vercel.json` (SPA rewrite)
- โครงโฟลเดอร์ตามหัวข้อ 11, npm scripts ครบตามหัวข้อ 2
- **DoD**: `npm run dev` แสดงหน้า placeholder ภาษาไทยในธีมเดียวกับต้นแบบ (ฟอนต์ถูก สีถูก ปุ่มกดจมลง), scripts `typecheck/lint/test` ผ่าน

### M1 — Game Engine (ไม่มี UI, ไม่มี Firebase)
- types, config (หัวข้อ 3 ทั้งหมด), seeded RNG, deck builder, setup, validators, `applyAction`, `tick`, `project`
- **DoD**:
  - unit tests ข้อมูล: การ์ด 98 ใบแยกชนิดตามหัวข้อ 3.2, ข้อมูลกระดาน 16 ช่อง/แผ่นดีล 15 แผ่นผ่านชุดตรวจความสอดคล้องตามหัวข้อ 3.3
  - unit tests กติกา: แจกนักลงทุนตามจำนวนผู้เล่น 3/4/5/6, สุ่มผู้เล่นคนแรก, หมากเริ่มช่อง 1 และต้องทอยก่อนเปิดดีล, ทอยเต๋าเดินข้ามช่องปิดและวนกลับช่องเดิม, `OPEN_DEAL`, ผู้เล่น 1 คนยื่นหลายข้อเสนอ, `isDealComplete` ครบทุกรูปแบบเงื่อนไข (โดยเฉพาะช่องที่มีหลายกลุ่ม: 4, 7, 12, 14), ตระกูลของบอสเกินเงื่อนไข (overfill), lock ได้เฉพาะเมื่อครบพอดี, คำนวณเงินจาก `dividends × valuePerDividend` และผลรวมส่วนแบ่งไม่เกิน `dividends`, `DEAL_RESOLVE` (เงิน การ์ดญาติใช้/ไม่ใช้ หมากเลื่อน เทิร์นถัดไปทางซ้ายของบอส), `FAIL_DEAL` (ช่องไม่ปิด หมากอยู่เดิม ไม่จั่ว), `travel` (นักลงทุน/การ์ดญาติ), `recruitment` (ข้างกระดานก่อน, `onVacation` คงอยู่), `imTheBoss` (ซ้อนหลายใบ), `stop` (สกัดไม่ได้ stop), คิว `pendingCards`, หน้าต่างรีเซ็ตเวลา, hand limit 12, กองจั่วหมดสับกองทิ้ง, `END_CHECK` ดีล 10–15 ครบทุกแผ่น, เงินเท่ากัน = ชนะร่วม
  - test "project() ไม่รั่วข้อมูล": public ไม่มี hand, money, cardId, deck
  - simulation test: บอทสุ่ม action ถูกกติกาเล่นจนจบ 200 เกมโดยไม่ throw, จำนวนการ์ดรวมคงที่ 98 ใบ และเงินรวมของผู้เล่นทุกคนเท่ากับผลรวมเงินที่ธนาคารจ่ายออกตามดีลที่ปิด
  - สรุปรายการ `ASSUMPTION` (หัวข้อ 3.6) และจุดอื่นที่ต้องเดาเพิ่มให้ผู้ใช้

### M2 — Firebase: Auth, Lobby, Presence, Home
- Anonymous auth, สร้าง/เข้าห้อง (รหัส 5 หลักไม่ขึ้นต้น 0), ชื่อซ้ำต่อท้ายตัวเลข, รายชื่อในล็อบบี้, presence, auto-rejoin, แบนเนอร์ rejoin ตามเงื่อนไข 8.2, ลิงก์เชิญ
- พอร์ต `Home.tsx` จาก `design/home.html` (ข้อความย้ายเข้า `th.ts`), ทำหน้าล็อบบี้และหน้าสถานะ (ห้องไม่พบ/เต็ม/เริ่มแล้ว) ในธีมเดียวกัน
- **DoD**: เปิด 3 แท็บ (incognito) เข้าห้องเดียวกันได้, รีเฟรชแล้วกลับที่นั่งเดิม, ปิดแท็บแล้วสถานะ offline, ชื่อซ้ำถูกต่อท้ายเลข

### M3 — Host Loop + Security Rules
- `hostLoop.ts`: listen actions → engine → multi-path update → ลบ action; rejection feedback
- `database.rules.json` + rules tests ใน emulator (หัวข้อ 6 รวมข้อจำกัด 6 คน, ห้ามเข้าหลังเริ่มเกม, ลบห้องเก่า)
- **DoD**: rules tests ผ่านทั้งหมด, เริ่มเกมจากล็อบบี้แล้วทุกคนเห็นไพ่ตัวเองเท่านั้น (ตรวจผ่าน DevTools)

### M4 — Tabletop UI (Desktop)
- Table layout, กระดาน 16 ช่อง (หัวข้อ 9.1), Seat, Hand, แผงดีลปัจจุบัน, Log, การ์ดคว่ำ, ที่นั่งหมุนตามตัวเอง, ทอยเต๋า + หมากเดิน, ดีไซน์การ์ดครบ 5 ชนิด + นักลงทุน
- **DoD**: เล่น 1 เทิร์นเปล่า (เปิดดีล→ดีลล้ม→จบเทิร์น) และเทิร์นทอยเต๋า-จั่ว 3 ใบ ผ่าน UI ได้ และสรุปภาพรวม UI (screenshot ทุกหน้าหลัก) ให้ผู้ใช้ตรวจก่อนไปต่อ

### M5 — Offers & Deal Flow
- Offer modal, offer bubble (หลายข้อเสนอต่อคน), บอสเลือก/ยกเลิก, วางการ์ดญาติของบอส, lock deal, resolve, animation เงิน (แสดงแค่ของตัวเอง)
- Playwright e2e 1 สถานการณ์: 3 ผู้เล่นปิดดีลแรก
- **DoD**: ปิดดีลได้ครบ flow กับ 3 ผู้เล่น, เงินถูกต้องตาม engine, e2e ผ่าน

### M6 — Action Cards & Interrupt Window
- ลงการ์ดทั้ง 4 แบบ, คิว `pendingCards`, interrupt bar, PASS, server time sync, grace period
- **DoD**: ลงการ์ดซ้อนกันหลายครั้งแล้วเวลารีเซ็ตถูกต้อง, ทุกคน PASS แล้วปิดทันที, จำลอง latency (DevTools throttling) แล้ว action ที่ทันเวลายังถูกนับ

### M7 — End of Turn & Game End
- บังคับทิ้งการ์ด, ทอยเต๋าเช็กจบเกม + animation, GAME_OVER reveal, REMATCH (ใช้ห้องและที่นั่งเดิม รีเซ็ตเงิน/มือ/กระดาน สุ่มผู้เล่นคนแรกตามหัวข้อ 3.4 ใหม่ host ถอดผู้เล่นที่ไม่อยู่ก่อนเริ่มรอบใหม่)
- **DoD**: เล่นจนจบเกมได้ทั้งแบบจบที่ดีล 15 และจบจากเต๋า

### M8 — Mobile Responsive
- layout มือถือและแท็บเล็ต (หัวข้อ 9.2)
- **DoD**: เล่นได้ครบบนจอ 375×667 โดยไม่ต้อง zoom, ไม่มี horizontal scroll ของทั้งหน้า

### M9 — Resilience, Polish, Deploy
- Host migration, reclaim seat, ข้ามเทิร์นบอสที่หลุด (host-only), ลบห้องเก่า, หน้า/โมดัลวิธีเล่น, sound effects (Web Audio, ปิดเป็นค่าเริ่มต้น), README (วิธีตั้งค่า Firebase + ข้อจำกัดเรื่อง host เห็นข้อมูล + ข้อจำกัดเรื่องห้องเก่า)
- Deploy Vercel + ตั้ง env
- **DoD**: ปิดแท็บ host กลางเกม → ผู้เล่นอื่นเล่นต่อได้ภายใน ~15 วินาทีโดยข้อมูลไม่หาย

---

## 11. โครงสร้างโฟลเดอร์

```
design/
  home.html               # ต้นแบบภาพ (index.html จากผู้ใช้) ห้ามแก้
src/
  config/app.ts           # APP_NAME = 'โต๊ะเจรจาดีล'
  i18n/th.ts
  styles/global.css       # tokens, halftone, paper grain, ลายเส้นเฉียง
  engine/                 # pure TS เท่านั้น
    config/{families,influenceCards,dealBoard,dealTiles,rules}.ts
    types.ts
    rng.ts
    deck.ts
    setup.ts
    validators.ts
    reducer.ts            # applyAction
    tick.ts
    endgame.ts
    project.ts
    __tests__/
  net/
    firebase.ts           # init, auth
    room.ts               # create/join/leave
    presence.ts
    clock.ts              # serverTimeOffset
    actions.ts            # sendAction()
    host/hostLoop.ts
    host/migration.ts
  store/
    roomStore.ts          # public + private + players + meta (sync จาก RTDB)
    uiStore.ts            # modal, selection
  ui/
    pages/{Home,Lobby,Room,RoomStatus}.tsx
    table/{Table,Seat,DealBoard,DealPanel,Hand,OfferBubble,InterruptBar,GameLog,DiceRoll,StartSpacePicker}.tsx
    modals/{OfferModal,OpenDealModal,TravelModal,RecruitmentModal,DiscardModal,EndGameModal,RulesModal}.tsx
    common/{Card,FamilyCard,ColorChip,Button,Panel,Chip,Toast}.tsx
e2e/                      # Playwright
database.rules.json
firebase.json
vercel.json
README.md
```

---

## 12. สถานะการเตรียมงาน (ผู้ใช้ต้องยืนยันก่อน Milestone ที่ระบุ)

ไม่มีคำถามกติกาที่ค้างอยู่ — ทุกอย่างอยู่ในหัวข้อ 3 และ `ASSUMPTION` ในหัวข้อ 3.6 สิ่งที่ agent ทำแทนไม่ได้:

## กรอกสถานะหัวข้อ 12

1) Firebase project (ต้องเสร็จก่อน M2)
   - สร้าง project แล้วหรือยัง: [สร้างแล้ว]
   - เปิด Anonymous Auth แล้วหรือยัง: [เปิดแล้ว]
   - สร้าง Realtime Database แล้วหรือยัง (region asia-southeast1): [สร้างแล้ว]

2) Vercel (ต้องเสร็จก่อน M9)
   - มีบัญชีแล้วหรือยัง: [มี]
   - โดเมนที่จะใช้: [ยังไม่ตัดสินใจ]

3) Git (ต้องเสร็จก่อน M0)
   - Git: [ติดตั้งแล้ว]
   - GitHub: [https://github.com/sirasakswnk/I-m-The-BOSS-BoardGame.git]
3) เครื่องพัฒนา (Node ต้องพร้อมก่อน M0, Java และ Firebase CLI ก่อน M3)
   - Node: [ติดตั้งแล้ว เวอร์ชัน v24.20.0 ]  (ต้อง ≥ 20 LTS)
   - Java: [ติดตั้งแล้ว ]  (Emulator ต้องใช้)
   - Firebase CLI: [ติดตั้งแล้ว ]
   - ระบบปฏิบัติการ: [Windows]

**การตัดสินใจของผู้ใช้ที่ต่างจากต้นฉบับหรือเป็นการตีความ (ห้ามเปลี่ยนเอง):**
1. ต้อง `LOCK_DEAL` และผ่านหน้าต่างขัดจังหวะเสมอ แม้บอสถือนักลงทุนครบเอง
2. `onVacation` คงอยู่เมื่อนักลงทุนถูกแย่งด้วย `recruitment` จนจบดีล
3. เงินเท่ากันตอนจบ = ชนะร่วม
4. กระดานในเกมเป็นกรอบสี่เหลี่ยม 16 ช่อง (ไม่ใช่วงกลม)
5. ไม่มีเวลาจำกัดช่วงเจรจา, host เท่านั้นที่ข้ามเทิร์นบอสที่หลุดได้, ห้ามออกถาวรกลางเกม
