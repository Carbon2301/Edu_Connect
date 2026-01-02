import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

/**
 * Phân tích tiêu đề và nội dung tin nhắn để xác định loại tin nhắn
 * và đưa ra 3 gợi ý trả lời phù hợp
 */
function analyzeMessageAndGenerateFallback(
  messageTitle: string,
  messageContent: string,
  language: 'vi' | 'ja' = 'ja'
): { replies: string[]; reactions: string[] } {
  const title = messageTitle.toLowerCase();
  const content = messageContent.toLowerCase();
  const combined = `${title} ${content}`;

  // Phân loại tin nhắn dựa trên từ khóa - Phân tích chi tiết và toàn diện
  
  // === BÀI TẬP & DEADLINE ===
  const isAssignment = combined.includes('bài tập') || combined.includes('assignment') || 
                       combined.includes('宿題') || combined.includes('課題') || 
                       combined.includes('homework') || combined.includes('nộp bài') ||
                       combined.includes('bài làm') || combined.includes('bài thực hành') ||
                       combined.includes('レポート') || combined.includes('report') ||
                       combined.includes('project') || combined.includes('dự án');
  
  const isDeadline = combined.includes('deadline') || combined.includes('hạn chót') || 
                     combined.includes('hạn nộp') || combined.includes('thời hạn') ||
                     combined.includes('締切') || combined.includes('期限') ||
                     combined.includes('hạn cuối') || combined.includes('due date') ||
                     combined.includes('due') || combined.includes('nộp trước');
  
  // === CUỘC HỌP & SỰ KIỆN ===
  const isMeeting = combined.includes('họp') || combined.includes('meeting') || 
                    combined.includes('会議') || combined.includes('ミーティング') ||
                    combined.includes('hội thảo') || combined.includes('seminar') ||
                    combined.includes('セミナー') || combined.includes('workshop') ||
                    combined.includes('ワークショップ') || combined.includes('buổi họp');
  
  const isEvent = combined.includes('sự kiện') || combined.includes('event') || 
                  combined.includes('イベント') || combined.includes('hoạt động') ||
                  combined.includes('活動') || combined.includes('chương trình') ||
                  combined.includes('program') || combined.includes('プログラム');
  
  // === LỊCH & THỜI GIAN ===
  const isSchedule = combined.includes('lịch') || combined.includes('schedule') || 
                     combined.includes('thời khóa biểu') || combined.includes('時間割') ||
                     combined.includes('calendar') || combined.includes('カレンダー') ||
                     combined.includes('lịch học') || combined.includes('timetable') ||
                     combined.includes('thời gian') || combined.includes('時間');
  
  const isHoliday = combined.includes('nghỉ') || combined.includes('holiday') || 
                    combined.includes('休日') || combined.includes('休み') ||
                    combined.includes('nghỉ học') || combined.includes('nghỉ lễ') ||
                    combined.includes('holiday') || combined.includes('day off');
  
  // === THI & KIỂM TRA ===
  const isExam = combined.includes('thi') || combined.includes('exam') || 
                 combined.includes('kiểm tra') || combined.includes('test') ||
                 combined.includes('試験') || combined.includes('テスト') ||
                 combined.includes('đề thi') || combined.includes('bài thi') ||
                 combined.includes('kiểm tra giữa kỳ') || combined.includes('midterm') ||
                 combined.includes('thi cuối kỳ') || combined.includes('final exam') ||
                 combined.includes('期末試験') || combined.includes('中間試験');
  
  const isGrade = combined.includes('điểm') || combined.includes('grade') || 
                  combined.includes('成績') || combined.includes('kết quả') ||
                  combined.includes('result') || combined.includes('結果') ||
                  combined.includes('điểm số') || combined.includes('đánh giá') ||
                  combined.includes('評価') || combined.includes('marking');
  
  // === CÂU HỎI & THẮC MẮC ===
  const isQuestion = combined.includes('câu hỏi') || combined.includes('question') || 
                     combined.includes('thắc mắc') || combined.includes('質問') ||
                     combined.includes('hỏi') || combined.includes('疑問') ||
                     combined.includes('thắc mắc') || combined.includes('inquiry') ||
                     combined.includes('問い合わせ') || combined.includes('giải đáp');
  
  // === YÊU CẦU & ĐỀ NGHỊ ===
  const isRequest = combined.includes('yêu cầu') || combined.includes('request') || 
                    combined.includes('nhờ') || combined.includes('依頼') ||
                    combined.includes('xin') || combined.includes('お願い') ||
                    combined.includes('đề nghị') || combined.includes('suggest') ||
                    combined.includes('提案') || combined.includes('nộp bổ sung') ||
                    combined.includes('bổ sung') || combined.includes('supplement');
  
  // === THÔNG BÁO & THÔNG TIN ===
  const isAnnouncement = combined.includes('thông báo') || combined.includes('announcement') || 
                         combined.includes('通知') || combined.includes('お知らせ') ||
                         combined.includes('thông báo chung') || combined.includes('general announcement');
  
  const isInformation = combined.includes('thông tin') || combined.includes('information') || 
                        combined.includes('情報') || combined.includes('info') ||
                        combined.includes('chi tiết') || combined.includes('details') ||
                        combined.includes('詳細') || combined.includes('cập nhật thông tin');
  
  // === NHẮC NHỞ ===
  const isReminder = combined.includes('nhắc nhở') || combined.includes('reminder') || 
                     combined.includes('リマインダー') || combined.includes('思い出させる') ||
                     combined.includes('nhắc') || combined.includes('remind') ||
                     combined.includes('lưu ý') || combined.includes('note') ||
                     combined.includes('注意') || combined.includes('cảnh báo') ||
                     combined.includes('warning') || combined.includes('警告');
  
  // === CẢM ƠN & KHEN NGỢI ===
  const isThankYou = combined.includes('cảm ơn') || combined.includes('thank') || 
                     combined.includes('ありがとう') || combined.includes('感謝') ||
                     combined.includes('thanks') || combined.includes('appreciate') ||
                     combined.includes('感謝') || combined.includes('biết ơn');
  
  const isPraise = combined.includes('khen') || combined.includes('praise') || 
                   combined.includes('褒める') || combined.includes('tốt') ||
                   combined.includes('good') || combined.includes('excellent') ||
                   combined.includes('素晴らしい') || combined.includes('xuất sắc') ||
                   combined.includes('chúc mừng') || combined.includes('congratulations') ||
                   combined.includes('おめでとう') || combined.includes('tuyệt vời');
  
  // === KHẨN CẤP & QUAN TRỌNG ===
  const isUrgent = combined.includes('khẩn cấp') || combined.includes('urgent') || 
                   combined.includes('gấp') || combined.includes('緊急') ||
                   combined.includes('asap') || combined.includes('ngay lập tức') ||
                   combined.includes('immediately') || combined.includes('すぐに') ||
                   combined.includes('quan trọng') || combined.includes('important') ||
                   combined.includes('重要') || combined.includes('priority');
  
  // === THAY ĐỔI & CẬP NHẬT ===
  const isChange = combined.includes('thay đổi') || combined.includes('change') || 
                   combined.includes('変更') || combined.includes('đổi') ||
                   combined.includes('cập nhật') || combined.includes('update') ||
                   combined.includes('更新') || combined.includes('thay') ||
                   combined.includes('đổi lịch') || combined.includes('reschedule') ||
                   combined.includes('日程変更') || combined.includes('thay đổi phòng') ||
                   combined.includes('room change') || combined.includes('教室変更');
  
  // === XÁC NHẬN ===
  const isConfirmation = combined.includes('xác nhận') || combined.includes('confirm') || 
                         combined.includes('確認') || combined.includes('xác nhận tham gia') ||
                         combined.includes('confirm attendance') || combined.includes('出席確認');
  
  // === HỦY BỎ ===
  const isCancellation = combined.includes('hủy') || combined.includes('cancel') || 
                         combined.includes('キャンセル') || combined.includes('取消') ||
                         combined.includes('hủy bỏ') || combined.includes('canceled') ||
                         combined.includes('中止') || combined.includes('không diễn ra');
  
  // === PHÊ DUYỆT & CHẤP NHẬN ===
  const isApproval = combined.includes('đồng ý') || combined.includes('approve') || 
                     combined.includes('承認') || combined.includes('chấp nhận') ||
                     combined.includes('approved') || combined.includes('accepted') ||
                     combined.includes('承認済み') || combined.includes('được phê duyệt') ||
                     combined.includes('duyệt') || combined.includes('permission granted');
  
  const isRejection = combined.includes('từ chối') || combined.includes('reject') || 
                      combined.includes('拒否') || combined.includes('không đồng ý') ||
                      combined.includes('rejected') || combined.includes('denied') ||
                      combined.includes('拒否されました') || combined.includes('bị từ chối');
  
  // === TÀI LIỆU & TÀI NGUYÊN ===
  const isDocument = combined.includes('tài liệu') || combined.includes('document') || 
                     combined.includes('資料') || combined.includes('file') ||
                     combined.includes('ファイル') || combined.includes('material') ||
                     combined.includes('教材') || combined.includes('handout') ||
                     combined.includes('配布資料') || combined.includes('slide') ||
                     combined.includes('スライド') || combined.includes('presentation');
  
  const isResource = combined.includes('tài nguyên') || combined.includes('resource') || 
                     combined.includes('リソース') || combined.includes('học liệu') ||
                     combined.includes('learning material') || combined.includes('学習資料');
  
  // === ĐIỂM SỐ & PHẢN HỒI ===
  const isFeedback = combined.includes('phản hồi') || combined.includes('feedback') || 
                     combined.includes('フィードバック') || combined.includes('nhận xét') ||
                     combined.includes('comment') || combined.includes('コメント') ||
                     combined.includes('đánh giá') || combined.includes('evaluation') ||
                     combined.includes('評価') || combined.includes('review');
  
  // === GIA HẠN ===
  const isExtension = combined.includes('gia hạn') || combined.includes('extension') || 
                      combined.includes('延長') || combined.includes('prorogue') ||
                      combined.includes('延長する') || combined.includes('cho thêm thời gian') ||
                      combined.includes('give more time') || combined.includes('thêm thời gian');
  
  // === LỖI & KHẮC PHỤC ===
  const isError = combined.includes('lỗi') || combined.includes('error') || 
                  combined.includes('エラー') || combined.includes('sai sót') ||
                  combined.includes('mistake') || combined.includes('間違い') ||
                  combined.includes('khắc phục') || combined.includes('fix') ||
                  combined.includes('修正') || combined.includes('correction');
  
  // === HỌC PHÍ & TÀI CHÍNH ===
  const isTuition = combined.includes('học phí') || combined.includes('tuition') || 
                    combined.includes('学費') || combined.includes('fee') ||
                    combined.includes('費用') || combined.includes('payment') ||
                    combined.includes('支払い') || combined.includes('thanh toán') ||
                    combined.includes('học bổng') || combined.includes('scholarship') ||
                    combined.includes('奨学金') || combined.includes('financial aid');
  
  // === TUYỂN SINH & ĐĂNG KÝ ===
  const isEnrollment = combined.includes('tuyển sinh') || combined.includes('enrollment') || 
                       combined.includes('入学') || combined.includes('đăng ký') ||
                       combined.includes('registration') || combined.includes('登録') ||
                       combined.includes('đăng ký học') || combined.includes('course registration') ||
                       combined.includes('科目登録') || combined.includes('chọn môn');
  
  // === THỰC TẬP & DỰ ÁN ===
  const isInternship = combined.includes('thực tập') || combined.includes('internship') || 
                       combined.includes('インターンシップ') || combined.includes('intern') ||
                       combined.includes('thực hành') || combined.includes('practice') ||
                       combined.includes('実習') || combined.includes('fieldwork');
  
  const isProject = combined.includes('dự án') || combined.includes('project') || 
                   combined.includes('プロジェクト') || combined.includes('đồ án') ||
                   combined.includes('research') || combined.includes('研究') ||
                   combined.includes('nghiên cứu') || combined.includes('thesis') ||
                   combined.includes('論文') || combined.includes('luận văn');
  
  // === CÂU LẠC BỘ & HOẠT ĐỘNG NGOẠI KHÓA ===
  const isClub = combined.includes('câu lạc bộ') || combined.includes('club') || 
                 combined.includes('クラブ') || combined.includes('hoạt động ngoại khóa') ||
                 combined.includes('extracurricular') || combined.includes('課外活動') ||
                 combined.includes('tình nguyện') || combined.includes('volunteer') ||
                 combined.includes('ボランティア') || combined.includes('community service');
  
  // === CHUYẾN ĐI & THAM QUAN ===
  const isTrip = combined.includes('chuyến đi') || combined.includes('trip') || 
                 combined.includes('旅行') || combined.includes('tham quan') ||
                 combined.includes('field trip') || combined.includes('見学') ||
                 combined.includes('study tour') || combined.includes('研修旅行') ||
                 combined.includes('du lịch') || combined.includes('travel');
  
  // === CUỘC THI & GIẢI THƯỞNG ===
  const isContest = combined.includes('cuộc thi') || combined.includes('contest') || 
                    combined.includes('コンテスト') || combined.includes('competition') ||
                    combined.includes('競技') || combined.includes('giải thưởng') ||
                    combined.includes('award') || combined.includes('賞') ||
                    combined.includes('prize') || combined.includes('prize') ||
                    combined.includes('trophy') || combined.includes('トロフィー');
  
  // === TỐT NGHIỆP & CHỨNG CHỈ ===
  const isGraduation = combined.includes('tốt nghiệp') || combined.includes('graduation') || 
                       combined.includes('卒業') || combined.includes('certificate') ||
                       combined.includes('証明書') || combined.includes('bằng cấp') ||
                       combined.includes('degree') || combined.includes('学位') ||
                       combined.includes('diploma') || combined.includes('卒業証書');
  
  // === THỂ THAO & HOẠT ĐỘNG THỂ CHẤT ===
  const isSports = combined.includes('thể thao') || combined.includes('sports') || 
                   combined.includes('スポーツ') || combined.includes('thi đấu') ||
                   combined.includes('competition') || combined.includes('競技') ||
                   combined.includes('giải đấu') || combined.includes('tournament') ||
                   combined.includes('トーナメント') || combined.includes('thể dục');
  
  // === ĐIỂM DANH & CHUYÊN CẦN ===
  const isAttendance = combined.includes('điểm danh') || combined.includes('attendance') || 
                       combined.includes('出席') || combined.includes('点呼') ||
                       combined.includes('chuyên cần') || combined.includes('attendance check') ||
                       combined.includes('vắng mặt') || combined.includes('absent') ||
                       combined.includes('欠席') || combined.includes('có mặt') ||
                       combined.includes('present') || combined.includes('出席確認');
  
  // === GẶP GIÁO VIÊN & OFFICE HOURS ===
  const isOfficeHours = combined.includes('gặp') || combined.includes('meet') || 
                        combined.includes('面談') || combined.includes('面会') ||
                        combined.includes('office hours') || combined.includes('giờ làm việc') ||
                        combined.includes('相談') || combined.includes('consultation') ||
                        combined.includes('hẹn gặp') || combined.includes('appointment') ||
                        combined.includes('予約') || combined.includes('liên hệ gặp') ||
                        combined.includes('contact') || combined.includes('trao đổi');
  
  // === YÊU CẦU LÀM LẠI & NỘP LẠI ===
  const isResubmission = combined.includes('làm lại') || combined.includes('resubmit') || 
                         combined.includes('再提出') || combined.includes('やり直し') ||
                         combined.includes('nộp lại') || combined.includes('submit again') ||
                         combined.includes('sửa lại') || combined.includes('revise') ||
                         combined.includes('修正') || combined.includes('chỉnh sửa lại') ||
                         combined.includes('cải thiện') || combined.includes('improve') ||
                         combined.includes('改善') || combined.includes('làm lại bài');
  
  // === BẢO VỆ ĐỒ ÁN & LUẬN VĂN ===
  const isDefense = combined.includes('bảo vệ') || combined.includes('defense') || 
                    combined.includes('審査') || combined.includes('発表') ||
                    combined.includes('presentation') || combined.includes('thuyết trình') ||
                    combined.includes('bảo vệ đồ án') || combined.includes('thesis defense') ||
                    combined.includes('卒業論文') || combined.includes('bảo vệ luận văn') ||
                    combined.includes('hội đồng') || combined.includes('committee') ||
                    combined.includes('審査会') || combined.includes('phản biện');
  
  // === KHUYẾN KHÍCH & ĐỘNG VIÊN ===
  const isEncouragement = combined.includes('khuyến khích') || combined.includes('encourage') || 
                          combined.includes('励ます') || combined.includes('激励') ||
                          combined.includes('động viên') || combined.includes('motivate') ||
                          combined.includes('tiếp tục') || combined.includes('keep going') ||
                          combined.includes('頑張って') || combined.includes('cố gắng') ||
                          combined.includes('nỗ lực') || combined.includes('effort') ||
                          combined.includes('努力') || combined.includes('tiếp tục phát huy');
  
  // === CẢNH CÁO & KỶ LUẬT ===
  const isDiscipline = combined.includes('cảnh cáo') || combined.includes('warning') || 
                       combined.includes('警告') || combined.includes('注意喚起') ||
                       combined.includes('kỷ luật') || combined.includes('discipline') ||
                       combined.includes('vi phạm') || combined.includes('violation') ||
                       combined.includes('違反') || combined.includes('vi phạm quy định') ||
                       combined.includes('nhắc nhở nghiêm') || combined.includes('serious reminder') ||
                       combined.includes('厳重注意') || combined.includes('phải chú ý');
  
  // === THÔNG BÁO NGHỈ ĐỘT XUẤT ===
  const isEmergencyCancel = combined.includes('nghỉ đột xuất') || combined.includes('emergency cancel') || 
                            combined.includes('急遽中止') || combined.includes('緊急中止') ||
                            combined.includes('hủy đột xuất') || combined.includes('đột xuất') ||
                            combined.includes('khẩn cấp hủy') || combined.includes('cancel immediately') ||
                            combined.includes('nghỉ học đột xuất') || combined.includes('sudden cancellation') ||
                            combined.includes('緊急') || combined.includes('thông báo khẩn');
  
  // === BÀI TẬP NHÓM ===
  const isGroupWork = combined.includes('nhóm') || combined.includes('group') || 
                      combined.includes('グループ') || combined.includes('team') ||
                      combined.includes('làm nhóm') || combined.includes('group work') ||
                      combined.includes('group project') || combined.includes('dự án nhóm') ||
                      combined.includes('グループワーク') || combined.includes('teamwork') ||
                      combined.includes('phân nhóm') || combined.includes('team assignment') ||
                      combined.includes('チーム') || combined.includes('làm việc nhóm');
  
  // === CÔNG BỐ ĐIỂM & CHẤM ĐIỂM ===
  const isGradePublication = combined.includes('công bố điểm') || combined.includes('grade publication') || 
                             combined.includes('成績発表') || combined.includes('点数の公表') ||
                             combined.includes('chấm điểm') || combined.includes('grading') ||
                             combined.includes('採点') || combined.includes('điểm đã chấm') ||
                             combined.includes('kết quả chấm') || combined.includes('graded results') ||
                             combined.includes('điểm số') || combined.includes('score') ||
                             combined.includes('得点') || combined.includes('bảng điểm');
  
  // === YÊU CẦU BỔ SUNG & BỔ KHUYẾT ===
  const isSupplementary = combined.includes('bổ sung') || combined.includes('supplementary') || 
                          combined.includes('補足') || combined.includes('追加') ||
                          combined.includes('bổ khuyết') || combined.includes('make up') ||
                          combined.includes('補講') || combined.includes('nộp bổ sung') ||
                          combined.includes('bài bổ sung') || combined.includes('additional work') ||
                          combined.includes('追加課題') || combined.includes('thi bổ sung') ||
                          combined.includes('makeup exam') || combined.includes('追試験');
  
  // === THÔNG BÁO ĐIỂM THI ===
  const isExamResults = combined.includes('kết quả thi') || combined.includes('exam results') || 
                        combined.includes('試験結果') || combined.includes('テスト結果') ||
                        combined.includes('điểm thi') || combined.includes('test scores') ||
                        combined.includes('kết quả kiểm tra') || combined.includes('check results') ||
                        combined.includes('điểm số bài thi') || combined.includes('exam scores') ||
                        combined.includes('テストの点数') || combined.includes('thông báo điểm');
  
  // === YÊU CẦU SỬA LỖI & CHỈNH SỬA ===
  const isCorrectionRequest = combined.includes('sửa lỗi') || combined.includes('correct errors') || 
                              combined.includes('誤りを修正') || combined.includes('修正依頼') ||
                              combined.includes('chỉnh sửa') || combined.includes('edit') ||
                              combined.includes('訂正') || combined.includes('sửa chữa') ||
                              combined.includes('sửa lại cho đúng') || combined.includes('fix mistakes') ||
                              combined.includes('間違いを直す') || combined.includes('cần sửa');
  
  // === LỚP HỌC THÊM & BỒI DƯỠNG ===
  const isExtraClass = combined.includes('lớp học thêm') || combined.includes('extra class') || 
                       combined.includes('補習') || combined.includes('追加授業') ||
                       combined.includes('bồi dưỡng') || combined.includes('tutoring') ||
                       combined.includes('phụ đạo') || combined.includes('remedial') ||
                       combined.includes('補講') || combined.includes('học thêm') ||
                       combined.includes('追加クラス') || combined.includes('buổi học bổ sung');
  
  // === YÊU CẦU PHẢN HỒI ===
  const isFeedbackRequest = combined.includes('xin phản hồi') || combined.includes('request feedback') || 
                            combined.includes('フィードバック依頼') || combined.includes('意見を聞く') ||
                            combined.includes('yêu cầu phản hồi') || combined.includes('need feedback') ||
                            combined.includes('mong nhận phản hồi') || combined.includes('feedback needed') ||
                            combined.includes('ご意見') || combined.includes('cho ý kiến') ||
                            combined.includes('opinion') || combined.includes('đánh giá');
  
  // === CÂU HỎI YÊU CẦU PHẢN HỒI (参加できますか？返信をお願いします) ===
  // Kiểm tra cả title và content riêng biệt để phát hiện tốt hơn
  const titleLower = messageTitle.toLowerCase();
  const contentLower = messageContent.toLowerCase();
  const isParticipationQuestion = 
    // Câu hỏi trực tiếp về tham gia
    combined.includes('参加できますか') || combined.includes('参加できます') ||
    contentLower.includes('参加できますか') || contentLower.includes('参加できます') ||
    // Yêu cầu phản hồi
    combined.includes('返信をお願い') || combined.includes('返信してください') ||
    contentLower.includes('返信をお願い') || contentLower.includes('返信してください') ||
    // Tiếng Việt
    combined.includes('tham gia được không') || combined.includes('có thể tham gia') ||
    contentLower.includes('tham gia được không') || contentLower.includes('có thể tham gia') ||
    // Câu hỏi với dấu hỏi
    (contentLower.includes('có thể') && (contentLower.includes('?') || contentLower.includes('？'))) ||
    contentLower.includes('được không') || contentLower.includes('có được không') ||
    // Các từ khóa yêu cầu phản hồi
    (contentLower.includes('返信') && (contentLower.includes('お願い') || contentLower.includes('ください'))) ||
    (contentLower.includes('phản hồi') && (contentLower.includes('vui lòng') || contentLower.includes('xin'))) ||
    contentLower.includes('trả lời') && (contentLower.includes('vui lòng') || contentLower.includes('xin'));
  
  // === KẾ HOẠCH HỌC TẬP & CHƯƠNG TRÌNH ===
  const isStudyPlan = combined.includes('kế hoạch học tập') || combined.includes('study plan') || 
                      combined.includes('学習計画') || combined.includes('カリキュラム') ||
                      combined.includes('chương trình học') || combined.includes('curriculum') ||
                      combined.includes('lộ trình') || combined.includes('roadmap') ||
                      combined.includes('計画') || combined.includes('lịch trình học tập') ||
                      combined.includes('学習スケジュール') || combined.includes('học tập');
  
  // === THÔNG BÁO TÀI LIỆU MỚI ===
  const isNewMaterial = combined.includes('tài liệu mới') || combined.includes('new material') || 
                        combined.includes('新しい資料') || combined.includes('新教材') ||
                        combined.includes('tài liệu bổ sung') || combined.includes('additional material') ||
                        combined.includes('追加資料') || combined.includes('tài liệu học tập mới') ||
                        combined.includes('bài giảng mới') || combined.includes('new lecture') ||
                        combined.includes('新講義') || combined.includes('slide mới');
  
  // === YÊU CẦU THAM GIA HOẠT ĐỘNG ===
  const isActivityInvitation = combined.includes('mời tham gia') || combined.includes('invite to join') || 
                               combined.includes('参加招待') || combined.includes('参加を促す') ||
                               combined.includes('yêu cầu tham gia') || combined.includes('participation required') ||
                               combined.includes('tham gia bắt buộc') || combined.includes('mandatory participation') ||
                               combined.includes('必須参加') || combined.includes('mong tham gia') ||
                               combined.includes('hope you join') || combined.includes('参加希望');
  
  // === THÔNG BÁO THAY ĐỔI ĐỊA ĐIỂM ===
  const isLocationChange = combined.includes('đổi địa điểm') || combined.includes('location change') || 
                           combined.includes('場所変更') || combined.includes('会場変更') ||
                           combined.includes('thay đổi địa điểm') || combined.includes('change venue') ||
                           combined.includes('đổi phòng') || combined.includes('room change') ||
                           combined.includes('教室変更') || combined.includes('chuyển phòng') ||
                           combined.includes('relocate') || combined.includes('新しい場所');
  
  // === YÊU CẦU XÁC NHẬN NHẬN ĐƯỢC ===
  const isReceiptConfirmation = combined.includes('xác nhận đã nhận') || combined.includes('confirm receipt') || 
                                combined.includes('受領確認') || combined.includes('受け取り確認') ||
                                combined.includes('xác nhận nhận được') || combined.includes('acknowledge receipt') ||
                                combined.includes('xác nhận đã đọc') || combined.includes('read confirmation') ||
                                combined.includes('既読確認') || combined.includes('確認してください');
  
  // === THÔNG BÁO HOÃN & DỜI LỊCH ===
  const isPostponement = combined.includes('hoãn') || combined.includes('postpone') || 
                         combined.includes('延期') || combined.includes('順延') ||
                         combined.includes('dời lịch') || combined.includes('reschedule') ||
                         combined.includes('lùi lại') || combined.includes('delay') ||
                         combined.includes('遅延') || combined.includes('tạm hoãn') ||
                         combined.includes('temporary postpone') || combined.includes('一時延期');

  // === YÊU CẦU GIẢI THÍCH VẮNG MẶT ===
  const isAbsenceExplanation = combined.includes('giải thích vắng') || combined.includes('explain absence') || 
                               combined.includes('欠席理由') || combined.includes('欠席説明') ||
                               combined.includes('lý do vắng') || combined.includes('tại sao vắng') ||
                               combined.includes('why absent') || combined.includes('không đi học') ||
                               combined.includes('なぜ休んだ') || combined.includes('結席の理由') ||
                               combined.includes('vắng không phép') || combined.includes('unauthorized absence');

  // === HỌP PHỤ HUYNH ===
  const isParentMeeting = combined.includes('họp phụ huynh') || combined.includes('parent meeting') || 
                          combined.includes('保護者会') || combined.includes('父母会') ||
                          combined.includes('parent-teacher conference') || combined.includes('面談') ||
                          combined.includes('gặp phụ huynh') || combined.includes('meet parents') ||
                          combined.includes('家族') || combined.includes('gia đình');

  // === BÁO CÁO TÌNH HÌNH HỌC TẬP ===
  const isProgressReport = combined.includes('báo cáo học tập') || combined.includes('progress report') || 
                           combined.includes('学習報告') || combined.includes('成績報告') ||
                           combined.includes('tình hình học tập') || combined.includes('academic progress') ||
                           combined.includes('学習状況') || combined.includes('tiến độ học tập') ||
                           combined.includes('study progress') || combined.includes('学業成績') ||
                           combined.includes('kết quả học tập') || combined.includes('academic performance');

  // === KHẢO SÁT & SURVEY ===
  const isSurvey = combined.includes('khảo sát') || combined.includes('survey') || 
                   combined.includes('アンケート') || combined.includes('調査') ||
                   combined.includes('đánh giá') || combined.includes('evaluation') ||
                   combined.includes('設問') || combined.includes('feedback form') ||
                   combined.includes('ý kiến') || combined.includes('opinion') ||
                   combined.includes('意見') || combined.includes('phiếu khảo sát');

  // === THAY ĐỔI GIÁO VIÊN ===
  const isTeacherChange = combined.includes('thay giáo viên') || combined.includes('teacher change') || 
                          combined.includes('教師変更') || combined.includes('先生が変わ') ||
                          combined.includes('giáo viên mới') || combined.includes('new teacher') ||
                          combined.includes('新しい先生') || combined.includes('đổi giáo viên') ||
                          combined.includes('thay thầy') || combined.includes('thay cô') ||
                          combined.includes('教員交代') || combined.includes('giáo viên thay thế');

  // === CẬP NHẬT THÔNG TIN CÁ NHÂN ===
  const isPersonalInfoUpdate = combined.includes('cập nhật thông tin') || combined.includes('update information') || 
                               combined.includes('情報更新') || combined.includes('個人情報') ||
                               combined.includes('thông tin cá nhân') || combined.includes('personal information') ||
                               combined.includes('profile update') || combined.includes('プロフィール更新') ||
                               combined.includes('cập nhật profile') || combined.includes('update profile') ||
                               combined.includes('確認してください') || combined.includes('kiểm tra thông tin');

  // === THI LẠI & HỌC LẠI ===
  const isRetakeExam = combined.includes('thi lại') || combined.includes('retake exam') || 
                       combined.includes('再試験') || combined.includes('追試') ||
                       combined.includes('học lại') || combined.includes('retake course') ||
                       combined.includes('再履修') || combined.includes('thi bổ túc') ||
                       combined.includes('make-up exam') || combined.includes('補習試験') ||
                       combined.includes('thi lại môn') || combined.includes('repeat course');

  // === NGÀY HỘI VIỆC LÀM & CAREER ===
  const isCareerEvent = combined.includes('ngày hội việc làm') || combined.includes('job fair') || 
                        combined.includes('就職説明会') || combined.includes('キャリア') ||
                        combined.includes('career fair') || combined.includes('tuyển dụng') ||
                        combined.includes('recruitment') || combined.includes('採用') ||
                        combined.includes('việc làm') || combined.includes('employment') ||
                        combined.includes('就職') || combined.includes('career counseling') ||
                        combined.includes('tư vấn nghề nghiệp') || combined.includes('キャリア相談');

  // === THÔNG BÁO VỀ CƠ SỞ VẬT CHẤT (Lab, Library, Facilities) ===
  const isFacilities = combined.includes('phòng lab') || combined.includes('laboratory') || 
                       combined.includes('実験室') || combined.includes('ラボ') ||
                       combined.includes('thư viện') || combined.includes('library') ||
                       combined.includes('図書館') || combined.includes('cơ sở vật chất') ||
                       combined.includes('facilities') || combined.includes('設備') ||
                       combined.includes('phòng học') || combined.includes('classroom') ||
                       combined.includes('教室') || combined.includes('equipment');

  // === XIN LỖI & APOLOGIZE ===
  const isApology = combined.includes('xin lỗi') || combined.includes('sorry') || 
                    combined.includes('申し訳') || combined.includes('すみません') ||
                    combined.includes('apologize') || combined.includes('お詫び') ||
                    combined.includes('thành thật xin lỗi') || combined.includes('deeply sorry') ||
                    combined.includes('謝罪') || combined.includes('lỗi của tôi') ||
                    combined.includes('my mistake') || combined.includes('私の間違い');

  // === AN TOÀN & SAFETY ===
  const isSafety = combined.includes('an toàn') || combined.includes('safety') || 
                   combined.includes('安全') || combined.includes('bảo vệ') ||
                   combined.includes('protection') || combined.includes('保護') ||
                   combined.includes('quy tắc an toàn') || combined.includes('safety rules') ||
                   combined.includes('安全規則') || combined.includes('cảnh báo an toàn') ||
                   combined.includes('safety warning') || combined.includes('注意事項');

  // === CHÚC MỪNG ĐẶC BIỆT (sinh nhật, lễ tết) ===
  const isCelebration = combined.includes('chúc mừng sinh nhật') || combined.includes('happy birthday') || 
                        combined.includes('お誕生日') || combined.includes('誕生日おめでとう') ||
                        combined.includes('chúc mừng năm mới') || combined.includes('happy new year') ||
                        combined.includes('新年おめでとう') || combined.includes('新年明けまして') ||
                        combined.includes('chúc mừng') || combined.includes('celebration') ||
                        combined.includes('お祝い') || combined.includes('lễ tết');

  // === YÊU CẦU TRÌNH BÀY & PRESENTATION ===
  const isPresentation = combined.includes('trình bày') || combined.includes('presentation') || 
                         combined.includes('プレゼン') || combined.includes('発表') ||
                         combined.includes('thuyết trình') || combined.includes('present') ||
                         combined.includes('báo cáo trước lớp') || combined.includes('class presentation') ||
                         combined.includes('発表準備') || combined.includes('chuẩn bị trình bày') ||
                         combined.includes('prepare presentation') || combined.includes('prepare to present');

  // === WORKSHOP & TRAINING SKILLS ===
  const isWorkshop = combined.includes('workshop') || combined.includes('ワークショップ') || 
                     combined.includes('training') || combined.includes('研修') ||
                     combined.includes('kỹ năng') || combined.includes('skills') ||
                     combined.includes('スキル') || combined.includes('đào tạo') ||
                     combined.includes('skill training') || combined.includes('技能訓練') ||
                     combined.includes('buổi đào tạo') || combined.includes('training session');

  // Tạo 3 gợi ý trả lời dựa trên phân loại
  let replies: string[] = [];
  let reactions: string[] = [];

  if (language === 'ja') {
    // Tiếng Nhật
    // ƯU TIÊN: Kiểm tra câu hỏi về tham gia trước (cho lớp bù, cuộc họp, sự kiện, hoạt động)
    if (isParticipationQuestion && (isExtraClass || isMeeting || isEvent || isActivityInvitation)) {
      // Trường hợp có câu hỏi về tham gia
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。日程を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAssignment || isDeadline) {
      replies = [
        '承知いたしました。期限内に提出いたします。',
        '了解しました。提出期限を確認いたします。',
        'ありがとうございます。必ず期限内に提出いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isMeeting && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia cuộc họp
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。日程を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isMeeting) {
      replies = [
        '承知いたしました。会議に参加いたします。',
        '了解しました。日程を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSchedule) {
      replies = [
        '承知いたしました。スケジュールを確認いたします。',
        '了解しました。時間割を確認いたします。',
        'ありがとうございます。スケジュールを把握いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExam) {
      replies = [
        '承知いたしました。試験の準備をいたします。',
        '了解しました。試験日程を確認いたします。',
        'ありがとうございます。しっかり準備いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isQuestion) {
      replies = [
        '承知いたしました。確認して回答いたします。',
        '了解しました。調べてお答えいたします。',
        'ありがとうございます。後ほど回答いたします。'
      ];
      reactions = ['understood', 'question', 'thanks'];
    } else if (isRequest) {
      replies = [
        '承知いたしました。対応いたします。',
        '了解しました。確認して対応いたします。',
        'ありがとうございます。お手伝いいたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAnnouncement) {
      replies = [
        '承知いたしました。内容を確認いたします。',
        '了解しました。確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isReminder) {
      replies = [
        '承知いたしました。確認いたします。',
        '了解しました。忘れずに対応いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isThankYou) {
      replies = [
        'どういたしまして。',
        'こちらこそありがとうございます。',
        'お役に立てて光栄です。'
      ];
      reactions = ['thanks', 'like', 'great'];
    } else if (isUrgent) {
      replies = [
        '承知いたしました。すぐに対応いたします。',
        '了解しました。至急確認いたします。',
        'ありがとうございます。優先的に対応いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isChange) {
      replies = [
        '承知いたしました。変更内容を確認いたします。',
        '了解しました。変更を把握いたしました。',
        'ありがとうございます。変更内容を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isConfirmation) {
      replies = [
        '承知いたしました。確認いたします。',
        '了解しました。内容を確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isInformation) {
      replies = [
        '承知いたしました。情報を確認いたします。',
        '了解しました。内容を確認いたしました。',
        'ありがとうございます。情報を確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCancellation) {
      replies = [
        '承知いたしました。キャンセルを確認いたします。',
        '了解しました。キャンセル内容を確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isApproval) {
      replies = [
        'ありがとうございます。承認いただき感謝いたします。',
        '了解しました。承認ありがとうございます。',
        '承知いたしました。ありがとうございます。'
      ];
      reactions = ['thanks', 'like', 'great'];
    } else if (isRejection) {
      replies = [
        '承知いたしました。了解いたしました。',
        '了解しました。確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEvent && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia sự kiện
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。日程を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEvent) {
      replies = [
        '承知いたしました。イベントに参加いたします。',
        '了解しました。日程を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isHoliday) {
      replies = [
        '承知いたしました。休日を確認いたしました。',
        '了解しました。休みの日程を把握いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGrade || isFeedback) {
      replies = [
        '承知いたしました。成績を確認いたします。',
        '了解しました。フィードバックを確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isDocument || isResource) {
      replies = [
        '承知いたしました。資料を確認いたします。',
        '了解しました。ダウンロードして確認いたします。',
        'ありがとうございます。資料を確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExtension) {
      replies = [
        'ありがとうございます。延長していただき感謝いたします。',
        '了解しました。延長期間を確認いたします。',
        '承知いたしました。ありがとうございます。'
      ];
      reactions = ['thanks', 'understood', 'great'];
    } else if (isError) {
      replies = [
        '承知いたしました。修正内容を確認いたします。',
        '了解しました。エラーを確認して対応いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTuition) {
      replies = [
        '承知いたしました。学費について確認いたします。',
        '了解しました。支払い方法を確認いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEnrollment) {
      replies = [
        '承知いたしました。登録内容を確認いたします。',
        '了解しました。登録手続きを確認いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isInternship) {
      replies = [
        '承知いたしました。インターンシップについて確認いたします。',
        '了解しました。実習内容を確認いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isProject) {
      replies = [
        '承知いたしました。プロジェクトについて確認いたします。',
        '了解しました。研究内容を確認いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'idea'];
    } else if (isClub) {
      replies = [
        '承知いたしました。クラブ活動について確認いたします。',
        '了解しました。活動内容を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTrip) {
      replies = [
        '承知いたしました。旅行について確認いたします。',
        '了解しました。日程を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isContest) {
      replies = [
        '承知いたしました。コンテストについて確認いたします。',
        '了解しました。参加方法を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'great'];
    } else if (isGraduation) {
      replies = [
        'ありがとうございます。卒業について確認いたします。',
        '了解しました。証明書について確認いたします。',
        '承知いたしました。ありがとうございます。'
      ];
      reactions = ['thanks', 'understood', 'great'];
    } else if (isSports) {
      replies = [
        '承知いたしました。スポーツイベントについて確認いたします。',
        '了解しました。競技内容を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPraise) {
      replies = [
        'ありがとうございます。お褒めいただき光栄です。',
        '感謝いたします。これからも頑張ります。',
        'ありがとうございます。励みになります。'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isAttendance) {
      replies = [
        '承知いたしました。出席を確認いたします。',
        '了解しました。出席状況を把握いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isOfficeHours) {
      replies = [
        '承知いたしました。ご都合の良い時間にご連絡いたします。',
        '了解しました。面談の日程を調整いたします。',
        'ありがとうございます。お時間をいただきたいと思います。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isResubmission) {
      replies = [
        '承知いたしました。修正して再提出いたします。',
        '了解しました。内容を確認して改善いたします。',
        'ありがとうございます。改善して再提出いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isDefense) {
      replies = [
        '承知いたしました。発表の準備をいたします。',
        '了解しました。審査に向けて準備いたします。',
        'ありがとうございます。しっかり準備いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isEncouragement) {
      replies = [
        'ありがとうございます。これからも頑張ります。',
        '感謝いたします。励みになります。',
        'ありがとうございます。お言葉を励みに頑張ります。'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isDiscipline) {
      replies = [
        '申し訳ございません。以後気をつけます。',
        '了解しました。再発防止に努めます。',
        'ありがとうございます。真摯に受け止めます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEmergencyCancel) {
      replies = [
        '承知いたしました。緊急中止を確認いたしました。',
        '了解しました。変更内容を確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGroupWork) {
      replies = [
        '承知いたしました。グループワークについて確認いたします。',
        '了解しました。チームメンバーと連絡を取り合います。',
        'ありがとうございます。協力して取り組みます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGradePublication) {
      replies = [
        '承知いたしました。成績を確認いたします。',
        '了解しました。採点結果を確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSupplementary) {
      replies = [
        '承知いたしました。補足資料を提出いたします。',
        '了解しました。追加課題に取り組みます。',
        'ありがとうございます。補足いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isExamResults) {
      replies = [
        '承知いたしました。試験結果を確認いたします。',
        '了解しました。テスト結果を確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCorrectionRequest) {
      replies = [
        '承知いたしました。修正いたします。',
        '了解しました。誤りを直して再提出いたします。',
        'ありがとうございます。訂正いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isExtraClass && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia lớp bù
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。日程を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExtraClass) {
      replies = [
        '承知いたしました。補習に参加いたします。',
        '了解しました。追加授業の日程を確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isFeedbackRequest) {
      replies = [
        '承知いたしました。フィードバックを提供いたします。',
        '了解しました。ご意見をお伝えいたします。',
        'ありがとうございます。後ほどフィードバックいたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isStudyPlan) {
      replies = [
        '承知いたしました。学習計画を確認いたします。',
        '了解しました。カリキュラムを把握いたしました。',
        'ありがとうございます。計画に沿って学習いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isNewMaterial) {
      replies = [
        '承知いたしました。新しい資料を確認いたします。',
        '了解しました。ダウンロードして確認いたします。',
        'ありがとうございます。新しい教材を確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isActivityInvitation && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia hoạt động
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。日程を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isActivityInvitation) {
      replies = [
        '承知いたしました。参加させていただきます。',
        '了解しました。活動に参加いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isLocationChange) {
      replies = [
        '承知いたしました。新しい場所を確認いたします。',
        '了解しました。場所変更を把握いたしました。',
        'ありがとうございます。新しい会場を確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isReceiptConfirmation) {
      replies = [
        '承知いたしました。受領確認いたします。',
        '了解しました。受け取りましたことを確認いたしました。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPostponement) {
      replies = [
        '承知いたしました。延期を確認いたします。',
        '了解しました。新しい日程を確認いたします。',
        'ありがとうございます。変更内容を確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAbsenceExplanation) {
      replies = [
        '申し訳ございません。後ほど詳しく説明いたします。',
        '了解しました。欠席理由を報告いたします。',
        'ありがとうございます。事情を説明させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isParentMeeting) {
      replies = [
        '承知いたしました。保護者に伝えます。',
        '了解しました。家族に連絡いたします。',
        'ありがとうございます。保護者会について伝えます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isProgressReport) {
      replies = [
        '承知いたしました。学習報告を確認いたします。',
        '了解しました。成績について確認いたしました。',
        'ありがとうございます。今後も努力いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSurvey) {
      replies = [
        '承知いたしました。アンケートに回答いたします。',
        '了解しました。調査に協力いたします。',
        'ありがとうございます。フィードバックを提供いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTeacherChange) {
      replies = [
        '承知いたしました。新しい先生について確認いたします。',
        '了解しました。教師変更を把握いたしました。',
        'ありがとうございます。よろしくお願いいたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPersonalInfoUpdate) {
      replies = [
        '承知いたしました。情報を更新いたします。',
        '了解しました。個人情報を確認して更新いたします。',
        'ありがとうございます。確認して更新いたします。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isRetakeExam) {
      replies = [
        '承知いたしました。再試験について確認いたします。',
        '了解しました。しっかり準備いたします。',
        'ありがとうございます。次回は合格できるよう頑張ります。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isCareerEvent) {
      replies = [
        '承知いたしました。就職説明会に参加いたします。',
        '了解しました。キャリアイベントについて確認いたします。',
        'ありがとうございます。参加させていただきます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isFacilities) {
      replies = [
        '承知いたしました。施設について確認いたします。',
        '了解しました。実験室の情報を確認いたしました。',
        'ありがとうございます。設備の使用方法を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isApology) {
      replies = [
        'いいえ、大丈夫です。お気になさらないでください。',
        '問題ございません。ご連絡ありがとうございます。',
        'ありがとうございます。理解いたしました。'
      ];
      reactions = ['thanks', 'understood', 'like'];
    } else if (isSafety) {
      replies = [
        '承知いたしました。安全規則を守ります。',
        '了解しました。注意事項を確認いたしました。',
        'ありがとうございます。気をつけます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCelebration) {
      replies = [
        'ありがとうございます。とても嬉しいです。',
        '感謝いたします。お祝いの言葉をいただき光栄です。',
        'ありがとうございます。心より感謝申し上げます。'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isPresentation) {
      replies = [
        '承知いたしました。発表の準備をいたします。',
        '了解しました。プレゼンテーションをしっかり準備いたします。',
        'ありがとうございます。準備して臨みます。'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isWorkshop) {
      replies = [
        '承知いたしました。ワークショップに参加いたします。',
        '了解しました。研修について確認いたします。',
        'ありがとうございます。スキル向上に努めます。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isParticipationQuestion) {
      // Trường hợp có câu hỏi yêu cầu phản hồi nhưng không rõ loại
      replies = [
        '参加できます。よろしくお願いいたします。',
        'はい、参加いたします。ありがとうございます。',
        '参加させていただきます。詳細を確認いたします。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else {
      // Mặc định cho các trường hợp khác
      replies = [
        '承知いたしました。ご連絡ありがとうございます。',
        '了解しました。内容を確認いたします。',
        'ありがとうございます。確認いたしました。'
      ];
      reactions = ['understood', 'thanks', 'like'];
    }
  } else {
    // Tiếng Việt
    // ƯU TIÊN: Kiểm tra câu hỏi về tham gia trước (cho lớp bù, cuộc họp, sự kiện, hoạt động)
    if (isParticipationQuestion && (isExtraClass || isMeeting || isEvent || isActivityInvitation)) {
      // Trường hợp có câu hỏi về tham gia
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã thông báo.',
        'Em có thể tham gia được ạ. Em sẽ sắp xếp thời gian.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAssignment || isDeadline) {
      replies = [
        'Vâng, em đã hiểu. Em sẽ nộp bài đúng hạn.',
        'Em đã nhận được. Em sẽ kiểm tra lại deadline và nộp bài đúng thời gian.',
        'Cảm ơn thầy/cô. Em sẽ hoàn thành và nộp bài trong thời hạn quy định.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isMeeting && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia cuộc họp
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã thông báo.',
        'Em có thể tham gia được ạ. Em sẽ có mặt đúng giờ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isMeeting) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia cuộc họp.',
        'Em đã xác nhận. Em sẽ kiểm tra lại lịch và tham gia đúng giờ.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ có mặt đúng giờ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSchedule) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ kiểm tra lại lịch học.',
        'Em đã xác nhận. Em sẽ cập nhật lịch học vào thời khóa biểu.',
        'Cảm ơn thầy/cô. Em đã ghi nhận lịch học mới.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExam) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ chuẩn bị cho kỳ thi.',
        'Em đã xác nhận. Em sẽ ôn tập và chuẩn bị kỹ lưỡng.',
        'Cảm ơn thầy/cô. Em sẽ chuẩn bị tốt cho kỳ thi.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isQuestion) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ kiểm tra và trả lời sau.',
        'Em đã xác nhận. Em cần thời gian để tìm hiểu và trả lời chính xác.',
        'Cảm ơn thầy/cô. Em sẽ nghiên cứu và phản hồi sớm nhất có thể.'
      ];
      reactions = ['understood', 'question', 'thanks'];
    } else if (isRequest) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ thực hiện theo yêu cầu.',
        'Em đã xác nhận. Em sẽ kiểm tra và thực hiện đúng như yêu cầu.',
        'Cảm ơn thầy/cô. Em sẽ cố gắng hoàn thành yêu cầu.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAnnouncement) {
      replies = [
        'Vâng, em đã nhận được thông báo. Em sẽ xem xét nội dung.',
        'Em đã xác nhận. Em đã đọc và ghi nhận thông tin.',
        'Cảm ơn thầy/cô đã thông báo. Em đã nắm được nội dung.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isReminder) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ kiểm tra lại và thực hiện.',
        'Em đã xác nhận. Em sẽ không quên và hoàn thành đúng hạn.',
        'Cảm ơn thầy/cô đã nhắc nhở. Em sẽ ghi nhớ và thực hiện.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isThankYou) {
      replies = [
        'Không có gì ạ. Em rất vui được giúp đỡ.',
        'Dạ không có gì. Nếu cần gì thêm, em sẵn sàng hỗ trợ.',
        'Em rất vui được hỗ trợ. Chúc thầy/cô một ngày tốt lành.'
      ];
      reactions = ['thanks', 'like', 'great'];
    } else if (isUrgent) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ ưu tiên xử lý ngay.',
        'Em đã xác nhận. Em sẽ xử lý khẩn cấp ngay lập tức.',
        'Cảm ơn thầy/cô. Em sẽ ưu tiên và hoàn thành sớm nhất.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isChange) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ cập nhật thông tin mới.',
        'Em đã xác nhận. Em đã ghi nhận sự thay đổi.',
        'Cảm ơn thầy/cô đã thông báo. Em đã cập nhật thông tin.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isConfirmation) {
      replies = [
        'Vâng, em đã xác nhận. Em đã kiểm tra và xác nhận.',
        'Em đã xác nhận. Em đã đọc và xác nhận nội dung.',
        'Cảm ơn thầy/cô. Em đã xác nhận và ghi nhận.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isInformation) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin.',
        'Em đã xác nhận. Em đã đọc và ghi nhận thông tin.',
        'Cảm ơn thầy/cô. Em đã nắm được thông tin.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCancellation) {
      replies = [
        'Vâng, em đã nhận được. Em đã ghi nhận việc hủy.',
        'Em đã xác nhận. Em đã hiểu về việc hủy bỏ.',
        'Cảm ơn thầy/cô đã thông báo. Em đã ghi nhận.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isApproval) {
      replies = [
        'Cảm ơn thầy/cô đã phê duyệt. Em rất biết ơn.',
        'Em cảm ơn thầy/cô. Em sẽ cố gắng hoàn thành tốt.',
        'Cảm ơn thầy/cô rất nhiều. Em sẽ không phụ lòng tin của thầy/cô.'
      ];
      reactions = ['thanks', 'like', 'great'];
    } else if (isRejection) {
      replies = [
        'Vâng, em đã nhận được. Em hiểu và sẽ cố gắng cải thiện.',
        'Em đã xác nhận. Em sẽ rút kinh nghiệm và làm tốt hơn.',
        'Cảm ơn thầy/cô đã phản hồi. Em sẽ cố gắng cải thiện.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEvent && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia sự kiện
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã thông báo.',
        'Em có thể tham gia được ạ. Em sẽ có mặt đúng giờ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEvent) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia sự kiện.',
        'Em đã xác nhận. Em sẽ kiểm tra lại lịch và tham gia đúng giờ.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ có mặt đúng giờ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isHoliday) {
      replies = [
        'Vâng, em đã nhận được. Em đã ghi nhận lịch nghỉ.',
        'Em đã xác nhận. Em đã nắm được lịch nghỉ học.',
        'Cảm ơn thầy/cô đã thông báo. Em đã ghi nhận.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGrade || isFeedback) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem điểm và phản hồi của thầy/cô.',
        'Em đã xác nhận. Em đã đọc nhận xét và sẽ cố gắng cải thiện.',
        'Cảm ơn thầy/cô đã đánh giá. Em sẽ xem xét và rút kinh nghiệm.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isDocument || isResource) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tải tài liệu và xem xét.',
        'Em đã xác nhận. Em sẽ tải về và nghiên cứu tài liệu.',
        'Cảm ơn thầy/cô đã chia sẻ tài liệu. Em sẽ sử dụng để học tập.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExtension) {
      replies = [
        'Cảm ơn thầy/cô đã gia hạn. Em rất biết ơn.',
        'Em đã nhận được. Em sẽ tận dụng thời gian gia hạn để hoàn thành tốt hơn.',
        'Cảm ơn thầy/cô rất nhiều. Em sẽ hoàn thành đúng thời hạn mới.'
      ];
      reactions = ['thanks', 'understood', 'great'];
    } else if (isError) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ kiểm tra và khắc phục lỗi.',
        'Em đã xác nhận. Em sẽ xem xét lại và sửa chữa.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ chỉnh sửa ngay.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTuition) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin về học phí.',
        'Em đã xác nhận. Em sẽ kiểm tra phương thức thanh toán.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ xử lý thanh toán đúng hạn.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEnrollment) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin đăng ký.',
        'Em đã xác nhận. Em sẽ kiểm tra lại thủ tục đăng ký.',
        'Cảm ơn thầy/cô. Em sẽ hoàn tất đăng ký đúng thời hạn.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isInternship) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin về thực tập.',
        'Em đã xác nhận. Em sẽ chuẩn bị cho kỳ thực tập.',
        'Cảm ơn thầy/cô. Em sẽ nghiên cứu kỹ và thực hiện tốt.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isProject) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét yêu cầu dự án.',
        'Em đã xác nhận. Em sẽ lên kế hoạch và thực hiện dự án.',
        'Cảm ơn thầy/cô. Em sẽ nghiên cứu và hoàn thành tốt dự án.'
      ];
      reactions = ['understood', 'thanks', 'idea'];
    } else if (isClub) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét hoạt động câu lạc bộ.',
        'Em đã xác nhận. Em sẽ tham gia hoạt động ngoại khóa.',
        'Cảm ơn thầy/cô. Em sẽ tham gia và đóng góp tích cực.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTrip) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin chuyến đi.',
        'Em đã xác nhận. Em sẽ chuẩn bị và tham gia chuyến đi.',
        'Cảm ơn thầy/cô. Em sẽ có mặt đúng giờ và tham gia đầy đủ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isContest) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin cuộc thi.',
        'Em đã xác nhận. Em sẽ chuẩn bị và tham gia cuộc thi.',
        'Cảm ơn thầy/cô. Em sẽ cố gắng hết sức trong cuộc thi.'
      ];
      reactions = ['understood', 'thanks', 'great'];
    } else if (isGraduation) {
      replies = [
        'Cảm ơn thầy/cô. Em rất vui mừng về thông tin tốt nghiệp.',
        'Em đã nhận được. Em sẽ xem xét thông tin về bằng cấp.',
        'Cảm ơn thầy/cô rất nhiều. Em sẽ hoàn tất các thủ tục cần thiết.'
      ];
      reactions = ['thanks', 'understood', 'great'];
    } else if (isSports) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét thông tin hoạt động thể thao.',
        'Em đã xác nhận. Em sẽ tham gia hoạt động thể thao.',
        'Cảm ơn thầy/cô. Em sẽ tham gia và cố gắng hết sức.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPraise) {
      replies = [
        'Cảm ơn thầy/cô rất nhiều. Em rất vui khi nhận được lời khen.',
        'Em cảm ơn thầy/cô. Điều này là động lực lớn cho em.',
        'Cảm ơn thầy/cô. Em sẽ tiếp tục cố gắng để không phụ lòng tin của thầy/cô.'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isAttendance) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xác nhận việc điểm danh.',
        'Em đã xác nhận. Em đã ghi nhận thông tin về chuyên cần.',
        'Cảm ơn thầy/cô. Em sẽ chú ý đến việc đi học đầy đủ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isOfficeHours) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ liên hệ với thầy/cô để hẹn gặp.',
        'Em đã xác nhận. Em sẽ sắp xếp thời gian phù hợp để gặp thầy/cô.',
        'Cảm ơn thầy/cô. Em sẽ trao đổi với thầy/cô khi có cơ hội.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isResubmission) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ chỉnh sửa và nộp lại bài.',
        'Em đã xác nhận. Em sẽ cải thiện bài làm và nộp lại đúng hạn.',
        'Cảm ơn thầy/cô đã cho em cơ hội. Em sẽ làm lại cẩn thận hơn.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isDefense) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ chuẩn bị kỹ lưỡng cho buổi bảo vệ.',
        'Em đã xác nhận. Em sẽ chuẩn bị tốt cho buổi thuyết trình.',
        'Cảm ơn thầy/cô. Em sẽ chuẩn bị đầy đủ cho buổi bảo vệ đồ án/luận văn.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isEncouragement) {
      replies = [
        'Cảm ơn thầy/cô rất nhiều. Em sẽ tiếp tục cố gắng.',
        'Em cảm ơn thầy/cô. Lời động viên này rất có ý nghĩa với em.',
        'Cảm ơn thầy/cô. Em sẽ phấn đấu để không phụ lòng tin của thầy/cô.'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isDiscipline) {
      replies = [
        'Vâng, em đã nhận được. Em xin lỗi và sẽ chú ý hơn trong tương lai.',
        'Em đã xác nhận. Em hiểu và sẽ cố gắng không vi phạm nữa.',
        'Cảm ơn thầy/cô đã nhắc nhở. Em sẽ nghiêm túc rút kinh nghiệm.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isEmergencyCancel) {
      replies = [
        'Vâng, em đã nhận được. Em đã ghi nhận việc hủy đột xuất.',
        'Em đã xác nhận. Em hiểu về tình huống khẩn cấp.',
        'Cảm ơn thầy/cô đã thông báo. Em đã ghi nhận thông tin.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGroupWork) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ liên hệ với các thành viên trong nhóm.',
        'Em đã xác nhận. Em sẽ phối hợp tốt với nhóm để hoàn thành bài tập.',
        'Cảm ơn thầy/cô. Em sẽ làm việc nhóm hiệu quả.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isGradePublication) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem điểm đã được công bố.',
        'Em đã xác nhận. Em đã kiểm tra điểm số của mình.',
        'Cảm ơn thầy/cô đã chấm điểm. Em sẽ xem xét kỹ kết quả.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSupplementary) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ nộp bài bổ sung đúng hạn.',
        'Em đã xác nhận. Em sẽ hoàn thành các yêu cầu bổ sung.',
        'Cảm ơn thầy/cô. Em sẽ bổ sung những phần còn thiếu.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isExamResults) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem kết quả thi.',
        'Em đã xác nhận. Em đã kiểm tra điểm thi của mình.',
        'Cảm ơn thầy/cô. Em sẽ xem xét kết quả và rút kinh nghiệm.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCorrectionRequest) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ sửa lỗi ngay.',
        'Em đã xác nhận. Em sẽ chỉnh sửa lại bài làm cho đúng.',
        'Cảm ơn thầy/cô đã chỉ ra lỗi. Em sẽ khắc phục ngay.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isExtraClass && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia lớp bù
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã thông báo.',
        'Em có thể tham gia được ạ. Em sẽ sắp xếp thời gian.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isExtraClass) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia lớp học thêm.',
        'Em đã xác nhận. Em sẽ sắp xếp thời gian để tham gia bồi dưỡng.',
        'Cảm ơn thầy/cô. Em sẽ tham gia đầy đủ các buổi học thêm.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isFeedbackRequest) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ gửi phản hồi sau khi suy nghĩ kỹ.',
        'Em đã xác nhận. Em sẽ cung cấp phản hồi chi tiết.',
        'Cảm ơn thầy/cô. Em sẽ gửi ý kiến phản hồi sớm nhất có thể.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isStudyPlan) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem xét kế hoạch học tập.',
        'Em đã xác nhận. Em đã nắm được chương trình học.',
        'Cảm ơn thầy/cô. Em sẽ tuân thủ kế hoạch học tập đã đề ra.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isNewMaterial) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tải tài liệu mới về và xem xét.',
        'Em đã xác nhận. Em sẽ nghiên cứu tài liệu mới được chia sẻ.',
        'Cảm ơn thầy/cô đã cung cấp tài liệu mới. Em sẽ sử dụng để học tập.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isActivityInvitation && isParticipationQuestion) {
      // Trường hợp có câu hỏi về tham gia hoạt động
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã mời.',
        'Em có thể tham gia được ạ. Em sẽ sắp xếp thời gian.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isActivityInvitation) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia hoạt động.',
        'Em đã xác nhận. Em sẽ sắp xếp thời gian để tham gia.',
        'Cảm ơn thầy/cô đã mời. Em sẽ tham gia đầy đủ.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isLocationChange) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ ghi nhớ địa điểm mới.',
        'Em đã xác nhận. Em đã ghi nhận việc thay đổi địa điểm.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ đến đúng địa điểm mới.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isReceiptConfirmation) {
      replies = [
        'Vâng, em đã nhận được và xác nhận.',
        'Em đã xác nhận. Em đã nhận được thông tin.',
        'Cảm ơn thầy/cô. Em đã xác nhận đã nhận được tin nhắn.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPostponement) {
      replies = [
        'Vâng, em đã nhận được. Em đã ghi nhận việc hoãn/dời lịch.',
        'Em đã xác nhận. Em sẽ theo dõi lịch mới.',
        'Cảm ơn thầy/cô đã thông báo. Em đã ghi nhận thay đổi lịch.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isAbsenceExplanation) {
      replies = [
        'Vâng, em xin lỗi. Em sẽ giải thích lý do vắng mặt.',
        'Em đã nhận được. Em sẽ gửi giấy xin phép và lý do vắng.',
        'Cảm ơn thầy/cô. Em sẽ báo cáo chi tiết về việc vắng học.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isParentMeeting) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ thông báo cho phụ huynh.',
        'Em đã xác nhận. Em sẽ nhắc bố mẹ tham gia họp phụ huynh.',
        'Cảm ơn thầy/cô. Em sẽ báo với gia đình về buổi họp.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isProgressReport) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ xem báo cáo học tập.',
        'Em đã xác nhận. Em sẽ cố gắng cải thiện kết quả học tập.',
        'Cảm ơn thầy/cô đã quan tâm. Em sẽ học tập chăm chỉ hơn.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isSurvey) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ điền phiếu khảo sát.',
        'Em đã xác nhận. Em sẽ hoàn thành khảo sát đúng hạn.',
        'Cảm ơn thầy/cô. Em sẽ góp ý chân thành trong khảo sát.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isTeacherChange) {
      replies = [
        'Vâng, em đã nhận được. Em đã ghi nhận về giáo viên mới.',
        'Em đã xác nhận. Em rất mong được học với thầy/cô mới.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ làm quen với giáo viên mới.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isPersonalInfoUpdate) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ cập nhật thông tin cá nhân.',
        'Em đã xác nhận. Em sẽ kiểm tra và cập nhật thông tin.',
        'Cảm ơn thầy/cô đã nhắc. Em sẽ hoàn tất cập nhật ngay.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isRetakeExam) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ chuẩn bị thi lại.',
        'Em đã xác nhận. Em sẽ học tập chăm chỉ hơn để thi lại.',
        'Cảm ơn thầy/cô. Em sẽ cố gắng hết sức trong kỳ thi lại.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isCareerEvent) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia ngày hội việc làm.',
        'Em đã xác nhận. Em rất quan tâm đến sự kiện career này.',
        'Cảm ơn thầy/cô đã thông báo. Em sẽ tham gia để tìm hiểu cơ hội.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isFacilities) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ ghi nhớ thông tin về cơ sở vật chất.',
        'Em đã xác nhận. Em sẽ tuân thủ quy định sử dụng phòng lab.',
        'Cảm ơn thầy/cô. Em sẽ chú ý khi sử dụng thiết bị.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isApology) {
      replies = [
        'Không sao ạ. Em hiểu và không có vấn đề gì.',
        'Dạ không có gì. Em rất biết ơn sự quan tâm của thầy/cô.',
        'Cảm ơn thầy/cô. Em đã hiểu và không có vấn đề gì.'
      ];
      reactions = ['thanks', 'understood', 'like'];
    } else if (isSafety) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tuân thủ quy tắc an toàn.',
        'Em đã xác nhận. Em sẽ chú ý đến các vấn đề an toàn.',
        'Cảm ơn thầy/cô đã nhắc nhở. Em sẽ cẩn thận và an toàn.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isCelebration) {
      replies = [
        'Cảm ơn thầy/cô rất nhiều. Em rất vui và hạnh phúc.',
        'Em cảm ơn thầy/cô. Lời chúc của thầy/cô rất ý nghĩa với em.',
        'Cảm ơn thầy/cô. Em xin chúc thầy/cô cũng luôn mạnh khỏe và hạnh phúc.'
      ];
      reactions = ['thanks', 'great', 'like'];
    } else if (isPresentation) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ chuẩn bị bài trình bày.',
        'Em đã xác nhận. Em sẽ chuẩn bị kỹ lưỡng cho buổi thuyết trình.',
        'Cảm ơn thầy/cô. Em sẽ trình bày tốt nhất có thể.'
      ];
      reactions = ['understood', 'thanks', 'done'];
    } else if (isWorkshop) {
      replies = [
        'Vâng, em đã nhận được. Em sẽ tham gia workshop.',
        'Em đã xác nhận. Em rất mong được học hỏi kỹ năng mới.',
        'Cảm ơn thầy/cô. Em sẽ tham gia và nâng cao kỹ năng.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else if (isParticipationQuestion) {
      // Trường hợp có câu hỏi yêu cầu phản hồi nhưng không rõ loại
      replies = [
        'Em có thể tham gia ạ. Cảm ơn thầy/cô.',
        'Vâng, em sẽ tham gia. Cảm ơn thầy/cô đã thông báo.',
        'Em có thể tham gia được ạ. Em sẽ sắp xếp thời gian.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    } else {
      // Mặc định cho các trường hợp khác
      replies = [
        'Vâng, em đã nhận được. Cảm ơn thầy/cô đã liên hệ.',
        'Em đã xác nhận. Em sẽ xem xét nội dung và phản hồi sau.',
        'Cảm ơn thầy/cô. Em đã ghi nhận thông tin.'
      ];
      reactions = ['understood', 'thanks', 'like'];
    }
  }

  // Đảm bảo luôn có đúng 3 gợi ý
  return {
    replies: replies.slice(0, 3),
    reactions: reactions.slice(0, 3),
  };
}

export async function generateReplySuggestions(
  messageTitle: string,
  messageContent: string,
  language: 'vi' | 'ja' = 'ja'
): Promise<{ replies: string[]; reactions: string[] }> {
  // Kiểm tra xem có câu hỏi về tham gia không - nếu có thì dùng fallback để đảm bảo kết quả phù hợp
  const combined = `${messageTitle.toLowerCase()} ${messageContent.toLowerCase()}`;
  const contentLower = messageContent.toLowerCase();
  const hasParticipationQuestion = 
    contentLower.includes('参加できますか') || contentLower.includes('参加できます') ||
    contentLower.includes('返信をお願い') || contentLower.includes('返信してください') ||
    contentLower.includes('tham gia được không') || contentLower.includes('có thể tham gia') ||
    (contentLower.includes('có thể') && (contentLower.includes('?') || contentLower.includes('？'))) ||
    contentLower.includes('được không') || contentLower.includes('có được không') ||
    (contentLower.includes('返信') && (contentLower.includes('お願い') || contentLower.includes('ください'))) ||
    (contentLower.includes('phản hồi') && (contentLower.includes('vui lòng') || contentLower.includes('xin')));
  
  // Nếu có câu hỏi về tham gia, ưu tiên dùng fallback
  if (hasParticipationQuestion) {
    return analyzeMessageAndGenerateFallback(messageTitle, messageContent, language);
  }
  
  // Nếu không có API key, sử dụng fallback thông minh
  if (!genAI) {
    return analyzeMessageAndGenerateFallback(messageTitle, messageContent, language);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = language === 'ja'
      ? `あなたは学生で、教師からのメッセージに対して返信する必要があります。以下のメッセージに対する適切な返信候補を3つだけ提案してください。また、適切なリアクション候補も3つ提案してください。

件名: ${messageTitle}
内容: ${messageContent}

重要な注意事項:
- メッセージに質問（例：「参加できますか？」「返信をお願いします」）が含まれている場合、その質問に答える返信を提案してください。
- 質問がない場合は、メッセージの内容を確認したことを示す返信を提案してください。
- 返信は学生から教師への丁寧で簡潔な日本語で、必ず3つだけ提案してください。
- リアクション候補も3つだけ、以下のいずれかから選んでください: like, thanks, understood, star, question, idea, great, done

JSON形式で返してください（repliesは必ず3つ、reactionsも3つ）:
{
  "replies": ["返信1", "返信2", "返信3"],
  "reactions": ["reaction1", "reaction2", "reaction3"]
}`
      : `Bạn là học sinh và cần trả lời tin nhắn từ giáo viên. Hãy đề xuất chính xác 3 câu trả lời phù hợp cho tin nhắn sau (không nhiều hơn, không ít hơn). Đồng thời đề xuất 3 phản ứng phù hợp.

Tiêu đề: ${messageTitle}
Nội dung: ${messageContent}

Lưu ý quan trọng:
- Nếu tin nhắn có câu hỏi (ví dụ: "có thể tham gia không?", "vui lòng phản hồi"), hãy đề xuất câu trả lời trả lời câu hỏi đó.
- Nếu không có câu hỏi, hãy đề xuất câu trả lời xác nhận đã đọc và hiểu nội dung.
- Câu trả lời nên lịch sự và ngắn gọn bằng tiếng Việt, phải có đúng 3 câu trả lời.
- Phản ứng cũng phải có đúng 3 cái, chọn từ: like, thanks, understood, star, question, idea, great, done

Vui lòng trả về dạng JSON (replies phải có đúng 3 phần tử, reactions cũng 3 phần tử):
{
  "replies": ["trả lời 1", "trả lời 2", "trả lời 3"],
  "reactions": ["reaction1", "reaction2", "reaction3"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON từ response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Đảm bảo chỉ trả về đúng 3 replies và 3 reactions
      const replies = (parsed.replies || []).slice(0, 3);
      const reactions = (parsed.reactions || []).slice(0, 3);
      
      // Nếu AI không trả về đủ 3 gợi ý, bổ sung từ fallback
      if (replies.length < 3 || reactions.length < 3) {
        const fallback = analyzeMessageAndGenerateFallback(messageTitle, messageContent, language);
        return {
          replies: replies.length >= 3 ? replies : [...replies, ...fallback.replies].slice(0, 3),
          reactions: reactions.length >= 3 ? reactions : [...reactions, ...fallback.reactions].slice(0, 3),
        };
      }
      
      return { replies, reactions };
    }
    
    // Fallback nếu không parse được JSON
    return analyzeMessageAndGenerateFallback(messageTitle, messageContent, language);
  } catch (error: any) {
    console.error('Gemini API error:', error);
    // Fallback suggestions khi AI lỗi
    return analyzeMessageAndGenerateFallback(messageTitle, messageContent, language);
  }
}

export default { generateReplySuggestions };
