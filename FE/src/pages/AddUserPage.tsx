import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './AddUserPage.css';

const API_URL = 'http://localhost:5000/api';

export default function AddUserPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<'Teacher' | 'Student'>('Student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mssv, setMssv] = useState('');
  const [className, setClassName] = useState('');
  const [teacherInCharge, setTeacherInCharge] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role === 'Student') {
      fetchTeachers();
    }
  }, [role]);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        params: { role: 'Teacher' },
      });
      setTeachers(response.data.users);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
    }
  };

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
        if (!className || !teacherInCharge) {
          setError('Học sinh phải có lớp và giáo viên phụ trách');
          setLoading(false);
          return;
        }
        userData.class = className;
        userData.teacherInCharge = teacherInCharge;
        if (mssv) {
          userData.mssv = mssv;
        }
      }

      await axios.post(`${API_URL}/admin/users`, userData);
      alert('Tạo tài khoản thành công!');
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tạo tài khoản');
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
        <button className="back-btn" onClick={() => navigate('/admin')}>
          ← Quay lại
        </button>
      </header>

      <main className="add-user-main">
        <h2 className="page-title">Thêm tài khoản (Học sinh / Giáo viên)</h2>

        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="role">
              Vai trò <span className="required">*</span>
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
                <span>Học sinh</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="role"
                  value="Teacher"
                  checked={role === 'Teacher'}
                  onChange={(e) => setRole(e.target.value as 'Student' | 'Teacher')}
                />
                <span>Giáo viên</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">
              Họ và Tên <span className="required">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Nhập họ và tên"
            />
          </div>

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="mssv">
                MSSV
              </label>
              <input
                id="mssv"
                type="text"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                placeholder="Nhập mã số sinh viên"
              />
            </div>
          )}

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="className">
                Lớp <span className="required">*</span>
              </label>
              <input
                id="className"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                placeholder="Nhập tên lớp"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Mật khẩu tạm thời <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mật khẩu tối thiểu 6 ký tự"
            />
          </div>

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="teacherInCharge">
                Giáo viên phụ trách <span className="required">*</span>
              </label>
              <select
                id="teacherInCharge"
                value={teacherInCharge}
                onChange={(e) => setTeacherInCharge(e.target.value)}
                required
              >
                <option value="">Chọn giáo viên</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fullName} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Thêm tài khoản'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>
              Hủy
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
