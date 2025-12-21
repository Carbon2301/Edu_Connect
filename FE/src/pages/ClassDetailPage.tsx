import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ClassDetailPage.css';

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

export default function ClassDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClassDetail();
    }
  }, [id]);

  const fetchClassDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/teacher/classes/${id}`);
      setClassData(response.data.class);
    } catch (err: any) {
      console.error('Error fetching class detail:', err);
      alert('Không thể tải thông tin lớp học');
      navigate('/teacher');
    } finally {
      setLoading(false);
    }
  };

  const getStudentLastMessageStatus = (studentId: string) => {
    // TODO: Lấy trạng thái tin nhắn mới nhất của học sinh
    return '未読'; // Tạm thời trả về "未読" (chưa đọc)
  };

  if (loading) {
    return (
      <div className="class-detail-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="class-detail-page">
        <div className="error-message">Không tìm thấy lớp học</div>
      </div>
    );
  }

  return (
    <div className="class-detail-page">
      <div className="class-detail-header">
        <button className="btn-back" onClick={() => navigate('/teacher')}>
          ← Quay lại
        </button>
        <div className="class-info">
          <h1 className="class-name">{classData.name}</h1>
          {classData.description && (
            <p className="class-description">{classData.description}</p>
          )}
        </div>
      </div>

      <div className="students-section">
        <div className="section-header">
          <h2 className="section-title">Danh sách học sinh ({classData.students.length})</h2>
        </div>

        {classData.students.length === 0 ? (
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
                {classData.students.map((student) => (
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
                        onClick={() => navigate(`/teacher/messages/create?student=${student._id}`)}
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
  );
}

