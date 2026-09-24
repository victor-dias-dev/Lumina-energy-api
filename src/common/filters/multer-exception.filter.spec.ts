import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { MulterExceptionFilter } from './multer-exception.filter';

describe('MulterExceptionFilter', () => {
  it('maps LIMIT_FILE_SIZE to 400', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new MulterExceptionFilter().catch(new MulterError('LIMIT_FILE_SIZE'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Arquivo excede o limite de 10 MB' }),
    );
  });
});
