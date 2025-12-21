import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './MessageSuccessPage.css';

export default function MessageSuccessPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };

  return (
    <div className="message-success-page">
      <header className="success-header">
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

      <main className="success-main">
        <div className="success-content">
          <div className="success-icon">✓</div>
          <h2 className="success-title">Tin nhắn đã được gửi thành công</h2>
          <p className="success-message">Tin nhắn đã được gửi thành công.</p>
          <p className="success-hint">
            Bạn có thể xem nội dung tin nhắn đã gửi từ "Lịch sử tin nhắn".
          </p>

          <div className="success-actions">
            <button
              className="btn-home"
              onClick={() => navigate('/teacher')}
            >
              Về trang chủ
            </button>
            <button
              className="btn-details"
              onClick={() => navigate(`/teacher/messages/${id}`)}
            >
              Quay lại chi tiết tin nhắn
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
