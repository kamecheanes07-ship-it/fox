---
title: Fox Search
emoji: 🦊
colorFrom: orange
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# 🦊 Fox Search

محرك بحث سريع ومفتوح بواجهة عصرية متكاملة (نمط داكن ونمط فاتح)، مدعوم بنتائج DuckDuckGo عبر تبويبات **All / Images / News / Videos** مع استمرارية تلقائية للصفحات المتعددة دون توقف.

## التشغيل كـ Hugging Face Space (Docker)

هذا المستودع **جاهز كـ Space** كما هو: الملف العلوي أعلاه هو بطاقة الـ Space، والـ `Dockerfile` مبني خصيصاً لبيئة Spaces.

1. أنشئ Space جديداً من [huggingface.co/new-space](https://huggingface.co/new-space) واختر **SDK: Docker → Blank**.
2. ارفع ملفات المشروع إلى مستودع الـ Space، إما برفعها من الواجهة أو:
   ```bash
   git clone https://huggingface.co/spaces/<USER>/<SPACE>
   cp -r <مجلد-المشروع>/* <SPACE>/ && cd <SPACE>
   git add -A && git commit -m "Fox Search" && git push
   ```
3. الـ Space يبني الصورة تلقائياً ويفتح المنفذ **7860**. لا حاجة لتسجيل دخول ولا لقاعدة بيانات.

### لماذا يعمل على Spaces بدون إعداد؟

| متطلّب بيئة Spaces | كيف تعامل معه المشروع |
|---|---|
| المنفذ `7860` | `EXPOSE 7860` و`PORT=7860` داخل الصورة، والاستماع على `0.0.0.0`. |
| المستخدم 1000 بدون root | كل الملفات مملوكة لـ `1000:1000`، ومجلدات البيانات قابلة للكتابة مسبقاً. |
| لا `package-lock.json` مضمون | البناء يستخدم `npm ci` إن وُجد القفل وإلا `npm install`. |
| بطء أول بناء | نسخة `deps` منفصلة + `.dockerignore` يستثني `node_modules` و`.next`. |
| البيانات تُفقد عند إعادة التشغيل | التخزين يفضّل `/data` (Persistent Storage في Spaces) ثم `/app/data` ثم `/tmp` — راجع أدناه. |
| لا قاعدة بيانات | طبقة تخزين مزدوجة: PostgreSQL عند وجود `DATABASE_URL`، وإلا مخزن JSON محلي. |
| فحص الصحة | `GET /api/health` يعيد `{"ok":true,...}` ويستخدمه `HEALTHCHECK`. |

### البيانات الدائمة (مهم)

بدون تفعيل **Persistent Storage** في إعدادات الـ Space (Settings → Persistent storage → `Small` أو أكبر)، تُحذف المحفوظات وسجل البحث عند كل إعادة تشغيل (الـ Space container مؤقت).

- مع التخزين الدائم: يُحفظ كل شيء تلقائياً في `/data/fox-data.json`.
- للتأكد: افتح `/api/health` واقرأ الحقل `persistent` — `true` تعني أن البيانات باقية.
- تريد PostgreSQL؟ أضف `DATABASE_URL` في **Settings → Variables and secrets** (سرّي)، وسيتحول التخزين تلقائياً.

### متغيرات اختيارية في Space

| الاسم | القيمة | الأثر |
|---|---|---|
| `DATABASE_URL` | رابط PostgreSQL | تحويل التخزين إلى PostgreSQL مع إنشاء الجداول تلقائياً. |
| `SEED_DEMO` | `false` | إخفاء حساب الديمو العام. |
| `FOX_DATA_DIR` | مسار | تغيير مجلد مخزن JSON (الافتراضي `/data`). |
| `PORT` | `7860` | لا تغيّره إلا إذا غيّرت `app_port` في بطاقة الـ Space. |

> `README.md` يُقرأ أيضاً من GitHub، لذا الإرشادات هنا مكتوبة لتناسب المكانين.

---

## الشعار والأيقونات

مصدر العلامة هو `assets-src/fox-mark.svg` (رأس ثعلب متجهّي)، ومنه تُولَّد كل الأيقونات:

```bash
node -e "const sharp=require('sharp'),fs=require('fs');const svg=fs.readFileSync('assets-src/fox-mark.svg');for(const [s,n] of [[192,'icon-192.png'],[512,'icon-512.png'],[180,'apple-touch-icon.png'],[32,'favicon-32x32.png'],[16,'favicon-16x16.png']]){sharp(svg,{density:s*4}).resize(s,s).png().toFile('public/icons/'+n)}"
```

- `public/favicon.ico` و`public/icons/*` هي ما يقدّمه المتصفح (`/favicon.ico` صار 200 بدل 404).
- `public/manifest.webmanifest` يجعل التطبيق قابلاً للتثبيت على الجوال.
- شعار الواجهة داخل التطبيق (`Logo.tsx`) صار SVG مضمّناً، فلا يعتمد على أي ملف صورة وقد بقي حاداً على كل المقاسات.

## التشغيل محلياً

```bash
npm install
npm run dev          # http://localhost:3000
# أو نسخة إنتاج:
npm run build && npm start
```

## Docker (ذاتي الاستضافة)

```bash
docker compose up -d --build            # مخزن JSON في volume باسم foxdata
docker compose --profile postgres up -d --build   # مع PostgreSQL
```
