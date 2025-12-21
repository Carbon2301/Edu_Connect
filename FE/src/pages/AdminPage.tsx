import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import './AdminPage.css';

const API_URL = 'http://localhost:5000/api';

interface User {
  _id: string;
  fullName: string;
  nameKana?: string;
  email: string;
  role: 'Admin' | 'Teacher' | 'Student';
  class?: string;
  mssv?: string;
  teacherInCharge?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (search?: string, page?: number) => {
    try {
      setLoading(true);
      const params: any = {
        search: search !== undefined ? search : searchTerm,
        page: page || currentPage,
        limit: itemsPerPage,
      };
      
      if (filterRole !== 'all') {
        params.role = filterRole;
      }
      
      const response = await axios.get(`${API_URL}/admin/users`, { params });
      setUsers(response.data.users);
      setTotalUsers(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
      setCurrentPage(response.data.page || 1);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || t('loadUsersError'));
    } finally {
      setLoading(false);
    }
  };

  // Load users lần đầu
  useEffect(() => {
    fetchUsers('');
  }, []);

  // Khi filter thay đổi, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
    fetchUsers(searchTerm, 1);
  }, [filterRole, itemsPerPage]);

  // Khi search thay đổi, reset về trang 1
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(searchTerm, 1);
    }, 500); // Debounce 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(searchTerm, page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Đóng filter menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const handleDelete = async (userId: string, userName: string) => {
    const confirmMessage = t('deleteConfirm').replace('{name}', userName);
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`);
      fetchUsers(searchTerm, currentPage);
    } catch (err: any) {
      alert(err.response?.data?.message || t('deleteAccountError'));
    }
  };

  const handleEdit = (userItem: User) => {
    setEditingUser(userItem);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
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
          <div className="user-menu">
            <span className="user-name" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.fullName || 'Administrator'}
            </span>
            {showUserMenu && (
              <div className="user-dropdown">
                <button onClick={() => setShowChangePassword(true)}>{t('changePassword')}</button>
                <button onClick={handleLogout}>{t('logout')}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-header-section">
          <h2 className="section-title">{t('accountList')}</h2>
          <div className="display-controls">
            <span>{t('display')}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="items-per-page-select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>{t('items')}</span>
          </div>
        </div>

        <div className="admin-actions">
          <div className="search-form-wrapper">
            <div className="search-form">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-container">
              <button
                className="filter-btn"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                title={t('filter')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showFilterMenu && (
                <div className="filter-menu">
                  <div className="filter-group">
                    <label>{t('roleLabel')}</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">{t('all')}</option>
                      <option value="Admin">{t('admin')}</option>
                      <option value="Teacher">{t('teacherRole')}</option>
                      <option value="Student">{t('studentRole')}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <button className="add-user-btn" onClick={() => navigate('/admin/add')}>
              {t('addAccount')}
            </button>
          </div>
        </div>

        <div className="users-summary">
          <span>
            {totalUsers > 0
              ? t('showingAccounts')
                  .replace('{from}', String((currentPage - 1) * itemsPerPage + 1))
                  .replace('{to}', String(Math.min(currentPage * itemsPerPage, totalUsers)))
                  .replace('{total}', String(totalUsers))
              : t('noAccounts')}
          </span>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">{t('loading')}</div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t('fullName')}</th>
                  <th>{t('studentId')}</th>
                  <th>{t('email')}</th>
                  <th>{t('roleLabelEdit')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  users.map((userItem) => (
                    <tr key={userItem._id}>
                      <td>
                        <div>
                          <div>{userItem.fullName}</div>
                          {userItem.nameKana && (
                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '2px' }}>
                              {userItem.nameKana}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{userItem.role === 'Student' ? (userItem.mssv || '-') : '-'}</td>
                      <td>{userItem.email}</td>
                      <td>
                        <span className={`role-badge ${userItem.role.toLowerCase()}`}>
                          {userItem.role === 'Student' ? t('studentRole') : userItem.role === 'Teacher' ? t('teacherRole') : t('admin')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(userItem)}
                            disabled={userItem.role === 'Admin'}
                          >
                            {t('editAccount')}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(userItem._id, userItem.fullName)}
                            disabled={userItem._id === user?.id}
                          >
                            {t('deleteAccount')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="pagination-ellipsis">...</span>
            )}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            )}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
      </main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => {
            setShowChangePassword(false);
            setShowUserMenu(false);
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={handleCloseEditModal}
          onSuccess={() => {
            handleCloseEditModal();
            fetchUsers(searchTerm, currentPage);
          }}
        />
      )}
    </div>
  );
}

// Change Password Modal Component
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });
      alert(t('changePasswordSuccess'));
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || t('changePasswordError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{t('changePasswordTitle')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPassword">{t('oldPasswordLabel')}</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">{t('newPasswordLabel')}</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? t('processing') : t('changePasswordTitle')}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ 
  user, 
  onClose, 
  onSuccess 
}: { 
  user: User; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [mssv, setMssv] = useState(user.mssv || '');
  const [role, setRole] = useState<'Teacher' | 'Student'>(user.role as 'Teacher' | 'Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updateData: any = {
        fullName,
        email,
      };

      // Chỉ cho phép thay đổi role nếu user hiện tại không phải Admin
      if (user.role !== 'Admin' && role !== user.role) {
        updateData.role = role;
      }

      // Thêm MSSV nếu là học sinh
      if (role === 'Student') {
        updateData.mssv = mssv || undefined;
      }

      await axios.put(`${API_URL}/admin/users/${user._id}`, updateData);
      alert(t('updateSuccess'));
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{t('editAccountTitle')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-fullName">
              {t('fullNameLabel')} <span className="required">*</span>
            </label>
            <input
              id="edit-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder={t('fullNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-email">
              {t('email')} <span className="required">*</span>
            </label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('emailPlaceholder')}
            />
          </div>

          {role === 'Student' && (
            <div className="form-group">
              <label htmlFor="edit-mssv">
                {t('studentId')}
              </label>
              <input
                id="edit-mssv"
                type="text"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                placeholder={t('mssvPlaceholder')}
              />
            </div>
          )}

          {user.role !== 'Admin' && (
            <div className="form-group">
              <label htmlFor="edit-role">
                {t('roleLabelEdit')} <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="edit-role"
                    value="Student"
                    checked={role === 'Student'}
                    onChange={(e) => setRole(e.target.value as 'Student' | 'Teacher')}
                  />
                  <span>{t('studentRole')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="edit-role"
                    value="Teacher"
                    checked={role === 'Teacher'}
                    onChange={(e) => setRole(e.target.value as 'Student' | 'Teacher')}
                  />
                  <span>{t('teacherRole')}</span>
                </label>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? t('updating') : t('saveChanges')}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}