import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import './AddUserPage.css';

const API_URL = 'http://localhost:5000/api';

export default function AddUserPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [role, setRole] = useState<'Teacher' | 'Student'>('Student');
  const [fullName, setFullName] = useState('');
  const [nameKana, setNameKana] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mssv, setMssv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData: any = {
        role,
        fullName,
        email,
        password,
      };

      if (role === 'Student') {
        userData.nameKana = nameKana;
        userData.mssv = mssv;
      }

      await axios.post(`${API_URL}/admin/users`, userData);
      alert(t('createAccountSuccess'));
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || t('createAccountError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-page">
      <header className="add-user-header">
        <div className="header-left">
          <h1 className="logo">EduConnect</h1>
          <span className="admin-badge">Admin</span>
        </div>
      </header>

      <main className="add-user-main">
        <div className="main-content-wrapper">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            ← {t('back')}
          </button>
          <div className="form-container">
            <h2 className="page-title">{t('addUserPageTitle')}</h2>

            <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="role">
              {t('roleLabelEdit')} <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="role"
                  value="Student"
                  checked={role === 'Student'}
                  onChange={(e) => setRole(e.target.value as 'Student' | 'Teacher')}
                />
                <span>{t('studentRole')}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="role"
                  value="Teacher"
                  checked={role === 'Teacher'}
                  onChange={(e) => setRole(e.target.value as 'Student' | 'Teacher')}
                />
                <span>{t('teacherRole')}</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">
              {t('fullNameLabel')} <span className="required">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder={t('fullNamePlaceholder')}
            />
          </div>

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="nameKana">
                {t('nameKana')} <span className="required">*</span>
              </label>
              <input
                id="nameKana"
                type="text"
                value={nameKana}
                onChange={(e) => setNameKana(e.target.value)}
                required
                placeholder={t('nameKanaPlaceholder')}
              />
            </div>
          )}

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="mssv">
                {t('studentId')} <span className="required">*</span>
              </label>
              <input
                id="mssv"
                type="text"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                required
                placeholder={t('mssvPlaceholder')}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              {t('email')} <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {t('temporaryPassword')} <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={t('temporaryPasswordPlaceholder')}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? t('creating') : t('addAccountButton')}
            </button>
            <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>
              {t('cancel')}
            </button>
          </div>
        </form>
          </div>
        </div>
      </main>
    </div>
  );
}





