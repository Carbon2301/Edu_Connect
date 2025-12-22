import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatUserName } from '../utils/nameFormatter';
import axios from 'axios';
import './NotificationsPage.css';

const API_URL = 'http://localhost:5000/api';

interface Notification {
  _id: string;
  type: 'new_message' | 'message_reply' | 'message_reaction' | 'manual_reminder';
  title: string;
  content: string;
  metadata?: {
    senderName?: string;
    messageTitle?: string;
    reactionType?: string;
    reminderType?: string;
  };
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    fullName: string;
    nameKana?: string;
  };
  relatedMessage?: {
    _id: string;
    title: string;
  };
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    // Poll thông báo mỗi 30 giây
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/notifications`);
      const allNotifs = response.data.notifications || [];
      setAllNotifications(allNotifs);
      
      // Lọc theo filter
      let filteredNotifs = allNotifs;
      if (filter === 'unread') {
        filteredNotifs = allNotifs.filter((n: Notification) => !n.isRead);
      } else if (filter === 'read') {
        filteredNotifs = allNotifs.filter((n: Notification) => n.isRead);
      }
      
      setNotifications(filteredNotifs);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      showToast(t('markAsReadError'), 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/notifications/${notificationToDelete}`);
      setNotifications(notifications.filter(n => n._id !== notificationToDelete));
      setAllNotifications(allNotifications.filter(n => n._id !== notificationToDelete));
      if (notifications.find(n => n._id === notificationToDelete && !n.isRead)) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      setShowDeleteDialog(false);
      setNotificationToDelete(null);
    } catch (err) {
      console.error('Error deleting notification:', err);
      showToast(t('deleteNotificationError'), 'error');
      setShowDeleteDialog(false);
      setNotificationToDelete(null);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(true);
  };

  const confirmDeleteAll = async () => {
    let notificationsToDelete: Notification[] = [];
    
    if (filter === 'all') {
      notificationsToDelete = allNotifications;
    } else if (filter === 'unread') {
      notificationsToDelete = allNotifications.filter(n => !n.isRead);
    } else if (filter === 'read') {
      notificationsToDelete = allNotifications.filter(n => n.isRead);
    }
    
    try {
      // Xóa từng notification
      await Promise.all(
        notificationsToDelete.map(notification => 
          axios.delete(`${API_URL}/notifications/${notification._id}`)
        )
      );
      
      // Cập nhật state
      const remainingNotifications = allNotifications.filter(
        n => !notificationsToDelete.some(d => d._id === n._id)
      );
      setAllNotifications(remainingNotifications);
      
      // Cập nhật unreadCount
      const newUnreadCount = remainingNotifications.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
      
      // Cập nhật notifications theo filter hiện tại
      if (filter === 'all') {
        setNotifications(remainingNotifications);
      } else if (filter === 'unread') {
        setNotifications(remainingNotifications.filter(n => !n.isRead));
      } else if (filter === 'read') {
        setNotifications(remainingNotifications.filter(n => n.isRead));
      }
      setShowDeleteAllDialog(false);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      showToast(t('deleteNotificationError'), 'error');
      setShowDeleteAllDialog(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    
    // Navigate to related message if exists
    const messageId = typeof notification.relatedMessage === 'object' && notification.relatedMessage?._id
      ? notification.relatedMessage._id
      : notification.relatedMessage;
    
    if (messageId) {
      if (user?.role === 'Teacher') {
        navigate('/teacher', { 
          state: { 
            activeMenu: 'message-detail', 
            selectedMessageId: messageId 
          } 
        });
      } else if (user?.role === 'Student') {
        const fromTab = localStorage.getItem('studentActiveMenu') || 'new';
        navigate(`/student/messages/${messageId}`, { 
          state: { fromTab } 
        });
      }
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatNotificationTitle = (notification: Notification): string => {
    if (!notification.metadata) return notification.title;

    switch (notification.type) {
      case 'new_message':
        return notification.title.includes('cập nhật') || notification.title.includes('更新')
          ? t('notifMessageUpdated')
          : t('notifNewMessage');
      case 'message_reply':
        return t('notifMessageReply');
      case 'message_reaction':
        return t('notifMessageReaction');
      case 'manual_reminder':
        return t('notifManualReminder');
      default:
        return notification.title;
    }
  };

  const formatNotificationContent = (notification: Notification): string => {
    if (!notification.metadata) return notification.content;

    const { senderName, messageTitle, reactionType, reminderType } = notification.metadata;
    
    // Use sender object if available (with nameKana support), otherwise use metadata.senderName
    const displayName = notification.sender 
      ? formatUserName(notification.sender, language)
      : senderName || '';

    switch (notification.type) {
      case 'new_message':
        if (notification.title.includes('cập nhật') || notification.title.includes('更新')) {
          return t('notifContentMessageUpdated')
            .replace('{sender}', displayName)
            .replace('{title}', messageTitle || '');
        }
        return t('notifContentNewMessage')
          .replace('{sender}', displayName)
          .replace('{title}', messageTitle || '');
      case 'message_reply':
        return t('notifContentMessageReply')
          .replace('{sender}', displayName)
          .replace('{title}', messageTitle || '');
      case 'message_reaction': {
        const reactionMap: { [key: string]: string } = {
          like: t('reactionTextLike'),
          thanks: t('reactionTextThanks'),
          understood: t('reactionTextUnderstood'),
          star: t('reactionTextStar'),
          question: t('reactionTextQuestion'),
          idea: t('reactionTextIdea'),
          great: t('reactionTextGreat'),
          done: t('reactionTextDone'),
        };
        const reactionText = reactionType ? reactionMap[reactionType] || reactionType : '';
        return t('notifContentMessageReaction')
          .replace('{sender}', displayName)
          .replace('{reaction}', reactionText)
          .replace('{title}', messageTitle || '');
      }
      case 'manual_reminder':
        if (reminderType === 'unread') {
          return t('notifContentReminderUnread')
            .replace('{sender}', displayName)
            .replace('{title}', messageTitle || '');
        }
        return t('notifContentReminderReply')
          .replace('{sender}', displayName)
          .replace('{title}', messageTitle || '');
      default:
        return notification.content;
    }
  };

  const getNotificationIcon = (type: string, content?: string): string => {
    switch (type) {
      case 'new_message': return '📧';
      case 'message_reply': return '💬';
      case 'message_reaction': {
        // Parse reaction type from content
        if (content) {
          const reactionIcons: { [key: string]: string } = {
            // Tiếng Việt
            'thích': '👍',
            'cảm ơn': '🙏',
            'đã hiểu': '✅',
            'yêu thích': '⭐',
            'có câu hỏi': '❓',
            'có ý tưởng': '💡',
            'tuyệt vời': '✨',
            'đã hoàn thành': '🎯',
            // Tiếng Nhật
            'いいね': '👍',
            'ありがとう': '🙏',
            '理解しました': '✅',
            'お気に入り': '⭐',
            '質問があります': '❓',
            'アイデアがあります': '💡',
            '素晴らしい': '✨',
            '完了しました': '🎯',
          };
          
          // Tìm reaction type trong content
          for (const [key, icon] of Object.entries(reactionIcons)) {
            if (content.includes(key)) {
              return icon;
            }
          }
        }
        return '👍'; // Default fallback
      }
      default: return '🔔';
    }
  };

  const getBackPath = () => {
    if (user?.role === 'Teacher') return '/teacher';
    if (user?.role === 'Student') return '/student';
    return '/';
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate(getBackPath())}>
            ← {t('back')}
          </button>
          <h1 className="page-title">{t('allNotificationsTitle')}</h1>
        </div>
        <div className="header-right">
          {unreadCount > 0 && (
            <button className="btn-mark-all-read" onClick={handleMarkAllAsRead}>
              {t('markAllAsRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button className="btn-delete-all" onClick={handleDeleteAll}>
              {t('deleteAllNotifications')}
            </button>
          )}
        </div>
      </header>

      <main className="notifications-main">
        <div className="notifications-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('allFilter')} ({allNotifications.length})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            {t('unreadFilter')} ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            {t('readFilter')} ({allNotifications.length - unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="loading">{t('loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">
            {filter === 'unread' 
              ? t('noUnreadNotifications')
              : filter === 'read'
              ? t('noReadNotifications')
              : t('noNotifications')}
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-card-header">
                  <div className="notification-icon-large">
                    {getNotificationIcon(notification.type, notification.content)}
                  </div>
                  <div className="notification-card-content">
                    <div className="notification-card-title">{formatNotificationTitle(notification)}</div>
                    <div className="notification-card-text">{formatNotificationContent(notification)}</div>
                    <div className="notification-card-time">{formatDateTime(notification.createdAt)}</div>
                  </div>
                  {!notification.isRead && <div className="notification-dot-large"></div>}
                </div>
                <div className="notification-card-actions">
                  {!notification.isRead && (
                    <button
                      className="btn-mark-read"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification._id);
                      }}
                    >
                      {t('markAsRead')}
                    </button>
                  )}
                  <button
                    className="btn-delete-notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        message={t('deleteNotificationConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setNotificationToDelete(null);
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        message={getDeleteAllMessage()}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => {
          setShowDeleteAllDialog(false);
        }}
      />
    </div>
  );
}

