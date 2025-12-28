import express, { Request, Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import Class from '../models/Class';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Fields to populate for user data (includes nameKana for Japanese display)
const USER_POPULATE_FIELDS = 'fullName nameKana email class mssv avatar';

// Tất cả routes đều yêu cầu authentication
router.use(authenticate);

// Middleware kiểm tra role Teacher
const requireTeacher = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'Teacher') {
    return res.status(403).json({ message: 'Chỉ giáo viên mới có quyền truy cập' });
  }
  next();
};

router.use(requireTeacher);

// ========== CLASS MANAGEMENT ==========

// Lấy danh sách lớp học của giáo viên hiện tại
router.get('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    
    const classes = await Class.find({ teacher: teacherId })
      .populate('teacher', USER_POPULATE_FIELDS)
      .populate('students', USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 });
    
    res.json({ classes, total: classes.length });
  } catch (error: any) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Tạo lớp học mới
router.post('/classes', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { name, description, students } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ message: 'Tên lớp là bắt buộc' });
    }
    
    // Kiểm tra tên lớp đã tồn tại chưa (trong cùng giáo viên)
    const existingClass = await Class.findOne({
      name: name.trim(),
      teacher: teacherId,
    });
    
    if (existingClass) {
      return res.status(400).json({ message: 'Tên lớp đã tồn tại' });
    }
    
    let validStudents: any[] = [];
    if (students && Array.isArray(students) && students.length > 0) {
      validStudents = await User.find({
        _id: { $in: students },
        role: 'Student',
      });
      
      if (validStudents.length !== students.length) {
        return res.status(400).json({ message: 'Một số học sinh không hợp lệ' });
      }
    }
    
    // Tạo lớp mới
    const newClass = await Class.create({
      name: name.trim(),
      description: description?.trim() || '',
      teacher: teacherId,
      students: validStudents.map(s => s._id),
    });
    
    // Cập nhật class field của học sinh
    if (validStudents.length > 0) {
      await User.updateMany(
        { _id: { $in: validStudents.map(s => s._id) } },
        { class: name.trim() }
      );
    }
    
    const populatedClass = await Class.findById(newClass._id)
      .populate('teacher', USER_POPULATE_FIELDS)
      .populate('students', USER_POPULATE_FIELDS);
    
    res.status(201).json({
      message: 'Tạo lớp học thành công',
      class: populatedClass,
    });
  } catch (error: any) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy chi tiết lớp học (bao gồm danh sách học sinh)
router.get('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const classId = req.params.id;
    
    const classData = await Class.findOne({
      _id: classId,
      teacher: teacherId,
    })
      .populate('teacher', USER_POPULATE_FIELDS)
      .populate('students', USER_POPULATE_FIELDS);
    
    if (!classData) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
    
    res.json({ class: classData });
  } catch (error: any) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật lớp học
router.put('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const classId = req.params.id;
    const { name, description, students } = req.body;
    
    const classData = await Class.findOne({
      _id: classId,
      teacher: teacherId,
    });
    
    if (!classData) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
    
    // Nếu đổi tên lớp, kiểm tra trùng lặp
    if (name && name.trim() !== classData.name) {
      const existingClass = await Class.findOne({
        name: name.trim(),
        teacher: teacherId,
        _id: { $ne: classId },
      });
      
      if (existingClass) {
        return res.status(400).json({ message: 'Tên lớp đã tồn tại' });
      }
      
      // Cập nhật class field của học sinh cũ
      const oldStudents = await User.find({
        _id: { $in: classData.students },
      });
      if (oldStudents.length > 0) {
        await User.updateMany(
          { _id: { $in: classData.students } },
          { class: name.trim() }
        );
      }
      
      classData.name = name.trim();
    }
    
    // Cập nhật mô tả
    if (description !== undefined) {
      classData.description = description?.trim() || '';
    }
    
    // Cập nhật danh sách học sinh
    if (students !== undefined) {
      if (Array.isArray(students)) {
        const validStudents = await User.find({
          _id: { $in: students },
          role: 'Student',
        });
        
        if (validStudents.length !== students.length) {
          return res.status(400).json({ message: 'Một số học sinh không hợp lệ' });
        }
        
        // Xóa class field của học sinh cũ (không còn trong lớp)
        const removedStudents = classData.students.filter(
          (id: any) => !students.includes(id.toString())
        );
        if (removedStudents.length > 0) {
          await User.updateMany(
            { _id: { $in: removedStudents } },
            { $unset: { class: '' } }
          );
        }
        
        // Cập nhật class field của học sinh mới
        const newStudents = students.filter(
          (id: string) => !classData.students.some((sid: any) => sid.toString() === id)
        );
        if (newStudents.length > 0) {
          await User.updateMany(
            { _id: { $in: newStudents } },
            { class: classData.name }
          );
        }
        
        classData.students = validStudents.map(s => s._id);
      }
    }
    
    await classData.save();
    
    const populatedClass = await Class.findById(classData._id)
      .populate('teacher', USER_POPULATE_FIELDS)
      .populate('students', USER_POPULATE_FIELDS);
    
    res.json({
      message: 'Cập nhật lớp học thành công',
      class: populatedClass,
    });
  } catch (error: any) {
    console.error('Update class error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa lớp học
router.delete('/classes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const classId = req.params.id;
    
    const classData = await Class.findOne({
      _id: classId,
      teacher: teacherId,
    });
    
    if (!classData) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
    
    // Xóa class field của học sinh trong lớp
    if (classData.students.length > 0) {
      await User.updateMany(
        { _id: { $in: classData.students } },
        { $unset: { class: '' } }
      );
    }
    
    // Xóa lớp
    await Class.findByIdAndDelete(classId);
    
    res.json({ message: 'Xóa lớp học thành công' });
  } catch (error: any) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy danh sách học sinh trong lớp
router.get('/classes/:id/students', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const classId = req.params.id;
    
    const classData = await Class.findOne({
      _id: classId,
      teacher: teacherId,
    }).populate('students', USER_POPULATE_FIELDS);
    
    if (!classData) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }
    
    res.json({
      students: classData.students,
      total: classData.students.length,
    });
  } catch (error: any) {
    console.error('Get class students error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ========== STUDENT MANAGEMENT ==========

// Lấy danh sách học sinh của giáo viên hiện tại
// Tất cả giáo viên đều có quyền xem tất cả học sinh trong hệ thống
router.get('/students', async (req: AuthRequest, res: Response) => {
  try {
    // Trả về tất cả học sinh trong hệ thống - tất cả giáo viên đều có quyền như nhau
    const students = await User.find({
      role: 'Student',
    })
      .select('-password')
      .sort({ fullName: 1 });
    
    res.json({ students, total: students.length });
  } catch (error: any) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Thêm học sinh vào lớp của giáo viên hiện tại
router.post('/students', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { fullName, email, password, class: className } = req.body;
    
    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Họ tên, email và mật khẩu là bắt buộc' });
    }
    
    if (!className) {
      return res.status(400).json({ message: 'Lớp là bắt buộc' });
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    
    // Tạo học sinh mới với teacherInCharge là giáo viên hiện tại
    const newStudent = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: 'Student',
      class: className,
      teacherInCharge: teacherId,
    });
    
    res.status(201).json({
      message: 'Thêm học sinh vào lớp thành công',
      student: {
        id: newStudent._id,
        fullName: newStudent.fullName,
        email: newStudent.email,
        class: newStudent.class,
      },
    });
  } catch (error: any) {
    console.error('Add student error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ========== MESSAGE MANAGEMENT ==========

// Tạo tin nhắn mới
router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { recipients, title, content, attachments, requestReply, duplicateMessage, deadline, lockResponseAfterDeadline, reminder } = req.body;
    const senderId = req.user?.userId;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'Người nhận là bắt buộc' });
    }
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
    }
    
    const validStudents = await User.find({
      _id: { $in: recipients },
      role: 'Student',
    });
    
    if (validStudents.length !== recipients.length) {
      return res.status(400).json({ message: 'Một số người nhận không hợp lệ' });
    }
    
    const message = await Message.create({
      sender: senderId,
      recipients,
      title,
      content,
      attachments: attachments || [],
      deadline: deadline ? new Date(deadline) : undefined,
      lockResponseAfterDeadline: lockResponseAfterDeadline || false,
      reminder: reminder || {
        enabled: false,
      },
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', USER_POPULATE_FIELDS)
      .populate('recipients', USER_POPULATE_FIELDS);
    
    // Tạo thông báo cho mỗi học sinh nhận tin nhắn
    const sender = await User.findById(senderId);
    const notificationPromises = recipients.map((recipientId) =>
      Notification.create({
        recipient: recipientId,
        sender: senderId,
        type: 'new_message',
        relatedMessage: message._id,
        title: 'Tin nhắn mới',
        content: `${sender?.fullName} đã gửi cho bạn tin nhắn: "${title}"`,
        metadata: {
          senderName: sender?.fullName,
          messageTitle: title,
        },
      })
    );
    await Promise.all(notificationPromises);
    
    res.status(201).json({
      message: 'Tạo tin nhắn thành công',
      data: populatedMessage,
    });
  } catch (error: any) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy danh sách tin nhắn đã gửi (lịch sử)
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { search, status } = req.query;
    
    let query: any = { sender: teacherId };
    
    // Tìm kiếm theo tiêu đề hoặc nội dung
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Lọc theo trạng thái (nếu có)
    if (status) {
      // TODO: Implement status filtering
    }
    
    const messages = await Message.find(query)
      .populate('sender', USER_POPULATE_FIELDS)
      .populate('recipients', USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 });
    
    res.json({ messages, total: messages.length });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy tin nhắn gần đây (PHẢI ĐẶT TRƯỚC route /messages/:id)
router.get('/messages/recent', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const messages = await Message.find({ sender: teacherId })
      .populate('sender', USER_POPULATE_FIELDS)
      .populate('recipients', USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({ messages });
  } catch (error: any) {
    console.error('Get recent messages error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Get message detail
router.get('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { id } = req.params;
    
    // Thử tìm message do teacher gửi
    let message = await Message.findOne({ _id: id, sender: teacherId })
      .populate('sender', USER_POPULATE_FIELDS)
      .populate('recipients', USER_POPULATE_FIELDS)
      .populate('readStatus.userId', USER_POPULATE_FIELDS)
      .populate('reactions.userId', USER_POPULATE_FIELDS);
    
    // Nếu không tìm thấy, có thể id là reply message ID
    // Thử tìm reply message và lấy parentMessage
    if (!message) {
      const replyMessage = await Message.findById(id);
      if (replyMessage && replyMessage.parentMessage) {
        // Lấy parent message (original message do teacher gửi)
        const parentId = replyMessage.parentMessage.toString();
        message = await Message.findOne({ _id: parentId, sender: teacherId })
          .populate('sender', USER_POPULATE_FIELDS)
          .populate('recipients', USER_POPULATE_FIELDS)
          .populate('readStatus.userId', USER_POPULATE_FIELDS)
          .populate('reactions.userId', USER_POPULATE_FIELDS);
      }
    }
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    res.json({ message });
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy replies của một tin nhắn
router.get('/messages/:id/replies', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const messageId = req.params.id;
    
    // Kiểm tra message có thuộc về teacher này không
    const originalMessage = await Message.findOne({
      _id: messageId,
      sender: teacherId,
    });
    
    if (!originalMessage) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Lấy tất cả replies
    const replies = await Message.find({ parentMessage: messageId })
      .populate('sender', USER_POPULATE_FIELDS)
      .sort({ createdAt: 1 });
    
    res.json({ replies });
  } catch (error: any) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật tin nhắn
router.put('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const messageId = req.params.id;
    const { title, content, attachments, deadline, lockResponseAfterDeadline, reminder } = req.body;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: teacherId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Cập nhật tin nhắn
    if (title) message.title = title;
    if (content) message.content = content;
    if (attachments !== undefined) message.attachments = attachments;
    if (deadline !== undefined) {
      message.deadline = deadline ? new Date(deadline) : undefined;
    }
    if (lockResponseAfterDeadline !== undefined) {
      message.lockResponseAfterDeadline = lockResponseAfterDeadline;
    }
    if (reminder !== undefined) {
      message.reminder = reminder;
    }
    
    await message.save();
    
    // Tạo thông báo cho tất cả người nhận
    const sender = await User.findById(teacherId);
    await Promise.all(message.recipients.map(async (recipientId: any) => {
      await Notification.create({
        recipient: recipientId,
        sender: teacherId,
        type: 'new_message',
        relatedMessage: message._id,
        title: 'Tin nhắn đã được cập nhật',
        content: `Giáo viên ${sender?.fullName} đã cập nhật tin nhắn "${message.title}"`,
        metadata: {
          senderName: sender?.fullName,
          messageTitle: message.title,
        },
      });
    }));
    
    res.json({
      message: 'Cập nhật tin nhắn thành công',
      data: message,
    });
  } catch (error: any) {
    console.error('Update message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa tin nhắn
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const messageId = req.params.id;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: teacherId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Xóa tin nhắn
    await Message.deleteOne({ _id: messageId });
    
    // Xóa các notification liên quan
    await Notification.deleteMany({ relatedMessage: messageId });
    
    res.json({
      message: 'Xóa tin nhắn thành công',
    });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật cài đặt nhắc nhở cho tin nhắn
router.put('/messages/:id/reminder', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const messageId = req.params.id;
    const { enabled, reminderDate, message: reminderMessage, remindIfNoReply } = req.body;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: teacherId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    message.reminder = {
      enabled: enabled !== undefined ? enabled : message.reminder?.enabled || false,
      reminderDate: reminderDate || message.reminder?.reminderDate,
      message: reminderMessage || message.reminder?.message,
    };
    
    // Thêm thông tin remindIfNoReply vào reminder object
    if (remindIfNoReply !== undefined) {
      (message.reminder as any).remindIfNoReply = remindIfNoReply;
    }
    
    await message.save();
    
    res.json({
      message: 'Cập nhật cài đặt nhắc nhở thành công',
      data: message,
    });
  } catch (error: any) {
    console.error('Update reminder error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Gửi nhắc nhở thủ công
router.post('/messages/:id/manual-reminder', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const messageId = req.params.id;
    const { target } = req.body; // 'unread' hoặc 'read_no_reply'
    
    const message = await Message.findOne({
      _id: messageId,
      sender: teacherId,
    })
      .populate('recipients', USER_POPULATE_FIELDS);
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Lấy danh sách học sinh cần nhắc nhở
    const studentsToRemind: any[] = [];
    
    for (const recipient of message.recipients) {
      const recipientId = typeof recipient === 'object' ? recipient._id : recipient;
      
      // Kiểm tra trạng thái đọc
      const readStatus = message.readStatus.find((rs: any) => {
        const rsUserId = typeof rs.userId === 'object' ? rs.userId._id : rs.userId;
        return rsUserId.toString() === recipientId.toString();
      });
      
      const isRead = readStatus?.isRead || false;
      
      // Kiểm tra xem đã phản hồi chưa
      const hasReply = await Message.findOne({
        parentMessage: messageId,
        sender: recipientId,
      });
      
      if (target === 'unread' && !isRead) {
        studentsToRemind.push(recipientId);
      } else if (target === 'read_no_reply' && isRead && !hasReply) {
        studentsToRemind.push(recipientId);
      }
    }
    
    if (studentsToRemind.length === 0) {
      return res.status(400).json({ 
        message: target === 'unread' 
          ? 'Không có học sinh nào chưa đọc tin nhắn này'
          : 'Không có học sinh nào đã đọc nhưng chưa phản hồi'
      });
    }
    
    // Tạo notification cho từng học sinh
    const sender = await User.findById(teacherId);
    const notificationPromises = studentsToRemind.map((studentId) =>
      Notification.create({
        recipient: studentId,
        sender: teacherId,
        type: 'manual_reminder',
        relatedMessage: messageId,
        title: 'Nhắc nhở từ giáo viên',
        content: target === 'unread'
          ? `${sender?.fullName} nhắc nhở bạn đọc tin nhắn: "${message.title}"`
          : `${sender?.fullName} nhắc nhở bạn phản hồi tin nhắn: "${message.title}"`,
        metadata: {
          senderName: sender?.fullName,
          messageTitle: message.title,
          reminderType: target,
        },
      })
    );
    
    await Promise.all(notificationPromises);
    
    res.json({
      message: `Đã gửi nhắc nhở cho ${studentsToRemind.length} học sinh`,
      count: studentsToRemind.length,
    });
  } catch (error: any) {
    console.error('Manual reminder error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});


// Lấy thống kê tin nhắn cho dashboard
router.get('/dashboard/stats', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    
    // Lấy số học sinh - tất cả giáo viên đều có quyền xem tất cả học sinh
    const studentCount = await User.countDocuments({
      role: 'Student',
    });
    
    // Lấy số tin nhắn chưa đọc
    const unreadCount = await Message.countDocuments({
      sender: teacherId,
      'readStatus.isRead': false,
    });
    
    // Lấy tin nhắn gần đây
    const recentMessages = await Message.find({ sender: teacherId })
      .populate('recipients', USER_POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      studentCount,
      unreadCount,
      recentMessages,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ========== PROFILE MANAGEMENT ==========

// Lấy thông tin profile của giáo viên
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    
    const teacher = await User.findById(teacherId)
      .select('-password');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }
    
    // Lấy danh sách các lớp mà giáo viên quản lý
    const classes = await Class.find({ teacher: teacherId })
      .select('name description createdAt')
      .populate('students', 'fullName email mssv');
    
    res.json({
      profile: teacher,
      classes: classes,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật thông tin profile của giáo viên
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { avatar, dateOfBirth, gender, phone, notificationSettings } = req.body;
    
    const teacher = await User.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Không tìm thấy giáo viên' });
    }
    
    // Chỉ cho phép cập nhật các field được phép
    if (avatar !== undefined) {
      teacher.avatar = avatar || undefined;
    }
    if (dateOfBirth !== undefined) {
      teacher.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    }
    if (gender !== undefined) {
      // Chỉ set gender nếu có giá trị hợp lệ, nếu là chuỗi rỗng thì set undefined
      teacher.gender = gender && gender.trim() !== '' ? gender : undefined;
    }
    if (phone !== undefined) {
      teacher.phone = phone || undefined;
    }
    if (notificationSettings !== undefined) {
      teacher.notificationSettings = {
        email: notificationSettings.email !== undefined ? notificationSettings.email : (teacher.notificationSettings?.email ?? true),
        app: notificationSettings.app !== undefined ? notificationSettings.app : (teacher.notificationSettings?.app ?? true),
      };
    }
    
    await teacher.save();
    
    const updatedTeacher = await User.findById(teacherId)
      .select('-password');
    
    res.json({
      message: 'Cập nhật profile thành công',
      profile: updatedTeacher,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
