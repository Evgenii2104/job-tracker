import { Controller, Get, Post, Body, Req, Res, HttpCode, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import csrf from 'csurf';

const csrfProtection = csrf({
  value: (req) =>
    (req.headers['x-csrf-token'] as string) ||
    (req.headers['csrf-token'] as string),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('csrf')
  csrf(@Req() req: Request, @Res() res: Response) {
    csrfProtection(req as any, res as any, (err: any) => {
      if (err) {
        res.status(500).json({ error: 'CSRF error' });
        return;
      }
      (req.session as any).save?.((saveErr: any) => {
        if (saveErr) {
          res.status(500).json({ error: 'Session error' });
          return;
        }
        res.set('Cache-Control', 'no-store');
        res.json({ csrfToken: (req as any).csrfToken() });
      });
    });
  }

  @Post('register')
  async register(@Body() body: any, @Req() req: Request) {
    console.log('session:', req.session);
    const user = await this.authService.register(body.email, body.name, body.password);
    (req.session as any).userId = Number(user.id);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any, @Req() req: Request) {
    const user = await this.authService.validate(body.email, body.password);
    (req.session as any).userId = Number(user.id);
    return { user };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req.session as any).userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const user = await this.authService.findById(userId);
    if (!user) throw new UnauthorizedException('Not authenticated');
    return { user: { id: String(user.id), email: user.email, name: user.name } };
  }
}
