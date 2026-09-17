# Event Registration & QR Check-in System
## Product & Technical Specification — MVP v1

> Đây là tài liệu nguồn duy nhất để triển khai hệ thống. Khi có xung đột giữa code và tài liệu này, ưu tiên tài liệu này.

---

## 1. Mục tiêu sản phẩm

Xây dựng một nền tảng quản lý đăng ký và check-in sự kiện, có thể tái sử dụng cho nhiều hoạt động.

Luồng chính:

1. BTC đăng nhập và tạo sự kiện.
2. Hệ thống sinh trang đăng ký công khai cho từng sự kiện.
3. Người tham gia điền form, không cần tạo tài khoản.
4. Hệ thống lưu đăng ký, sinh một QR riêng cho lượt đăng ký đó và gửi QR qua email.
5. Khi đến sự kiện, BTC dùng điện thoại mở trang Scanner và quét QR của người tham gia.
6. Backend xác thực QR, chống check-in trùng và ghi nhận thời gian/người thực hiện.
7. Dashboard cập nhật số liệu đăng ký/check-in.
8. BTC có thể tìm participant, check-in thủ công và xuất dữ liệu CSV/XLSX.

MVP phải hỗ trợ nhiều sự kiện, không hard-code cho một chương trình cụ thể.

---

## 2. Phạm vi MVP

### Có trong MVP

- Đăng nhập cho BTC.
- Role `ADMIN` và `ORGANIZER`.
- Tạo/sửa/publish/cancel event.
- Trang event công khai.
- Form đăng ký theo event.
- Core fields bắt buộc: Họ tên, MSSV, Email.
- Optional built-in fields: Số điện thoại, Khoa/Viện.
- Custom registration fields.
- Capacity.
- Registration window.
- Check-in window.
- QR cá nhân cho từng registration.
- Email xác nhận + QR.
- QR scanner trên browser bằng camera điện thoại.
- Chống check-in trùng.
- Manual check-in.
- Event dashboard.
- Participant list + search/filter/pagination.
- Participant detail.
- Export CSV/XLSX.
- Rate limiting public registration.
- Seed data.
- Automated tests cho critical flows.
- Deploy được lên Vercel + Supabase.

### Chưa làm trong MVP

- Account cho participant.
- Participant profile dùng chung nhiều event.
- SSO UEH.
- Tự đăng ký tài khoản BTC.
- Certificate.
- Waiting list.
- Payment.
- SMS.
- Push notification.
- QR động/OTP xoay vòng.
- Xóa cứng event/registration.
- Phân quyền phức tạp theo từng event.
- Import participant hàng loạt.
- Offline scanner.

---

## 3. Actor và quyền

### Participant

Không có account.

Có thể:
- Xem event public.
- Đăng ký event khi hợp lệ.
- Nhận QR sau đăng ký.
- Nhận email xác nhận.

Không thể:
- Xem danh sách người khác.
- Truy cập admin.
- Tự check-in.

### Organizer / BTC

Phải đăng nhập.

Có thể:
- Xem dashboard.
- Tạo/sửa/publish/cancel event.
- Xem participant.
- Scan QR.
- Manual check-in.
- Export dữ liệu.

Trong MVP, mọi `ORGANIZER` đã đăng nhập có thể quản lý mọi event. `ADMIN` có toàn quyền tương tự và dành chỗ cho mở rộng quản trị user sau này.

---

## 4. Tech stack chính thức

### Application

- Next.js, App Router.
- TypeScript, `strict: true`.
- Tailwind CSS.
- shadcn/ui.
- Responsive design.
- UI mặc định tiếng Việt.

### Backend

- Next.js Route Handlers.
- REST API.
- Zod validation.
- Prisma ORM.
- PostgreSQL trên Supabase.

### Authentication

- Auth.js.
- Credentials provider.
- JWT session strategy.
- Password hash bằng `bcryptjs`.
- Không có self-registration.

### Email

- Resend.
- QR PNG đính kèm email hoặc render CID/attachment theo cách Resend hỗ trợ ổn định.
- Email failure không rollback registration.

### QR

- `qrcode` để sinh QR.
- `html5-qrcode` để scan trên browser.
- QR chứa opaque random token, không chứa MSSV/email/name.

### Export

- `exceljs` cho XLSX.
- CSV do server generate.
- Bắt buộc chống spreadsheet formula injection.

### Rate limiting

- Production: Upstash Redis + `@upstash/ratelimit`.
- Local development có thể fallback sang memory limiter hoặc bypass có cảnh báo rõ ràng.

### Testing

- Vitest cho unit/integration-level logic.
- Playwright cho E2E.
- Test database tách biệt với production.

### Deployment

- Vercel: web app.
- Supabase: PostgreSQL.
- Resend: email.
- Upstash: rate limiting production.

---

## 5. Kiến trúc hệ thống

```text
Browser
  │
  ├── Public Pages
  └── Admin Pages
        │
        ▼
Next.js App Router
  │
  ├── Route Handlers / REST API
  ├── Auth.js
  ├── Services / Business Rules
  ├── Validation
  └── Export / Email / QR
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL (Supabase)
```

Quy tắc:
- Client không truy cập database trực tiếp.
- Business rules không đặt rải rác trong React components.
- Route handler gọi service layer.
- Service layer chịu trách nhiệm transaction, validation cấp nghiệp vụ, authorization và mapping error code.
- Secrets chỉ tồn tại server-side.

---

## 6. Cấu trúc source code

```text
/
├─ app/
│  ├─ (public)/
│  │  └─ events/
│  │     └─ [slug]/
│  │        ├─ page.tsx
│  │        ├─ register/
│  │        │  └─ page.tsx
│  │        └─ registration/
│  │           └─ success/
│  │              └─ page.tsx
│  │
│  ├─ admin/
│  │  ├─ login/
│  │  │  └─ page.tsx
│  │  ├─ page.tsx
│  │  └─ events/
│  │     ├─ page.tsx
│  │     ├─ new/
│  │     │  └─ page.tsx
│  │     └─ [id]/
│  │        ├─ page.tsx
│  │        ├─ edit/
│  │        │  └─ page.tsx
│  │        ├─ participants/
│  │        │  └─ page.tsx
│  │        └─ scanner/
│  │           └─ page.tsx
│  │
│  └─ api/
│     ├─ auth/
│     ├─ events/
│     └─ admin/
│
├─ components/
│  ├─ ui/
│  ├─ public/
│  ├─ admin/
│  ├─ events/
│  ├─ participants/
│  └─ scanner/
│
├─ lib/
│  ├─ auth/
│  ├─ db/
│  ├─ email/
│  ├─ qr/
│  ├─ rate-limit/
│  ├─ validation/
│  ├─ export/
│  ├─ errors/
│  ├─ time/
│  └─ utils/
│
├─ services/
│  ├─ event.service.ts
│  ├─ registration.service.ts
│  ├─ checkin.service.ts
│  ├─ dashboard.service.ts
│  └─ export.service.ts
│
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
│
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
│
├─ public/
├─ middleware.ts
├─ .env.example
├─ README.md
└─ SPECIFICATION.md
```

Không bắt buộc tên file y hệt nếu framework yêu cầu khác, nhưng phải giữ separation of concerns tương đương.

---

## 7. Coding conventions

- TypeScript strict.
- Không dùng `any` nếu không thật sự cần.
- Dùng Zod cho mọi request body/query public.
- Dùng enums/constants thay vì magic strings.
- Không duplicate business logic giữa API và UI.
- Functions nhỏ, tên rõ ràng.
- Không nhét DB query trực tiếp vào React client component.
- Client component chỉ dùng khi thật sự cần state/browser API/camera.
- Server component là mặc định.
- Log server không chứa QR token gốc, password, secret hoặc dữ liệu nhạy cảm không cần thiết.
- Error trả cho client phải dùng error code chuẩn.
- Không swallow exception; phải log lỗi kỹ thuật ở server nhưng trả message an toàn cho client.
- Tất cả date trong database là UTC.
- UI hiển thị theo `Asia/Ho_Chi_Minh`.

---

## 8. Database schema

### 8.1 Enums

```text
UserRole:
- ADMIN
- ORGANIZER

EventStatus:
- DRAFT
- PUBLISHED
- CANCELLED

RegistrationStatus:
- REGISTERED
- CANCELLED

CheckinMethod:
- QR
- MANUAL

EventFieldType:
- TEXT
- NUMBER
- EMAIL
- PHONE
- SELECT
- RADIO
- CHECKBOX
- TEXTAREA
```

### 8.2 `users`

```text
id                UUID PK
name              String
email             String UNIQUE
password_hash     String
role              UserRole
created_at        DateTime
updated_at        DateTime
```

### 8.3 `events`

```text
id                       UUID PK
name                     String
slug                     String UNIQUE
description              Text nullable
location                 String nullable

start_time               DateTime
end_time                 DateTime

registration_open_at     DateTime
registration_close_at    DateTime

checkin_open_at          DateTime
checkin_close_at         DateTime

capacity                 Int nullable

status                   EventStatus

code_prefix              String
registration_counter     Int default 0

collect_phone            Boolean default true
require_phone            Boolean default false

collect_faculty          Boolean default true
require_faculty          Boolean default false

created_by               UUID FK -> users.id

created_at               DateTime
updated_at               DateTime
```

Validation:
- `start_time < end_time`
- `registration_open_at < registration_close_at`
- `registration_close_at <= start_time`
- `checkin_open_at < checkin_close_at`
- default `checkin_open_at = start_time - 30 minutes`
- default `checkin_close_at = end_time`
- `capacity == null` nghĩa là không giới hạn.
- Nếu có capacity thì `capacity > 0`.
- `code_prefix` 3–8 ký tự A-Z/0-9.
- Không cho giảm capacity xuống thấp hơn số active registrations.

### 8.4 `event_fields`

```text
id             UUID PK
event_id       UUID FK -> events.id

label          String
field_key      String
type           EventFieldType
required       Boolean default false
options        Json nullable
order          Int
is_active      Boolean default true

created_at     DateTime
updated_at     DateTime
```

Constraints:
- UNIQUE `(event_id, field_key)`
- `SELECT`, `RADIO`, `CHECKBOX` phải có `options` hợp lệ.
- Field có answer rồi không được hard delete trong MVP; chuyển `is_active = false`.

### 8.5 `registrations`

```text
id                         UUID PK
event_id                   UUID FK -> events.id

registration_code          String UNIQUE

full_name                  String
student_id                 String
email                      String
phone                      String nullable
faculty                    String nullable

qr_token_hash              String UNIQUE

status                     RegistrationStatus default REGISTERED

registered_at              DateTime
updated_at                 DateTime

confirmation_email_sent_at DateTime nullable
```

Constraints:
- UNIQUE `(event_id, student_id)`
- UNIQUE `(event_id, email)`
- normalize MSSV bằng trim.
- normalize email bằng trim + lowercase.

### 8.6 `registration_answers`

```text
id                 UUID PK
registration_id    UUID FK -> registrations.id
event_field_id     UUID FK -> event_fields.id
value              Json
created_at         DateTime
```

Constraint:
- UNIQUE `(registration_id, event_field_id)`

Dùng `Json` để hỗ trợ checkbox/multi-value an toàn.

### 8.7 `checkins`

```text
id                 UUID PK
registration_id    UUID FK -> registrations.id UNIQUE
event_id           UUID FK -> events.id
checked_in_at      DateTime
checked_in_by      UUID FK -> users.id
method             CheckinMethod
created_at         DateTime
```

Service phải đảm bảo `checkins.event_id == registrations.event_id`.

### 8.8 Indexes

Ít nhất:
- `registrations(event_id)`
- `registrations(student_id)`
- `registrations(email)`
- `registrations(registered_at)`
- `checkins(event_id)`
- `checkins(checked_in_at)`
- `event_fields(event_id, order)`

---

## 9. Registration code

Mỗi event có `code_prefix`, ví dụ `PENTA`.

Khi tạo registration:
1. Trong transaction, increment `events.registration_counter`.
2. Lấy số mới.
3. Sinh code: `PENTA-000154`.
4. Lưu vào `registration_code`.

Phải xử lý concurrency bằng transaction có isolation phù hợp và retry khi cần.

Registration code chỉ phục vụ tra cứu/support, không dùng để xác thực QR.

---

## 10. QR security

### Token

- Sinh bằng CSPRNG, entropy khoảng 256-bit, ví dụ `crypto.randomBytes(32)`.
- QR chứa token gốc ở dạng opaque string.
- Không chứa MSSV, email, tên, registration code hoặc data cá nhân.

### Database

- Không lưu token gốc.
- Lưu `SHA-256(token)` trong `qr_token_hash`.

### Scan

1. Scanner đọc token.
2. Gửi token qua HTTPS tới server.
3. Server hash token bằng SHA-256.
4. Lookup `qr_token_hash`.
5. Validate event/status/check-in window.
6. Tạo check-in nếu hợp lệ.

Không log token gốc.

QR hợp lệ từ lúc registration tạo thành công cho đến khi:
- registration bị cancel; hoặc
- event/check-in window không còn hợp lệ theo business rule.

---

## 11. Derived event/registration state

Database event chỉ lưu:
- `DRAFT`
- `PUBLISHED`
- `CANCELLED`

UI/backend derive state:

```text
CANCELLED
  nếu status = CANCELLED

DRAFT
  nếu status = DRAFT

COMPLETED
  nếu now > end_time

ONGOING
  nếu start_time <= now <= end_time

NOT_OPEN_YET
  nếu now < registration_open_at

OPEN
  nếu registration_open_at <= now <= registration_close_at
  và chưa full

FULL
  nếu active registrations >= capacity

CLOSED
  nếu now > registration_close_at
```

`FULL` ưu tiên hơn `OPEN`.

---

## 12. Public UI

### 12.1 Event page

Route:
`/events/[slug]`

Hiển thị:
- Event name.
- Description.
- Location.
- Start/end time.
- Registration window.
- Capacity.
- Registered count.
- Registration state.
- CTA đăng ký khi hợp lệ.

Không hiện CTA nếu:
- chưa mở;
- đã đóng;
- full;
- cancelled;
- completed.

### 12.2 Registration page

Route:
`/events/[slug]/register`

Fields:
- Họ tên *.
- MSSV *.
- Email *.
- Phone theo event config.
- Faculty theo event config.
- Active custom fields theo `order`.
- Checkbox xác nhận thông tin.

UX:
- Client validation.
- Server validation bắt buộc.
- Disable submit khi đang xử lý.
- Không cho double submit.
- Hiển thị field-level error rõ ràng.

### 12.3 Success page

Route:
`/events/[slug]/registration/success`

Hiển thị:
- Đăng ký thành công.
- Name.
- MSSV.
- Registration code.
- QR.
- Email nhận xác nhận.
- Nút lưu QR.

Registration POST trả QR token cho client một lần để render QR. Có thể giữ dữ liệu success trong `sessionStorage` để tránh URL lộ token. Nếu reload và token không còn ở client, trang phải thông báo QR đã được gửi email thay vì fetch token gốc từ database.

---

## 13. Admin UI

### 13.1 Login

Route:
`/admin/login`

Fields:
- Email.
- Password.
- Submit.

Không có sign-up.

### 13.2 Global dashboard

Route:
`/admin`

Hiển thị:
- Total events.
- Total active registrations.
- Total check-ins.
- Attendance rate.
- Upcoming events.
- Recent activity.

### 13.3 Event list

Route:
`/admin/events`

- Search.
- Filter.
- Pagination.
- Create Event.
- Event cards/table.
- Derived status.

### 13.4 Create Event

Route:
`/admin/events/new`

Sections:
1. Basic Information.
2. Registration settings.
3. Check-in settings.
4. Registration form settings.
5. Custom fields.

Actions:
- Save Draft.
- Publish Event.

Core fields `full_name`, `student_id`, `email` luôn bật và required.

Phone/Faculty:
- toggle collect.
- toggle required.

Custom field:
- label.
- key.
- type.
- required.
- options.
- order.
- active.

### 13.5 Edit Event

Route:
`/admin/events/[id]/edit`

Nếu đã có registrations:
- warning.
- Không hard-delete field đã có answer.
- Không giảm capacity thấp hơn current active registration count.

### 13.6 Event Dashboard

Route:
`/admin/events/[id]`

Metrics:
- Registered.
- Checked in.
- Not checked in.
- Attendance rate.

Charts:
- Registration trend.
- Check-in trend.

Other:
- Recent check-ins.
- Edit.
- Scanner.
- Export.
- Link Participants.

### 13.7 Participants

Route:
`/admin/events/[id]/participants`

- Search MSSV/name/email/registration code.
- Filter all/checked-in/not-checked-in/cancelled nếu cần.
- Pagination.
- Export.
- Row click -> detail drawer.

### 13.8 Participant detail drawer

Hiển thị:
- Core participant data.
- Custom answers.
- Registration code/time/status.
- Check-in info.
- Manual check-in button nếu đủ điều kiện.

### 13.9 Scanner

Route:
`/admin/events/[id]/scanner`

Mobile-first.

Hiển thị:
- Event name.
- Camera viewport.
- Count `checked-in / active registrations`.
- Manual search fallback.

Scanner behavior:
- Không gửi request mới khi request hiện tại đang xử lý.
- Success: hiển thị ~1.5 giây rồi resume.
- Duplicate: hiển thị ~2–3 giây rồi resume.
- Invalid/wrong event: hiển thị rõ, cho scan lại.
- Camera permission failure: hướng dẫn user bật camera.
- Chỉ chạy trong secure context (HTTPS) trên production.

---

## 14. REST API

Tất cả API trả JSON thống nhất trừ export file.

### 14.1 Public event

`GET /api/events/{slug}`

Trả:
- event public info.
- registeredCount.
- derived registration state.
- active fields.

### 14.2 Register

`POST /api/events/{eventId}/registrations`

Request:

```json
{
  "fullName": "Nguyen Van A",
  "studentId": "31241000001",
  "email": "example@st.ueh.edu.vn",
  "phone": "0900000000",
  "faculty": "CTD",
  "answers": {
    "shirt_size": "L",
    "vegetarian": "NO"
  }
}
```

Server:
1. Normalize.
2. Validate event.
3. Validate registration window.
4. Validate capacity.
5. Validate duplicate.
6. Validate built-in fields.
7. Validate active custom fields.
8. Generate QR token.
9. Transaction:
   - protect capacity/concurrency;
   - increment event registration counter;
   - create registration;
   - create answers.
10. Commit.
11. Generate QR.
12. Send email.
13. Update `confirmation_email_sent_at` nếu thành công.
14. Return success + registration info + one-time QR token/QR payload.

Email error không rollback registration.

### 14.3 Admin events

- `GET /api/admin/events`
- `POST /api/admin/events`
- `GET /api/admin/events/{eventId}`
- `PATCH /api/admin/events/{eventId}`

Không hard-delete event trong MVP.

### 14.4 Participants

- `GET /api/admin/events/{eventId}/participants`
- `GET /api/admin/registrations/{registrationId}`

Query hỗ trợ:
- search.
- status.
- page.
- limit.

Search server-side, case-insensitive, partial match.

### 14.5 QR check-in

`POST /api/admin/events/{eventId}/checkins/qr`

Request:
```json
{ "token": "opaque-token" }
```

Response status:
- `SUCCESS`
- `ALREADY_CHECKED_IN`
- `INVALID_QR`
- `WRONG_EVENT`
- `CHECKIN_NOT_OPEN`
- `REGISTRATION_CANCELLED`

### 14.6 Manual check-in

`POST /api/admin/events/{eventId}/checkins/manual`

Request:
```json
{ "registrationId": "..." }
```

Lưu:
- `method = MANUAL`
- `checked_in_by = currentUser.id`

### 14.7 Dashboard

`GET /api/admin/events/{eventId}/dashboard`

Trả:
- registered.
- checkedIn.
- notCheckedIn.
- attendanceRate.
- registrationTrend.
- checkinTrend.
- recentCheckins.

Attendance:
`checkedIn / activeRegistrations * 100`.

### 14.8 Export

`GET /api/admin/events/{eventId}/export?format=xlsx`

Hoặc:
`format=csv`

---

## 15. Error format

Format chuẩn:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_STUDENT",
    "message": "Student ID has already registered for this event."
  }
}
```

Các code tối thiểu:

- `EVENT_NOT_FOUND`
- `EVENT_CANCELLED`
- `REGISTRATION_NOT_OPEN`
- `REGISTRATION_CLOSED`
- `EVENT_FULL`
- `DUPLICATE_STUDENT`
- `DUPLICATE_EMAIL`
- `VALIDATION_ERROR`
- `INVALID_QR`
- `WRONG_EVENT`
- `ALREADY_CHECKED_IN`
- `CHECKIN_NOT_OPEN`
- `REGISTRATION_CANCELLED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Không trả stack trace ra client.

---

## 16. Business rules bắt buộc

### Registration uniqueness

Database enforce:
- UNIQUE `(event_id, student_id)`
- UNIQUE `(event_id, email)`

### Check-in uniqueness

Database enforce:
- UNIQUE `checkins.registration_id`

Nếu hai scanner quét cùng QR gần đồng thời:
- chỉ một request tạo check-in;
- request còn lại trả `ALREADY_CHECKED_IN`.

### Capacity concurrency

Không được vượt capacity dù nhiều người đăng ký cùng lúc.

Triển khai bằng Prisma transaction với isolation phù hợp PostgreSQL, ưu tiên `Serializable`, và retry transaction khi gặp conflict/deadlock serialization.

### Custom field removal

Nếu field đã có answer:
- không hard-delete;
- set `is_active = false`.

### Event cancel

Cancel:
- giữ toàn bộ registrations/checkins.
- không nhận registration mới.
- scanner không cho check-in.

### Email failure

Registration vẫn thành công.
UI cảnh báo email chưa gửi được và yêu cầu user lưu QR.

---

## 17. Security baseline

Bắt buộc:

- Server-side validation.
- Zod.
- Auth guard cho `/admin` và `/api/admin/*`.
- Secure cookies trong production.
- CSRF protection theo cơ chế Auth.js/framework.
- Password hash bằng bcryptjs.
- Rate limit public registration.
- QR random token 256-bit.
- QR token hash trong DB.
- Không expose secret.
- `.env` trong `.gitignore`.
- Chỉ commit `.env.example`.
- Không log password/token/secret.
- ORM parameterization để tránh SQL injection.
- Escape/sanitize output phù hợp.
- Không tin client-derived event state/capacity/check-in status.
- Authorization luôn kiểm tra ở server.

---

## 18. Spreadsheet export security

Trước khi ghi CSV/XLSX, sanitize text cell bắt đầu bằng:

- `=`
- `+`
- `-`
- `@`

Phải prefix an toàn để Excel không interpret thành formula.

XLSX columns:
- Registration Code
- MSSV
- Full Name
- Email
- Phone
- Faculty
- Custom fields
- Registered At
- Registration Status
- Check-in Status
- Checked In At
- Check-in Method

Filename:
`{event_slug}_attendance_{YYYY-MM-DD}.xlsx`

---

## 19. Timezone

- DB: UTC.
- Server compare bằng timestamps chuẩn.
- UI: `Asia/Ho_Chi_Minh`.
- Export: hiển thị local time Việt Nam, nhưng không thay đổi dữ liệu gốc.

---

## 20. Email

Subject:
`Xác nhận đăng ký - {eventName}`

Nội dung tối thiểu:
- Họ tên.
- Event.
- Thời gian.
- Địa điểm.
- Registration code.
- QR.
- Nhắc xuất trình QR khi check-in.

Không đưa QR token dạng text nếu không cần; ưu tiên ảnh QR.

Nếu Resend lỗi:
- log error server-safe.
- không rollback.
- `confirmation_email_sent_at = null`.

---

## 21. Responsive/UI quality

Breakpoints phải test tối thiểu:
- 375px.
- 768px.
- 1440px.

Ưu tiên:
- Public registration: mobile friendly.
- Scanner: mobile-first.
- Admin dashboard/table: desktop tốt nhưng vẫn responsive.

UI:
- clean.
- minimal.
- professional.
- consistent spacing.
- accessible form labels.
- keyboard-friendly admin forms.
- loading/error/empty states đầy đủ.

Font có thể dùng Geist hoặc Inter.

Không lạm dụng animation.

---

## 22. Seed data

`prisma/seed.ts` phải tạo dữ liệu giả, tuyệt đối không dùng thông tin cá nhân thật.

Tối thiểu:

### Users
- 1 ADMIN.
- 1 ORGANIZER.

Credentials dev lấy từ env nếu có:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Nếu không có, seed dev có thể dùng giá trị documented trong README nhưng phải cảnh báo không dùng production.

### Events
- 1 Draft.
- 1 Published/Open.
- 1 Completed/old event.

### Registrations
Khoảng 20–30 registration giả.

### Check-ins
Một phần QR, một phần MANUAL.

### Custom fields
Ít nhất:
- shirt size SELECT.
- vegetarian RADIO.
- note TEXTAREA.

---

## 23. Testing strategy

### Unit tests

Tối thiểu:
- derive event state.
- normalize email/student id.
- registration window.
- capacity logic.
- QR hash.
- error mapping.
- spreadsheet formula sanitization.
- validation custom field.

### Integration/API tests

Tối thiểu:
- register success.
- duplicate student.
- duplicate email.
- full event.
- registration closed.
- invalid custom field.
- email failure không rollback registration.
- valid QR check-in.
- duplicate QR.
- wrong-event QR.
- cancelled registration.
- check-in outside window.
- manual check-in.
- concurrent duplicate check-in protection.
- capacity concurrency protection nếu test environment cho phép.

### E2E Playwright

Critical paths:
1. Admin login.
2. Create draft event.
3. Publish event.
4. Participant register.
5. Success page shows QR.
6. Admin participant list contains registration.
7. Manual check-in.
8. Export endpoint returns file.
9. Scanner UI fallback/manual flow.

Camera hardware scan không bắt buộc chạy trong CI; business endpoint và UI state phải test được bằng mocked scan token.

### Quality gates

Trước khi coi phase hoàn thành:
- lint pass.
- TypeScript pass.
- unit/integration tests pass.
- production build pass.

---

## 24. Deployment

### Supabase

- Tạo PostgreSQL database.
- Dùng connection string phù hợp Prisma.
- Nếu dùng pooler cho runtime, cấu hình thêm direct connection cho migrations nếu cần.
- Không bật public table access từ browser; app truy cập DB qua server.

### Vercel

Set env:
- `DATABASE_URL`
- `DIRECT_URL` nếu Prisma/Supabase setup cần.
- `AUTH_SECRET`
- `APP_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- seed vars chỉ dùng khi cần.

Deploy command phải chạy migration an toàn:
`prisma migrate deploy`

Không tự động seed production trừ khi explicitly requested.

### Resend

- Verify sender/domain.
- `EMAIL_FROM` dùng verified sender.

### Camera

Production scanner phải chạy HTTPS; Vercel đáp ứng điều này.

---

## 25. README bắt buộc

README phải có:

1. Project overview.
2. Tech stack.
3. Prerequisites.
4. Environment variables.
5. Local setup.
6. Prisma migration.
7. Seed.
8. Run dev.
9. Run tests.
10. Build.
11. Deploy notes.
12. Default/dev admin credentials nếu seed dev có tạo.
13. Email setup.
14. Scanner/camera notes.
15. Troubleshooting thường gặp.

---

## 26. `.env.example`

Tối thiểu:

```env
DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=
APP_URL=http://localhost:3000

RESEND_API_KEY=
EMAIL_FROM=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ORGANIZER_EMAIL=
SEED_ORGANIZER_PASSWORD=
```

Không đưa secret thật.

---

## 27. Definition of Done

MVP chỉ được xem là hoàn thành khi tất cả điều sau đúng:

### Functional
- Admin login được.
- Tạo Draft Event được.
- Publish event sau validation được.
- Public event page đúng trạng thái.
- Participant đăng ký được.
- Duplicate student/email bị chặn.
- Capacity không bị vượt.
- QR riêng được tạo.
- Email được gửi khi cấu hình Resend hợp lệ.
- Email lỗi không làm mất registration.
- Scanner đọc token và gọi check-in API.
- QR hợp lệ check-in được.
- QR trùng không tạo record thứ hai.
- QR event khác bị từ chối.
- Manual check-in hoạt động.
- Dashboard số liệu đúng.
- Search/filter participant hoạt động.
- Export CSV/XLSX hoạt động.
- Formula injection được sanitize.
- Cancel event chặn registration/check-in mới.

### Security
- Admin routes protected.
- Public registration rate limited.
- Password hashed.
- QR token không lưu plain text.
- Secrets không xuất hiện ở client/repo/log.
- Server-side authorization và validation đầy đủ.

### Quality
- TypeScript strict không lỗi.
- Lint pass.
- Tests critical pass.
- Production build pass.
- Responsive tại 375/768/1440.
- Loading/error/empty states có.
- README hoàn chỉnh.
- `.env.example` hoàn chỉnh.
- Prisma migrations tồn tại.
- Seed chạy được.

### Deployment
- Chạy local theo README được.
- Deploy Vercel + Supabase được.
- Scanner dùng được qua HTTPS.
- Production migration chạy được bằng `prisma migrate deploy`.

---

## 28. Thứ tự triển khai bắt buộc

### Phase 1 — Foundation
- Initialize Next.js.
- TypeScript/Tailwind/shadcn.
- Prisma + DB.
- Auth.
- Base layout.
- Env validation.
- Error infrastructure.

### Phase 2 — Event Management
- Event schema.
- CRUD create/read/update.
- Draft/Publish/Cancel.
- Admin event list.
- Create/Edit UI.
- Event validation.

### Phase 3 — Public Registration
- Public event page.
- Dynamic registration form.
- Registration service.
- Capacity/duplicate/concurrency rules.
- Registration code.
- QR token/hash.
- Success page.

### Phase 4 — Email
- Resend integration.
- QR attachment.
- Non-blocking email failure behavior.

### Phase 5 — Check-in
- QR API.
- Manual API.
- Scanner UI.
- Duplicate/wrong event/window handling.
- Concurrency safety.

### Phase 6 — Dashboard & Participants
- Metrics.
- Trends.
- Participant list.
- Search/filter/pagination.
- Detail drawer.

### Phase 7 — Export
- CSV.
- XLSX.
- Formula sanitization.

### Phase 8 — Testing & Hardening
- Unit/integration/E2E.
- Responsive.
- Error states.
- Rate limiting.
- Security review.
- Build/lint/tests.

### Phase 9 — Documentation & Deployment
- README.
- `.env.example`.
- Seed.
- Vercel/Supabase deployment notes.
- Final verification against Definition of Done.

Không bỏ qua phase verification.
