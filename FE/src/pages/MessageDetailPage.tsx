import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
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
  attachments?: string[];
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
  const { showToast } = useToast();

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
  const [editedAttachments, setEditedAttachments] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
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
      setEditedAttachments([...(studentReply?.attachments || [])]);
      setNewAttachments([]);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewAttachments(prev => [...prev, ...files]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEditedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFile = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
      if (studentReply) {
        const hasContentChange = editedReplyContent !== studentReply.content;
        const hasAttachmentsChange = JSON.stringify(editedAttachments) !== JSON.stringify(studentReply.attachments || []) || newAttachments.length > 0;
        
        if (hasContentChange || hasAttachmentsChange) {
          // Upload new files nếu có
          let newAttachmentUrls: string[] = [];
          if (newAttachments.length > 0) {
            setUploading(true);
            const formData = new FormData();
            newAttachments.forEach((file) => {
              formData.append('files', file);
            });

            try {
              const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });
              newAttachmentUrls = uploadResponse.data.urls || [];
            } catch (uploadErr: any) {
              console.error('Error uploading files:', uploadErr);
              const errorMsg = uploadErr.response?.data?.message || uploadErr.message || t('uploadErrorGeneric');
              showToast(t('uploadAttachmentError').replace('{error}', errorMsg), 'warning');
            } finally {
              setUploading(false);
            }
          }

          // Combine existing attachments (that weren't removed) with new ones
          const finalAttachments = [...editedAttachments, ...newAttachmentUrls];

          // Update existing reply
          await axios.put(`${API_URL}/student/messages/${id}/reply`, {
            content: editedReplyContent,
            attachments: finalAttachments,
          });
          setStudentReply({ ...studentReply, content: editedReplyContent, attachments: finalAttachments });
        }
      }

      setIsEditing(false);
      showToast(t('updateReplySuccess'), 'success');
      // Refresh data
      await fetchMessage();
      await fetchStudentResponse();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      const backendMessage = err.response?.data?.message || t('updateError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedReaction(studentReaction);
    setEditedReplyContent(studentReply?.content || '');
    setEditedAttachments([...(studentReply?.attachments || [])]);
    setNewAttachments([]);
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
        <div className="error">{t('messageNotFound')}</div>
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
              title={canEdit() ? t('editReply') : t('expiredCannotEdit')}
            >
              {t('edit')}
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
                        
                        {/* Attachments in edit mode */}
                        <div style={{ marginTop: '1rem' }}>
                          <span className="response-label">{t('fileAttachments')}</span>
                          
                          {/* Existing attachments */}
                          {editedAttachments.length > 0 && (
                            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#666' }}>{t('existingFiles')}:</strong>
                              <div style={{ marginTop: '0.5rem' }}>
                                {editedAttachments.map((file, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem',
                                      backgroundColor: '#f3f4f6',
                                      borderRadius: '4px',
                                      marginBottom: '0.5rem',
                                    }}
                                  >
                                    <a
                                      href={file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ flex: 1, textDecoration: 'none', color: '#2563eb' }}
                                    >
                                      📎 {file.split('/').pop()}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAttachment(index)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {t('delete')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* New files to upload */}
                          {newAttachments.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#666' }}>{t('newFiles')}:</strong>
                              <div style={{ marginTop: '0.5rem' }}>
                                {newAttachments.map((file, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem',
                                      backgroundColor: '#f3f4f6',
                                      borderRadius: '4px',
                                      marginBottom: '0.5rem',
                                    }}
                                  >
                                    <span style={{ flex: 1 }}>📄 {file.name} ({formatFileSize(file.size)})</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveNewFile(index)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {t('delete')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Add file button */}
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="edit-attachments"
                          />
                          <label
                            htmlFor="edit-attachments"
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              border: '2px dashed #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-block',
                              fontSize: '0.875rem',
                            }}
                          >
                            {t('addFiles')}
                          </label>
                        </div>
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
                        
                        {/* Attachments in view mode */}
                        {studentReply.attachments && studentReply.attachments.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <span className="response-label">{t('fileAttachments')}:</span>
                            <div style={{ marginTop: '0.5rem' }}>
                              {studentReply.attachments.map((file, index) => (
                                <a
                                  key={index}
                                  href={file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'block',
                                    padding: '0.5rem',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '4px',
                                    marginBottom: '0.5rem',
                                    textDecoration: 'none',
                                    color: '#2563eb',
                                  }}
                                >
                                  📎 {file.split('/').pop()}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <span className="reply-time">
                          {formatDateTime(studentReply.createdAt)}
                          {studentReply.updatedAt && new Date(studentReply.updatedAt).getTime() !== new Date(studentReply.createdAt).getTime() && (
                            <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontStyle: 'italic' }}>
                              {t('edited')}
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
                  {t('cancel')}
                </button>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving || uploading}
                >
                  {uploading ? t('uploading') : saving ? t('saving') : t('saveChanges')}
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
                        title={t('expiredCannotReply')}
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
