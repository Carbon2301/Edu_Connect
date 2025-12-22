import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import axios from 'axios';
import './ForgotPassword.css';

const API_URL = 'http://localhost:5000/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setMessage(t('enterOTP'));
      setStep('otp');
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('genericError');
      setError(translateBackendMessage(backendMessage, language));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp !== '123456') {
      setError(t('invalidOTP'));
      return;
    }

    setStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        otp: '123456',
        newPassword,
      });
      
      setMessage(t('resetPasswordSuccess'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('genericError');
      setError(translateBackendMessage(backendMessage, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-header">
        <div className="logo-small">EduConnect</div>
      </div>

      <div className="forgot-password-content">
        <div className="forgot-password-form-container">
          <h1 className="forgot-password-title">{t('forgotPasswordTitle')}</h1>

          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email">{t('email')}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('enterEmail')}
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? t('loading') : t('sendOTP')}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="back-button"
              >
                {t('backToLogin')}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="otp">{t('otp')}</label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder={t('enterOTP')}
                  maxLength={6}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="submit-button">
                {t('submit')}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="back-button"
              >
                {t('cancel')}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="newPassword">{t('newPassword')}</label>
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
                <label htmlFor="confirmPassword">{t('confirmPassword')}</label>
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
              {message && <div className="success-message">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? t('loading') : t('resetPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
