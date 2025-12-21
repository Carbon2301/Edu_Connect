# EduConnect

Hệ thống quản lý liên lạc giữa Giáo viên và Học sinh

## Cách chạy dự án

### Backend

1. Cài đặt dependencies:
```bash
cd BE
npm install
```

2. Tạo file `.env` trong thư mục `BE`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/edconnect?retryWrites=true&w=majority
PORT=5000
```

3. Chạy server:
```bash
npm run dev
```

Nếu kết nối MongoDB thành công, bạn sẽ thấy log:
```
✅ Kết nối MongoDB Atlas thành công!
📊 Database: edconnect
✅ Cài đặt hệ thống đã sẵn sàng
🚀 Server đang chạy tại http://localhost:5000
```

### Frontend

1. Cài đặt dependencies:
```bash
cd FE
npm install
```

2. Chạy development server:
```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:3000`

## Tạo tài khoản mẫu

Sau khi cài đặt và cấu hình `.env`, chạy script seed để tạo sẵn tài khoản:

```bash
cd BE
npm run seed
```

Script sẽ tạo:
- **Admin**: email `admin@sis.hust.edu.vn`, password `admin123` (có thể đăng nhập bằng "admin" hoặc email đầy đủ)
- **Teacher**: email `teacher@sis.hust.edu.vn`, password `teacher`, tên "Kiyoshi Yorifuji"
- **40 Students**: password mặc định `student`, danh sách đầy đủ trong file seed

## Lưu ý

- Thay `username`, `password`, và `cluster` trong `.env` bằng thông tin MongoDB Atlas của bạn