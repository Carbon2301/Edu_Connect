import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import ConfirmDialog from '../components/ConfirmDialog';
import axios from 'axios';
import './CreateMessagePage.css';

const API_URL = 'http://localhost:5000/api';

interface Student {
  _id: string;
  fullName: string;
  email: string;
  class?: string;
}

interface RecentMessage {
  _id: string;
  title: string;
  content: string;
  recipients: Student[];
  createdAt: string;
}

export default function CreateMessagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  const [students, setStudents] = useState<Student[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [requestReply, setRequestReply] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchRecentMessages();
    
    // Nếu có student ID trong URL, tự động chọn
    const studentId = searchParams.get('student');
    if (studentId) {
      setSelectedRecipients([studentId]);
    }
  }, [searchParams]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/students`);
      setStudents(response.data.students);
    } catch (err: any) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchRecentMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/messages/recent?limit=5`);
      setRecentMessages(response.data.messages);
    } catch (err: any) {
      console.error('Error fetching recent messages:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // TODO: Upload files to server and get URLs
      const fileNames = Array.from(files).map(file => file.name);
      setAttachments([...attachments, ...fileNames]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (selectedRecipients.length === 0) {
      setError(t('selectAtLeastOneRecipient'));
      return;
    }
    
    if (!title || !content) {
      setError(t('titleAndContentRequired'));
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/teacher/messages`, {
        recipients: selectedRecipients,
        title,
        content,
        attachments,
        requestReply,
        duplicateMessage,
      });

      showToast(t('messageSentSuccess'), 'success');
      // Hỏi người dùng có muốn cài đặt nhắc nhở không
      setLastMessageId(response.data.data._id);
      setTimeout(() => {
        setShowReminderDialog(true);
      }, 500);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('createMessageError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecentMessage = (message: RecentMessage) => {
    setTitle(message.title);
    setContent(message.content);
    setSelectedRecipients(message.recipients.map(r => r._id));
    navigate(`/teacher/messages/${message._id}`);
  };

  return (
    <div className="create-message-page">
      <header className="message-header">
        <div className="header-left">
          <h1 className="logo">EduConnect</h1>
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
          <span className="user-name">{user?.fullName || 'Teacher'}</span>
        </div>
      </header>

      <div className="message-layout">
        <main className="message-main">
          <h2 className="page-title">{t('createNewMessage')}</h2>

          <form onSubmit={handleSubmit} className="message-form">
            <div className="form-group">
              <label htmlFor="recipients">
                {t('recipients')} <span className="required">{t('required')}</span>
              </label>
              <select
                id="recipients"
                multiple
                value={selectedRecipients}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedRecipients(values);
                }}
                className="recipients-select"
                required
              >
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.fullName} ({student.class || 'N/A'})
                  </option>
                ))}
              </select>
              <small>{t('selectMultipleHint')}</small>
            </div>

            <div className="form-group">
              <label htmlFor="title">
                {t('title')} <span className="required">{t('required')}</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={t('enterMessageTitlePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">
                {t('content')} <span className="required">{t('required')}</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={8}
                placeholder={t('enterContentPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="attachments">{t('attachments')}</label>
              <div className="file-input-group">
                <input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="attachments" className="file-label">
                  {t('selectFiles')}
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="attachments-list">
                  {attachments.map((file, index) => (
                    <span key={index} className="attachment-tag">
                      {file}
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        className="remove-attachment"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={duplicateMessage}
                  onChange={(e) => setDuplicateMessage(e.target.checked)}
                />
                <span>{t('duplicateMessage')}</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={requestReply}
                  onChange={(e) => setRequestReply(e.target.checked)}
                />
                <span>{t('requestReplyLabel')}</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-send" disabled={loading}>
                {loading ? t('sendingEllipsis') : t('sendMessageButton')}
              </button>
              <button
                type="button"
                className="btn-reminder"
                onClick={() => {
                  // TODO: Navigate to reminder settings after save draft
                }}
              >
                {t('settingsButton')}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate('/teacher')}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </main>

        <aside className="recent-messages">
          <h3 className="sidebar-title">{t('recentMessages')}</h3>
          <div className="recent-messages-list">
            {recentMessages.length === 0 ? (
              <p className="no-messages">{t('noMessages')}</p>
            ) : (
              recentMessages.map((message) => (
                <div
                  key={message._id}
                  className="recent-message-item"
                  onClick={() => handleSelectRecentMessage(message)}
                >
                  <div className="message-radio">
                    <input
                      type="radio"
                      name="recent-message"
                      readOnly
                    />
                  </div>
                  <div className="message-content">
                    <div className="message-title">{message.title}</div>
                    <div className="message-preview">
                      {message.content.substring(0, 50)}...
                    </div>
                    <div className="message-recipients">
                      {message.recipients.map(r => r.fullName).join(', ')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
      
      <ConfirmDialog
        isOpen={showReminderDialog}
        message={t('reminderConfirmation')}
        confirmText={t('yes')}
        cancelText={t('no')}
        type="info"
        onConfirm={() => {
          setShowReminderDialog(false);
          if (lastMessageId) {
            navigate(`/teacher/messages/${lastMessageId}/reminder`);
          }
        }}
        onCancel={() => {
          setShowReminderDialog(false);
          if (lastMessageId) {
            navigate(`/teacher/messages/${lastMessageId}/success`);
          }
        }}
      />
    </div>
  );
}
