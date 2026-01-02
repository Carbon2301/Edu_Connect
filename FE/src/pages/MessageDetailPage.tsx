import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import { getOriginalFileName, formatFileSize } from '../utils/fileUtils';
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
  const [studentReplies, setStudentReplies] = useState<StudentReply[]>([]);
  const [studentReaction, setStudentReaction] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReaction, setEditingReaction] = useState<boolean>(false);
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

  // Khởi tạo giá trị chỉnh sửa khi vào chế độ edit một reply cụ thể
  useEffect(() => {
    if (editingReplyId) {
      const replyToEdit = studentReplies.find(r => r._id === editingReplyId);
      if (replyToEdit) {
        setEditedReplyContent(replyToEdit.content || '');
        setEditedAttachments([...(replyToEdit.attachments || [])]);
        setNewAttachments([]);
      }
    }
  }, [editingReplyId, studentReplies]);

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

      // Tìm tất cả replies của học sinh
      const replyResponse = await axios.get(`${API_URL}/student/messages/${id}/my-replies`);
      if (replyResponse.data.replies && Array.isArray(replyResponse.data.replies)) {
        setStudentReplies(replyResponse.data.replies);
      } else {
        setStudentReplies([]);
      }
    } catch (err: any) {
      // Nếu không tìm thấy replies (404), đó là bình thường
      if (err.response?.status !== 404) {
        console.error('Error fetching student responses:', err);
      }
      setStudentReplies([]);
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

  const handleSaveReaction = async () => {
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
        }
      }

      setEditingReaction(false);
      showToast(t('updateReplySuccess'), 'success');
      // Refresh data
      await fetchMessage();
      await fetchStudentResponse();
    } catch (err: any) {
      console.error('Error saving reaction:', err);
      const backendMessage = err.response?.data?.message || t('updateError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!id || !editingReplyId) return;
    
    setSaving(true);
    try {
      // Cập nhật reply cụ thể đang được chỉnh sửa
      const replyToEdit = studentReplies.find(r => r._id === editingReplyId);
      if (replyToEdit) {
        const hasContentChange = editedReplyContent !== replyToEdit.content;
        const hasAttachmentsChange = JSON.stringify(editedAttachments) !== JSON.stringify(replyToEdit.attachments || []) || newAttachments.length > 0;
        
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

          // Update existing reply với replyId
          await axios.put(`${API_URL}/student/messages/${id}/reply`, {
            replyId: editingReplyId,
            content: editedReplyContent,
            attachments: finalAttachments,
          });
          
          // Cập nhật state
          setStudentReplies(prev => prev.map(r => 
            r._id === editingReplyId 
              ? { ...r, content: editedReplyContent, attachments: finalAttachments, updatedAt: new Date().toISOString() }
              : r
          ));
        }
      }

      setEditingReplyId(null);
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
    setEditingReplyId(null);
    setEditingReaction(false);
    setEditedReplyContent('');
    setEditedAttachments([]);
    setNewAttachments([]);
    setEditedReaction(studentReaction);
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
                    📎 {getOriginalFileName(file)}
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
            {studentReplies.length === 0 && !studentReaction ? (
              <div className="no-response">
                <span className="no-response-icon">⚠️</span>
                <span className="no-response-text">{t('noResponse')}</span>
              </div>
            ) : (
              <div className="has-response">
                {/* Hiển thị reaction */}
                {studentReaction && (
                  <div
                    className="response-item"
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: editingReaction ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      display: 'block', // Override CSS class .reaction-item
                    }}
                  >
                    {editingReaction ? (
                      <>
                        <div style={{ marginBottom: '1rem' }}>
                          <span className="response-label">{t('reactionLabel')}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
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
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveReaction}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {saving ? t('saving') : t('saveChanges')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Chế độ xem reaction */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                            {t('reactionLabel')}
                          </span>
                          {canEdit() && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditedReaction(studentReaction);
                                setEditingReaction(true);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.875rem',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {t('edit')}
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'block' }}>
                          <span className="reaction-display">
                            {REACTION_ICONS[studentReaction]} {getReactionLabel(studentReaction, t)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hiển thị tất cả replies */}
                {studentReplies.length > 0 && (
                  <div style={{ marginTop: studentReaction ? '1rem' : '0' }}>
                    <span className="response-label" style={{ marginBottom: '1rem', display: 'block' }}>
                      {t('replyContentLabel')} ({studentReplies.length})
                    </span>
                    {studentReplies.map((reply, index) => (
                      <div
                        key={reply._id}
                        className="response-item reply-item"
                        style={{
                          marginBottom: '1.5rem',
                          padding: '1rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          border: editingReplyId === reply._id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        }}
                      >
                        {editingReplyId === reply._id ? (
                          <>
                            {/* Chế độ chỉnh sửa reply */}
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
                                marginBottom: '1rem',
                              }}
                            />
                            
                            {/* Attachments in edit mode */}
                            <div style={{ marginBottom: '1rem' }}>
                              <span className="response-label">{t('fileAttachments')}</span>
                              
                              {/* Existing attachments */}
                              {editedAttachments.length > 0 && (
                                <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                                  <strong style={{ fontSize: '0.9rem', color: '#666' }}>{t('existingFiles')}:</strong>
                                  <div style={{ marginTop: '0.5rem' }}>
                                    {editedAttachments.map((file, fileIndex) => (
                                      <div
                                        key={fileIndex}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem',
                                          backgroundColor: '#ffffff',
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
                                          📎 {getOriginalFileName(file)}
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAttachment(fileIndex)}
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
                                    {newAttachments.map((file, fileIndex) => (
                                      <div
                                        key={fileIndex}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem',
                                          backgroundColor: '#ffffff',
                                          borderRadius: '4px',
                                          marginBottom: '0.5rem',
                                        }}
                                      >
                                        <span style={{ flex: 1 }}>📄 {file.name} ({formatFileSize(file.size)})</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveNewFile(fileIndex)}
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
                                id={`edit-attachments-${reply._id}`}
                              />
                              <label
                                htmlFor={`edit-attachments-${reply._id}`}
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

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#f3f4f6',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {t('cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || uploading}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {uploading ? t('uploading') : saving ? t('saving') : t('saveChanges')}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Chế độ xem reply */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                                {t('reply')} #{index + 1}
                              </span>
                              {canEdit() && (
                                <button
                                  type="button"
                                  onClick={() => setEditingReplyId(reply._id)}
                                  style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {t('edit')}
                                </button>
                              )}
                            </div>
                            <div className="reply-content-display" style={{ marginBottom: '0.75rem' }}>
                              {reply.content}
                            </div>
                            
                            {/* Attachments in view mode */}
                            {reply.attachments && reply.attachments.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <span className="response-label" style={{ fontSize: '0.875rem' }}>{t('fileAttachments')}:</span>
                                <div style={{ marginTop: '0.5rem' }}>
                                  {reply.attachments.map((file, fileIndex) => (
                                    <a
                                      key={fileIndex}
                                      href={file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'block',
                                        padding: '0.5rem',
                                        backgroundColor: '#ffffff',
                                        borderRadius: '4px',
                                        marginBottom: '0.5rem',
                                        textDecoration: 'none',
                                        color: '#2563eb',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      📎 {getOriginalFileName(file)}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <span className="reply-time" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {formatDateTime(reply.createdAt)}
                              {reply.updatedAt && new Date(reply.updatedAt).getTime() !== new Date(reply.createdAt).getTime() && (
                                <span style={{ marginLeft: '0.5rem', fontStyle: 'italic' }}>
                                  {t('edited')}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="message-actions">
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
          </div>
        </div>
      </main>
    </div>
  );
}
