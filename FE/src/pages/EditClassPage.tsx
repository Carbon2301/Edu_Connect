import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import './EditClassPage.css';

const API_URL = 'http://localhost:5000/api';

interface Student {
  _id: string;
  fullName: string;
  email: string;
  class?: string;
}

interface ClassData {
  _id: string;
  name: string;
  description?: string;
  teacher: {
    _id: string;
    fullName: string;
    email: string;
  };
  students: Student[];
}

export default function EditClassPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
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
    if (id) {
      fetchClassData();
      fetchAvailableStudents();
    }
  }, [id]);

  const fetchClassData = async () => {
    try {
      setLoadingData(true);
      const response = await axios.get(`${API_URL}/teacher/classes/${id}`);
      const data = response.data.class;
      setClassData(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setSelectedStudents(data.students || []);
    } catch (err: any) {
      console.error('Error fetching class:', err);
      const errorMsg = t('cannotLoadClassInfo');
      showToast(errorMsg, 'error');
      setTimeout(() => {
        navigate('/teacher');
      }, 1000);
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
        setError(t('classNameRequired'));
        setLoading(false);
        return;
      }

      const studentIds = selectedStudents.map(s => s._id);

      await axios.put(`${API_URL}/teacher/classes/${id}`, {
        name: name.trim(),
        description: description.trim(),
        students: studentIds,
      });

      showToast(t('updateClassSuccess'), 'success');
      setTimeout(() => {
        navigate('/teacher');
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || t('updateClassError');
      setError(errorMsg);
      showToast(errorMsg, 'error');
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
    return (
      <div className="edit-class-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="edit-class-page">
        <div className="error-message">Không tìm thấy lớp học</div>
      </div>
    );
  }

  return (
    <div className="edit-class-page">
      <div className="edit-class-header">
        <button className="btn-back" onClick={() => navigate('/teacher')}>
          ← Quay lại
        </button>
        <h1 className="page-title">Sửa lớp học</h1>
      </div>

      <div className="edit-class-content">
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
              onClick={() => navigate('/teacher')}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

