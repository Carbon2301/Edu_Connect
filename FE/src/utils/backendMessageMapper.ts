import { Language, translations } from '../i18n';

/**
 * Map backend error messages to i18n keys
 */
const backendMessageMap: { [key: string]: string } = {
  // Auth messages
  'Email và mật khẩu là bắt buộc': 'emailPasswordRequired',
  'Email hoặc mật khẩu không đúng': 'invalidEmailPassword',
  'Đăng nhập thành công!': 'loginSuccess',
  'Lỗi server': 'serverError',
  'Email là bắt buộc': 'emailRequired',
  'Email không tồn tại trong hệ thống': 'emailNotFound',
  'Mã OTP đã được gửi đến email của bạn': 'otpSent',
  'Email, OTP và mật khẩu mới là bắt buộc': 'emailOtpPasswordRequired',
  'Mã OTP không đúng': 'invalidOTP',
  'Không tìm thấy người dùng': 'userNotFound',
  'Đặt lại mật khẩu thành công': 'resetPasswordSuccess',
  'Mật khẩu cũ và mật khẩu mới là bắt buộc': 'oldNewPasswordRequired',
  'Mật khẩu mới phải có ít nhất 6 ký tự': 'passwordMinLength',
  'Không tìm thấy thông tin người dùng': 'userInfoNotFound',
  'Mật khẩu cũ không đúng': 'invalidOldPassword',
  'Đổi mật khẩu thành công': 'changePasswordSuccess',
  
  // Student messages
  'Chỉ học sinh mới có quyền truy cập': 'studentOnly',
  'Không tìm thấy tin nhắn': 'messageNotFound',
  'Đã đánh dấu là đã đọc': 'markedAsRead',
  'Phải có nội dung hoặc file đính kèm': 'contentOrAttachmentRequired',
  'Nội dung phản hồi là bắt buộc': 'replyContentRequired',
  'Không tìm thấy phản hồi': 'replyNotFound',
  'Đã cập nhật phản hồi': 'updateReplySuccess',
  'Reaction không hợp lệ': 'invalidReaction',
  'Đã cập nhật reaction': 'reactionUpdated',
  'Chưa có reaction để cập nhật': 'noReactionToUpdate',
  'Đã thêm reaction': 'reactionAdded',
  'Đã xóa tin nhắn': 'messageDeleted',
  'Không tìm thấy học sinh': 'studentNotFound',
  
  // Teacher messages
  'Chỉ giáo viên mới có quyền truy cập': 'teacherOnly',
  'Tên lớp là bắt buộc': 'classNameRequired',
  'Tên lớp đã tồn tại': 'classNameExists',
  'Một số học sinh không hợp lệ': 'invalidStudents',
  'Xóa lớp học thành công': 'deleteClassSuccess',
  'Họ tên, email và mật khẩu là bắt buộc': 'nameEmailPasswordRequired',
  'Lớp là bắt buộc': 'classRequired',
  'Email đã tồn tại': 'emailExists',
  'Người nhận là bắt buộc': 'recipientsRequired',
  'Tiêu đề và nội dung là bắt buộc': 'titleContentRequired',
  'Một số người nhận không hợp lệ': 'invalidRecipients',
  'Không tìm thấy giáo viên': 'teacherNotFound',
  
  // Admin messages
  'Chỉ Admin mới có quyền truy cập': 'adminOnly',
  'Vai trò, họ tên, email và mật khẩu là bắt buộc': 'roleNameEmailPasswordRequired',
  'Vai trò phải là Teacher hoặc Student': 'invalidRole',
  'Không thể sửa thông tin tài khoản Admin': 'cannotEditAdmin',
  'Không thể xóa tài khoản của chính bạn': 'cannotDeleteSelf',
  'Xóa tài khoản thành công': 'deleteAccountSuccess',
  'Cập nhật cài đặt thành công': 'updateSettingsSuccess',
  
  // Notification messages
  'Không tìm thấy thông báo': 'notificationNotFound',
  'Đã xóa thông báo': 'notificationDeleted',
  'Đã đánh dấu tất cả thông báo là đã đọc': 'allNotificationsMarkedRead',
};

/**
 * Translate backend message to i18n message
 */
export function translateBackendMessage(message: string, language: Language): string {
  // If message is already an i18n key, use it directly
  if (translations[language][message as keyof typeof translations.vi]) {
    return translations[language][message as keyof typeof translations.vi] || message;
  }
  
  // Map backend message to i18n key
  const i18nKey = backendMessageMap[message];
  if (i18nKey) {
    return translations[language][i18nKey as keyof typeof translations.vi] || message;
  }
  
  // Return original message if no mapping found
  return message;
}

