import AuditLog, { IAuditLog } from '../models/AuditLog';

export interface CreateAuditLogParams {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  target: string;
  details?: Record<string, unknown> | string;
  ip?: string;
  userAgent?: string;
}

export const recordAuditLog = async (params: CreateAuditLogParams): Promise<IAuditLog | null> => {
  try {
    const log = await AuditLog.create({
      user: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userRole: params.userRole,
      action: params.action,
      target: params.target,
      details: params.details,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    return log;
  } catch (error) {
    console.error('Lỗi khi ghi nhận audit log:', error);
    return null;
  }
};

export const getAuditLogsService = async (params: {
  page?: number;
  limit?: number;
  action?: string;
  search?: string;
}) => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (params.action && params.action !== 'all') {
    filter.action = params.action;
  }

  if (params.search && params.search.trim()) {
    const regex = new RegExp(params.search.trim(), 'i');
    filter.$or = [
      { userName: regex },
      { userEmail: regex },
      { target: regex },
      { action: regex },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'fullName email role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

