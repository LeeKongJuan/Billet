import { z } from 'zod';

export const createGroupFundSchema = z.object({
  name: z.string().min(1, 'Tên quỹ không được bỏ trống').max(100),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().default('users')
});

export const updateGroupFundSchema = z.object({
  name: z.string().min(1, 'Tên quỹ không được bỏ trống').max(100),
  description: z.string().max(500).optional().nullable()
});

export const contributeFundSchema = z.object({
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền không hợp lệ'),
  walletId: z.coerce.number().int().positive('Vui lòng chọn ví để đóng góp'),
  note: z.string().max(255).optional().nullable()
});

export const createFundGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(100),
  targetAmount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền cần đạt phải lớn hơn 0'),
  targetDate: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(d.getTime()) && d >= today;
  }, 'ngày dự kiến nằm trong quá khứ')
});

export const updateFundGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(100),
  targetAmount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền cần đạt phải lớn hơn 0'),
  targetDate: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(d.getTime()) && d >= today;
  }, 'ngày dự kiến nằm trong quá khứ')
});

export const inviteUsersSchema = z.object({
  userIds: z.array(z.coerce.number().int()).min(1, 'Vui lòng chọn ít nhất 1 người dùng để gửi lời mời')
});

export const transferOwnerSchema = z.object({
  newOwnerUserId: z.coerce.number().int().positive('Vui lòng chọn thành viên')
});
