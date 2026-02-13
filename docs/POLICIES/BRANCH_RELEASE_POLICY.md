# سیاست شاخه و ریلیز
نسخه: 1.1

## شاخه ها
- `main`: شاخه پایدار
- `feat/*`, `fix/*`, `docs/*`, `chore/*`: شاخه های کاری کوتاه عمر

## قوانین merge
- merge مستقیم به `main` ممنوع است.
- همه تغییرات باید از PR عبور کنند.
- برای حوزه های حساس، approval چندنفره الزامی است.

## نسخه گذاری و tag
- tagها با الگوی `vMAJOR.MINOR.PATCH` برای release رسمی
- tagهای `phase-*` فقط artifact فاز هستند و جایگزین release tag نیستند.

## release flow
1. freeze تغییرات غیرضروری
2. اجرای کامل gateها
3. اجرای runbook ریلیز
4. ایجاد tag نسخه
5. انتشار release note و rollback plan

## hotfix
- hotfix از `main` branch می شود: `fix/hotfix-...`
- بعد از deploy، مستندات و changelog باید همسان شوند.
