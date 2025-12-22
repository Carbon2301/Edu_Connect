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
            <img 
              src={`https://flagcdn.com/w20/${language === 'vi' ? 'vn' : 'jp'}.png`}
              alt={language === 'vi' ? 'VN' : 'JP'}
              className="flag-icon"
            />
            <span>{language === 'vi' ? 'Tiếng Việt' : '日本語'}</span>
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
