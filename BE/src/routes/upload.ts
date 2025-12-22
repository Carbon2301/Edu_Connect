import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Giữ tên file gốc và thêm unique suffix để tránh trùng lặp
    const originalNameWithoutExt = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    // Sanitize filename: loại bỏ ký tự đặc biệt, chỉ giữ chữ cái, số, dấu gạch ngang và gạch dưới
    const sanitizedName = originalNameWithoutExt.replace(/[^a-zA-Z0-9\-_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Cho phép tất cả các loại file
    cb(null, true);
  },
});

// Route upload file
router.post('/', authenticate, (req: AuthRequest, res: Response, next) => {
  upload.array('files', 10)(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File quá lớn. Kích thước tối đa là 10MB' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Quá nhiều file. Tối đa 10 file' });
      }
      return res.status(400).json({ message: 'Lỗi khi upload file: ' + (err.message || 'Unknown error') });
    }
    next();
  });
}, (req: AuthRequest, res: Response) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);
    
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({ message: 'Không có file nào được upload' });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const urls = files.map((file: Express.Multer.File) => {
      // Trả về URL để truy cập file
      return `http://localhost:5000/uploads/${file.filename}`;
    });

    console.log('Upload thành công, URLs:', urls);
    res.json({
      message: 'Upload file thành công',
      urls: urls,
    });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Lỗi khi upload file: ' + (error.message || 'Unknown error') });
  }
});

export default router;

