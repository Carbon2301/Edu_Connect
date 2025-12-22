import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatUserName } from '../utils/nameFormatter';
import axios from 'axios';
import './NotificationDropdown.css';

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

export default function NotificationDropdown() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    // Poll thông báo mỗi 30 giây
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Lấy tất cả thông báo (không limit)
      const response = await axios.get(`${API_URL}/notifications`);
      const allNotifs = response.data.notifications || [];
      setAllNotifications(allNotifs);
      // Chỉ hiển thị 4 thông báo đầu tiên trong dropdown
      setNotifications(allNotifs.slice(0, 4));
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    
    setShowDropdown(false);
    
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
        // Lấy tab hiện tại từ localStorage
        const fromTab = localStorage.getItem('studentActiveMenu') || 'new';
        navigate(`/student/messages/${messageId}`, { 
          state: { fromTab } 
        });
      }
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('hoursAgo')}`;
    return `${Math.floor(diffInSeconds / 86400)} ${t('daysAgo')}`;
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
      case 'manual_reminder': return '🔔';
      default: return '🔔';
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button className="notification-btn" onClick={handleToggleDropdown}>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M13.73 21a2 2 0 0 1-3.46 0" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown-content">
          <div className="notification-header">
            <h3>{t('notificationTitle')}</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="mark-all-btn">
                {t('markAllAsRead')}
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-loading">{t('loading')}</div>
          ) : notifications.length === 0 ? (
            <>
              <div className="notification-empty">{t('noNotifications')}</div>
              <div className="notification-view-more">
                <button 
                  className="view-more-btn"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/notifications');
                  }}
                >
                  {t('viewAllNotifications')}
                </button>
              </div>
            </>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type, notification.content)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{formatNotificationTitle(notification)}</div>
                    <div className="notification-text">{formatNotificationContent(notification)}</div>
                    <div className="notification-time">{formatTimeAgo(notification.createdAt)}</div>
                  </div>
                  {!notification.isRead && <div className="notification-dot"></div>}
                </div>
              ))}
              <div className="notification-view-more">
                <button 
                  className="view-more-btn"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/notifications');
                  }}
                >
                  {t('viewAllNotifications')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

