import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import axios from 'axios';
import './SystemSettingsPage.css';

const API_URL = 'http://localhost:5000/api';

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
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
      const backendMessage = err.response?.data?.message || t('loadSettingsError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setError(errorMsg);
      showToast(errorMsg, 'error');
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

      showToast(t('updateSettingsSuccess'), 'success');
      setSuccess(t('updateSettingsSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('updateSettingsError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // TODO: Hiển thị preview thông báo
    showToast(t('previewFeature'), 'info');
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
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
          ← {t('back')}
        </button>
        <h2 className="page-title">{t('systemSettings')}</h2>

        {/* Deadline Settings */}
        <section className="settings-section">
          <h3 className="section-title">{t('defaultDeadlineSettings')}</h3>

          <div className="form-group">
            <label>{t('defaultResponseDeadline')}</label>
            <div className="button-group">
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 7 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(7)}
              >
                {t('days7')}
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 1 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(1)}
              >
                {t('day1')}
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 0.083 ? 'active' : ''}`}
                onClick={() => setDefaultDeadline(0.083)}
              >
                {t('hours2')}
              </button>
              <button
                type="button"
                className={`preset-btn ${defaultDeadline === 'custom' ? 'active' : ''}`}
                onClick={() => setDefaultDeadline('custom')}
              >
                {t('custom')}
              </button>
            </div>
            {defaultDeadline === 'custom' && (
              <input
                type="number"
                value={customDeadline}
                onChange={(e) => setCustomDeadline(e.target.value)}
                placeholder={t('enterDays')}
                min="0"
                step="0.01"
                className="custom-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>{t('actionWhenExpired')}</label>
            <div className="button-group">
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'expired' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('expired')}
              >
                {t('markExpired')}
              </button>
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'lock' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('lock')}
              >
                {t('lockResponse')}
              </button>
              <button
                type="button"
                className={`action-btn ${deadlineAction === 'close' ? 'active' : ''}`}
                onClick={() => setDeadlineAction('close')}
              >
                {t('autoClose')}
              </button>
            </div>
            <small className="hint-text">
              {t('lockResponseHint')}
            </small>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="settings-section">
          <h3 className="section-title">{t('notificationSettings')}</h3>

          <div className="form-group">
            <label htmlFor="notificationTitle">{t('notificationTitleLabel')}</label>
            <input
              id="notificationTitle"
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder={t('enterNotificationTitle')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notificationContent">{t('notificationContentLabel')}</label>
            <textarea
              id="notificationContent"
              value={notificationContent}
              onChange={(e) => setNotificationContent(e.target.value)}
              placeholder={t('enterNotificationContent')}
              rows={5}
            />
          </div>

          <div className="form-group">
            <label htmlFor="testRecipient">{t('testEmail')}</label>
            <input
              id="testRecipient"
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="form-group">
            <label>{t('notificationChannel')}</label>
            <div className="button-group">
              <button
                type="button"
                className={`channel-btn ${notificationChannel === 'email' ? 'active' : ''}`}
                onClick={() => setNotificationChannel('email')}
              >
                {t('emailChannel')}
              </button>
              <button
                type="button"
                className={`channel-btn ${notificationChannel === 'inapp' ? 'active' : ''}`}
                onClick={() => setNotificationChannel('inapp')}
              >
                {t('inAppChannel')}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>{t('sendTiming')}</label>
            <div className="button-group">
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 7 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(7)}
              >
                {t('days7Before')}
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 1 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(1)}
              >
                {t('day1Before')}
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 0.083 ? 'active' : ''}`}
                onClick={() => setNotificationTiming(0.083)}
              >
                {t('hours2Before')}
              </button>
              <button
                type="button"
                className={`timing-btn ${notificationTiming === 'custom' ? 'active' : ''}`}
                onClick={() => setNotificationTiming('custom')}
              >
                {t('custom')}
              </button>
            </div>
            {notificationTiming === 'custom' && (
              <input
                type="number"
                value={customTiming}
                onChange={(e) => setCustomTiming(e.target.value)}
                placeholder={t('enterDaysOrHours')}
                min="0"
                step="0.01"
                className="custom-input"
              />
            )}
            <small className="hint-text">
              {t('testBeforeApply')}
            </small>
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button type="button" className="btn-preview" onClick={handlePreview}>
            {t('preview')}
          </button>
          <button type="button" className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('saveSettings')}
          </button>
          <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>
            {t('cancel')}
          </button>
        </div>
      </main>
    </div>
  );
}
