import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SystemSettingsPage.css';

const API_URL = 'http://localhost:5000/api';

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Deadline settings
  const [defaultDeadline, setDefaultDeadline] = useState<number | 'custom'>(7);
  const [customDeadline, setCustomDeadline] = useState('');
  const [deadlineAction, setDeadlineAction] = useState<'expired' | 'lock' | 'close'>('expired');

  // Notification settings
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationContent, setNotificationContent] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [notificationChannel, setNotificationChannel] = useState<'email' | 'inapp'>('email');
  const [notificationTiming, setNotificationTiming] = useState<number | 'custom'>(7);
  const [customTiming, setCustomTiming] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/settings`);
      const settings = response.data.settings;

      setDefaultDeadline(settings.defaultDeadline || 7);
      setDeadlineAction(settings.deadlineAction || 'expired');
      setNotificationTitle(settings.notificationSettings?.notificationTitle || '');
      setNotificationContent(settings.notificationSettings?.notificationContent || '');
      setNotificationChannel(settings.notificationSettings?.notificationChannel || 'email');
      setNotificationTiming(settings.notificationSettings?.notificationTiming || 7);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const deadlineValue = defaultDeadline === 'custom' 
        ? parseInt(customDeadline) 
        : typeof defaultDeadline === 'number' ? defaultDeadline : 7;

      const timingValue = notificationTiming === 'custom'
        ? parseInt(customTiming)
        : typeof notificationTiming === 'number' ? notificationTiming : 7;

      await axios.put(`${API_URL}/admin/settings`, {
        defaultDeadline: deadlineValue,
        deadlineAction,
        notificationTitle,
        notificationContent,
        notificationChannel,
        notificationTiming: timingValue,
      });

      setSuccess('Cập nhật cài đặt thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi cập nhật cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // TODO: Hiển thị preview thông báo
    alert('Preview: Tính năng này sẽ được phát triển sau');
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="system-settings-page">
      <header className="settings-header">
        <div className="header-left">
          <h1 className="logo">EduConnect</h1>
          <span className="admin-badge">Admin</span>
        </div>
      </header>

      <main className="settings-main">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          ← Quay lại
        </button>
        <h2 className="page-title">Cài đặt hệ thống</h2>

        {/* Deadline Settings */}
        <section className="settings-section">
          <h3 className="section-title">Thiết lập Deadline mặc định</h3>

          <div className="form-group">
            <label>Thời hạn phản hồi (mặc định):</label>
            <div className="button-group">
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 7 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(7)}
              >
                7 ngày
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 1 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(1)}
              >
                1 ngày
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 0.083 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(0.083)}
              >
                2 giờ
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 'custom' ? 'active' : ''}`}
                onClick={() => setDefaultDeadline('custom')}
              >
                Tùy chỉnh
              </button>
            </div>
            {defaultDeadline === 'custom' && (
              <input
                type="number"
                value={customDeadline}
                onChange={(e) => setCustomDeadline(e.target.value)}
                placeholder="Nhập số ngày"
                min="0"
                step="0.01"
                className="custom-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>Hành động khi quá hạn:</label>
            <div className="button-group">
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'expired' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('expired')}
              >
                Đánh dấu "Hết hạn"
              </button>
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'lock' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('lock')}
              >
                Khóa phản hồi
              </button>
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'close' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('close')}
              >
                Tự động đóng
              </button>
            </div>
            <small className="hint-text">
              ※ Khóa phản hồi = Học sinh không thể phản hồi, Tự động đóng = Đóng luồng
            </small>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="settings-section">
          <h3 className="section-title">Cài đặt thông báo</h3>

          <div className="form-group">
            <label htmlFor="notificationTitle">Tiêu đề thông báo:</label>
            <input
              id="notificationTitle"
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder="Nhập tiêu đề thông báo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notificationContent">Nội dung thông báo:</label>
            <textarea
              id="notificationContent"
              value={notificationContent}
              onChange={(e) => setNotificationContent(e.target.value)}
              placeholder="Nhập nội dung thông báo"
              rows={5}
            />
          </div>

          <div className="form-group">
            <label htmlFor="testRecipient">Email test:</label>
            <input
              id="testRecipient"
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="form-group">
            <label>Kênh thông báo:</label>
            <div className="button-group">
              <button
                type="button"
                className={`channel-btn ${notificationChannel === 'email' ? 'active' : ''}`}
                onClick={() => setNotificationChannel('email')}
              >
                Email
              </button>
              <button
                type="button"
                className={`channel-btn ${notificationChannel === 'inapp' ? 'active' : ''}`}
                onClick={() => setNotificationChannel('inapp')}
              >
                Trong ứng dụng
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Thời gian gửi:</label>
            <div className="button-group">
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 7 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(7)}
              >
                7 ngày trước
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 1 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(1)}
              >
                1 ngày trước
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 0.083 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(0.083)}
              >
                2 giờ trước
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 'custom' ? 'active' : ''}`}
                onClick={() => setNotificationTiming('custom')}
              >
                Tùy chỉnh
              </button>
            </div>
            {notificationTiming === 'custom' && (
              <input
                type="number"
                value={customTiming}
                onChange={(e) => setCustomTiming(e.target.value)}
                placeholder="Nhập số ngày/giờ"
                min="0"
                step="0.01"
                className="custom-input"
              />
            )}
            <small className="hint-text">
              ※ Khuyến nghị gửi test trước khi áp dụng
            </small>
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button type="button" className="btn-preview" onClick={handlePreview}>
            Xem trước
          </button>
          <button type="button" className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
          <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>
            Hủy
          </button>
        </div>
      </main>
    </div>
  );
}
