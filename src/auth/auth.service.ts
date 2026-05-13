import {
   BadRequestException,
   ConflictException,
   Injectable,
   UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Register ─────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      fullName: dto.FullName,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      status: 1, // active by default (no email verification for now)
    });

    const token = this._signToken(user.id, user.email);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      token,
    };
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please login with your social account');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this._signToken(user.id, user.email);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      token,
    };
  }

  // ── Forgot Password (send OTP) ──────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If the email exists, an OTP has been sent' };
    }

    const otp = this._generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.usersService.update(user.id, {
      otp: { code: otp, expiresAt },
    } as any);

    // TODO: integrate email service to send OTP
    // For dev/testing, log OTP to console
    console.log(`[DEV] OTP for ${dto.email}: ${otp}`);
    return {
      message: 'OTP sent successfully',
    };
  }

  // ── Verify OTP ───────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const { code, expiresAt } = user.otp as { code: string; expiresAt: Date };

    if (code !== dto.code || new Date() > new Date(expiresAt)) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.usersService.update(user.id, {
      otp: undefined,
      resetToken: { token: resetToken, expiresAt: tokenExpiry },
    } as any);

    return { resetToken };
  }

  // ── Resend OTP ───────────────────────────────────────────────
  async resendOtp(dto: ResendOtpDto) {
    return this.forgotPassword(dto);
  }

  // ── Reset Password ───────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user || !user.resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { expiresAt } = user.resetToken as { token: string; expiresAt: Date };
    if (new Date() > new Date(expiresAt)) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetToken: undefined,
    } as any);

    return { message: 'Password reset successfully' };
  }

  // ── OAuth Login ──────────────────────────────────────────────
  async validateOAuthLogin(profile: any, provider: string): Promise<string> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      throw new BadRequestException('No email provided by OAuth provider');
    }

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user
      user = await this.usersService.create({
        fullName: profile.displayName || email.split('@')[0],
        email: email,
        status: 1,
        provider: provider,
        providerId: profile.id,
        avatar: profile.photos?.[0]?.value,
      });
    } else {
      // If user exists but it's first time with this provider, link it
      if (!user.providerId || user.provider !== provider) {
        await this.usersService.update(user.id, {
          provider: provider,
          providerId: profile.id,
        } as any);
      }
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return this._signToken(user.id, user.email);
  }

  // ── Private helpers ──────────────────────────────────────────
  private _signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  private _generateOtp(): string {
    // TODO: generate random OTP in production
    return '111111';
  }
}
