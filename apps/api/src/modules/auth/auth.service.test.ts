import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { AppError } from "../../shared/errors";

describe("AuthService", () => {
  let authService: AuthService;
  let mockRepo: AuthRepository;

  beforeEach(() => {
    mockRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    } as unknown as AuthRepository;

    authService = new AuthService(mockRepo);
  });

  describe("register", () => {
    it("should throw conflict error if email is already registered", async () => {
      vi.mocked(mockRepo.findByEmail).mockResolvedValue({
        id: "user-1",
        name: "Existing",
        email: "test@example.com",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow(AppError.conflict("Email is already registered"));
    });

    it("should hash password and create user when email is available", async () => {
      vi.mocked(mockRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockRepo.create).mockResolvedValue({
        id: "user-new",
        name: "New User",
        email: "new@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        name: "New User",
        email: "new@example.com",
        password: "password123",
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("new@example.com");
    });
  });

  describe("login", () => {
    it("should throw unauthorized if user does not exist", async () => {
      vi.mocked(mockRepo.findByEmail).mockResolvedValue(null);

      await expect(
        authService.login({
          email: "missing@example.com",
          password: "password123",
        })
      ).rejects.toThrow(AppError.unauthorized("Invalid email or password"));
    });

    it("should throw unauthorized if password does not match", async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("correct-password", salt);

      vi.mocked(mockRepo.findByEmail).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrong-password",
        })
      ).rejects.toThrow(AppError.unauthorized("Invalid email or password"));
    });

    it("should return token and safe user on valid credentials", async () => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("correct-password", salt);

      vi.mocked(mockRepo.findByEmail).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.login({
        email: "test@example.com",
        password: "correct-password",
      });

      expect(result.token).toBeDefined();
      expect(result.user.id).toBe("user-1");
      expect(result.user.email).toBe("test@example.com");
    });
  });

  describe("getProfile", () => {
    it("should throw notFound if user does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(authService.getProfile("unknown-id")).rejects.toThrow(
        AppError.notFound("User not found")
      );
    });

    it("should return user profile if found", async () => {
      const user = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockRepo.findById).mockResolvedValue(user);

      const result = await authService.getProfile("user-1");
      expect(result).toEqual(user);
    });
  });
});
