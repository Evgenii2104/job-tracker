import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import csrf from 'csurf';

const csrfProtection = csrf({
  value: (req) => req.headers['x-csrf-token'] as string,
});

@Injectable()
export class CsrfGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;

    await new Promise<void>((resolve, reject) => {
      csrfProtection(req, res, (err: any) => {
        if (err) reject(new ForbiddenException('Invalid CSRF token'));
        else resolve();
      });
    });
    return true;
  }
}