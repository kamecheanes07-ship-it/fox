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

### إن ظهرت صفحة 404 على كل المسارات

Next.js يختار مجلد App Router كأول مجلد موجود من: `app/` ثم `src/app/`. إذا رفعت إلى نفس الـ Space مشروعاً آخر
فيه مجلد `app/` في الجذر (مثل تطبيق FastAPI/بايثون: `app/main.py`)، فسيُختار **هذا** المجلد، والبناء ينجح لكن كل
الصفحات ترجع `404: This page could not be found.` — بينما الملفات الثابتة (`/favicon.ico`, `/manifest.webmanifest`)
تعمل، وهذا هو التوقيع المميّز للمشكلة.

الإصلاح (أحد الخيارين):

1. **الأفضل**: أبقِ الـ Space لمشروع Fox فقط. انقل مشروع بايثون إلى Space آخر (أو إلى فرع/مجلد منفصل)، لأن
   `README.md` (بطاقة الـ Space) و`Dockerfile` كلاهما لـ Fox.
2. إن كان لا بد من وجودهما معاً: أعد تسمية مجلد بايثون من `app/` إلى `pyapp/` وحدّث الاستيرادات (`from pyapp.main import ...`)
   و`entrypoint.sh`.

هذا المشروع محمي الآن تلقائياً من هذه الحالة:
- `Dockerfile` ينسخ فقط ملفات Next (`src/`, `public/`, `scripts/`, الإعدادات) ولا ينسخ أي مجلد `app/` في الجذر.
- `.dockerignore` يستثني `/app` و`*.py` و`requirements*.txt` و`entrypoint.sh`.
- `npm run build` يشغّل `scripts/verify-build.mjs` بعده، وإذا لم تُبنَ الصفحة الرئيسية أو كانت هناك `app/` في الجذر
  يفشل البناء برسالة صريحة تسمّي المجلد المتسبب — بدلاً من نشر موقع كله 404.

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

الشعار مأخوذ من صور المستخدم الأصلية (`fox1.jpg` و`fox2.jpg` من مستودع `kamecheanes07-ship-it/Icons`).
بما أن الأصل JPEG بخلفية شطرنجية مرسومة، استُخرج الشعار وفُصلت أجزاؤه البيضاء عن الخلفية، ثم أُعيد بناؤه
بألوان مسطّحة وشفافية حقيقية:

| الملف | الاستخدام |
|---|---|
| `assets-src/fox-mark.png` | الثعلب فقط، شفاف (309×387) — المصدر |
| `public/logos/fox-dark.png` | شعار كامل: ثعلب + كلمة FOX **بيضاء** (النمط الداكن) |
| `public/logos/fox-light.png` | شعار كامل: ثعلب + كلمة FOX **سوداء** (النمط الفاتح) |
| `public/logos/fox-icon.png` | الثعلب فقط، للاستخدام في حقل البحث |
| `public/icons/*` + `public/favicon.ico` | أيقونة التطبيق: مربع برتقالي وفيه الثعلب بالأبيض (16→512 + ICO) |

الواجهة تبدّل تلقائياً بين `fox-dark.png` و`fox-light.png` حسب النمط (`dark:block` / `dark:hidden`) في
`src/components/Logo.tsx`، و`<head>` يستخدم `favicon.ico` و`manifest.webmanifest`.

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
