import { z } from 'zod';

export const createBillSchema = z.object({
  name: z.string().min(1, 'Tên hóa đơn không được để trống').max(100),
  participants: z.array(
    z.object({
      displayName: z.string().min(1, 'Tên người tham gia không được để trống'),
      userId: z.coerce.number().int().optional().nullable()
    })
  ).min(1, 'Cần ít nhất một người tham gia')
});

export const createActivitySchema = z.object({
  name: z.string().min(1, 'Tên hoạt động không được để trống').max(100),
  totalAmount: z.coerce.number().int('Số tiền phải là số nguyên').positive('Tổng số tiền hoạt động phải lớn hơn 0'),
  paidByParticipantId: z.coerce.number().int().positive('Vui lòng chọn người ứng trước'),
  splitType: z.enum(['equal', 'custom']).default('equal'),
  participantIds: z.array(z.coerce.number().int()).min(1, 'Vui lòng chọn người tham gia hoạt động'),
  customShares: z.record(z.string(), z.coerce.number().int()).optional()
});

export const updateSettlementSchema = z.object({
  isPaid: z.boolean()
});
