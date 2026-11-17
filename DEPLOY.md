# 🚀 نشر NexGO (Next.js 16 + PostgreSQL + Drizzle)

NexGO تطبيق **Fullstack** كامل: واجهة Next.js (App Router) + قاعدة PostgreSQL عبر Drizzle ORM + بحث حقيقي من DuckDuckGo + مصادقة وجلسات.

قبل أي شيء تذكّر أن التطبيق يحتاج **قاعدة PostgreSQL** ومتغير بيئة واحد إلزامي: `DATABASE_URL`.

---

## 0) جهّز المشروع على GitHub

من بيئة المشروع هنا: نزّل الملفات (أو اربط مستودع GitHub إن كان متاحاً)، ثم:

```bash
git init
git add -A
git commit -m "NexGO search app"
git branch -M main
git remote add origin https://github.com/<USERNAME>/nexgo.git
git push -u origin main
```

> ملاحظة: لا ترفع ملف `.env` إلى GitHub (يحتوي بيانات الاتصال). الملف `.env.example` موجود كقالب.

---

## 1) تجربة محلية سريعة

```bash
npm install
cp .env.example .env        # ثم عدّل DATABASE_URL
npx drizzle-kit push        # إنشاء الجداول
npm run build && npm start  # تشغيل نسخة الإنتاج على http://localhost:3000
```

التحقق: افتح `http://localhost:3000/api/health` ويجب أن يعيد `{"ok":true}`.

---

## 2) الخيار (أ) — Vercel + Neon / Supabase ✅ الأسرع والأنسب

### أ. قاعدة البيانات (Neon كمثال، ومجاني للبداية)
1. أنشئ حساباً على <https://neon.tech> ثم مشروعاً جديداً (اختر أقرب منطقة لك).
2. من **Connection Details** انسخ رابط **Pooled connection**، شكله:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   (استخدم الرابط الذي يحتوي `-pooler` لتجنّب استنزاف الاتصالات على Serverless.)

### ب. النشر على Vercel
1. اذهب إلى <https://vercel.com/new> واختر **Import Git Repository** لمستودع NexGO.
2. الإعدادات تلقائياً: Framework = **Next.js**، Build = `npm run build`، Output = `.next`.
3. في **Environment Variables** أضف:
   | الاسم | القيمة |
   |---|---|
   | `DATABASE_URL` | رابط Neon Pooled (مع `sslmode=require`) |
   | `PG_POOL_MAX` | `3` (اختياري لكن مفضّل) |
4. اضغط **Deploy**.
5. بعد أول Deploy، شغّل مرة واحدة من جهازك لإنشاء الجداول (اختياري — التطبيق ينشئها تلقائياً أيضاً):
   ```bash
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npx drizzle-kit push
   ```
6. افتح الرابط → سجّل الدخول بـ `demo@nexgo.app` / `demo1234` وستجد بيانات ديمو جاهزة.

> **كيف تُنشأ الجداول تلقائياً؟** ملف `src/instrumentation.ts` ينفّذ `ensureBootstrapped()` عند إقلاع كل نسخة: ينشئ الجداول إن لم تكن موجودة، ثم يزرع بيانات الديمو فقط إذا كانت القاعدة فارغة. العملية محمية بـ `pg_advisory_lock` فلا يحدث تضارب بين نسخ Serverless المتعددة.

---

## 3) الخيار (ب) — Railway أو Render (تطبيق + قاعدة في منصة واحدة)

### Railway
1. <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
2. أضف خدمة قاعدة: **+ New → Database → PostgreSQL**.
3. من خدمة التطبيق: **Variables → Add Reference → `DATABASE_URL` → Postgres.DATABASE_URL**.
4. Settings: Build `npm install && npm run build` — Start `npm start`.
5. من **Settings → Networking → Generate Domain** للحصول على رابط عام.

### Render
1. <https://render.com> → **New → PostgreSQL** (انسخ **Internal Database URL**).
2. **New → Web Service** → اربط المستودع.
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
   - Node version: 22 (أضف `NODE_VERSION=22` في Environment إن لزم)
3. أضف `DATABASE_URL` كمتغير بيئة ثم Deploy.

---

## 4) الخيار (ج) — VPS خاص مع Docker (تحكّم كامل)

الملفات الجاهزة: `Dockerfile` + `docker-compose.yml` (تطبيق + PostgreSQL + Healthcheck).

```bash
# على السيرفر (Ubuntu 22/24 مثلاً)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
git clone https://github.com/<USERNAME>/nexgo.git && cd nexgo
# (اختياري) كلمة مرور قاعدة أقوى:
export POSTGRES_PASSWORD='كلمة-مرور-قوية'
docker compose up -d --build
docker compose logs -f web          # تابع الإقلاع حتى يظهر الجاهزية
curl http://127.0.0.1:3000/api/health
```

### HTTPS مع Caddy (الأسهل)
```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
nexgo.example.com {
    reverse_proxy 127.0.0.1:3000
}
EOF
sudo systemctl reload caddy
```
Caddy يصدر شهادة SSL تلقائياً. عدّل سجل DNS: `A record` للنطاق → IP السيرفر.

نسخ احتياطي دوري:
```bash
docker compose exec db pg_dump -U postgres app_db > backup-$(date +%F).sql
```

---

## 5) متغيرات البيئة

| المتغير | إلزامي | الوصف |
|---|---|---|
| `DATABASE_URL` | ✅ | رابط PostgreSQL. استخدم Pooled URL في Serverless. |
| `PG_POOL_MAX` | ❌ | أقصى اتصالات لكل نسخة (الافتراضي 10، اجعله 3–5 على Vercel). |
| `DATABASE_SSL` | ❌ | `true` عند الحاجة إلى TLS بدون `sslmode` في الرابط. |
| `PORT` | ❌ | يستخدمه `next start` ( الافتراضي 3000، والمنصات تضبطه تلقائياً). |
| `SEED_DEMO` | ❌ | اجعله `false` عند الإطلاق الحقيقي: لا تُزرع بيانات ديمو، ولا يُعاد إنشاء حساب `demo@nexgo.app`، ويختفي زر الدخول التجريبي. |

كوكي الجلسة `HttpOnly` + `SameSite=Lax` دائماً، ويصبح `Secure` **تلقائياً** عند الوصول عبر HTTPS (يُستدل عليه من `X-Forwarded-Proto` أو ترويسة `Origin`)، فيعمل الدخول على HTTPS في الإنتاج وعلى `http://localhost` محلياً دون إعداد. وإذا عُرض التطبيق داخل إطار (iframe) من موقع آخر — كالمعاينات المضمّنة — يُصدر كوكي `SameSite=None; Secure; Partitioned` ليعمل الدخول هناك أيضاً، مع رفض أي طلب كتابة قادم من موقع آخر (`Sec-Fetch-Site: cross-site`) في `src/proxy.ts`.

---

## 6) قاعدة البيانات: الجداول وبيانات الديمو

- **إنشاء الجداول:** تلقائياً عند الإقلاع، أو يدوياً `npx drizzle-kit push`.
- **الحسابات المزروعة:** `demo@nexgo.app` / `demo1234` و `marcus@nexgo.app` / `password123` مع سجل بحث، ونتائج محفوظة بروابط حقيقية تم التحقق منها، ومجموعات جاهزة. حساب الديمو عام، لذلك كلمة مروره وحذفه مقفلان من الواجهة، ويُعاد إنشاؤه تلقائياً إن فُقد (عطّل ذلك بـ `SEED_DEMO=false`).
- **إعادة زرع الديمو** بعد الحذف:
  ```sql
  TRUNCATE users CASCADE;   -- يحذف كل شيء مرتبط، والزرع يحدث في أول طلب
  ```
- **قبل الإنتاج الحقيقي:** احذف حسابات الديمو أو غيّر كلمات مرورها من صفحة **Settings**.
- **تغيير المخطط لاحقاً:**
  ```bash
  npx drizzle-kit generate   # يولّد ملفات migration
  npx drizzle-kit push       # يطبّقها على القاعدة
  ```

---

## 7) قائمة تحقق بعد النشر

```bash
BASE=https://your-domain.com
curl -s $BASE/api/health                                  # {"ok":true}
curl -s -o /dev/null -w "%{http_code}\n" $BASE/            # 200
curl -s -o /dev/null -w "%{http_code}\n" $BASE/login       # 200
curl -s -o /dev/null -w "%{http_code}\n" $BASE/dashboard   # 307 (محمي، يحوّل لتسجيل الدخول)
curl -s "$BASE/api/search?q=nextjs&tab=all" | head -c 120  # نتائج ويب حقيقية
```

يدوياً في المتصفح:
1. سجّل الدخول بالحساب التجريبي.
2. جرّب البحث والتبويبات: **All / News / Photos / Videos**.
3. احفظ نتيجة (أيقونة الحاشية) ← تظهر في **Saved results**، ثم أضفها لمجموعة.
4. تحقق من **Search history** و**Overview** و**Settings**.
5. جرّب من الجوال (القائمة الجانبية تصبح Drawer).

---

## 8) استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `DATABASE_URL is required` | أضف المتغير في Environment Variables وأعد النشر. |
| `relation "users" does not exist` | نفّذ `npx drizzle-kit push` بنفس `DATABASE_URL`. |
| `too many connections` | استخدم Pooled URL وقلّل `PG_POOL_MAX` إلى 3. |
| `no pg_hba.conf entry ... SSL off` | أضف `?sslmode=require` للرابط أو `DATABASE_SSL=true`. |
| شريط أصفر «DuckDuckGo is limiting requests» ونتائج من ويكيبيديا | DuckDuckGo يحجب مؤقتاً العناوين التي ترسل طلبات كثيرة متتالية. التطبيق يعرض مطابقات ويكيبيديا كبديل مؤقت موسوم بوضوح (والصور من Wikimedia Commons)، وزر **Retry DuckDuckGo** يعيد المحاولة. الحجب يزول تلقائياً بعد دقائق؛ الصفحات الناجحة تُخزَّن 10 دقائق لتقليل الطلبات. |
| نتائج الويب تتوقف عند ~200 نتيجة | هذا حدّ DuckDuckGo نفسه: يقدّم نحو 13 صفحة (10 ثم 15 نتيجة) لكل بحث ويرفض ما بعدها، لذلك لا يطلب التطبيق الصفحة 14. الأخبار ~30/صفحة، الفيديو 60/صفحة، الصور 100/صفحة حتى تنتهي. |
| بحث بعلامات اقتباس أو `site:` يعرض إشعاراً | DuckDuckGo لا ينفّذ عوامل البحث للطلبات القادمة من الخوادم، فيبحث التطبيق عن الكلمات نفسها بدون العوامل ويوضّح ذلك أعلى النتائج. |
| تسجيل الدخول لا «يثبت» | المتصفح يحجب الكوكي (يظهر تنبيه بذلك في نموذج الدخول). اسمح بالكوكيز للموقع، أو افتح التطبيق في تبويب مستقل إن كان معروضاً داخل صفحة أخرى، وتأكد أن البروكسي يمرّر `X-Forwarded-Proto`. |
| فشل البناء على Vercel | اختر Node.js 22 في Project Settings، وتأكد أن `npm run build` ينجح محلياً. |

---

## 9) خريطة سريعة لبنية المشروع

```
src/app/                 الصفحات + API routes
  page.tsx               الرئيسية (بحث)
  search/page.tsx        صفحة النتائج + التبويبات
  login|signup/          المصادقة
  dashboard/             Overview, searches, saved, collections, settings
  api/search/route.ts    وسيط DuckDuckGo (All/News/Videos/Images) + تسجيل السجل
src/components/          واجهات العميل (بحث، حفظ، جداول، مجموعات، إعدادات)
src/db/                  schema.ts, migrate.ts, seed.ts, bootstrap.ts
src/lib/                 ddg.ts (المحرك), auth.ts, password.ts, utils.ts
src/instrumentation.ts   تهيئة القاعدة والزرع عند الإقلاع
proxy.ts (src/)          حماية /dashboard
Dockerfile / compose     نشر ذاتي الاستضافة
```

بعد النشر: أي `git push` إلى `main` سيعيد النشر تلقائياً على Vercel/Railway/Render.
