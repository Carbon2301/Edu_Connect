import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { translateBackendMessage } from '../utils/backendMessageMapper';
import NotificationDropdown from '../components/NotificationDropdown';
import axios from 'axios';
import './ReplyPage.css';

const API_URL = 'http://localhost:5000/api';

interface Message {
  _id: string;
  title: string;
  content: string;
  sender: {
    fullName: string;
  };
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

export default function ReplyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();
  
  const fromTab = location.state?.fromTab || 'new';

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  const [originalMessage, setOriginalMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ replies: string[]; reactions: string[] } | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOriginalMessage();
      
      // Nếu có text từ URL (từ AI suggestion), điền vào
      const text = searchParams.get('text');
      if (text) {
        setReplyContent(decodeURIComponent(text));
      }
      
      // Nếu có reaction từ location state, set vào
      const reactionFromState = (location.state as { reaction?: string })?.reaction;
      if (reactionFromState) {
        setSelectedReaction(reactionFromState);
      }
    }
  }, [id, searchParams, location.state]);

  const fetchOriginalMessage = async () => {
    try {
      const response = await axios.get(`${API_URL}/student/messages/${id}`);
      setOriginalMessage(response.data.message);
    } catch (err: any) {
      console.error('Error fetching message:', err);
    }
  };

  const fetchAiSuggestions = async () => {
    if (!originalMessage) return;
    
    try {
      setLoadingSuggestions(true);
      const response = await axios.post(`${API_URL}/ai/suggestions`, {
        messageTitle: originalMessage.title,
        messageContent: originalMessage.content,
        language: language, // Sử dụng language từ context thay vì hardcode
      });
      // Đảm bảo chỉ lấy 3 gợi ý
      const suggestions = response.data.suggestions;
      setAiSuggestions({
        replies: (suggestions.replies || []).slice(0, 3),
        reactions: (suggestions.reactions || []).slice(0, 3),
      });
    } catch (err: any) {
      console.error('Error fetching AI suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (originalMessage) {
      fetchAiSuggestions();
    }
  }, [originalMessage, language]); // Thêm language vào dependency để fetch lại khi đổi ngôn ngữ

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!replyContent.trim() && !selectedReaction) {
      setError(t('replyError'));
      return;
    }

    setLoading(true);

    try {
      // Gửi reply nếu có nội dung
      if (replyContent.trim()) {
        await axios.post(`${API_URL}/student/messages/${id}/reply`, {
          content: replyContent,
        });
        showToast(t('replySentSuccess'), 'success');
      }

      // Gửi reaction nếu có
      if (selectedReaction) {
        await axios.post(`${API_URL}/student/messages/${id}/reaction`, {
          reaction: selectedReaction,
        });
        showToast(t('reactionSentSuccess'), 'success');
      }

      // Nếu có cả reply và reaction, chỉ hiển thị một thông báo
      if (replyContent.trim() && selectedReaction) {
        showToast(t('replySentSuccess'), 'success');
      }

      setTimeout(() => {
        navigate('/student', { state: { fromTab } });
      }, 500);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || t('replyError');
      const errorMsg = translateBackendMessage(backendMessage, language);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = (reaction: string) => {
    // Nếu đã chọn reaction này rồi, hủy chọn; ngược lại, chọn reaction này
    if (selectedReaction === reaction) {
      setSelectedReaction(null);
    } else {
      setSelectedReaction(reaction);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setReplyContent(suggestion);
  };

  return (
    <div className="reply-page">
      <header className="reply-header">
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

      <div className="reply-layout">
        <main className="reply-main">
          <h2 className="page-title">{t('createReply')}</h2>

          <form onSubmit={handleSubmit} className="reply-form">
            <div className="form-group">
              <label>{t('originalMessageLabel')}</label>
              <div className="original-message-box">
                <div className="original-title">
                  <strong>{t('titleLabel')}</strong> {originalMessage?.title || t('loading')}
                </div>
                {originalMessage?.content && (
                  <div className="original-content">
                    <strong>{t('contentLabel')}</strong>
                    <p>{originalMessage.content}</p>
                  </div>
                )}
                {originalMessage?.sender && (
                  <div className="original-sender">
                    <strong>{t('fromLabel')}</strong> {originalMessage.sender.fullName}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="content">
                {t('replyContentRequired')}
              </label>
              <textarea
                id="content"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={8}
                placeholder={t('replyPlaceholder')}
                className="reply-textarea"
              />
            </div>

            <div className="reactions-quick">
              <span>{t('quickReactions')}</span>
              <div className="reactions-list">
                {['like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'].map((reaction) => (
                  <button
                    key={reaction}
                    type="button"
                    className={`reaction-quick-btn ${selectedReaction === reaction ? 'active' : ''}`}
                    onClick={() => handleReaction(reaction)}
                    title={getReactionLabel(reaction, t)}
                  >
                    {REACTION_ICONS[reaction]}
                  </button>
                ))}
              </div>
              {selectedReaction && (
                <div className="selected-reaction-info">
                  {t('selectedReaction')}: {REACTION_ICONS[selectedReaction]} {getReactionLabel(selectedReaction, t)}
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn-back"
                onClick={() => navigate('/student', { state: { fromTab } })}
              >
                {t('back')}
              </button>
              <button type="submit" className="btn-send" disabled={loading}>
                {loading ? t('sending') : t('sendReply')}
              </button>
            </div>
          </form>
        </main>

        <aside className="ai-suggestions-sidebar">
          <div className="suggestions-header">
            <span className="suggestions-icon">💡</span>
            <h3>{t('aiSuggestions')}</h3>
          </div>

          {loadingSuggestions ? (
            <div className="loading-suggestions">{t('loadingSuggestions')}</div>
          ) : aiSuggestions ? (
            <div className="suggestions-content">
              <div className="reply-suggestions">
                <strong>{t('replySuggestions')}</strong>
                <div className="suggestion-list">
                  {aiSuggestions.replies.map((reply, index) => (
                    <button
                      key={index}
                      type="button"
                      className="suggestion-item"
                      onClick={() => handleUseSuggestion(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              <div className="reaction-suggestions">
                <strong>{t('reactionSuggestions')}</strong>
                <div className="reaction-suggestions-list">
                  {aiSuggestions.reactions.map((reaction, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`reaction-suggestion-btn ${selectedReaction === reaction ? 'active' : ''}`}
                      onClick={() => handleReaction(reaction)}
                    >
                      {REACTION_ICONS[reaction]} {getReactionLabel(reaction, t)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-suggestions">{t('noSuggestions')}</div>
          )}
        </aside>
      </div>
    </div>
  );
}
