import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import './ClassDetailPage.css';

const API_URL = 'http://localhost:5000/api';

interface Student {
  _id: string;
  fullName: string;
  email: string;
  class?: string;
  mssv?: string;
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
  const { t } = useLanguage();
  const { showToast } = useToast();
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
      const errorMsg = t('cannotLoadClassInfo');
      showToast(errorMsg, 'error');
      setTimeout(() => {
        navigate('/teacher');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="class-detail-page">
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="class-detail-page">
        <div className="error-message">{t('classNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="class-detail-page">
      <div className="class-detail-header">
        <button className="btn-back" onClick={() => navigate('/teacher')}>
          ← {t('back')}
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
          <h2 className="section-title">{t('studentList')} ({classData.students.length})</h2>
        </div>

        {classData.students.length === 0 ? (
          <div className="no-data">{t('noStudentsInClass')}</div>
        ) : (
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>{t('studentName')}</th>
                  <th>{t('studentId')}</th>
                  <th>{t('email')}</th>
                  <th>{t('actions')}</th>
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
                    <td>{student.mssv || '—'}</td>
                    <td>{student.email}</td>
                    <td>
                      <button
                        className="btn-send"
                        onClick={() => navigate(`/teacher/messages/create?student=${student._id}`)}
                      >
                        {t('sendMessage')}
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

