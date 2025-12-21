import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Homepage.css';

export default function Homepage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };

  return (
    <div className="homepage">
      <header className="homepage-header">
        <div className="logo">EduConnect</div>
        <div className="header-actions">
          <button className="language-btn" onClick={handleLanguageChange}>
            {language === 'vi' ? '🇯🇵 日本語' : '🇻🇳 Tiếng Việt'}
          </button>
          <button className="login-btn" onClick={() => navigate('/login')}>
            {t('login')}
          </button>
        </div>
      </header>

      <main className="homepage-main">
        <div className="homepage-content">
          <h1 className="homepage-title">EduConnect</h1>
          <p className="homepage-tagline">{t('tagline')}</p>
        </div>
        <div className="homepage-image">
          <div className="image-placeholder">
            {/* Placeholder for image */}
          </div>
        </div>
      </main>
    </div>
  );
}
