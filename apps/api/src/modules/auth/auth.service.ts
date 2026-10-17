import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthResponse, AuthTokenPayload, AuthUser, LoginInput, RegisterInput } from "@erp/shared";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";
import { AuthRepository, authRepository } from "./auth.repository";

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("Email is already registered");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await this.repo.create({
      ...input,
      passwordHash,
    });

    const token = this.generateToken({ userId: user.id, email: user.email });

    return { token, user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const safeUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const token = this.generateToken({ userId: user.id, email: user.email });

    return { token, user: safeUser };
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return user;
  }

  private generateToken(payload: AuthTokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }
}

export const authService = new AuthService();
