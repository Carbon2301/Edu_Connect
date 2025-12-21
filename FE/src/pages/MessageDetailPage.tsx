import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationDropdown from '../components/NotificationDropdown';
import axios from 'axios';
import './MessageDetailPage.css';

const API_URL = 'http://localhost:5000/api';

interface Message {
  _id: string;
  title: string;
  content: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
  };
  recipients: {
    _id: string;
    fullName: string;
  }[];
  attachments?: string[];
  deadline?: string;
  lockResponseAfterDeadline?: boolean;
  reactions?: {
    userId: string | {
      _id: string;
      fullName: string;
    };
    reaction: string;
    createdAt: string;
  }[];
  createdAt: string;
}

interface StudentReply {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

const REACTION_ICONS: { [key: string]: string } = {
  like: '👍',
  thanks: '🙏',
  understood: '✅',
  star: '⭐',
  question: '❓',
  idea: '💡',
  great: '✨',
  done: '🎯',
};

const getReactionLabel = (reaction: string, t: (key: string) => string): string => {
  const labels: { [key: string]: string } = {
    like: t('reactionLike'),
    thanks: t('reactionThanks'),
    understood: t('reactionUnderstood'),
    star: t('reactionStar'),
    question: t('reactionQuestion'),
    idea: t('reactionIdea'),
    great: t('reactionGreat'),
    done: t('reactionDone'),
  };
  return labels[reaction] || reaction;
};

export default function MessageDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentReply, setStudentReply] = useState<StudentReply | null>(null);
  const [studentReaction, setStudentReaction] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReaction, setEditedReaction] = useState<string | null>(null);
  const [editedReplyContent, setEditedReplyContent] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Lấy tab từ state
  const fromTab = (location.state as { fromTab?: string })?.fromTab || 'new';

  useEffect(() => {
    if (id) {
      fetchMessage();
    }
  }, [id]);

  useEffect(() => {
    if (message) {
      fetchStudentResponse();
    }
  }, [message]);

  // Khởi tạo giá trị chỉnh sửa khi vào chế độ edit
  useEffect(() => {
    if (isEditing) {
      setEditedReaction(studentReaction);
      setEditedReplyContent(studentReply?.content || '');
    }
  }, [isEditing, studentReaction, studentReply]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/student/messages/${id}`);
      setMessage(response.data.message);
      
      // Đánh dấu là đã đọc
      await axios.put(`${API_URL}/student/messages/${id}/read`);
    } catch (err: any) {
      console.error('Error fetching message:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentResponse = async () => {
    if (!id || !user?.id) return;

    try {
      // Tìm reaction của học sinh
      if (message?.reactions) {
        const userReaction = message.reactions.find((r: any) => {
          let userId: string;
          if (typeof r.userId === 'object' && r.userId) {
            userId = (r.userId as any)._id?.toString() || (r.userId as any).id?.toString() || r.userId.toString();
          } else {
            userId = r.userId?.toString() || r.userId;
          }
          return userId === user.id?.toString();
        });
        if (userReaction) {
          setStudentReaction(userReaction.reaction);
        }
      }

      // Tìm reply của học sinh
      const replyResponse = await axios.get(`${API_URL}/student/messages/${id}/my-reply`);
      if (replyResponse.data.reply) {
        setStudentReply(replyResponse.data.reply);
      }
    } catch (err: any) {
      // Nếu không tìm thấy reply (404), đó là bình thường
      if (err.response?.status !== 404) {
        console.error('Error fetching student response:', err);
      }
    }
  };


  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (language === 'ja') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  };

  // Kiểm tra xem có thể chỉnh sửa không (chưa hết hạn)
  const canEdit = () => {
    if (!message?.deadline) return true;
    const deadlineDate = new Date(message.deadline);
    const now = new Date();
    return now < deadlineDate;
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      // Cập nhật reaction nếu có thay đổi
      if (editedReaction !== studentReaction) {
        if (editedReaction && studentReaction) {
          // Update existing reaction
          await axios.put(`${API_URL}/student/messages/${id}/reaction`, {
            reaction: editedReaction,
          });
          setStudentReaction(editedReaction);
        } else if (editedReaction && !studentReaction) {
          // Create new reaction
          await axios.post(`${API_URL}/student/messages/${id}/reaction`, {
            reaction: editedReaction,
          });
          setStudentReaction(editedReaction);
        } else if (!editedReaction && studentReaction) {
          // Xóa reaction - cần API để xóa, tạm thời không hỗ trợ
          // Có thể để lại hoặc thêm API DELETE sau
        }
      }

      // Cập nhật reply nếu có thay đổi
      if (studentReply && editedReplyContent !== studentReply.content) {
        if (editedReplyContent.trim()) {
          // Update existing reply
          await axios.put(`${API_URL}/student/messages/${id}/reply`, {
            content: editedReplyContent,
          });
          setStudentReply({ ...studentReply, content: editedReplyContent });
        }
      }

      setIsEditing(false);
      // Refresh data
      await fetchMessage();
      await fetchStudentResponse();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      alert(err.response?.data?.message || (language === 'vi' ? 'Lỗi khi lưu thay đổi' : '変更の保存中にエラーが発生しました'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedReaction(studentReaction);
    setEditedReplyContent(studentReply?.content || '');
  };

  if (loading) {
    return (
      <div className="message-detail-page">
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="message-detail-page">
        <div className="error">{language === 'vi' ? 'Không tìm thấy tin nhắn' : 'メッセージが見つかりません'}</div>
      </div>
    );
  }

  return (
    <div className="message-detail-page">
      <header className="detail-header">
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
          <NotificationDropdown />
          <span className="user-name">{user?.fullName || 'Student'}</span>
        </div>
      </header>

      <main className="detail-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="page-title">{t('messageDetail')}</h2>
          {(studentReply || studentReaction) && (
            <button
              className="btn-edit"
              onClick={() => setIsEditing(true)}
              disabled={!canEdit()}
              style={{
                opacity: canEdit() ? 1 : 0.5,
                cursor: canEdit() ? 'pointer' : 'not-allowed',
              }}
              title={canEdit() ? (language === 'vi' ? 'Chỉnh sửa phản hồi' : '返信を編集') : (language === 'vi' ? 'Đã hết hạn, không thể chỉnh sửa' : '期限切れのため編集できません')}
            >
              {language === 'vi' ? 'Chỉnh sửa' : '編集'}
            </button>
          )}
        </div>

        <div className="message-card">
          <div className="message-header">
            <div className="title-section">
              <strong>{t('titleLabel')}</strong>
              <h3 className="message-title">{message.title}</h3>
            </div>
            <div className="message-meta">
              <div className="meta-item">
                <strong>{t('senderLabel')}</strong> {message.sender.fullName}
              </div>
              <div className="meta-item">
                <strong>{t('sentDateLabel')}</strong> {formatDateTime(message.createdAt)}
              </div>
              {message.deadline && (
                <div className="meta-item">
                  <strong>{t('deadlineLabel')}</strong> {formatDateTime(message.deadline)}
                  {message.lockResponseAfterDeadline && new Date(message.deadline) < new Date() && (
                    <span style={{ color: '#dc2626', marginLeft: '10px' }}>
                      {t('lockedResponse')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="attachments-section">
              <strong>{t('attachmentsLabel')}</strong>
              <div className="attachments-list">
                {message.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-link"
                  >
                    📎 {file}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="message-content-wrapper">
            <div className="message-content-label">{t('contentLabel')}</div>
            <div className="message-content">
              {message.content}
            </div>
          </div>

          {/* Hiển thị trạng thái phản hồi của học sinh */}
          <div className="student-response-status">
            <h4 className="response-status-title">{t('responseStatusTitle')}</h4>
            {!studentReply && !studentReaction ? (
              <div className="no-response">
                <span className="no-response-icon">⚠️</span>
                <span className="no-response-text">{t('noResponse')}</span>
              </div>
            ) : (
              <div className="has-response">
                {isEditing ? (
                  <>
                    {/* Chế độ chỉnh sửa */}
                    <div className="response-item reaction-item">
                      <span className="response-label">{t('reactionLabel')}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'].map((reaction) => (
                          <button
                            key={reaction}
                            type="button"
                            onClick={() => setEditedReaction(editedReaction === reaction ? null : reaction)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: `2px solid ${editedReaction === reaction ? '#3b82f6' : '#e5e7eb'}`,
                              borderRadius: '20px',
                              background: editedReaction === reaction ? '#eff6ff' : 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            {REACTION_ICONS[reaction]} {getReactionLabel(reaction, t)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {studentReply && (
                      <div className="response-item reply-item">
                        <span className="response-label">{t('replyContentLabel')}</span>
                        <textarea
                          value={editedReplyContent}
                          onChange={(e) => setEditedReplyContent(e.target.value)}
                          rows={6}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Chế độ xem */}
                    {studentReaction && (
                      <div className="response-item reaction-item">
                        <span className="response-label">{t('reactionLabel')}</span>
                        <span className="reaction-display">
                          {REACTION_ICONS[studentReaction]} {getReactionLabel(studentReaction, t)}
                        </span>
                      </div>
                    )}
                    {studentReply && (
                      <div className="response-item reply-item">
                        <span className="response-label">{t('replyContentLabel')}</span>
                        <div className="reply-content-display">
                          {studentReply.content}
                        </div>
                        <span className="reply-time">
                          {formatDateTime(studentReply.createdAt)}
                          {studentReply.updatedAt && new Date(studentReply.updatedAt).getTime() !== new Date(studentReply.createdAt).getTime() && (
                            <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontStyle: 'italic' }}>
                              {language === 'vi' ? '(Đã chỉnh sửa)' : '(編集済み)'}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="message-actions">
            {isEditing ? (
              <>
                <button
                  className="btn-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  {language === 'vi' ? 'Hủy' : 'キャンセル'}
                </button>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (language === 'vi' ? 'Đang lưu...' : '保存中...') : (language === 'vi' ? 'Lưu thay đổi' : '変更を保存')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-back"
                  onClick={() => navigate('/student', { state: { fromTab } })}
                >
                  {t('back')}
                </button>
                {(() => {
                  const isDeadlinePassed = message.deadline && new Date(message.deadline) < new Date();
                  const isLocked = message.lockResponseAfterDeadline && isDeadlinePassed;
                  
                  if (isLocked) {
                    return (
                      <button
                        className="btn-reply"
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        title={language === 'vi' ? 'Đã quá hạn deadline, không thể phản hồi' : '期限が過ぎたため、返信できません'}
                      >
                        {t('replyButtonLocked')}
                      </button>
                    );
                  }
                  
                  return (
                    <button
                      className="btn-reply"
                      onClick={() => navigate(`/student/messages/${id}/reply`, { state: { fromTab } })}
                    >
                      {t('replyButton')}
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
