# Hướng dẫn Deploy Demo (Free) lên Render.com

Stack: Render Web Service (Docker, free) + Render Postgres (free) + Upstash Redis (free).

## 1. Tạo Redis miễn phí trên Upstash

1. Vào https://upstash.com → đăng ký/đăng nhập (có thể dùng GitHub).
2. Tạo **Database** mới → chọn **Redis**, region gần nhất (VD: `ap-southeast-1`), plan **Free**.
3. Vào tab **Details**, lấy các thông tin sau:
   - `Endpoint` (host)
   - `Port` (thường là 6379)
   - `Password`
   - TLS: Upstash luôn yêu cầu **TLS**, nên nhớ bật.

## 2. Tạo tài khoản Render và kết nối GitHub

1. Vào https://render.com → đăng ký/đăng nhập bằng GitHub.
2. Cho phép Render truy cập repo `mock-ecommerce` (Grant access).
3. Vào **New** → **Blueprint** → chọn repo này. Render sẽ tự đọc file `render.yaml` ở root repo và đề xuất tạo:
   - 1 Postgres database (free) tên `mock-ecommerce-db`
   - 1 Web Service (Docker, free) tên `mock-ecommerce-api`

## 3. Cấu hình biến môi trường (Environment Variables)

`render.yaml` đã tự động nối `DATABASE_URL` từ Postgres do Render tạo, và tự sinh `SECRET_KEY`, `JWT_REFRESH_SECRET`. Bạn chỉ cần vào **Web Service → Environment** và điền các biến còn thiếu (đánh dấu `sync: false` trong render.yaml):

| Biến | Giá trị |
|---|---|
| `REDIS_HOST` | Endpoint lấy từ Upstash (bước 1) |
| `REDIS_PORT` | Port từ Upstash (thường 6379) |
| `REDIS_PASSWORD` | Password từ Upstash |
| `APP_URL` | URL public của service, VD: `https://mock-ecommerce-api.onrender.com` (Render cấp sau khi tạo service, có thể cập nhật lại sau) |
| `MAIL_HOST` | VD: `smtp.gmail.com` |
| `MAIL_USER` | Email dùng gửi mail |
| `MAIL_PASSWORD` | App password của email đó |
| `MAIL_FROM` | VD: `"No Reply <your-email@gmail.com>"` |

Lưu ý: `REDIS_TLS` đã được set sẵn `true` trong `render.yaml` vì Upstash bắt buộc TLS.

## 4. Deploy

1. Sau khi điền đủ biến môi trường, bấm **Create Web Service** (hoặc **Manual Deploy** nếu service đã tồn tại).
2. Render sẽ build Docker image theo `Dockerfile` ở root repo, chạy `prisma migrate deploy` rồi mới start app (`node dist/main`).
3. Theo dõi tab **Logs** để chắc chắn build & migrate thành công, không có lỗi kết nối Redis/Postgres.

## 5. Kiểm tra sau khi deploy

- Mở `https://<service-name>.onrender.com/docs` để xem Swagger UI.
- Free plan của Render sẽ tự **sleep sau ~15 phút không có traffic**, lần truy cập đầu sau khi sleep sẽ chậm hơn (cold start) — bình thường với free tier, không phải lỗi.

## Lưu ý khác

- Free Postgres của Render có giới hạn dung lượng và sẽ **hết hạn sau 90 ngày** (theo chính sách hiện tại của Render) — chỉ phù hợp cho demo ngắn hạn.
- Free Redis của Upstash có giới hạn số lệnh/ngày, đủ dùng cho demo Bull queue nhẹ.
- Không commit file `.env` thật lên Git — chỉ dùng Render/Upstash dashboard để set secrets.
