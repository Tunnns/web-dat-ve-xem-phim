/**
 * Lỗi nghiệp vụ có kèm HTTP status code.
 * Service ném lỗi này, controller bắt và trả đúng status cho client.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
