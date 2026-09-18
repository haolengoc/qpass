# QPass

MVP quản lý đăng ký và check-in QR cho nhiều sự kiện, triển khai theo
`SPECIFICATION.md`.

## Truy cập web

Web production chạy tại **[https://qpass-one.vercel.app](https://qpass-one.vercel.app)**.

| Trang | Đường dẫn |
| --- | --- |
| Trang chủ | [Mở trang chủ](https://qpass-one.vercel.app/) |
| Đăng nhập người tham gia | [Đăng nhập người tham gia](https://qpass-one.vercel.app/login) |
| Tạo tài khoản người tham gia | [Tạo tài khoản](https://qpass-one.vercel.app/signup) |
| Danh sách sự kiện | [Xem sự kiện](https://qpass-one.vercel.app/events) |
| Đăng nhập BTC | [Đăng nhập BTC](https://qpass-one.vercel.app/admin/login) |
| Quản lý sự kiện của BTC | [Quản lý sự kiện](https://qpass-one.vercel.app/admin/events) |

### Giao diện theo vai trò

- Người tham gia đăng nhập tại `/login`, sau đó vào `/events`: tìm sự kiện,
  đăng ký tham dự và xem mục **Đã đăng ký** của tài khoản.
- BTC đăng nhập tại `/admin/login`, sau đó vào `/admin/events` để quản lý sự kiện.
  Trang tổng quan vẫn có tại `/admin`.
- Logo QPass luôn mở trang chủ `/`, kể cả khi còn phiên đăng nhập.
  Trang chủ hiển thị nút vào khu vực tương ứng với tài khoản hiện tại.
  Đăng xuất kết thúc phiên rồi về trang chủ trên cùng địa chỉ đang truy cập.
  Đường dẫn đăng ký một sự kiện cụ thể được giữ lại sau khi đăng nhập.

## Tech Stack

- Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui style
- Prisma ORM + PostgreSQL/Supabase
- Auth.js/NextAuth credentials + JWT session
- bcryptjs, Zod, qrcode, html5-qrcode, Resend, ExcelJS
- Vitest, Playwright

## Chạy dự án local

Yêu cầu Node.js LTS và PostgreSQL 17 (hoặc PostgreSQL tương thích). Sau khi
tạo database, sao chép `.env.example` thành `.env` nếu chưa có và điền thông tin
kết nối database. Đặt hai địa chỉ sau cùng cổng với web:

```dotenv
APP_URL=http://localhost:3100
NEXTAUTH_URL=http://localhost:3100
```

Sau đó chạy:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev -- -p 3100
```

Nếu đổi cổng, cập nhật cả `APP_URL`, `NEXTAUTH_URL` và cổng trong lệnh chạy,
rồi khởi động lại server.

## Hai tài khoản dùng thử

| Vai trò | Trang đăng nhập | Email | Mật khẩu |
| --- | --- | --- | --- |
| Người tham gia (PARTICIPANT) | [Đăng nhập](http://localhost:3100/login) | `thamgia@example.test` | `Thamgia123!` |
| Ban tổ chức (ORGANIZER) | [Đăng nhập BTC](http://localhost:3100/admin/login) | `organizer@example.test` | `ChangeMeOrganizer123!` |

Hai tài khoản trên đã có trong database local hiện tại và chỉ dùng cho phát triển,
không sử dụng trên production. Với database mới, lệnh seed tạo tài khoản BTC
mặc định trong bảng (nếu không ghi đè bằng biến `SEED_ORGANIZER_*`); tài khoản
người tham gia cần được tạo tại trang **Tạo tài khoản**.

## Environment Variables

Xem `.env.example`. Không commit `.env`.

Các biến bắt buộc cho runtime production:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `APP_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Đặt `NEXTAUTH_URL` cùng địa chỉ với `APP_URL` để đường dẫn xác thực khớp host
đang triển khai. Local có thể để trống cấu hình email và Redis theo `.env.example`.

## Deploy lên Vercel để dùng trên điện thoại

Camera trên điện thoại chỉ hoạt động ổn định khi web chạy qua HTTPS. Cấu hình production mẫu
nằm trong `.env.production.example`; không đưa file chứa khóa thật lên Git.

1. Tạo một project Supabase. Dùng **Transaction pooler** cổng `6543` cho
   `DATABASE_URL` và **Session pooler** cổng `5432` cho `DIRECT_URL` như file mẫu.
2. Tạo project Vercel từ repository này rồi khai báo toàn bộ biến trong
   `.env.production.example` cho môi trường Production. `APP_URL` và `NEXTAUTH_URL`
   phải cùng là URL HTTPS cuối cùng của web.
3. Kết nối Upstash Redis với project Vercel, hoặc nhập hai biến REST URL/token thủ công.
4. Xác minh domain gửi trong Resend, tạo API key và đặt `EMAIL_FROM` đúng domain đã xác minh.
5. Trên máy local, nạp các biến production và chạy lần lượt:

   ```bash
   npm run deploy:check
   npm run prisma:deploy
   npm run admin:create
   ```

   `admin:create` dùng ba biến `BOOTSTRAP_ADMIN_*`. Xóa ba biến này ngay sau khi tạo tài khoản BTC.
   Không chạy `prisma:seed` trên production.
6. Deploy lại Vercel. Mở URL HTTPS trên điện thoại và cho phép quyền Camera khi vào màn hình quét QR.

### Kiểm thử production

- Kiểm tra cấu hình, kết nối database và Redis: `npm run deploy:check`.
- Gửi email thật có file QR đính kèm: đặt tạm `TEST_EMAIL_TO` trên máy đang chạy lệnh,
  sau đó chạy `npm run test:email:live`. Lệnh dừng trước khi gửi nếu thiếu người nhận hoặc khóa Resend.
- Quy trình QR cần hai thiết bị: đăng ký bằng tài khoản người tham gia, mở QR nhận trong email
  trên thiết bị thứ nhất, rồi đăng nhập BTC và quét tại trang check-in trên điện thoại thứ hai.
- Kiểm tra cả ba trường hợp: quét thành công, quét lại cùng QR và quét QR của sự kiện khác.

## Chức năng hiện có

- Đăng ký tài khoản người tham gia, đăng nhập theo vai trò và đăng xuất về trang chủ.
- Logo QPass dẫn về trang chủ; người đã đăng nhập có nút mở khu vực tương ứng.
- BTC tạo, chỉnh sửa, xuất bản và hủy sự kiện; thiết lập thời gian, sức chứa và form.
- Người tham gia tìm sự kiện, đăng ký tham dự và xem mục **Đã đăng ký**.
- Kiểm tra thời gian đăng ký, giới hạn số lượng và đăng ký trùng; cấp mã đăng ký và QR.
- Người tham gia có trang **Mã QR** riêng; mã vẫn còn sau khi tải lại trang và chỉ biến mất sau khi check-in.
- Màn hình mã QR tự cập nhật thông báo check-in thành công sau khi Ban tổ chức quét.
- Gửi email xác nhận kèm QR khi đã cấu hình `RESEND_API_KEY` và `EMAIL_FROM`.
  Lỗi gửi email không hủy đăng ký đã lưu.
- Check-in bằng QR hoặc thủ công, kiểm tra đúng sự kiện, khung giờ và check-in trùng.
- BTC xem thống kê, quản lý người tham gia và xuất danh sách.
- Giao diện responsive, hiệu ứng tương tác và hỗ trợ chế độ giảm chuyển động.
