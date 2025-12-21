import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password, rememberMe);
      
      // Điều hướng theo vai trò
      if (userData.role === 'Admin') {
        navigate('/admin');
      } else if (userData.role === 'Teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="logo-small">EduConnect</div>
        <button className="language-btn" onClick={handleLanguageChange}>
          {language === 'vi' ? '🇯🇵 日本語' : '🇻🇳 Tiếng Việt'}
        </button>
      </div>

      <div className="login-content">
        <div className="login-form-container">
          <h1 className="login-title">{t('loginTitle')}</h1>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{t('username')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('username')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('password')}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('password')}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t('rememberAccount')}</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? t('loading') : t('login')}
            </button>

            <Link to="/forgot-password" className="forgot-password-link">
              {t('forgotPassword')}
            </Link>
          </form>
        </div>

        <div className="login-image">
          <div className="image-placeholder"></div>
        </div>
      </div>
    </div>
  );
}
