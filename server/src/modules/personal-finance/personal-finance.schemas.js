import { z } from 'zod';

const transactionNameSchema = z.string({ required_error: 'Vui lòng nhập tên giao dịch' })
  .trim()
  .min(1, 'Vui lòng nhập tên giao dịch')
  .max(100, 'Tên giao dịch không được vượt quá 100 ký tự');

const transactionNoteSchema = z.string()
  .max(2000, 'Ghi chú không được vượt quá 2.000 ký tự')
  .refine((note) => note.trim().split(/\s+/).filter(Boolean).length <= 100, 'Ghi chú không được vượt quá 100 từ')
  .optional()
  .nullable();

export const createWalletSchema = z.object({
  name: z.string().min(1, 'Tên ví không được bỏ trống').max(100),
  description: z.string().max(500).optional().nullable(),
  initialBalance: z.coerce.number().int('Số dư phải là số nguyên').min(0, 'Số dư ban đầu không được nhỏ hơn 0').default(0)
});

export const updateWalletSchema = z.object({
  name: z.string().min(1, 'Tên ví không được bỏ trống').max(100),
  description: z.string().max(500).optional().nullable()
});

export const transferWalletSchema = z.object({
  fromWalletId: z.coerce.number().int().positive(),
  toWalletId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int('Số tiền chuyển phải là số nguyên').positive('Số tiền chuyển phải lớn hơn 0'),
  note: z.string().max(255).optional().nullable(),
  transferredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày chuyển phải có định dạng YYYY-MM-DD')
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(100),
  type: z.enum(['expense', 'income'], { errorMap: () => ({ message: 'Loại danh mục không hợp lệ' }) }),
  icon: z.string().default('tag')
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(100)
});

export const createTransactionSchema = z.object({
  name: transactionNameSchema,
  walletId: z.coerce.number().int().positive('Vui lòng chọn ví'),
  categoryId: z.coerce.number().int().positive('Vui lòng chọn danh mục'),
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày giao dịch không hợp lệ'),
  note: transactionNoteSchema
});

export const updateTransactionSchema = z.object({
  name: transactionNameSchema,
  walletId: z.coerce.number().int().positive('Vui lòng chọn ví'),
  categoryId: z.coerce.number().int().positive('Vui lòng chọn danh mục'),
  type: z.enum(['expense', 'income']),
  amount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày giao dịch không hợp lệ'),
  note: transactionNoteSchema
});

export const createBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Tháng phải có định dạng YYYY-MM').optional(),
  amount: z.coerce.number().int('Hạn mức phải là số nguyên').positive('Vui lòng nhập số tiền')
});

export const updateBudgetSchema = z.object({
  amount: z.coerce.number().int('Hạn mức phải là số nguyên').positive('Vui lòng nhập số tiền')
});

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(100),
  targetAmount: z.coerce.number().int('Số tiền mục tiêu phải là số nguyên').positive('thông tin bị thiếu hoặc số tiền <= 0'),
  targetDate: z.string().refine((val) => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(d.getTime()) && d >= today;
  }, 'ngày kết thúc ở quá khứ: dữ liệu không hợp lệ')
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(100),
  targetAmount: z.coerce.number().int().positive('thông tin bị thiếu hoặc số tiền <= 0'),
  targetDate: z.string().refine((val) => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(d.getTime()) && d >= today;
  }, 'ngày kết thúc ở quá khứ: dữ liệu không hợp lệ')
});

export const depositSavingsGoalSchema = z.object({
  walletId: z.coerce.number().int().positive('Vui lòng chọn ví'),
  amount: z.coerce.number().int().positive('Số tiền nạp phải lớn hơn 0'),
  note: z.string().max(255).optional().nullable()
});

export const transferSavingsGoalSchema = z.object({
  fromGoalId: z.coerce.number().int().positive(),
  toGoalId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive('Số tiền chuyển phải lớn hơn 0'),
  note: z.string().max(255).optional().nullable()
});
