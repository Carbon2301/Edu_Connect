import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateReplySuggestions } from '../lib/gemini';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticate);

// Lấy AI suggestions cho reply
router.post('/suggestions', async (req: AuthRequest, res: Response) => {
  try {
    const { messageTitle, messageContent } = req.body;
    
    if (!messageTitle || !messageContent) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung tin nhắn là bắt buộc' });
    }
    
    // Luôn sử dụng tiếng Nhật cho gợi ý AI, bất kể ngôn ngữ giao diện của học sinh
    const suggestions = await generateReplySuggestions(
      messageTitle,
      messageContent,
      'ja'
    );
    
    res.json({ suggestions });
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
