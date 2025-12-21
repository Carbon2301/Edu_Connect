import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateReplySuggestions } from '../lib/gemini';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticate);

// Lấy AI suggestions cho reply
router.post('/suggestions', async (req: AuthRequest, res: Response) => {
  try {
    const { messageTitle, messageContent, language } = req.body;
    
    if (!messageTitle || !messageContent) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung tin nhắn là bắt buộc' });
    }
    
    const suggestions = await generateReplySuggestions(
      messageTitle,
      messageContent,
      language || 'ja'
    );
    
    res.json({ suggestions });
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
