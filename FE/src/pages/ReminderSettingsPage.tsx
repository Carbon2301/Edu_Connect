import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import './ReminderSettingsPage.css';

const API_URL = 'http://localhost:5000/api';

function ReminderSettingsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  const [messageTitle, setMessageTitle] = useState('');
  const [remindIfNoReply, setRemindIfNoReply] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<'1hour' | 'tomorrow' | '3days' | 'custom'>('1hour');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchMessage();
    }
  }, [id]);

  const fetchMessage = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/messages/${id}`);
      setMessageTitle(response.data.message.title);
      
      if (response.data.message.reminder) {
        setRemindIfNoReply(response.data.message.reminder.remindIfNoReply || false);
        setMemo(response.data.message.reminder.message || '');
        
        if (response.data.message.reminder.reminderDate) {
          const date = new Date(response.data.message.reminder.reminderDate);
          setCustomDate(date.toISOString().split('T')[0]);
          setCustomTime(date.toTimeString().slice(0, 5));
          setReminderTiming('custom');
        }
      }
    } catch (err: any) {
      console.error('Error fetching message:', err);
    }
  };

  const calculateReminderDate = (): Date | null => {
    const now = new Date();
    
    switch (reminderTiming) {
      case '1hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
        return tomorrow;
      case '3days':
        const threeDays = new Date(now);
        threeDays.setDate(threeDays.getDate() + 3);
        return threeDays;
      case 'custom':
        if (customDate && customTime) {
          const [year, month, day] = customDate.split('-');
          const [hours, minutes] = customTime.split(':');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        }
        return null;
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (reminderTiming === 'custom' && (!customDate || !customTime)) {
      setError(t('customReminderDateTimeRequired'));
      showToast(t('customReminderDateTimeRequired'), 'error');
      return;
    }

    setLoading(true);

    try {
      const reminderDate = calculateReminderDate();
      
      await axios.put(`${API_URL}/teacher/messages/${id}/reminder`, {
        enabled: true,
        reminderDate: reminderDate?.toISOString(),
        message: memo,
        remindIfNoReply,
      });

      showToast(t('reminderSetSuccess'), 'success');
      setTimeout(() => {
        navigate(`/teacher/messages/${id}/success`);
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || t('reminderSetError');
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reminder-settings-page">
      <header className="reminder-header">
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

      <main className="reminder-main">
        <h2 className="page-title">Cài đặt nhắc nhở</h2>

        <div className="target-message">
          <strong>{t('messageLabel')}</strong> {messageTitle || t('loading')}
        </div>

        <form onSubmit={handleSubmit} className="reminder-form">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={remindIfNoReply}
                onChange={(e) => setRemindIfNoReply(e.target.checked)}
              />
              <span>Nhắc nhở nếu chưa có phản hồi</span>
            </label>
          </div>

          <div className="form-group">
            <label>Thời gian nhắc nhở:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="timing"
                  value="1hour"
                  checked={reminderTiming === '1hour'}
                  onChange={(e) => setReminderTiming(e.target.value as any)}
                />
                <span>1 giờ sau</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="timing"
                  value="tomorrow"
                  checked={reminderTiming === 'tomorrow'}
                  onChange={(e) => setReminderTiming(e.target.value as any)}
                />
                <span>Sáng mai</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="timing"
                  value="3days"
                  checked={reminderTiming === '3days'}
                  onChange={(e) => setReminderTiming(e.target.value as any)}
                />
                <span>3 ngày sau</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="timing"
                  value="custom"
                  checked={reminderTiming === 'custom'}
                  onChange={(e) => setReminderTiming(e.target.value as any)}
                />
                <span>Tùy chỉnh</span>
              </label>
            </div>

            {reminderTiming === 'custom' && (
              <div className="custom-datetime">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="memo">Ghi chú (tùy chọn):</label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Nhớ kiểm tra phản hồi từ học sinh A"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-set" disabled={loading}>
              {loading ? t('saving') : t('settingsButton')}
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/teacher/messages/${id}`)}
            >
              Hủy
            </button>
          </div>

          <div className="back-link">
            <button
              type="button"
              onClick={() => navigate(`/teacher/messages/${id}`)}
              className="link-button"
            >
              ← Quay lại chi tiết tin nhắn
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ReminderSettingsPage;
