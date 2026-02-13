# مدل دامنه
نسخه: 1.1

## موجودیت های اصلی
- User
- CreatorProfile
- Tier
- Membership
- Payment
- PaymentEvent
- Post
- Asset
- Payout
- PayoutItem
- AuditLog

## invariants کلیدی
- `creator_profiles.username` یکتا است.
- `payments.gatewayRef` یکتا است.
- membership فعال تکراری برای `(userId, tierId)` مجاز نیست.
- هر `payout_item.paymentId` فقط یکبار مصرف می شود.

## چرخه عمر ساده
- Payment: `created -> pending_callback -> succeeded|failed`
- Membership: `inactive -> active -> expired|cancelled`
- Payout: `draft -> approved -> processing -> settled|rejected`
