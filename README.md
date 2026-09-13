# Masat AlJud Recruitment Candidate Form - Static GitHub Pages Build

هذه نسخة ملفات ثابتة قابلة للرفع إلى GitHub Pages.

## الملفات

- `index.html`: صفحة النموذج.
- `styles.css`: التصميم والهوية البصرية.
- `config.js`: إعدادات الحقول المستخرجة من Form_Config الحالية.
- `app.js`: منطق الخطوات، المراجعة، التحقق، وشاشة النجاح.

## ملاحظة مهمة

هذه النسخة تعمل كواجهة ثابتة على GitHub Pages. الإرسال لا يكتب إلى Google Sheet، بل يولد رقم معاينة ويحفظ نسخة محلية في متصفح المستخدم داخل `localStorage` باسم `masat_candidate_preview_submissions`.

لجعل نسخة GitHub تحفظ فعليًا في Google Sheet، يجب إضافة endpoint منفصل في Apps Script مثل `doPost` أو API وسيط ثم تعديل `send()` داخل `app.js`.

## التشغيل المحلي

افتح `index.html` مباشرة في المتصفح، أو ارفع المجلد كاملًا إلى GitHub Pages.
