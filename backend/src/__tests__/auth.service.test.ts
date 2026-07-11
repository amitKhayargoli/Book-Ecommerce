// ─── Mocks must come first (jest hoists jest.mock above imports) ──
jest.mock("@prisma/client", () => {
  // Each mock function is created once in the factory closure
  const mockPrisma = {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => ({
      user: mockPrisma,
    })),
    UserRole: {
      CUSTOMER: "CUSTOMER",
      ADMIN: "ADMIN",
    },
  };
});

jest.mock("../utils/jwt", () => ({
  signAccessToken: jest.fn().mockReturnValue("mock-access-token"),
}));

// ─── Imports ──────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../services/auth.service";
import { UnauthorizedError, TooManyRequestsError } from "../utils/errors";
import bcrypt from "bcryptjs";

// ─── Capture Prisma mock instance at module load time ─────────────
// AuthService creates new PrismaClient() at module scope, so
// PrismaClient.mock.results[0] is populated during import.
const prismaMock = (PrismaClient as unknown as jest.Mock).mock
  .results[0].value as {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
};

// ─── Shared test data ─────────────────────────────────────────────
const VALID_PASSWORD = "correct-password";
const WRONG_PASSWORD = "wrong-password";
const TEST_EMAIL = "test@example.com";

function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: TEST_EMAIL,
    password: bcrypt.hashSync(VALID_PASSWORD, 4),
    role: "CUSTOMER",
    emailVerified: new Date(),
    failedLoginAttempts: 0,
    lockoutUntil: null,
    ...overrides,
  };
}

describe("AuthService - Lockout Logic", () => {
  let service: AuthService;

  beforeEach(() => {
    // Reset inner mock functions only (not the PrismaClient constructor)
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.user.create.mockReset();
    service = new AuthService();
  });

  // ─── User not found ───────────────────────────────────────────
  it("should throw UnauthorizedError when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: TEST_EMAIL, password: VALID_PASSWORD, captchaToken: "test-token" })
    ).rejects.toThrow(UnauthorizedError);

    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // ─── Account locked ───────────────────────────────────────────
  it("should throw TooManyRequestsError when account is currently locked (lockoutUntil in the future)", async () => {
    const futureLock = new Date(Date.now() + 60_000);
    prismaMock.user.findUnique.mockResolvedValue(
      buildMockUser({ lockoutUntil: futureLock })
    );

    await expect(
      service.login({ email: TEST_EMAIL, password: VALID_PASSWORD, captchaToken: "test-token" })
    ).rejects.toThrow(TooManyRequestsError);

    // Should NOT have called update on a locked account
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // ─── Lockout expired - resets counter then proceeds ───────────
  it("should reset failed attempts when lockout has expired and allow login with correct password", async () => {
    const pastLock = new Date(Date.now() - 60_000);
    const mockUser = buildMockUser({
      failedLoginAttempts: 15,
      lockoutUntil: pastLock,
    });
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({
      ...mockUser,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    const result = await service.login({
      email: TEST_EMAIL,
      password: VALID_PASSWORD,
      captchaToken: "test-token",
    });

    // Should have reset the counter
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });
    expect(result).toBeDefined();
    expect("mfaRequired" in result).toBe(false);
    expect((result as { accessToken: string }).accessToken).toBe("mock-access-token");
  });

  // ─── 14 failed → 1 more wrong → locks ────────────────────────
  it("should lock the account for 30 minutes after 15 failed attempts", async () => {
    const mockUser = buildMockUser({ failedLoginAttempts: 14 });
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      service.login({ email: TEST_EMAIL, password: WRONG_PASSWORD, captchaToken: "test-token" })
    ).rejects.toThrow(UnauthorizedError);

    const updateCalls = prismaMock.user.update.mock.calls;
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0][0]).toEqual({
      where: { id: "user-1" },
      data: {
        failedLoginAttempts: 15,
        lockoutUntil: expect.any(Date),
      },
    });
    // lockoutUntil should be ~30 minutes in the future
    const lockoutDate = updateCalls[0][0].data.lockoutUntil as Date;
    const msDiff = lockoutDate.getTime() - Date.now();
    expect(msDiff).toBeGreaterThan(29 * 60 * 1000);
    expect(msDiff).toBeLessThan(31 * 60 * 1000);
  });

  // ─── 10 failed → 1 more wrong → increments only ──────────────
  it("should increment failed attempts without locking before reaching 15", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      buildMockUser({ failedLoginAttempts: 10 })
    );

    await expect(
      service.login({ email: TEST_EMAIL, password: WRONG_PASSWORD, captchaToken: "test-token" })
    ).rejects.toThrow(UnauthorizedError);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 11 },
    });
  });

  // ─── Successful login resets counter ──────────────────────────
  it("should reset failed attempts to 0 on successful login", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      buildMockUser({ failedLoginAttempts: 5 })
    );

    const result = await service.login({
      email: TEST_EMAIL,
      password: VALID_PASSWORD,
      captchaToken: "test-token",
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });
    expect("mfaRequired" in result).toBe(false);
    const authResult = result as { accessToken: string; user: { email: string } };
    expect(authResult.accessToken).toBe("mock-access-token");
    expect(authResult.user.email).toBe(TEST_EMAIL);
  });

  // ─── Wrong password increments from 0 ─────────────────────────
  it("should increment failed attempts from 0 on wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      buildMockUser({ failedLoginAttempts: 0 })
    );

    await expect(
      service.login({ email: TEST_EMAIL, password: WRONG_PASSWORD, captchaToken: "test-token" })
    ).rejects.toThrow(UnauthorizedError);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 1 },
    });
  });
});
