import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import User from '../models/User';

dotenv.config();

const students = [
  { stt: 1, fullName: 'Lê Phúc', nameKana: 'レー・フック', mssv: '20207992', email: 'phuc.l207992@sis.hust.edu.vn' },
  { stt: 2, fullName: 'Nguyễn Tùng Dương', nameKana: 'グエン・トゥン・ズオン', mssv: '20225823', email: 'duong.nt225823@sis.hust.edu.vn' },
  { stt: 3, fullName: 'Lê Việt Anh', nameKana: 'レ・ヴィエット・アイン', mssv: '20225689', email: 'anh.lv225689@sis.hust.edu.vn' },
  { stt: 4, fullName: 'Nguyễn Khắc Điệp', nameKana: 'グエン・カック・ディエップ', mssv: '20225806', email: 'diep.nk225806@sis.hust.edu.vn' },
  { stt: 5, fullName: 'Hoàng Sĩ Anh Minh', nameKana: 'ホアン・シー・アイン・ミン', mssv: '20225883', email: 'minh.hsa225883@sis.hust.edu.vn' },
  { stt: 6, fullName: 'Phạm Lê Quang Minh', nameKana: 'ファム・レ・クアン・ミン', mssv: '20225887', email: 'minh.plq225887@sis.hust.edu.vn' },
  { stt: 7, fullName: 'Nguyễn Sinh Quân', nameKana: 'グエン・シン・クアン', mssv: '20225909', email: 'quan.ns225909@sis.hust.edu.vn' },
  { stt: 8, fullName: 'Nguyễn Trung Tường', nameKana: 'グエン・チュン・トゥオン', mssv: '20225950', email: 'tuong.nt225950@sis.hust.edu.vn' },
  { stt: 9, fullName: 'Trần Thành An', nameKana: 'チャン・タイン・アン', mssv: '20225592', email: 'an.tt225592@sis.hust.edu.vn' },
  { stt: 10, fullName: 'Ngo Hoàng Phúc', nameKana: 'ゴー・ホアン・フック', mssv: '20225903', email: 'phuc.nh225903@sis.hust.edu.vn' },
  { stt: 11, fullName: 'Trịnh Hữu An', nameKana: 'チン・フー・アン', mssv: '20225593', email: 'an.th225593@sis.hust.edu.vn' },
  { stt: 12, fullName: 'Mạch Ngọc Đức Anh', nameKana: 'マック・ゴック・ドゥック・アイン', mssv: '20225595', email: 'anh.mnd225595@sis.hust.edu.vn' },
  { stt: 13, fullName: 'Đỗ Hoàng Đông', nameKana: 'ドー・ホアン・ドン', mssv: '20225807', email: 'dong.dh225807@sis.hust.edu.vn' },
  { stt: 14, fullName: 'Nguyễn Đức Hậu', nameKana: 'グエン・ドゥック・ハウ', mssv: '20225834', email: 'hau.nd225834@sis.hust.edu.vn' },
  { stt: 15, fullName: 'Đỗ Thanh Sơn', nameKana: 'ドー・タイン・ソン', mssv: '20225665', email: 'son.dt225665@sis.hust.edu.vn' },
  { stt: 16, fullName: 'Nguyễn Anh Quân', nameKana: 'グエン・アイン・クアン', mssv: '20225907', email: 'quan.na225907@sis.hust.edu.vn' },
  { stt: 17, fullName: 'Lại Thành Vinh', nameKana: 'ライ・タイン・ヴィン', mssv: '20225954', email: 'vinh.lt225954@sis.hust.edu.vn' },
  { stt: 18, fullName: 'Nguyễn Tuấn Đạt', nameKana: 'グエン・トゥアン・ダット', mssv: '20225605', email: 'dat.nt225605@sis.hust.edu.vn' },
  { stt: 19, fullName: 'Vũ Ngọc Lâm', nameKana: 'ヴー・ゴック・ラム', mssv: '20225645', email: 'lam.vn225645@sis.hust.edu.vn' },
  { stt: 20, fullName: 'Nguyễn Mạnh Tuấn', nameKana: 'グエン・マイン・トゥアン', mssv: '20225679', email: 'tuan.nm225679@sis.hust.edu.vn' },
  { stt: 21, fullName: 'Vũ Minh Đức', nameKana: 'ヴー・ミン・ドゥック', mssv: '20225705', email: 'duc.vm225705@sis.hust.edu.vn' },
  { stt: 22, fullName: 'Trần Hoàng Dũng', nameKana: 'チャン・ホアン・ズン', mssv: '20225708', email: 'dung.th225708@sis.hust.edu.vn' },
  { stt: 23, fullName: 'Đỗ Đắc Duy', nameKana: 'ドー・ダック・ズイ', mssv: '20225827', email: 'duy.dd225827@sis.hust.edu.vn' },
  { stt: 24, fullName: 'Nguyễn Minh Hoàng', nameKana: 'グエン・ミン・ホアン', mssv: '20225846', email: 'hoang.nm225846@sis.hust.edu.vn' },
  { stt: 25, fullName: 'Hà Ngọc Huy', nameKana: 'ハー・ゴック・フイ', mssv: '20225855', email: 'huy.hn225855@sis.hust.edu.vn' },
  { stt: 26, fullName: 'Nguyễn Việt Thành', nameKana: 'グエン・ヴィエット・タイン', mssv: '20225931', email: 'thanh.nv225931@sis.hust.edu.vn' },
  { stt: 27, fullName: 'Phạm Đức Ngự Bình', nameKana: 'ファム・ドゥック・グー・ビン', mssv: '20225696', email: 'binh.pdn225696@sis.hust.edu.vn' },
  { stt: 28, fullName: 'Đặng Hồng Minh', nameKana: 'ダン・ホン・ミン', mssv: '20225740', email: 'minh.dh225740@sis.hust.edu.vn' },
  { stt: 29, fullName: 'Hoàng Trường Giang', nameKana: 'ホアン・チュオン・ザン', mssv: '20225710', email: 'giang.ht225710@sis.hust.edu.vn' },
  { stt: 30, fullName: 'Trần Ngọc Hưng', nameKana: 'チャン・ゴック・フン', mssv: '20225635', email: 'hung.tn225635@sis.hust.edu.vn' },
  { stt: 31, fullName: 'Phùng Quang Khải', nameKana: 'フン・クアン・カイ', mssv: '20225639', email: 'khai.pq225639@sis.hust.edu.vn' },
  { stt: 32, fullName: 'Nguyễn Hồng Phúc', nameKana: 'グエン・ホン・フック', mssv: '20225659', email: 'phuc.nh225659@sis.hust.edu.vn' },
  { stt: 33, fullName: 'Phạm Lê Thành', nameKana: 'ファム・レ・タイン', mssv: '20225765', email: 'thanh.pl225765@sis.hust.edu.vn' },
  { stt: 34, fullName: 'Bùi Minh Bá', nameKana: 'ブイ・ミン・バー', mssv: '20225788', email: 'ba.bm225788@sis.hust.edu.vn' },
  { stt: 35, fullName: 'Trịnh Quốc Hoàng', nameKana: 'チン・クオック・ホアン', mssv: '20225629', email: 'hoang.tq225629@sis.hust.edu.vn' },
  { stt: 36, fullName: 'Nguyễn Vũ Linh Phong', nameKana: 'グエン・ヴー・リン・フォン', mssv: '20225902', email: 'phong.nvl225902@sis.hust.edu.vn' },
  { stt: 37, fullName: 'Bùi Minh Tùng', nameKana: 'ブイ・ミン・トゥン', mssv: '20225774', email: 'tung.bm225774@sis.hust.edu.vn' },
  { stt: 38, fullName: 'Trương Phạm Ngọc Khánh', nameKana: 'チュオン・ファム・ゴック・カイン', mssv: '20225641', email: 'khanh.tpn225641@sis.hust.edu.vn' },
  { stt: 39, fullName: 'Lê Minh Thành', nameKana: 'レ・ミン・タイン', mssv: '20225764', email: 'thanh.lm225764@sis.hust.edu.vn' },
  { stt: 40, fullName: 'Lê Kim Phú', nameKana: 'レ・キム・フー', mssv: '20235808', email: 'phu.lk235808@sis.hust.edu.vn' },
];

async function seedUsers() {
  try {
    // Kết nối database
    await connectDB();
    console.log('✅ Đã kết nối database');

    // Xóa các user cũ nếu có (tùy chọn - có thể comment lại nếu không muốn xóa)
    // await User.deleteMany({});
    // console.log('🗑️ Đã xóa các user cũ');

    // 1. Tạo Admin
    const adminEmail = 'admin@sis.hust.edu.vn';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        fullName: 'Administrator',
        email: adminEmail,
        password: 'admin123',
        role: 'Admin',
      });
      console.log(`✅ Đã tạo Admin: ${admin.email}`);
    } else {
      console.log(`ℹ️ Admin đã tồn tại: ${admin.email}`);
    }

    // 2. Tạo Teacher
    const teacherEmail = 'teacher@sis.hust.edu.vn';
    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      teacher = await User.create({
        fullName: 'Kiyoshi Yorifuji',
        email: teacherEmail,
        password: 'teacher',
        role: 'Teacher',
      });
      console.log(`✅ Đã tạo Teacher: ${teacher.email} - ${teacher.fullName}`);
    } else {
      console.log(`ℹ️ Teacher đã tồn tại: ${teacher.email}`);
    }

    // 3. Tạo Students
    const teacherId = teacher._id;
    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        const existingStudent = await User.findOne({ email: student.email });
        if (!existingStudent) {
          await User.create({
            fullName: student.fullName,
            nameKana: student.nameKana,
            email: student.email,
            password: 'student',
            role: 'Student',
            class: 'CNTT', // Có thể thay đổi tên lớp nếu cần
            teacherInCharge: teacherId,
            mssv: student.mssv,
          });
          createdCount++;
          console.log(`✅ Đã tạo Student ${student.stt}: ${student.fullName} (${student.nameKana}) - ${student.email}`);
        } else {
          existingCount++;
          console.log(`ℹ️ Student đã tồn tại: ${student.email}`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Lỗi khi tạo Student ${student.stt} (${student.email}):`, error.message);
      }
    }

    console.log('\n📊 Tổng kết:');
    console.log(`  - Admin: ${admin ? 'Đã có' : 'Chưa tạo'}`);
    console.log(`  - Teacher: ${teacher ? 'Đã có' : 'Chưa tạo'}`);
    console.log(`  - Students mới tạo: ${createdCount}`);
    console.log(`  - Students đã tồn tại: ${existingCount}`);
    console.log(`  - Lỗi: ${errorCount}`);

    console.log('\n✅ Hoàn thành seed users!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Lỗi khi seed users:', error);
    process.exit(1);
  }
}

seedUsers();
