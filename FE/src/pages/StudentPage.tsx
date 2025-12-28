import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import axios from 'axios';
import Toast from '../components/Toast';
import NotificationDropdown from '../components/NotificationDropdown';
import './StudentPage.css';

const API_URL = 'http://localhost:5000/api';

interface Message {
  _id: string;
  title: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  createdAt: string;
  deadline?: string;
  readStatus: {
    userId: string;
    isRead: boolean;
  }[];
  reactions?: {
    userId: string | {
      _id: string;
      fullName: string;
    };
    reaction: string;
    createdAt: string;
  }[];
}

export default function StudentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(() => {
    // Đọc state từ navigation hoặc localStorage
    const state = location.state as { fromTab?: string } | null;
    return state?.fromTab || localStorage.getItem('studentActiveTab') || 'new';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'replied' | 'notReplied'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [deadlineFilterFrom, setDeadlineFilterFrom] = useState('');
  const [deadlineFilterTo, setDeadlineFilterTo] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (activeMenu === 'profile') {
      fetchProfile();
    } else {
      fetchMessages();
    }
  }, [activeMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
      if (!target.closest('.status-filter-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showUserMenu || showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showFilterMenu]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const filter = activeMenu === 'new' ? 'new' : activeMenu === 'read' ? 'read' : undefined;
      const response = await axios.get(`${API_URL}/student/messages`, {
        params: filter ? { filter } : {},
      });
      const messagesData = response.data.messages;
      
      // Fetch replies để check trạng thái phản hồi (chỉ fetch khi cần)
      const messagesWithReplies = await Promise.all(
        messagesData.map(async (message: Message) => {
          try {
            const replyResponse = await axios.get(`${API_URL}/student/messages/${message._id}/my-reply`);
            return { ...message, hasReply: !!replyResponse.data.reply };
          } catch {
            return { ...message, hasReply: false };
          }
        })
      );
      
      setAllMessages(messagesWithReplies);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatDeadline = (deadlineString: string | undefined): string => {
    if (!deadlineString) return '—';
    const date = new Date(deadlineString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getReplyStatus = (message: any): string => {
    // Kiểm tra xem học sinh đã reply chưa
    if (message.hasReply) {
      return t('replied');
    }
    
    // Kiểm tra xem học sinh đã react chưa
    const hasReaction = message.reactions && message.reactions.some((r: any) => {
      const userId = typeof r.userId === 'object' && r.userId?._id 
        ? r.userId._id.toString() 
        : r.userId?.toString() || r.userId;
      return userId === user?.id?.toString();
    });
    
    if (hasReaction) {
      return t('replied');
    }
    
    return t('notReplied');
  };

  // Lọc tin nhắn theo search term và filters
  useEffect(() => {
    let filtered = [...allMessages];

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((message) => {
        // Tìm theo tiêu đề
        if (message.title && message.title.toLowerCase().includes(searchLower)) return true;
        
        // Tìm theo người gửi
        if (message.sender?.fullName && message.sender.fullName.toLowerCase().includes(searchLower)) return true;
        if (message.sender?.email && message.sender.email.toLowerCase().includes(searchLower)) return true;
        
        return false;
      });
    }

    // Lọc theo trạng thái phản hồi
    if (statusFilter !== 'all') {
      filtered = filtered.filter((message) => {
        const status = getReplyStatus(message);
        if (statusFilter === 'replied') {
          return status === t('replied');
        } else {
          return status === t('notReplied');
        }
      });
    }

    // Lọc theo ngày gửi
    if (dateFilterFrom || dateFilterTo) {
      filtered = filtered.filter((message) => {
        if (message.createdAt) {
          const messageDate = new Date(message.createdAt);
          messageDate.setHours(0, 0, 0, 0);
          
          if (dateFilterFrom) {
            const fromDate = new Date(dateFilterFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (messageDate < fromDate) return false;
          }
          
          if (dateFilterTo) {
            const toDate = new Date(dateFilterTo);
            toDate.setHours(23, 59, 59, 999);
            if (messageDate > toDate) return false;
          }
          
          return true;
        }
        return false;
      });
    }

    // Lọc theo deadline
    if (deadlineFilterFrom || deadlineFilterTo) {
      filtered = filtered.filter((message) => {
        if (message.deadline) {
          const deadlineDate = new Date(message.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          
          if (deadlineFilterFrom) {
            const fromDate = new Date(deadlineFilterFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (deadlineDate < fromDate) return false;
          }
          
          if (deadlineFilterTo) {
            const toDate = new Date(deadlineFilterTo);
            toDate.setHours(23, 59, 59, 999);
            if (deadlineDate > toDate) return false;
          }
          
          return true;
        }
        return false;
      });
    }

    setMessages(filtered);
  }, [allMessages, searchTerm, statusFilter, dateFilterFrom, dateFilterTo, deadlineFilterFrom, deadlineFilterTo, user, t]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');
      const response = await axios.get(`${API_URL}/student/profile`);
      setProfile(response.data.profile);
      setClasses(response.data.classes || []);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('loadProfileError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setProfileError(errorMsg);
      console.error('Error fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Lưu activeMenu vào localStorage
  useEffect(() => {
    localStorage.setItem('studentActiveTab', activeMenu);
  }, [activeMenu]);

  // Clear navigation state sau khi đọc
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [activeMenu]);

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="header-left">
          <h1 className="logo">EduConnect</h1>
          <span className="role-badge student-badge">{t('student')}</span>
        </div>
        <div className="header-right">
          <button className="language-btn" onClick={handleLanguageChange}>
            <img 
              src={`https://flagcdn.com/w20/${language === 'vi' ? 'vn' : 'jp'}.png`}
              alt={language === 'vi' ? 'VN' : 'JP'}
              className="flag-icon"
            />
            <span>{language === 'vi' ? 'Tiếng Việt' : '日本語'}</span>
          </button>
          <NotificationDropdown />
          <div className="user-menu">
            <span className="user-name" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.fullName || 'Student'}
            </span>
            {showUserMenu && (
              <div className="user-dropdown">
                <button onClick={() => {
                  setActiveMenu('profile');
                  setShowUserMenu(false);
                }}>{t('profile')}</button>
                <button onClick={() => setShowChangePassword(true)}>{t('changePassword')}</button>
                <button onClick={handleLogout}>{t('logout')}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="student-layout">
        <aside className="student-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeMenu === 'new' ? 'active' : ''}`}
              onClick={() => setActiveMenu('new')}
            >
              {t('unreadMessages')}
            </button>
            <button
              className={`nav-item ${activeMenu === 'read' ? 'active' : ''}`}
              onClick={() => setActiveMenu('read')}
            >
              {t('readMessages')}
            </button>
          </nav>
        </aside>

        <main className="student-main">
          {activeMenu === 'profile' ? (
            <ProfileSection 
              profile={profile}
              classes={classes}
              loading={profileLoading}
              error={profileError}
              onUpdate={fetchProfile}
            />
          ) : (
            <>
              <h2 className="section-title">{t('messageList')}</h2>
              
              <div className="history-actions" style={{ marginBottom: '1.5rem' }}>
                <div className="search-area">
                  <input
                    type="text"
                    placeholder={t('searchMessagePlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <div className="status-filter-container" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        minWidth: '120px',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {statusFilter === 'all' 
                          ? t('all')
                          : statusFilter === 'replied'
                          ? t('replied')
                          : t('notReplied')}
                      </span>
                      <span className="filter-icon">▼</span>
                    </button>
                    {showFilterMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '0.5rem',
                          background: 'white',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          minWidth: '320px',
                          zIndex: 1000,
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                            {t('statusLabel')}
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'replied' | 'notReplied')}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                            }}
                          >
                            <option value="all">{t('all')}</option>
                            <option value="replied">{t('replied')}</option>
                            <option value="notReplied">{t('notReplied')}</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                            {t('sentDateLabel')}
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="date"
                              value={dateFilterFrom}
                              onChange={(e) => setDateFilterFrom(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                              }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('to')}</span>
                            <input
                              type="date"
                              value={dateFilterTo}
                              onChange={(e) => setDateFilterTo(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                            {t('deadlineLabel')}
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="date"
                              value={deadlineFilterFrom}
                              onChange={(e) => setDeadlineFilterFrom(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                              }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('to')}</span>
                            <input
                              type="date"
                              value={deadlineFilterTo}
                              onChange={(e) => setDeadlineFilterTo(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setStatusFilter('all');
                              setDateFilterFrom('');
                              setDateFilterTo('');
                              setDeadlineFilterFrom('');
                              setDeadlineFilterTo('');
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              background: 'white',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {t('clearFilter')}
                          </button>
                          <button
                            onClick={() => setShowFilterMenu(false)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {t('apply')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="total-count" style={{ marginLeft: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    {language === 'vi' ? `Tổng: ${messages.length} tin nhắn` : `合計: ${messages.length}件`}
                  </span>
                </div>
              </div>
              
              {loading ? (
                <div className="loading">{t('loading')}</div>
              ) : (
            <div className="messages-table-container">
              <table className="messages-table">
                <thead>
                  <tr>
                    <th>{t('title')}</th>
                    <th>{t('sender')}</th>
                    <th>{t('sentDate')}</th>
                    <th>{t('deadline')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="no-data">
                        {t('noMessages')}
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message._id}>
                        <td>{message.title}</td>
                        <td>
                          <div className="sender-info">
                            <div className="sender-avatar">
                              {message.sender?.fullName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span>{message.sender?.fullName || t('unknownSender') || 'Unknown'}</span>
                          </div>
                        </td>
                        <td>{formatDate(message.createdAt)}</td>
                        <td>{formatDeadline(message.deadline)}</td>
                        <td>
                          <span className={`status-badge ${getReplyStatus(message) === t('replied') ? 'replied' : 'not-replied'}`}>
                            {getReplyStatus(message)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-details"
                              onClick={() => navigate(`/student/messages/${message._id}`, { state: { fromTab: activeMenu } })}
                            >
                              {t('details')}
                            </button>
                            <button
                              className="btn-reply"
                              onClick={() => navigate(`/student/messages/${message._id}/reply`, { state: { fromTab: activeMenu } })}
                            >
                              {t('reply')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => {
            setShowChangePassword(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
}

// Change Password Modal Component
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { language, t } = useLanguage();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });
      showToast(t('changePasswordSuccess'), 'success');
      onClose();
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('changePasswordError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{t('changePasswordTitle')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPassword">{t('oldPassword')}:</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">{t('newPassword')}:</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('confirmNewPassword')}:</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? t('processing') : t('changePassword')}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Profile Section Component
function ProfileSection({ 
  profile, 
  classes, 
  loading, 
  error, 
  onUpdate 
}: { 
  profile: any; 
  classes: any[]; 
  loading: boolean; 
  error: string; 
  onUpdate: () => void;
}) {
  const { language, t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    avatar: '',
    nameKana: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    notificationSettings: {
      email: true,
      app: true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        avatar: profile.avatar || '',
        nameKana: profile.nameKana || '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: profile.gender || '',
        phone: profile.phone || '',
        address: profile.address || '',
        notificationSettings: {
          email: profile.notificationSettings?.email ?? true,
          app: profile.notificationSettings?.app ?? true,
        },
      });
      setAvatarPreview(profile.avatar || null);
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      showToast(t('selectImageFile'), 'error');
      return;
    }

    // Kiểm tra kích thước file (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('fileTooLargeMessage'), 'error');
      return;
    }

    // Preview ảnh trước khi upload
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('files', file);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.urls && response.data.urls.length > 0) {
        const avatarUrl = response.data.urls[0];
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
        setAvatarPreview(avatarUrl);
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      const backendMessage = err.response?.data?.message || t('uploadError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      showToast(errorMsg, 'error');
      setAvatarPreview(formData.avatar || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/student/profile`, formData);
      setEditing(false);
      onUpdate();
      showToast(t('updateProfileSuccess'), 'success');
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('updateProfileError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!profile) {
    return <div className="no-data">{t('noProfileInfo')}</div>;
  }

  return (
    <div className="profile-section">
      <div className="profile-header">
        <h2 className="section-title">{t('personalProfile')}</h2>
        {!editing && (
          <button className="btn-edit-profile" onClick={() => setEditing(true)}>
            {t('edit')}
          </button>
        )}
      </div>

      <div className="profile-content">
        {/* Thông tin cơ bản */}
        <div className="profile-section-card">
          <h3 className="profile-section-title">{t('basicInfo')}</h3>
          <div className="profile-basic-info-wrapper">
            <div className="avatar-section-column">
              <div className="avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {profile.fullName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                )}
              </div>
              {editing && (
                <div className="avatar-upload-wrapper">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="avatar-file-input"
                  />
                  <label htmlFor="avatar-upload" className="avatar-upload-label">
                    {uploadingAvatar ? t('uploading') : t('selectAvatar')}
                  </label>
                </div>
              )}
            </div>
            <div className="profile-basic-info">
              <div className="profile-info-row">
                <label>{t('fullName')}:</label>
                <span className="readonly-field">{profile.fullName}</span>
              </div>
              {editing ? (
                <div className="profile-info-row">
                  <label>{t('nameKana')}:</label>
                  <input
                    type="text"
                    value={formData.nameKana}
                    onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                    placeholder={t('nameKana')}
                  />
                </div>
              ) : (
                profile.nameKana && (
                  <div className="profile-info-row">
                    <label>{t('nameKana')}:</label>
                    <span>{profile.nameKana}</span>
                  </div>
                )
              )}
              {editing ? (
                <div className="profile-info-row">
                  <label>{t('dateOfBirth')}:</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              ) : (
                <div className="profile-info-row">
                  <label>{t('dateOfBirth')}:</label>
                  <span>
                    {profile.dateOfBirth 
                      ? new Date(profile.dateOfBirth).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'ja-JP')
                      : '-'}
                  </span>
                </div>
              )}
              {editing ? (
                <div className="profile-info-row">
                  <label>{t('gender')}:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">{t('selectGender')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              ) : (
                <div className="profile-info-row">
                  <label>{t('gender')}:</label>
                  <span>
                    {profile.gender === 'male' ? t('male') : 
                     profile.gender === 'female' ? t('female') : 
                     profile.gender === 'other' ? t('other') : '-'}
                  </span>
                </div>
              )}
              <div className="profile-info-row">
                <label>{t('studentId')}:</label>
                <span className="readonly-field">{profile.mssv || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin liên lạc */}
        <div className="profile-section-card">
          <h3 className="profile-section-title">{t('contactInfo')}</h3>
          <div className="profile-info-row">
            <label>{t('emailSIS')}:</label>
            <span className="readonly-field">{profile.email}</span>
          </div>
          {editing ? (
            <div className="profile-info-row">
              <label>{t('phone')}:</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('phone')}
              />
            </div>
          ) : (
            <div className="profile-info-row">
              <label>{t('phone')}:</label>
              <span>{profile.phone || '-'}</span>
            </div>
          )}
          {editing ? (
            <div className="profile-info-row">
              <label>{t('address')}:</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('address')}
                rows={3}
              />
            </div>
          ) : (
            profile.address && (
              <div className="profile-info-row">
                <label>{t('address')}:</label>
                <span>{profile.address}</span>
              </div>
            )
          )}
        </div>

        {/* Thông tin học tập */}
        <div className="profile-section-card">
          <h3 className="profile-section-title">{t('studyInfo')}</h3>
          {classes.length === 0 ? (
            <div className="no-classes">{t('noClasses')}</div>
          ) : (
            <div className="classes-list">
              {classes.map((classItem) => (
                <div key={classItem._id} className="class-item">
                  <div className="class-name">{classItem.name}</div>
                  {classItem.description && (
                    <div className="class-description">{classItem.description}</div>
                  )}
                  <div className="class-teacher">
                    {t('teacher')}: {classItem.teacher?.fullName || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editing && (
          <div className="profile-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? t('saving') : t('saveChanges')}
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setEditing(false);
                setFormData({
                  avatar: profile.avatar || '',
                  nameKana: profile.nameKana || '',
                  dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
                  gender: profile.gender || '',
                  phone: profile.phone || '',
                  address: profile.address || '',
                  notificationSettings: {
                    email: profile.notificationSettings?.email ?? true,
                    app: profile.notificationSettings?.app ?? true,
                  },
                });
                setAvatarPreview(profile.avatar || null);
              }}
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}