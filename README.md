# 📚 PBTstudents LMS

ระบบติวเตอร์ส่วนตัว (Private Tutoring LMS) สร้างด้วยเครื่องมือฟรีทั้งหมด

## สถาปัตยกรรมระบบ

| Layer | เทคโนโลยี |
|-------|----------|
| Frontend | HTML + CSS + JavaScript (Vanilla) |
| Backend API | Google Apps Script |
| Database | Google Sheets (8 sheets) |
| File Storage | Google Drive |
| Hosting | Vercel (ฟรี) |
| Version Control | GitHub |

---

## 🚀 วิธี Deploy (ทำตามทีละขั้น)

### ขั้นที่ 1: สร้าง Google Sheets + Backend API

1. **สร้าง Google Sheets ใหม่**
   - เข้า [Google Sheets](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
   - ตั้งชื่อว่า `PBTstudents Database`

2. **เปิด Apps Script**
   - ไปที่เมนู `Extensions` → `Apps Script`
   - จะเปิดหน้า Script Editor ขึ้นมา

3. **สร้าง Sheet ทั้งหมด**
   - ลบโค้ดเก่าที่มีอยู่ใน `Code.gs` ออก
   - คัดลอกเนื้อหาจากไฟล์ `gas/SetupSheets.gs` ไปวาง
   - กด **▶ Run** → เลือกฟังก์ชัน `setupAllSheets`
   - อนุญาต Permissions ที่ระบบถาม
   - ✅ ระบบจะสร้าง 8 Sheets + Demo Data ให้อัตโนมัติ

4. **ใส่โค้ด Backend API**
   - สร้างไฟล์ใหม่ (กด `+` → `Script`) ตั้งชื่อว่า `Code`
   - คัดลอกเนื้อหาจากไฟล์ `gas/Code.gs` ไปวาง
   - ✅ ตอนนี้มี 2 ไฟล์: `SetupSheets.gs` + `Code.gs`

5. **Deploy เป็น Web App**
   - กดปุ่ม `Deploy` → `New deployment`
   - เลือก Type = `Web app`
   - ตั้งค่า:
     - Description: `PBT LMS API`
     - Execute as: `Me`
     - Who has access: `Anyone`
   - กด `Deploy`
   - **📋 คัดลอก URL ที่ได้** (จะมีรูปแบบ `https://script.google.com/macros/s/xxx/exec`)

### ขั้นที่ 2: ตั้งค่า Frontend

1. **ใส่ API URL**
   - เปิดไฟล์ `js/api.js`
   - บรรทัดที่ 6: เปลี่ยน `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` เป็น URL ที่ได้จากขั้นที่ 1.5
   - บันทึกไฟล์

### ขั้นที่ 3: Push to GitHub

```bash
cd PBTstudents
git init
git add .
git commit -m "Initial commit: PBT LMS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PBTstudents.git
git push -u origin main
```

### ขั้นที่ 4: Deploy บน Vercel

1. เข้า [vercel.com](https://vercel.com) → Login ด้วย GitHub
2. กด `Add New` → `Project`
3. เลือก repository `PBTstudents`
4. Framework Preset = `Other`
5. กด `Deploy`
6. ✅ เว็บจะพร้อมใช้งานที่ URL ที่ Vercel ให้มา!

---

## 👤 ข้อมูล Demo Login

| Role | Username | Password |
|------|----------|----------|
| Admin (ครู) | `admin` | `admin123` |
| นักเรียน 1 | `student1` | `student1` |
| นักเรียน 2 | `student2` | `student2` |
| นักเรียน 3 | `student3` | `student3` |
| นักเรียน 4 | `student4` | `student4` |

> ⚠️ **สำคัญ:** เปลี่ยนรหัสผ่านก่อนใช้งานจริง! (แก้ใน function `seedDemoData` แล้วรัน `setupAllSheets` ใหม่)

---

## 📁 โครงสร้างไฟล์

```
PBTstudents/
├── index.html          ← หน้า Login
├── dashboard.html      ← หน้าแดชบอร์ด
├── subject.html        ← หน้ารายวิชา
├── lesson.html         ← หน้าบทเรียน
├── assignment.html     ← หน้าทำข้อสอบ
├── admin.html          ← หน้าจัดการระบบ (Admin)
├── css/
│   └── style.css       ← ระบบ Design (Dark Glassmorphism)
├── js/
│   ├── api.js          ← API Client + Cache
│   ├── auth.js         ← ระบบ Login/Session
│   └── app.js          ← Utilities (Toast, Navbar, etc.)
├── gas/
│   ├── SetupSheets.gs  ← สคริปต์สร้าง Sheets
│   └── Code.gs         ← Backend API
├── vercel.json         ← Vercel config
└── README.md           ← ไฟล์นี้
```

---

## ✨ ฟีเจอร์

- ✅ ระบบ Login/Logout พร้อม Session
- ✅ แดชบอร์ดสรุปผล + เกรดรวม
- ✅ แยกวิชาได้ (ชีววิทยา, เคมี, ฟิสิกส์, ฯลฯ)
- ✅ บทเรียนแบ่งตามบท + ดาวน์โหลดไฟล์จาก Google Drive
- ✅ ระบบทำข้อสอบ MCQ ตรวจอัตโนมัติ + ให้เกรด
- ✅ บันทึก Progress การเรียน
- ✅ Admin Panel จัดการวิชา/บทเรียน/ข้อสอบ/คำถาม
- ✅ ดูคะแนนนักเรียนทั้งหมด (Admin)
- ✅ Logging ทุก action
- ✅ Responsive (ใช้งานบนมือถือได้)
- ✅ Premium Dark UI + Glassmorphism
