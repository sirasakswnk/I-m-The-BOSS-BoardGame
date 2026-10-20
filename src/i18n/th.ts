// All Thai UI text lives here (plan.md section 0, rule 5).
// Keep keys grouped by screen/feature; never hardcode Thai text inside components.
export const th = {
  app: {
    slogan: 'ใครเป็นบอส ใครบลัฟ เดี๋ยวก็รู้',
  },
  common: {
    createRoom: 'สร้างห้อง',
    joinRoom: 'เข้าร่วม',
    roomCode: 'รหัสห้อง',
    nickname: 'ชื่อเล่น',
    backToHome: 'กลับหน้าแรก',
    comingSoon: 'เร็ว ๆ นี้',
    development: 'สถานะการพัฒนา',
  },
  home: {
    heroBefore: 'ใครเป็น',
    heroStamp: 'บอส',
    heroAfter: 'ใครบลัฟ เดี๋ยวก็รู้',
    heroLead:
      'บอร์ดเกมต่อรองสำหรับแก๊งเพื่อน ไม่ต้องสมัคร ไม่ต้องลงแอป เปิด Discord แล้วเข้าห้องเดียวกัน',
    privacyChip: 'ไพ่และเงินของคุณ เพื่อนมองไม่เห็นบนจอ',
    demoRoomCta: 'เปิดห้องตัวอย่าง',
    familiesPreviewAria: 'ตัวอย่างการ์ดตระกูลทั้ง 6',
    scaffoldPanelNote: 'M0 – โครงโปรเจกต์พร้อมแล้ว: ธีม สี ฟอนต์ และปุ่มกดจมตามต้นแบบ',
    nextMilestone: 'ขั้นถัดไป: M1 – Game Engine (กติกาเกมและชุดทดสอบ)',
  },
  families: {
    red: 'แดง',
    blue: 'น้ำเงิน',
    green: 'เขียว',
    yellow: 'เหลือง',
    purple: 'ม่วง',
    black: 'ดำ',
  },
  card: {
    clanTag: 'ญาติ',
  },
  room: {
    placeholderTitle: 'ห้อง {code}',
    placeholderNote: 'หน้านี้จะกลายเป็นล็อบบี้และโต๊ะเกมใน Milestone ถัดไป',
  },
} as const;

export type Messages = typeof th;
