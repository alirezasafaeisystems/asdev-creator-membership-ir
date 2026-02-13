# Runbook ریلیز
نسخه: 1.1

## قبل از ریلیز
- freeze تغییرات غیرضروری
- اجرای کامل quality gates
- بررسی policy و approvalها

## گام های ریلیز
1. sync با `origin/main`
2. اجرای smoke/quality
3. ایجاد tag نسخه رسمی
4. انتشار release notes

## rollback
- اگر migration مشکل داشت، restore طبق `ops/scripts/restore_db.sh`
- اگر خطای عملیاتی شدید رخ داد، rollback به tag پایدار قبلی

## خروجی اجباری
- گزارش تست
- changelog/release note
- ثبت incident در صورت rollback
