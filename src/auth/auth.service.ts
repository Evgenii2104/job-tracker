import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async register(email: string, name: string, password: string) {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) throw new UnauthorizedException('User already exists');

    const hash = await bcrypt.hash(password, 10);
    const user = this.usersRepo.create({ email, name, passwordHash: hash });
    await this.usersRepo.save(user);
    return { id: String(user.id), email: user.email, name: user.name };
  }

  async validate(email: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { id: String(user.id), email: user.email, name: user.name };
  }

  async findById(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }
}