import { Request, Response } from 'express';

export const generateVietQR = (req: Request, res: Response) => {
  try {
    const { amount, description, bankId, accountNo, accountName } = req.body;

    // Hardcode fallback cho demo, thực tế sẽ lấy từ DB/Config
    const MY_BANK_ID = bankId || 'MB'; // Tên viết tắt của ngân hàng, ví dụ MB, VCB, ACB...
    const MY_ACCOUNT_NO = accountNo || '0123456789'; // Số tài khoản
    const MY_ACCOUNT_NAME = accountName || 'NGUYEN VAN A'; // Tên chủ tài khoản

    // API của vietqr.io: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
    // template có thể là 'compact', 'compact2', 'qr_only', 'print'
    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      description
    )}&accountName=${encodeURIComponent(MY_ACCOUNT_NAME)}`;

    // Trong thực tế, bạn sẽ tạo 1 record vào bảng Ticket (status: pending)
    // Và tạo 1 record vào bảng Transaction/Payment trước khi trả về QR

    res.status(200).json({
      success: true,
      message: 'Tạo mã QR thành công',
      data: {
        qrUrl,
        amount,
        description,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã QR',
      error: (error as Error).message,
    });
  }
};
