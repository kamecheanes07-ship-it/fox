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

## النشر على Hugging Face Spaces
1. أنشئ Space جديداً على [huggingface.co/new-space](https://huggingface.co/new-space).
2. اختر **SDK: Docker** (Blank).
3. ارفع ملفات المشروع كاملة إلى مستودع الـ Space (أو اربطه عبر `git push`).
4. سيعمل التطبيق تلقائياً على المنفذ **7860** دون الحاجة لأي تسجيل دخول أو إعداد قاعدة بيانات خارجية (يحفظ المحفوظات والمجموعات وسجل البحث تلقائياً في `/app/data/fox-data.json`، أو في PostgreSQL إذا أضفت `DATABASE_URL` في Space Secrets).
