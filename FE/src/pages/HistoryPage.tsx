import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import './HistoryPage.css';

const API_URL = 'http://localhost:5000/api';

interface Message {
  _id: string;
  title: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
  };
  recipients: {
    _id: string;
    fullName: string;
    email: string;
  }[];
  createdAt: string;
  readStatus: {
    userId: string;
    isRead: boolean;
  }[];
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  // Tìm kiếm real-time với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMessages(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchMessages = async (search?: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/messages`, {
        params: { search: search || searchTerm },
      });
      setMessages(response.data.messages);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải lịch sử tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const getMessageStatus = (message: Message): string => {
    const allRead = message.readStatus.every(status => status.isRead);
    if (allRead) {
      return 'Đã đọc';
    }
    
    const hasUnread = message.readStatus.some(status => !status.isRead);
    if (hasUnread) {
      return 'Chưa đọc';
    }
    
    return 'Đã gửi';
  };

  const getStatusClass = (status: string): string => {
    if (status === 'Đã đọc') return 'read';
    if (status === 'Chưa đọc') return 'unread';
    return 'sent';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="history-page">
      <header className="history-header">
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

      <main className="history-main">
        <h2 className="page-title">Lịch sử tin nhắn</h2>

        <div className="history-actions">
          <div className="search-area">
            <input
              type="text"
              placeholder="Tìm kiếm theo từ khóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="total-count">Tổng: {messages.length}</span>
          </div>

          <div className="action-links">
            <button onClick={() => navigate('/teacher')} className="action-link">
              🏠 Về trang chủ
            </button>
            <button onClick={() => navigate('/teacher/messages/create')} className="action-link">
              ✏️ Tạo tin nhắn mới
            </button>
            <button onClick={() => fetchMessages()} className="action-link">
              🔄 Làm mới
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Người gửi</th>
                  <th>Người nhận</th>
                  <th>Tiêu đề</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      Không có tin nhắn nào
                    </td>
                  </tr>
                ) : (
                  messages.map((message) => {
                    const status = getMessageStatus(message);
                    return (
                      <tr key={message._id}>
                        <td>{message.sender.fullName}</td>
                        <td>
                          {message.recipients.map(r => r.fullName).join(', ')}
                        </td>
                        <td>{message.title}</td>
                        <td>{formatDate(message.createdAt)}</td>
                        <td>
                          <span className={`status-tag ${getStatusClass(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-details"
                            onClick={() => navigate(`/teacher/messages/${message._id}`)}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
