import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import NotificationDropdown from '../components/NotificationDropdown';
import './TeacherPage.css';

const API_URL = 'http://localhost:5000/api';

interface Student {
  _id: string;
  fullName: string;
  email: string;
  class?: string;
}

interface Class {
  _id: string;
  name: string;
  description?: string;
  teacher: {
    _id: string;
    fullName: string;
    email: string;
  };
  students: Student[];
  createdAt: string;
}

export default function TeacherPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLanguageChange = () => {
    setLanguage(language === 'vi' ? 'ja' : 'vi');
  };
  
  // Khởi tạo selectedMessageId từ localStorage hoặc location.state
  const getInitialSelectedMessageId = () => {
    if (location.state?.selectedMessageId) {
      return location.state.selectedMessageId;
    }
    const savedMessageId = localStorage.getItem('teacherSelectedMessageId');
    return savedMessageId || null;
  };
  
  // Khởi tạo activeMenu từ localStorage hoặc location.state
  const getInitialActiveMenu = () => {
    // Ưu tiên location.state (từ notification hoặc navigation)
    if (location.state?.activeMenu) {
      return location.state.activeMenu;
    }
    // Nếu có selectedMessageId trong localStorage, activeMenu phải là 'message-detail'
    const savedMessageId = localStorage.getItem('teacherSelectedMessageId');
    if (savedMessageId) {
      return 'message-detail';
    }
    // Nếu không có, lấy từ localStorage
    const savedMenu = localStorage.getItem('teacherActiveMenu');
    return savedMenu || 'classes';
  };
  
  const [activeMenu, setActiveMenu] = useState(getInitialActiveMenu());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(getInitialSelectedMessageId());
  const [initialStudentIdForMessage, setInitialStudentIdForMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileClasses, setProfileClasses] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Helper function để xác định tab chính từ activeMenu
  const getMainTab = (menu: string) => {
    if (menu === 'classes' || menu === 'class-detail' || menu === 'edit-class') {
      return 'classes';
    }
    if (menu === 'history' || menu === 'message-detail') {
      return 'history';
    }
    return menu;
  };

  // Lưu activeMenu vào localStorage khi thay đổi (chỉ lưu tab chính, không lưu sub-menu)
  useEffect(() => {
    const mainTab = getMainTab(activeMenu);
    localStorage.setItem('teacherActiveMenu', mainTab);
  }, [activeMenu]);

  // Ref để track xem có đang xử lý popstate event không
  const isPopStateHandlingRef = useRef(false);

  // Xử lý browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopStateHandlingRef.current = true;
      // Khi browser back button được ấn
      if (event.state && event.state.menu) {
        const previousMenu = event.state.menu;
        setActiveMenu(previousMenu);
        
        // Nếu quay về class-detail, đảm bảo selectedClassId vẫn còn
        if (previousMenu === 'class-detail' && !selectedClassId) {
          setActiveMenu('classes');
        }
      } else {
        // Nếu không có state, quay về menu mặc định
        setActiveMenu('classes');
      }
      // Reset flag sau một tick
      setTimeout(() => {
        isPopStateHandlingRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedClassId]);

  // Push state vào history khi activeMenu thay đổi (chỉ khi không phải từ popstate)
  useEffect(() => {
    if (!isPopStateHandlingRef.current) {
      const currentState = window.history.state;
      if (!currentState || currentState.menu !== activeMenu) {
        window.history.pushState({ menu: activeMenu }, '', location.pathname);
      }
    }
  }, [activeMenu, location.pathname]);

  // Lưu selectedMessageId vào localStorage khi thay đổi
  useEffect(() => {
    if (selectedMessageId) {
      localStorage.setItem('teacherSelectedMessageId', selectedMessageId);
    } else {
      localStorage.removeItem('teacherSelectedMessageId');
    }
  }, [selectedMessageId]);

  // Xử lý location.state khi navigate từ notification
  useEffect(() => {
    if (location.state?.activeMenu) {
      setActiveMenu(location.state.activeMenu);
      if (location.state.selectedMessageId) {
        setSelectedMessageId(location.state.selectedMessageId);
      }
      // Clear state để tránh apply lại khi reload
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    fetchClasses();
  }, []);

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

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/classes`);
      setClasses(response.data.classes);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');
      const response = await axios.get(`${API_URL}/teacher/profile`);
      setProfile(response.data.profile);
      setProfileClasses(response.data.classes || []);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Lỗi khi tải thông tin profile');
      console.error('Error fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'profile') {
      fetchProfile();
    }
  }, [activeMenu]);

  const handleCreateClass = () => {
    setShowClassModal(true);
  };

  const handleEditClass = (classId: string) => {
    setSelectedClassId(classId);
    setActiveMenu('edit-class');
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/teacher/classes/${classId}`);
      alert('Xóa lớp học thành công!');
      fetchClasses();
    } catch (err: any) {
      console.error('Error deleting class:', err);
      alert(err.response?.data?.message || 'Lỗi khi xóa lớp học');
    }
  };

  const handleViewClassDetail = (classId: string) => {
    setSelectedClassId(classId);
    setActiveMenu('class-detail');
  };

  const handleViewMessageDetail = (messageId: string) => {
    setSelectedMessageId(messageId);
    setActiveMenu('message-detail');
  };

  const handleBackFromMessageDetail = () => {
    setSelectedMessageId(null);
    setActiveMenu('history');
  };

  // Xác định tab nào nên active dựa trên activeMenu
  const activeTab = getMainTab(activeMenu);

  return (
    <div className="teacher-page">
      <header className="teacher-header">
        <div className="header-left">
          <h1 className="logo">EduConnect</h1>
          <span className="role-badge teacher-badge">Giáo viên</span>
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
          <div className="user-menu">
            <span className="user-name" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.fullName || 'Teacher'}
            </span>
            {showUserMenu && (
              <div className="user-dropdown">
                <button onClick={() => {
                  setActiveMenu('profile');
                  setShowUserMenu(false);
                }}>Hồ sơ</button>
                <button onClick={() => setShowChangePassword(true)}>Đổi mật khẩu</button>
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
              onClick={() => setActiveMenu('classes')}
            >
              Quản lý lớp học
            </button>
            <button
              className={`nav-item ${activeTab === 'create-message' ? 'active' : ''}`}
              onClick={() => setActiveMenu('create-message')}
            >
              Tạo tin nhắn
            </button>
            <button
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveMenu('history')}
            >
              Lịch sử tin nhắn
            </button>
          </nav>
        </aside>

        <main className="teacher-main">
          {activeMenu === 'classes' && (
            <div className="classes-section">
              <div className="section-header">
                <h2 className="section-title">Quản lý lớp học</h2>
                <button className="btn-create" onClick={handleCreateClass}>
                  + Tạo lớp mới
                </button>
              </div>
              
              {loading ? (
                <div className="loading">Đang tải...</div>
              ) : (
                <div className="classes-table-container">
                  <table className="classes-table">
                    <thead>
                      <tr>
                        <th>Tên lớp</th>
                        <th>Mô tả</th>
                        <th>Số học sinh</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="no-data">
                            Chưa có lớp học nào. Hãy tạo lớp mới!
                          </td>
                        </tr>
                      ) : (
                        classes.map((classItem) => (
                          <tr key={classItem._id}>
                            <td>
                              <div className="class-name-cell">
                                <strong>{classItem.name}</strong>
                              </div>
                            </td>
                            <td>{classItem.description || '—'}</td>
                            <td>{classItem.students?.length || 0}</td>
                            <td>
                              <div className="action-buttons">
                              <button
                                  className="btn-details"
                                  onClick={() => handleViewClassDetail(classItem._id)}
                              >
                                  Chi tiết
                              </button>
                                <button
                                  className="btn-edit"
                                  onClick={() => handleEditClass(classItem._id)}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteClass(classItem._id)}
                                >
                                  Xóa
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
            </div>
          )}

          {activeMenu === 'class-detail' && selectedClassId && (
            <ClassDetailSection 
              classId={selectedClassId}
              onBack={() => {
                setActiveMenu('classes');
                setSelectedClassId(null);
              }}
              onSendMessage={(studentId: string) => {
                setInitialStudentIdForMessage(studentId);
                setActiveMenu('create-message');
              }}
            />
          )}

          {activeMenu === 'edit-class' && selectedClassId && (
            <EditClassSection 
              classId={selectedClassId}
              onBack={() => {
                setActiveMenu('classes');
                setSelectedClassId(null);
                fetchClasses();
              }}
            />
          )}

          {activeMenu === 'create-message' && (
            <CreateMessageSection
              onBack={() => {
                // Nếu có selectedClassId, quay về class-detail, nếu không thì quay về classes
                if (selectedClassId) {
                  setActiveMenu('class-detail');
                } else {
                  setActiveMenu('classes');
                }
                setInitialStudentIdForMessage(null);
              }}
              onSuccess={() => {
                setActiveMenu('history');
                setInitialStudentIdForMessage(null);
              }}
              initialStudentId={initialStudentIdForMessage}
            />
          )}

          {activeMenu === 'history' && (
            <HistorySection onViewDetail={handleViewMessageDetail} />
          )}

          {activeMenu === 'message-detail' && selectedMessageId && (
            <MessageDetailSection
              messageId={selectedMessageId}
              onBack={handleBackFromMessageDetail}
            />
          )}

          {activeMenu === 'profile' && (
            <TeacherProfileSection
              profile={profile}
              classes={profileClasses}
              loading={profileLoading}
              error={profileError}
              onUpdate={fetchProfile}
            />
          )}

        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => {
            setShowChangePassword(false);
            setShowUserMenu(false);
          }}
        />
      )}

      {/* Class Modal */}
      {showClassModal && (
        <ClassModal
          classData={null}
          onClose={() => {
            setShowClassModal(false);
          }}
          onSuccess={() => {
            setShowClassModal(false);
            fetchClasses();
          }}
        />
      )}
    </div>
  );
}

// Class Detail Section Component
function ClassDetailSection({ classId, onBack, onSendMessage }: { classId: string; onBack: () => void; onSendMessage?: (studentId: string) => void }) {
  const navigate = useNavigate();
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassDetail();
  }, [classId]);

  const fetchClassDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/classes/${classId}`);
      setClassData(response.data.class);
    } catch (err: any) {
      console.error('Error fetching class detail:', err);
      alert('Không thể tải thông tin lớp học');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const getStudentLastMessageStatus = (_studentId: string) => {
    return '未読';
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!classData) {
    return <div className="error-message">Không tìm thấy lớp học</div>;
  }

  return (
    <>
      <button className="btn-back-outside" onClick={onBack}>
        ← Quay lại
      </button>
      <div className="class-detail-section">
        <div className="class-info-header">
          <h2 className="section-title">{classData.name}</h2>
          {classData.description && (
            <p className="class-description-inline">{classData.description}</p>
          )}
        </div>

        <div className="students-section-inner">
          <h3 className="subsection-title">Danh sách học sinh ({classData.students?.length || 0})</h3>

        {classData.students?.length === 0 ? (
          <div className="no-data">Lớp học chưa có học sinh nào</div>
              ) : (
                <div className="students-table-container">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Tên học sinh</th>
                  <th>Email</th>
                        <th>Tin nhắn cuối</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                {classData.students?.map((student) => (
                          <tr key={student._id}>
                            <td>
                              <div className="student-info">
                                <div className="student-avatar">
                                  {student.fullName.charAt(0).toUpperCase()}
                                </div>
                                <span>{student.fullName}</span>
                              </div>
                            </td>
                    <td>{student.email}</td>
                            <td>—</td>
                            <td>
                              <span className={`status-badge ${getStudentLastMessageStatus(student._id) === '未読' ? 'unread' : 'read'}`}>
                                {getStudentLastMessageStatus(student._id)}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-send"
                                onClick={() => {
                                  if (onSendMessage) {
                                    onSendMessage(student._id);
                                  } else {
                                    navigate(`/teacher/messages/create?student=${student._id}`);
                                  }
                                }}
                              >
                                Gửi tin nhắn
                              </button>
                            </td>
                          </tr>
                ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
      </div>
    </>
  );
}

// Edit Class Section Component
function EditClassSection({ classId, onBack }: { classId: string; onBack: () => void }) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => {
    fetchClassData();
    fetchAvailableStudents();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoadingData(true);
      const response = await axios.get(`${API_URL}/teacher/classes/${classId}`);
      const data = response.data.class;
      setClassData(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setSelectedStudents(data.students || []);
    } catch (err: any) {
      console.error('Error fetching class:', err);
      alert('Không thể tải thông tin lớp học');
      onBack();
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/students`);
      setAllStudents(response.data.students);
    } catch (err: any) {
      console.error('Error fetching students:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name.trim()) {
        setError('Tên lớp là bắt buộc');
        setLoading(false);
        return;
      }

      const studentIds = selectedStudents.map(s => s._id);

      await axios.put(`${API_URL}/teacher/classes/${classId}`, {
        name: name.trim(),
        description: description.trim(),
        students: studentIds,
      });

      alert('Cập nhật lớp học thành công!');
      onBack();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi cập nhật lớp học');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    setAddStudentError('');
    
    if (!studentEmail.trim()) {
      setAddStudentError('Vui lòng nhập email học sinh');
      return;
    }

    const student = allStudents.find(s => s.email.toLowerCase() === studentEmail.trim().toLowerCase());
    
    if (!student) {
      setAddStudentError('Không tìm thấy học sinh với email này');
      return;
    }

    if (selectedStudents.some(s => s._id === student._id)) {
      setAddStudentError('Học sinh này đã được thêm vào lớp');
      return;
    }

    setSelectedStudents(prev => [...prev, student]);
    setStudentEmail('');
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s._id !== studentId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStudent();
    }
  };

  const handleSelectFromList = (student: Student) => {
    if (selectedStudents.some(s => s._id === student._id)) {
      return;
    }
    setSelectedStudents(prev => [...prev, student]);
  };

  const availableStudents = allStudents.filter(
    student => !selectedStudents.some(s => s._id === student._id)
  );

  if (loadingData) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!classData) {
    return <div className="error-message">Không tìm thấy lớp học</div>;
  }

  return (
    <>
      <button className="btn-back-outside" onClick={onBack}>
        ← Quay lại
      </button>
      <div className="edit-class-section">
        <h2 className="section-title">Sửa lớp học</h2>

        <form onSubmit={handleSubmit} className="edit-class-form">
        <div className="form-group">
          <label htmlFor="className">
            Tên lớp <span className="required">*</span>
          </label>
          <input
            id="className"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nhập tên lớp"
          />
      </div>

        <div className="form-group">
          <label htmlFor="classDescription">Mô tả</label>
          <textarea
            id="classDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả lớp học (tùy chọn)"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Thêm học sinh</label>
          <div className="add-student-input-group">
          <input
            type="email"
              value={studentEmail}
              onChange={(e) => {
                setStudentEmail(e.target.value);
                setAddStudentError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Nhập email học sinh"
              className="student-email-input"
            />
            <button
              type="button"
              onClick={handleAddStudent}
              className="btn-add-student"
            >
              Thêm
            </button>
        </div>
          {addStudentError && <div className="add-student-error">{addStudentError}</div>}
          
          <button
            type="button"
            onClick={() => setShowStudentList(!showStudentList)}
            className="btn-toggle-list"
          >
            {showStudentList ? '▼ Ẩn danh sách' : '▶ Chọn từ danh sách'}
          </button>

          {showStudentList && (
            <div className="available-students-list">
              {availableStudents.length === 0 ? (
                <div className="no-students">
                  {allStudents.length === 0 
                    ? 'Chưa có học sinh nào' 
                    : 'Tất cả học sinh đã được thêm vào lớp'}
                </div>
              ) : (
                availableStudents.map((student) => (
                  <div
                    key={student._id}
                    className="available-student-item"
                    onClick={() => handleSelectFromList(student)}
                  >
                    <div className="student-info-inline">
                      <div className="student-avatar-small">
                        {student.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="student-name-email">
                        {student.fullName} ({student.email})
                      </span>
                    </div>
                    <span className="add-icon">+</span>
                  </div>
                ))
      )}
    </div>
          )}
          
          {selectedStudents.length > 0 && (
            <div className="selected-students-list">
              <div className="selected-students-header">
                Học sinh đã chọn ({selectedStudents.length})
              </div>
              {selectedStudents.map((student) => (
                <div key={student._id} className="selected-student-item">
                  <div className="student-info-inline">
                    <div className="student-avatar-small">
                      {student.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="student-name-email">
                      {student.fullName} ({student.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-student"
                    onClick={() => handleRemoveStudent(student._id)}
                    title="Xóa học sinh"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Đang cập nhật...' : 'Cập nhật lớp học'}
          </button>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onBack}
          >
            Hủy
          </button>
        </div>
      </form>
      </div>
    </>
  );
}

// Class Modal Component
function ClassModal({ 
  classData, 
  onClose, 
  onSuccess 
}: { 
  classData: Class | null; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(classData?.name || '');
  const [description, setDescription] = useState(classData?.description || '');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);

  useEffect(() => {
    fetchAvailableStudents();
    if (classData) {
      setName(classData.name || '');
      setDescription(classData.description || '');
      setSelectedStudents(classData.students || []);
    } else {
      setName('');
      setDescription('');
      setSelectedStudents([]);
    }
  }, [classData]);

  const fetchAvailableStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await axios.get(`${API_URL}/teacher/students`);
      setAllStudents(response.data.students);
    } catch (err: any) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name.trim()) {
        setError('Tên lớp là bắt buộc');
        setLoading(false);
        return;
      }

      const studentIds = selectedStudents.map(s => s._id);

      if (classData) {
        // Update existing class
        await axios.put(`${API_URL}/teacher/classes/${classData._id}`, {
          name: name.trim(),
          description: description.trim(),
          students: studentIds,
      });
        alert('Cập nhật lớp học thành công!');
      } else {
        // Create new class
        await axios.post(`${API_URL}/teacher/classes`, {
          name: name.trim(),
          description: description.trim(),
          students: studentIds,
        });
        alert('Tạo lớp học thành công!');
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi lưu lớp học');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    setAddStudentError('');
    
    if (!studentEmail.trim()) {
      setAddStudentError('Vui lòng nhập email học sinh');
      return;
    }

    // Tìm học sinh theo email
    const student = allStudents.find(s => s.email.toLowerCase() === studentEmail.trim().toLowerCase());
    
    if (!student) {
      setAddStudentError('Không tìm thấy học sinh với email này');
      return;
    }

    // Kiểm tra xem học sinh đã được thêm chưa
    if (selectedStudents.some(s => s._id === student._id)) {
      setAddStudentError('Học sinh này đã được thêm vào lớp');
      return;
    }

    // Thêm học sinh vào danh sách
    setSelectedStudents(prev => [...prev, student]);
    setStudentEmail('');
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s._id !== studentId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStudent();
    }
  };

  const handleSelectFromList = (student: Student) => {
    // Kiểm tra xem học sinh đã được thêm chưa
    if (selectedStudents.some(s => s._id === student._id)) {
      return;
    }

    // Thêm học sinh vào danh sách
    setSelectedStudents(prev => [...prev, student]);
  };

  // Lọc ra các học sinh chưa được chọn
  const availableStudents = allStudents.filter(
    student => !selectedStudents.some(s => s._id === student._id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content class-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{classData ? 'Sửa lớp học' : 'Tạo lớp học mới'}</h3>
        <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="className">
              Tên lớp <span className="required">*</span>
          </label>
          <input
            id="className"
            type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nhập tên lớp"
          />
        </div>

        <div className="form-group">
            <label htmlFor="classDescription">Mô tả</label>
            <textarea
              id="classDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả lớp học (tùy chọn)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Thêm học sinh</label>
            {loadingStudents ? (
              <div className="loading">Đang tải danh sách học sinh...</div>
            ) : (
              <>
                <div className="add-student-input-group">
          <input
            type="email"
                    value={studentEmail}
                    onChange={(e) => {
                      setStudentEmail(e.target.value);
                      setAddStudentError('');
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập email học sinh"
                    className="student-email-input"
          />
                  <button
                    type="button"
                    onClick={handleAddStudent}
                    className="btn-add-student"
                  >
                    Thêm
                  </button>
        </div>
                {addStudentError && <div className="add-student-error">{addStudentError}</div>}
                
                <button
                  type="button"
                  onClick={() => setShowStudentList(!showStudentList)}
                  className="btn-toggle-list"
                >
                  {showStudentList ? '▼ Ẩn danh sách' : '▶ Chọn từ danh sách'}
                </button>

                {showStudentList && (
                  <div className="available-students-list">
                    {availableStudents.length === 0 ? (
                      <div className="no-students">
                        {allStudents.length === 0 
                          ? 'Chưa có học sinh nào' 
                          : 'Tất cả học sinh đã được thêm vào lớp'}
                      </div>
                    ) : (
                      availableStudents.map((student) => (
                        <div
                          key={student._id}
                          className="available-student-item"
                          onClick={() => handleSelectFromList(student)}
                        >
                          <div className="student-info-inline">
                            <div className="student-avatar-small">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="student-name-email">
                              {student.fullName} ({student.email})
                            </span>
                          </div>
                          <span className="add-icon">+</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {selectedStudents.length > 0 && (
                  <div className="selected-students-list">
                    <div className="selected-students-header">
                      Học sinh đã chọn ({selectedStudents.length})
                    </div>
                    {selectedStudents.map((student) => (
                      <div key={student._id} className="selected-student-item">
                        <div className="student-info-inline">
                          <div className="student-avatar-small">
                            {student.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="student-name-email">
                            {student.fullName} ({student.email})
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-student"
                          onClick={() => handleRemoveStudent(student._id)}
                          title="Xóa học sinh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>

        {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Đang lưu...' : classData ? 'Cập nhật' : 'Tạo lớp'}
          </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// History Section Component
function HistorySection({ onViewDetail }: { onViewDetail: (messageId: string) => void }) {
  const { language, t } = useLanguage();
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [deadlineFilterFrom, setDeadlineFilterFrom] = useState('');
  const [deadlineFilterTo, setDeadlineFilterTo] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editLockResponseAfterDeadline, setEditLockResponseAfterDeadline] = useState(false);
  const [editReminderEnabled, setEditReminderEnabled] = useState(false);
  const [editReminderFrequency, setEditReminderFrequency] = useState<'once' | 'periodic' | 'custom'>('once');
  const [editReminderCustomFrequency, setEditReminderCustomFrequency] = useState<number>(24);
  const [editReminderAfterSend, setEditReminderAfterSend] = useState(false);
  const [editReminderAfterSendHours, setEditReminderAfterSendHours] = useState<number>(24);
  const [editReminderBeforeDeadline, setEditReminderBeforeDeadline] = useState(false);
  const [editReminderBeforeDeadlineHours, setEditReminderBeforeDeadlineHours] = useState<number>(24);
  const [editReminderTarget, setEditReminderTarget] = useState<'unread' | 'read_no_reply'>('unread');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Đóng filter menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-filter-container')) {
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

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/messages`);
      setAllMessages(response.data.messages);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải lịch sử tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  // Helper function để format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Lọc tin nhắn theo search term và status filter
  const filteredMessages = allMessages.filter((message) => {
    try {
      // Kiểm tra dữ liệu hợp lệ
      if (!message || !message.readStatus || !message.recipients) return false;

      // Lọc theo trạng thái
      if (statusFilter !== 'all') {
        const unreadCount = message.readStatus.filter((status: any) => !status.isRead).length;
        const isAllRead = unreadCount === 0;
        
        if (statusFilter === 'read' && !isAllRead) return false;
        if (statusFilter === 'unread' && isAllRead) return false;
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        // Tìm theo tiêu đề
        if (message.title && message.title.toLowerCase().includes(searchLower)) return true;
        
        // Tìm theo người nhận
        if (message.recipients && message.recipients.length > 0) {
          const recipientMatch = message.recipients.some((recipient: any) => 
            (recipient.fullName && recipient.fullName.toLowerCase().includes(searchLower)) ||
            (recipient.email && recipient.email.toLowerCase().includes(searchLower))
          );
          if (recipientMatch) return true;
        }
        
        return false;
      }

      // Lọc theo ngày gửi
      if (dateFilterFrom || dateFilterTo) {
        if (message.createdAt) {
          const messageDate = new Date(message.createdAt);
          messageDate.setHours(0, 0, 0, 0);
          
          if (dateFilterFrom) {
            const fromDate = new Date(dateFilterFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (messageDate < fromDate) return false;
          }
          
          if (dateFilterTo) {
            const toDate = new Date(dateFilterTo);
            toDate.setHours(23, 59, 59, 999);
            if (messageDate > toDate) return false;
          }
        } else {
          return false;
        }
      }

      // Lọc theo deadline
      if (deadlineFilterFrom || deadlineFilterTo) {
        if (message.deadline) {
          const deadlineDate = new Date(message.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          
          if (deadlineFilterFrom) {
            const fromDate = new Date(deadlineFilterFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (deadlineDate < fromDate) return false;
          }
          
          if (deadlineFilterTo) {
            const toDate = new Date(deadlineFilterTo);
            toDate.setHours(23, 59, 59, 999);
            if (deadlineDate > toDate) return false;
          }
        } else {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error filtering message:', error, message);
      return false;
    }
  });

  const getMessageStatus = (message: any): string => {
    const totalRecipients = message.recipients.length;
    const unreadCount = message.readStatus.filter((status: any) => !status.isRead).length;
    
    // Nếu tất cả đã đọc
    if (unreadCount === 0) {
      return 'Đã đọc';
    }
    
    // Nếu gửi cho 1 người
    if (totalRecipients === 1) {
      return 'Chưa đọc';
    }
    
    // Nếu gửi cho nhiều người và còn người chưa đọc
    return `Chưa đọc: ${unreadCount}/${totalRecipients}`;
  };

  const getStatusClass = (status: string): string => {
    if (status === 'Đã đọc') return 'read';
    if (status.startsWith('Chưa đọc')) return 'unread';
    return 'sent';
  };

  const handleEdit = (message: any) => {
    setEditingMessage(message);
    setEditTitle(message.title);
    setEditContent(message.content);
    
    // Set deadline
    if (message.deadline) {
      const deadlineDate = new Date(message.deadline);
      const year = deadlineDate.getFullYear();
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
      const day = String(deadlineDate.getDate()).padStart(2, '0');
      const hours = String(deadlineDate.getHours()).padStart(2, '0');
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
      setEditDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditDeadline('');
    }
    
    setEditLockResponseAfterDeadline(message.lockResponseAfterDeadline || false);
    
    // Set reminder settings
    if (message.reminder) {
      setEditReminderEnabled(message.reminder.enabled || false);
      setEditReminderFrequency(message.reminder.frequency || 'once');
      setEditReminderCustomFrequency(message.reminder.customFrequency || 24);
      
      if (message.reminder.timing && Array.isArray(message.reminder.timing)) {
        const afterSendTiming = message.reminder.timing.find((t: any) => t.type === 'after_send');
        const beforeDeadlineTiming = message.reminder.timing.find((t: any) => t.type === 'before_deadline');
        
        setEditReminderAfterSend(!!afterSendTiming);
        setEditReminderAfterSendHours(afterSendTiming?.value || 24);
        
        setEditReminderBeforeDeadline(!!beforeDeadlineTiming);
        setEditReminderBeforeDeadlineHours(beforeDeadlineTiming?.value || 24);
      } else {
        setEditReminderAfterSend(false);
        setEditReminderBeforeDeadline(false);
      }
      
      setEditReminderTarget(message.reminder.target || 'unread');
    } else {
      setEditReminderEnabled(false);
      setEditReminderFrequency('once');
      setEditReminderCustomFrequency(24);
      setEditReminderAfterSend(false);
      setEditReminderAfterSendHours(24);
      setEditReminderBeforeDeadline(false);
      setEditReminderBeforeDeadlineHours(24);
      setEditReminderTarget('unread');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Tiêu đề và nội dung không được để trống');
      return;
    }

    // Kiểm tra deadline có sớm hơn deadline cũ không
    if (editDeadline && editingMessage.deadline) {
      const oldDeadline = new Date(editingMessage.deadline);
      const newDeadline = new Date(editDeadline);
      
      if (newDeadline < oldDeadline) {
        const confirmed = window.confirm(
          '⚠️ Cảnh báo: Deadline mới sớm hơn deadline cũ.\n\n' +
          'Điều này có thể khiến các học sinh đã phản hồi đúng hạn trước đó chuyển thành "Nộp muộn".\n\n' +
          'Bạn có chắc chắn muốn tiếp tục?'
        );
        if (!confirmed) {
          return;
        }
      }
    }

    // Validation cho reminder settings
    if (editReminderEnabled) {
      if (!editReminderAfterSend && !editReminderBeforeDeadline) {
        alert('Vui lòng chọn ít nhất một thời điểm nhắc nhở');
        return;
      }
      if (editReminderBeforeDeadline && !editDeadline) {
        alert('Cần đặt deadline để sử dụng tính năng nhắc nhở trước deadline');
        return;
      }
    }

    setEditLoading(true);
    try {
      // Tạo mảng timing từ các lựa chọn
      const timingArray: any[] = [];
      if (editReminderAfterSend) {
        timingArray.push({
          type: 'after_send',
          value: editReminderAfterSendHours,
        });
      }
      if (editReminderBeforeDeadline) {
        timingArray.push({
          type: 'before_deadline',
          value: editReminderBeforeDeadlineHours,
        });
      }

      const reminder = editReminderEnabled ? {
        enabled: true,
        frequency: editReminderFrequency,
        customFrequency: editReminderFrequency === 'custom' ? editReminderCustomFrequency : undefined,
        timing: timingArray,
        target: editReminderTarget,
      } : {
        enabled: false,
      };

      await axios.put(`${API_URL}/teacher/messages/${editingMessage._id}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
        attachments: editingMessage.attachments || [],
        deadline: editDeadline || undefined,
        lockResponseAfterDeadline: editLockResponseAfterDeadline,
        reminder,
      });

      alert('Cập nhật tin nhắn thành công! Học sinh đã nhận được thông báo.');
      setEditingMessage(null);
      fetchMessages(); // Refresh danh sách
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật tin nhắn');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/teacher/messages/${messageId}`);
      alert('Xóa tin nhắn thành công!');
      fetchMessages(); // Refresh danh sách
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi xóa tin nhắn');
    }
  };

  return (
    <div className="history-section">
      <h2 className="section-title">Lịch sử tin nhắn</h2>

      <div className="history-actions">
        <div className="search-area">
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc người nhận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="status-filter-container" style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {statusFilter === 'all' ? 'Tất cả' : statusFilter === 'read' ? 'Đã đọc' : 'Chưa đọc'}
              </span>
              <span className="filter-icon">▼</span>
            </button>
            {showFilterMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  minWidth: '320px',
                  zIndex: 1000,
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Trạng thái:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'read' | 'unread')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="read">Đã đọc</option>
                    <option value="unread">Chưa đọc</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Ngày gửi:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={dateFilterFrom}
                      onChange={(e) => setDateFilterFrom(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{language === 'vi' ? 'đến' : 'まで'}</span>
                    <input
                      type="date"
                      value={dateFilterTo}
                      onChange={(e) => setDateFilterTo(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    {t('deadlineLabel')}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={deadlineFilterFrom}
                      onChange={(e) => setDeadlineFilterFrom(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{language === 'vi' ? 'đến' : 'まで'}</span>
                    <input
                      type="date"
                      value={deadlineFilterTo}
                      onChange={(e) => setDeadlineFilterTo(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateFilterFrom('');
                      setDateFilterTo('');
                      setDeadlineFilterFrom('');
                      setDeadlineFilterTo('');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#3b82f6',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className="total-count">Tổng: {filteredMessages.length} tin nhắn</span>
        </div>
        <button onClick={() => fetchMessages()} className="btn-refresh">
          <span style={{ fontSize: '1.25rem' }}>⟳</span>
          <span>Làm mới</span>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Người nhận</th>
                <th>Tiêu đề</th>
                <th>Ngày gửi</th>
                <th>{t('deadline')}</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    Không có tin nhắn nào
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => {
                  const status = getMessageStatus(message);
                  const formatDeadline = (deadlineString: string | undefined): string => {
                    if (!deadlineString) return '—';
                    const date = new Date(deadlineString);
                    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                  };
                  return (
                    <tr key={message._id}>
                      <td>
                        {message.recipients.length > 3
                          ? `${message.recipients.slice(0, 3).map((r: any) => r.fullName).join(', ')}...`
                          : message.recipients.map((r: any) => r.fullName).join(', ')}
                      </td>
                      <td>{message.title}</td>
                      <td>{formatDate(message.createdAt)}</td>
                      <td>{formatDeadline(message.deadline)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button 
                            className="btn-details"
                            onClick={() => onViewDetail(message._id)}
                          >
                            Chi tiết
                          </button>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(message)}
                          >
                            Sửa
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(message._id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="modal-overlay" onClick={() => setEditingMessage(null)}>
          <div className="modal-content edit-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sửa tin nhắn</h3>
              <button className="modal-close" onClick={() => setEditingMessage(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="editTitle">
                  Tiêu đề <span className="required">*</span>
                </label>
                <input
                  id="editTitle"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  placeholder="Nhập tiêu đề tin nhắn"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editContent">
                  Nội dung <span className="required">*</span>
                </label>
                <textarea
                  id="editContent"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={8}
                  placeholder="Nhập nội dung tin nhắn"
                />
              </div>

              {/* Deadline Settings */}
              <div className="form-group">
                <label htmlFor="editDeadline">
                  {t('deadline')}
                </label>
                <input
                  id="editDeadline"
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
                <label className="checkbox-label" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={editLockResponseAfterDeadline}
                    onChange={(e) => setEditLockResponseAfterDeadline(e.target.checked)}
                  />
                  <span>Khóa phản hồi sau khi hết hạn</span>
                </label>
                <small style={{ color: '#666', display: 'block', marginTop: '8px', marginLeft: '1.8rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  Nếu không tick, phản hồi muộn sẽ bị đánh dấu là "Nộp muộn"
                </small>
              </div>

              {/* Reminder Settings */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editReminderEnabled}
                    onChange={(e) => setEditReminderEnabled(e.target.checked)}
                  />
                  <span>Bật nhắc nhở tự động</span>
                </label>
              </div>

              {editReminderEnabled && (
                <>
                  <div className="form-group">
                    <label htmlFor="editReminderFrequency">
                      Tần suất nhắc nhở
                    </label>
                    <select
                      id="editReminderFrequency"
                      value={editReminderFrequency}
                      onChange={(e) => setEditReminderFrequency(e.target.value as 'once' | 'periodic' | 'custom')}
                    >
                      <option value="once">1 lần</option>
                      <option value="periodic">Định kỳ</option>
                      <option value="custom">Tùy chỉnh</option>
                    </select>
                    {editReminderFrequency === 'custom' && (
                      <div style={{ marginTop: '10px' }}>
                        <label htmlFor="editReminderCustomFrequency" style={{ display: 'block', marginBottom: '5px' }}>
                          Số giờ giữa các lần nhắc
                        </label>
                        <input
                          id="editReminderCustomFrequency"
                          type="number"
                          min="1"
                          value={editReminderCustomFrequency}
                          onChange={(e) => setEditReminderCustomFrequency(parseInt(e.target.value) || 24)}
                          className="custom-frequency-input"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Thời điểm nhắc</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editReminderAfterSend}
                          onChange={(e) => setEditReminderAfterSend(e.target.checked)}
                        />
                        <span>Sau khi gửi tin nhắn</span>
                      </label>
                      {editReminderAfterSend && (
                        <div style={{ marginLeft: '30px', marginTop: '5px' }}>
                          <label htmlFor="editReminderAfterSendHours" style={{ display: 'block', marginBottom: '5px' }}>
                            Số giờ sau khi gửi tin nhắn
                          </label>
                          <input
                            id="editReminderAfterSendHours"
                            type="number"
                            min="1"
                            value={editReminderAfterSendHours}
                            onChange={(e) => setEditReminderAfterSendHours(parseInt(e.target.value) || 24)}
                            className="reminder-timing-input"
                          />
                        </div>
                      )}

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editReminderBeforeDeadline}
                          onChange={(e) => setEditReminderBeforeDeadline(e.target.checked)}
                          disabled={!editDeadline}
                        />
                        <span>Trước deadline {!editDeadline && '(Cần đặt deadline trước)'}</span>
                      </label>
                      {editReminderBeforeDeadline && editDeadline && (
                        <div style={{ marginLeft: '30px', marginTop: '5px' }}>
                          <label htmlFor="editReminderBeforeDeadlineHours" style={{ display: 'block', marginBottom: '5px' }}>
                            Số giờ trước deadline
                          </label>
                          <input
                            id="editReminderBeforeDeadlineHours"
                            type="number"
                            min="1"
                            value={editReminderBeforeDeadlineHours}
                            onChange={(e) => setEditReminderBeforeDeadlineHours(parseInt(e.target.value) || 24)}
                            className="reminder-timing-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="editReminderTarget">
                      Đối tượng nhắc nhở
                    </label>
                    <select
                      id="editReminderTarget"
                      value={editReminderTarget}
                      onChange={(e) => setEditReminderTarget(e.target.value as 'unread' | 'read_no_reply')}
                    >
                      <option value="unread">Chưa đọc</option>
                      <option value="read_no_reply">Đã đọc nhưng chưa phản hồi</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setEditingMessage(null)}
                disabled={editLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Message Section Component
function CreateMessageSection({ onBack, onSuccess, initialStudentId }: { onBack: () => void; onSuccess?: () => void; initialStudentId?: string | null }) {
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [lockResponseAfterDeadline, setLockResponseAfterDeadline] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<'once' | 'periodic' | 'custom'>('once');
  const [reminderCustomFrequency, setReminderCustomFrequency] = useState<number>(24); // số giờ giữa các lần nhắc
  const [reminderAfterSend, setReminderAfterSend] = useState(false);
  const [reminderAfterSendHours, setReminderAfterSendHours] = useState<number>(24);
  const [reminderBeforeDeadline, setReminderBeforeDeadline] = useState(false);
  const [reminderBeforeDeadlineHours, setReminderBeforeDeadlineHours] = useState<number>(24);
  const [reminderTarget, setReminderTarget] = useState<'unread' | 'read_no_reply'>('unread');

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  // Pre-select student if initialStudentId is provided
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const studentExists = students.some(s => s._id === initialStudentId);
      if (studentExists) {
        setSelectedRecipients([initialStudentId]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentId, students.length]);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/classes`);
      setClasses(response.data.classes);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/students`);
      setStudents(response.data.students);
    } catch (err: any) {
      console.error('Error fetching students:', err);
    }
  };

  const filteredStudents = students.filter((student) => {
    // Lọc theo lớp
    if (selectedClass !== 'all') {
      const selectedClassData = classes.find(c => c._id === selectedClass);
      if (selectedClassData) {
        const isInClass = selectedClassData.students.some((s: any) => s._id === student._id);
        if (!isInClass) return false;
      }
    }
    
    // Lọc theo tìm kiếm
    const searchLower = recipientSearchTerm.toLowerCase();
    return (
      student.fullName.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
              setError('');
    
    if (selectedRecipients.length === 0) {
      setError('Vui lòng chọn ít nhất một người nhận');
      return;
    }
    
    if (!title || !content) {
      setError('Tiêu đề và nội dung là bắt buộc');
      return;
    }

    // Validation cho reminder settings
    if (reminderEnabled) {
      if (!reminderAfterSend && !reminderBeforeDeadline) {
        setError('Vui lòng chọn ít nhất một thời điểm nhắc nhở');
        return;
      }
      if (reminderBeforeDeadline && !deadline) {
        setError('Cần đặt deadline để sử dụng tính năng nhắc nhở trước deadline');
        return;
      }
    }

    setLoading(true);

    try {
      // Upload files nếu có
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append('files', file);
        });

        try {
          const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
            // Không set Content-Type, để axios tự động set với boundary
          });
          attachmentUrls = uploadResponse.data.urls || [];
          console.log('Upload thành công, URLs:', attachmentUrls);
        } catch (uploadErr: any) {
          console.error('Error uploading files:', uploadErr);
          console.error('Error response:', uploadErr.response?.data);
          console.error('Error status:', uploadErr.response?.status);
          // Nếu upload thất bại, vẫn cho phép gửi message không có attachments
          const errorMsg = uploadErr.response?.data?.message || uploadErr.message || 'Lỗi không xác định';
          alert(`Có lỗi khi upload file đính kèm: ${errorMsg}\nTin nhắn sẽ được gửi không có file đính kèm.`);
        }
      }

      // Tạo mảng timing từ các lựa chọn
      const timingArray: any[] = [];
      if (reminderAfterSend) {
        timingArray.push({
          type: 'after_send',
          value: reminderAfterSendHours,
        });
      }
      if (reminderBeforeDeadline) {
        timingArray.push({
          type: 'before_deadline',
          value: reminderBeforeDeadlineHours,
        });
      }

      const reminder = reminderEnabled ? {
        enabled: true,
        frequency: reminderFrequency,
        customFrequency: reminderFrequency === 'custom' ? reminderCustomFrequency : undefined,
        timing: timingArray,
        target: reminderTarget,
      } : {
        enabled: false,
      };

      await axios.post(`${API_URL}/teacher/messages`, {
        recipients: selectedRecipients,
        title,
        content,
        attachments: attachmentUrls,
        requestReply: false,
        duplicateMessage: false,
        deadline: deadline || undefined,
        lockResponseAfterDeadline,
        reminder,
      });

      alert('Tin nhắn đã được gửi thành công!');
      setTitle('');
      setContent('');
      setSelectedRecipients([]);
      setAttachments([]);
      setDeadline('');
      setLockResponseAfterDeadline(false);
      setReminderEnabled(false);
      setReminderFrequency('once');
      setReminderCustomFrequency(24);
      setReminderAfterSend(false);
      setReminderAfterSendHours(24);
      setReminderBeforeDeadline(false);
      setReminderBeforeDeadlineHours(24);
      setReminderTarget('unread');
      if (onSuccess) {
              onSuccess();
      } else {
        onBack();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tạo tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecipient = (studentId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredStudents.map(student => student._id);
    const allSelected = allFilteredIds.every(id => selectedRecipients.includes(id));
    
    if (allSelected) {
      // Bỏ chọn tất cả
      setSelectedRecipients(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Chọn tất cả
      const newSelected = [...new Set([...selectedRecipients, ...allFilteredIds])];
      setSelectedRecipients(newSelected);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="create-message-section">
      <h2 className="section-title">Tạo tin nhắn mới</h2>

      <form onSubmit={handleSubmit} className="message-form">
        <div className="form-group">
          <label htmlFor="recipients">
            Chọn người nhận <span className="required">*</span>
          </label>
          
          <div className="class-filter-container">
            <label htmlFor="classFilter" className="class-filter-label">Lọc theo lớp:</label>
            <select
              id="classFilter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="class-filter-select"
            >
              <option value="all">Tất cả học sinh</option>
              {classes.map((classItem) => (
                <option key={classItem._id} value={classItem._id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <div className="recipient-search-container">
          <input
            type="text"
              placeholder="Tìm kiếm học sinh theo tên hoặc email..."
              value={recipientSearchTerm}
              onChange={(e) => setRecipientSearchTerm(e.target.value)}
              className="recipient-search-input"
            />
          </div>
          
          {filteredStudents.length > 0 && (
            <div className="select-all-container">
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn-select-all"
              >
                {filteredStudents.every(student => selectedRecipients.includes(student._id))
                  ? '✓ Bỏ chọn tất cả'
                  : '☐ Chọn tất cả'}
              </button>
            </div>
          )}
          
          <div className="recipients-list">
            {students.length === 0 ? (
              <div className="no-students">Chưa có học sinh nào</div>
            ) : filteredStudents.length === 0 ? (
              <div className="no-students">Không tìm thấy học sinh phù hợp</div>
            ) : (
              filteredStudents.map((student) => (
                <label key={student._id} className="recipient-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(student._id)}
                    onChange={() => handleToggleRecipient(student._id)}
                  />
                  <span>{student.fullName} ({student.email})</span>
                </label>
              ))
            )}
          </div>
          <small>{selectedRecipients.length} học sinh được chọn</small>
        </div>

        <div className="form-group">
          <label htmlFor="title">
            Tiêu đề <span className="required">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Nhập tiêu đề tin nhắn"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">
            Nội dung <span className="required">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            placeholder="Nhập nội dung tin nhắn"
          />
        </div>

        <div className="form-group">
          <label htmlFor="attachments">
            Đính kèm tệp
          </label>
          <div className="file-upload-container">
            <input
              id="attachments"
              type="file"
              multiple
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="attachments" className="file-input-label">
              📎 Chọn tệp đính kèm
            </label>
          </div>
          
          {attachments.length > 0 && (
            <div className="attachments-list">
              {attachments.map((file, index) => (
                <div key={index} className="attachment-item">
                  <span className="attachment-name">
                    📄 {file.name}
                  </span>
                  <span className="attachment-size">
                    ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="remove-attachment-btn"
                    title="Xóa"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi tin nhắn'}
          </button>
          <button 
            type="button" 
            className="btn-advanced" 
            onClick={() => setShowAdvancedSettings(true)}
          >
            Cài đặt nâng cao
          </button>
          <button type="button" className="btn-cancel" onClick={onBack}>
            Hủy
          </button>
        </div>
      </form>

      {/* Advanced Settings Modal */}
      {showAdvancedSettings && (
        <div className="modal-overlay" onClick={() => setShowAdvancedSettings(false)}>
          <div className="modal-content advanced-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cài đặt nâng cao</h3>
              <button className="modal-close" onClick={() => setShowAdvancedSettings(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Deadline Settings */}
              <div className="form-group">
                <label htmlFor="deadline">
                  {t('deadline')}
                </label>
                <input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <label className="checkbox-label" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={lockResponseAfterDeadline}
                    onChange={(e) => setLockResponseAfterDeadline(e.target.checked)}
                  />
                  <span>Khóa phản hồi sau khi hết hạn</span>
                </label>
                <small style={{ color: '#666', display: 'block', marginTop: '8px', marginLeft: '1.8rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  Nếu không tick, phản hồi muộn sẽ bị đánh dấu là "Nộp muộn"
                </small>
              </div>

              {/* Reminder Settings */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                  />
                  <span>Bật nhắc nhở tự động</span>
                </label>
              </div>

              {reminderEnabled && (
                <>
                  <div className="form-group">
                    <label htmlFor="reminderFrequency">
                      Tần suất nhắc nhở
                    </label>
                    <select
                      id="reminderFrequency"
                      value={reminderFrequency}
                      onChange={(e) => setReminderFrequency(e.target.value as 'once' | 'periodic' | 'custom')}
                    >
                      <option value="once">1 lần</option>
                      <option value="periodic">Định kỳ</option>
                      <option value="custom">Tùy chỉnh</option>
                    </select>
                    {reminderFrequency === 'custom' && (
                      <div style={{ marginTop: '10px' }}>
                        <label htmlFor="reminderCustomFrequency" style={{ display: 'block', marginBottom: '5px' }}>
                          Số giờ giữa các lần nhắc
                        </label>
                        <input
                          id="reminderCustomFrequency"
                          type="number"
                          min="1"
                          value={reminderCustomFrequency}
                          onChange={(e) => setReminderCustomFrequency(parseInt(e.target.value) || 24)}
                          className="custom-frequency-input"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Thời điểm nhắc</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={reminderAfterSend}
                          onChange={(e) => setReminderAfterSend(e.target.checked)}
                        />
                        <span>Sau khi gửi tin nhắn</span>
                      </label>
                      {reminderAfterSend && (
                        <div style={{ marginLeft: '30px', marginTop: '5px' }}>
                          <label htmlFor="reminderAfterSendHours" style={{ display: 'block', marginBottom: '5px' }}>
                            Số giờ sau khi gửi tin nhắn
                          </label>
                          <input
                            id="reminderAfterSendHours"
                            type="number"
                            min="1"
                            value={reminderAfterSendHours}
                            onChange={(e) => setReminderAfterSendHours(parseInt(e.target.value) || 24)}
                            className="reminder-timing-input"
                          />
                        </div>
                      )}

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={reminderBeforeDeadline}
                          onChange={(e) => setReminderBeforeDeadline(e.target.checked)}
                          disabled={!deadline}
                        />
                        <span>Trước deadline {!deadline && '(Cần đặt deadline trước)'}</span>
                      </label>
                      {reminderBeforeDeadline && deadline && (
                        <div style={{ marginLeft: '30px', marginTop: '5px' }}>
                          <label htmlFor="reminderBeforeDeadlineHours" style={{ display: 'block', marginBottom: '5px' }}>
                            Số giờ trước deadline
                          </label>
                          <input
                            id="reminderBeforeDeadlineHours"
                            type="number"
                            min="1"
                            value={reminderBeforeDeadlineHours}
                            onChange={(e) => setReminderBeforeDeadlineHours(parseInt(e.target.value) || 24)}
                            className="reminder-timing-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reminderTarget">
                      Đối tượng nhắc nhở
                    </label>
                    <select
                      id="reminderTarget"
                      value={reminderTarget}
                      onChange={(e) => setReminderTarget(e.target.value as 'unread' | 'read_no_reply')}
                    >
                      <option value="unread">Chưa đọc</option>
                      <option value="read_no_reply">Đã đọc nhưng chưa phản hồi</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-submit"
                onClick={() => setShowAdvancedSettings(false)}
              >
                Xác nhận
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowAdvancedSettings(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Message Detail Section Component
function MessageDetailSection({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchMessageDetail();
  }, [messageId]);

  // Fetch replies sau khi có message (để đảm bảo dùng đúng message ID)
  useEffect(() => {
    if (message?._id) {
      fetchReplies(message._id);
    }
  }, [message]);

  const fetchMessageDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/messages/${messageId}`);
      setMessage(response.data.message);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải chi tiết tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (originalMessageId: string) => {
    try {
      const response = await axios.get(`${API_URL}/teacher/messages/${originalMessageId}/replies`);
      setReplies(response.data.replies || []);
    } catch (err: any) {
      console.error('Error fetching replies:', err);
      setReplies([]);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Hàm tạo màu avatar dựa trên tên người dùng
  const getAvatarColor = (name: string): string => {
    const colors = [
      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Blue
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Purple
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
      'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Green
      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
      'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Orange
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getReadStatus = (recipientId: string): boolean => {
    if (!message?.readStatus) return false;
    const status = message.readStatus.find((rs: any) => rs.userId._id === recipientId || rs.userId === recipientId);
    return status?.isRead || false;
  };

  // Hàm lấy trạng thái phản hồi của học sinh
  const getResponseStatus = (recipientId: string): 'Đã phản hồi' | 'Chưa có' | 'Nộp muộn' => {
    const recipientIdStr = recipientId?.toString() || recipientId;
    const recipientReplies = replies.filter((reply: any) => {
      const senderId = typeof reply.sender === 'object' && reply.sender?._id 
        ? reply.sender._id.toString() 
        : reply.sender?.toString() || reply.sender;
      return senderId === recipientIdStr;
    });

    if (recipientReplies.length === 0) {
      return 'Chưa có';
    }

    // Kiểm tra nếu có deadline và có phản hồi muộn
    if (message.deadline) {
      const deadlineDate = new Date(message.deadline);
      const hasLateReply = recipientReplies.some((reply: any) => {
        const replyDate = new Date(reply.createdAt);
        return replyDate > deadlineDate;
      });
      
      if (hasLateReply) {
        return 'Nộp muộn';
      }
    }

    return 'Đã phản hồi';
  };

  const handleManualReminder = async (target: 'unread' | 'read_no_reply') => {
    const targetText = target === 'unread' ? 'chưa đọc' : 'đã đọc nhưng chưa phản hồi';
    if (!window.confirm(`Bạn có muốn gửi nhắc nhở cho các học sinh ${targetText} tin nhắn này không?`)) {
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/teacher/messages/${messageId}/manual-reminder`, {
        target,
      });
      alert(response.data.message || `Đã gửi nhắc nhở cho ${response.data.count} học sinh`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi gửi nhắc nhở');
    }
  };

  const REACTION_LABELS: { [key: string]: string } = {
    like: '👍 Thích',
    thanks: '🙏 Cảm ơn',
    understood: '✅ Đã hiểu',
    star: '⭐ Yêu thích',
    question: '❓ Có câu hỏi',
    idea: '💡 Có ý tưởng',
    great: '✨ Tuyệt vời',
    done: '🎯 Đã hoàn thành',
  };

  const REACTION_TEXT_LABELS: { [key: string]: string } = {
    like: 'thích',
    thanks: 'cảm ơn',
    understood: 'đã hiểu',
    star: 'yêu thích',
    question: 'có câu hỏi',
    idea: 'có ý tưởng',
    great: 'tuyệt vời',
    done: 'đã hoàn thành',
  };

  const getReactionsByType = () => {
    if (!message?.reactions || message.reactions.length === 0) return {};
    
    const reactionsByType: { [key: string]: any[] } = {};
    message.reactions.forEach((reaction: any) => {
      const reactionType = reaction.reaction;
      if (!reactionsByType[reactionType]) {
        reactionsByType[reactionType] = [];
      }
      reactionsByType[reactionType].push(reaction);
    });
    
    return reactionsByType;
  };

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


  if (loading) {
    return (
      <div className="message-detail-section">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="message-detail-section">
        <button onClick={onBack} className="btn-back-outside">
          ← Quay lại
        </button>
        <div className="error-message">{error || 'Không tìm thấy tin nhắn'}</div>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="btn-back-outside">
        ← Quay lại
      </button>
      <div className="message-detail-section">
        <h2 className="section-title">Chi tiết tin nhắn</h2>

        <div className="message-detail-card">
          <div className="message-detail-header">
            <div className="title-section">
              <strong>Tiêu đề:</strong>
              <h3 className="message-detail-title">{message.title}</h3>
            </div>
            <div className="message-meta">
              <div className="meta-item">
                <strong>Người gửi:</strong> {message.sender.fullName}
              </div>
              <div className="meta-item">
                <strong>Ngày gửi:</strong> {formatDateTime(message.createdAt)}
              </div>
              {message.deadline && (
                <div className="meta-item">
                  <strong>{t('deadlineLabel')}</strong> {formatDateTime(message.deadline)}
                  {message.lockResponseAfterDeadline && (
                    <span style={{ color: '#dc2626', marginLeft: '10px' }}>
                      (Khóa phản hồi sau hết hạn)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {message.attachments && message.attachments.length > 0 && (
            <div className="attachments-section">
              <strong>File đính kèm:</strong>
              <div className="attachments-list">
                {message.attachments.map((file: string, index: number) => (
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

          <div className="message-detail-content">
            {message.content}
          </div>

          {/* Phản ứng */}
          {message.reactions && message.reactions.length > 0 && (() => {
            const reactionsByType = getReactionsByType();
            const reactionTypes = Object.keys(reactionsByType);
            
            if (reactionTypes.length === 0) return null;
            
            return (
              <div className="message-reactions-display">
                {reactionTypes.map((reactionType) => {
                  const reactions = reactionsByType[reactionType];
                  return (
                    <button 
                      key={reactionType}
                      className="reaction-icon-btn"
                      onClick={() => {
                        setSelectedReaction(reactionType);
                        setShowReactionModal(true);
                      }}
                      title={`${reactions.length} người đã ${REACTION_LABELS[reactionType] || reactionType}`}
                    >
                      <span className="reaction-icon">{REACTION_ICONS[reactionType] || '👍'}</span>
                      <span className="reaction-count">{reactions.length}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div className="recipients-status-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4>Trạng thái người nhận ({message.recipients.length}):</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-remind-manual"
                  onClick={() => handleManualReminder('unread')}
                  title="Nhắc nhở học sinh chưa đọc"
                >
                  🔔 Nhắc nhở: Chưa đọc
                </button>
                <button
                  className="btn-remind-manual"
                  onClick={() => handleManualReminder('read_no_reply')}
                  title="Nhắc nhở học sinh đã đọc nhưng chưa phản hồi"
                >
                  🔔 Nhắc nhở: Đã đọc nhưng chưa phản hồi
                </button>
              </div>
            </div>
            <div className="recipients-status-table">
              <table className="status-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Phản hồi</th>
                  </tr>
                </thead>
                <tbody>
                  {message.recipients.map((recipient: any) => {
                    const responseStatus = getResponseStatus(recipient._id);
                    return (
                      <tr key={recipient._id}>
                        <td>{recipient.fullName}</td>
                        <td>{recipient.email}</td>
                        <td>
                          <span className={`status-badge ${getReadStatus(recipient._id) ? 'read' : 'unread'}`}>
                            {getReadStatus(recipient._id) ? 'Đã đọc' : 'Chưa đọc'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${
                            responseStatus === 'Đã phản hồi' ? 'read' : 
                            responseStatus === 'Nộp muộn' ? 'late' : 
                            'unread'
                          }`}>
                            {responseStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(() => {
            const repliesByRecipient: { [key: string]: any[] } = {};
            
            replies.forEach((reply: any) => {
              const senderId = typeof reply.sender === 'object' && reply.sender?._id 
                ? reply.sender._id.toString() 
                : reply.sender?.toString() || reply.sender;
              if (!repliesByRecipient[senderId]) {
                repliesByRecipient[senderId] = [];
              }
              repliesByRecipient[senderId].push(reply);
            });
            
            // Lấy danh sách học sinh có phản hồi (chỉ replies)
            const studentsWithResponses = message.recipients.filter((recipient: any) => {
              const recipientId = recipient._id?.toString() || recipient._id;
              return repliesByRecipient[recipientId]?.length > 0;
            });
            
            // Ẩn phần "Phản hồi từ học sinh: Không có phản hồi" nếu tất cả học sinh đều chưa phản hồi
            if (studentsWithResponses.length === 0) {
              return null;
            }
            
            return studentsWithResponses.map((recipient: any) => {
              const recipientId = recipient._id?.toString() || recipient._id;
              const recipientReplies = repliesByRecipient[recipientId] || [];
              
              if (recipientReplies.length === 0) return null;
              
              return (
                <div key={recipient._id} className="student-responses-section">
                  <h4>Phản hồi từ học sinh {recipient.fullName}</h4>
                  <div className="responses-content">
                    <div className="replies-group">
                      <h5>Trả lời:</h5>
                      {recipientReplies.map((reply: any) => {
                        const isEdited = reply.updatedAt && new Date(reply.updatedAt).getTime() !== new Date(reply.createdAt).getTime();
                        return (
                          <div key={reply._id} className="recipient-response-item">
                            <div className="response-time-header">
                              <span className="response-time">
                                {formatDateTime(reply.createdAt)}
                                {isEdited && (
                                  <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontStyle: 'italic' }}>
                                    (Đã chỉnh sửa)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="response-content reply-content">
                              {reply.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Modal hiển thị danh sách người đã react */}
      {showReactionModal && selectedReaction && (() => {
        const reactionsByType = getReactionsByType();
        const reactions = reactionsByType[selectedReaction] || [];
        
        return (
          <div className="modal-overlay" onClick={() => setShowReactionModal(false)}>
            <div className="modal-content reaction-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {REACTION_LABELS[selectedReaction] || selectedReaction}
                </h3>
                <button className="modal-close" onClick={() => setShowReactionModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p className="reaction-count-text">
                  {reactions.length} người đã {REACTION_ICONS[selectedReaction]} {REACTION_TEXT_LABELS[selectedReaction] || selectedReaction}
                </p>
                <div className="reaction-users-list">
                  {reactions.map((reaction: any, index: number) => {
                    const user = typeof reaction.userId === 'object' && reaction.userId
                      ? reaction.userId
                      : null;
                    const userName = user?.fullName || 'Không xác định';
                    const userInitial = userName.charAt(0).toUpperCase();
                    return (
                      <div key={index} className="reaction-user-item">
                        <div 
                          className="user-avatar-small" 
                          style={{ background: getAvatarColor(userName) }}
                        >
                          {userInitial}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{userName}</div>
                        </div>
                        <div className="reaction-time">
                          {formatDateTime(reaction.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// Change Password Modal Component (reuse from AdminPage)
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });
      alert('Đổi mật khẩu thành công!');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Đổi mật khẩu</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPassword">Mật khẩu cũ:</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">Mật khẩu mới:</label>
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
            <label htmlFor="confirmPassword">Nhập lại mật khẩu mới:</label>
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
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Teacher Profile Section Component
function TeacherProfileSection({ 
  profile, 
  loading, 
  error, 
  onUpdate 
}: { 
  profile: any; 
  classes?: any[]; 
  loading: boolean; 
  error: string; 
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    avatar: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    notificationSettings: {
      email: true,
      app: true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        avatar: profile.avatar || '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: profile.gender || '',
        phone: profile.phone || '',
        notificationSettings: {
          email: profile.notificationSettings?.email ?? true,
          app: profile.notificationSettings?.app ?? true,
        },
      });
      setAvatarPreview(profile.avatar || null);
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Kiểm tra kích thước file (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    // Preview ảnh trước khi upload
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('files', file);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.urls && response.data.urls.length > 0) {
        const avatarUrl = response.data.urls[0];
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
        setAvatarPreview(avatarUrl);
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      alert(err.response?.data?.message || 'Lỗi khi upload ảnh');
      setAvatarPreview(formData.avatar || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/teacher/profile`, formData);
      setEditing(false);
      onUpdate();
      alert('Cập nhật profile thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!profile) {
    return <div className="no-data">Không có thông tin profile</div>;
  }

  return (
    <div className="profile-section">
      <div className="profile-header">
        <h2 className="section-title">Hồ sơ cá nhân</h2>
        {!editing && (
          <button className="btn-edit-profile" onClick={() => setEditing(true)}>
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="profile-content">
        {/* Thông tin cơ bản */}
        <div className="profile-section-card">
          <h3 className="profile-section-title">Thông tin cơ bản</h3>
          <div className="profile-basic-info-wrapper">
            <div className="avatar-section-column">
              <div className="avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {profile.fullName?.charAt(0).toUpperCase() || 'T'}
                  </div>
                )}
              </div>
              {editing && (
                <div className="avatar-upload-wrapper">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="avatar-file-input"
                  />
                  <label htmlFor="avatar-upload" className="avatar-upload-label">
                    {uploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh đại diện'}
                  </label>
                </div>
              )}
            </div>
            <div className="profile-basic-info">
              <div className="profile-info-row">
                <label>Họ và tên:</label>
                <span className="readonly-field">{profile.fullName}</span>
              </div>
              {editing ? (
                <div className="profile-info-row">
                  <label>Ngày sinh:</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              ) : (
                <div className="profile-info-row">
                  <label>Ngày sinh:</label>
                  <span>
                    {profile.dateOfBirth 
                      ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN')
                      : '-'}
                  </span>
                </div>
              )}
              {editing ? (
                <div className="profile-info-row">
                  <label>Giới tính:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              ) : (
                <div className="profile-info-row">
                  <label>Giới tính:</label>
                  <span>
                    {profile.gender === 'male' ? 'Nam' : 
                     profile.gender === 'female' ? 'Nữ' : 
                     profile.gender === 'other' ? 'Khác' : '-'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thông tin liên lạc */}
        <div className="profile-section-card">
          <h3 className="profile-section-title">Thông tin liên lạc</h3>
          <div className="profile-info-row">
            <label>Email:</label>
            <span className="readonly-field">{profile.email}</span>
          </div>
          {editing ? (
            <div className="profile-info-row">
              <label>Số điện thoại:</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>
          ) : (
            <div className="profile-info-row">
              <label>Số điện thoại:</label>
              <span>{profile.phone || '-'}</span>
            </div>
          )}
        </div>

        {editing && (
          <div className="profile-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setEditing(false);
                setFormData({
                  avatar: profile.avatar || '',
                  dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
                  gender: profile.gender || '',
                  phone: profile.phone || '',
                  notificationSettings: {
                    email: profile.notificationSettings?.email ?? true,
                    app: profile.notificationSettings?.app ?? true,
                  },
                });
                setAvatarPreview(profile.avatar || null);
              }}
            >
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}