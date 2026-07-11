// ─── Mocks must come first (jest hoists jest.mock above imports) ──
jest.mock("@prisma/client", () => {
  const mockPrisma = {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => ({
      user: mockPrisma,
      address: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      book: {
        findMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
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

// ─── Capture Prisma mock instance at module load time ─────────────
const prismaMock = (PrismaClient as unknown as jest.Mock).mock
  .results[0].value as {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
  };
  address: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  book: {
    findMany: jest.Mock;
  };
  order: {
    create: jest.Mock;
  };
};

// ─── Shared test data ─────────────────────────────────────────────
const USER_ID = "user-123";
const BOOK_1_ID = "book-111";
const BOOK_2_ID = "book-222";
const MISSING_BOOK_TITLE = "Non-existent Book";

// Factory for a minimal export JSON structure
function makeExportData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    exportedAt: "2026-07-08T12:00:00.000Z",
    user: {
      id: USER_ID,
      name: "Imported Name",
      email: "test@example.com",
      role: "CUSTOMER",
    },
    orders: [],
    reviews: [],
    activityLog: [],
    ...overrides,
  };
}

// Factory for a mock order entry as it appears in the export
function makeExportedOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "DELIVERED",
    totalAmount: 59.99,
    paymentStatus: "PAID",
    paymentProvider: "ESEWA",
    items: [
      { bookTitle: "Book One", quantity: 1, price: 29.99 },
      { bookTitle: "Book Two", quantity: 2, price: 15.00 },
    ],
    address: {
      fullName: "John Doe",
      phone: "555-1234",
      street: "123 Main St",
      city: "Kathmandu",
      state: "Bagmati",
      postalCode: "44600",
      country: "Nepal",
      isDefault: true,
    },
    ...overrides,
  };
}

describe("AuthService - importData", () => {
  let service: AuthService;

  beforeEach(() => {
    // Reset all mock functions
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.address.findMany.mockReset();
    prismaMock.address.create.mockReset();
    prismaMock.book.findMany.mockReset();
    prismaMock.order.create.mockReset();

    service = new AuthService();
  });

  // ─── Profile name import ───────────────────────────────────────
  it("should import the profile name from export data", async () => {
    prismaMock.user.update.mockResolvedValue({ id: USER_ID, name: "Imported Name" });

    const importData = makeExportData();
    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: "Imported Name" },
    });
    expect(result.message).toContain("profile");
  });

  it("should skip profile update when no name is provided", async () => {
    const importData = makeExportData({ user: { id: USER_ID, email: "test@example.com" } });

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result.message).toContain("No new information");
  });

  // ─── Address restoration ───────────────────────────────────────
  it("should create addresses from exported order address data", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.address.create.mockResolvedValue({ id: "addr-1" } as any);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
      { id: BOOK_2_ID, title: "Book Two" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [makeExportedOrder()],
    });

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.address.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        fullName: "John Doe",
        phone: "555-1234",
        street: "123 Main St",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        country: "Nepal",
        isDefault: true,
      },
    });
    expect(result.message).toContain("address");
  });

  // ─── Address deduplication ─────────────────────────────────────
  it("should skip duplicate addresses that already exist", async () => {
    // Simulate existing address with same street/city/postalCode
    prismaMock.address.findMany.mockResolvedValue([
      { street: "123 Main St", city: "Kathmandu", postalCode: "44600" },
    ] as any);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
      { id: BOOK_2_ID, title: "Book Two" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [makeExportedOrder()],
    });

    const result = await service.importData(USER_ID, importData);

    // Should NOT have called address.create since the address already exists
    expect(prismaMock.address.create).not.toHaveBeenCalled();
    expect(result.message).not.toContain("address");
  });

  it("should deduplicate addresses within the same import data", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.address.create.mockResolvedValue({ id: "addr-1" } as any);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
      { id: BOOK_2_ID, title: "Book Two" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    // Two orders with the same address
    const importData = makeExportData({
      orders: [
        makeExportedOrder(),
        makeExportedOrder({ totalAmount: 99.99 }),
      ],
    });

    const result = await service.importData(USER_ID, importData);

    // Should only create ONE address
    expect(prismaMock.address.create).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("1 address");
  });

  // ─── Order restoration ─────────────────────────────────────────
  it("should create orders with resolved book IDs", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
      { id: BOOK_2_ID, title: "Book Two" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [makeExportedOrder()],
    });

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
    const orderCreateCall = prismaMock.order.create.mock.calls[0][0];
    expect(orderCreateCall.data.userId).toBe(USER_ID);
    expect(orderCreateCall.data.items.create).toEqual([
      { bookId: BOOK_1_ID, quantity: 1, price: 29.99 },
      { bookId: BOOK_2_ID, quantity: 2, price: 15.00 },
    ]);
    // Should use a newly generated transaction UUID
    expect(orderCreateCall.data.paymentTransactionUuid).toEqual(expect.any(String));
    expect(result.message).toContain("1 order(s) with 2 item(s)");
  });

  // ─── Graceful missing books ────────────────────────────────────
  it("should skip orders when a book cannot be found in the catalog", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    // Only return one book, so the second item's book won't be found
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
    ]);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [makeExportedOrder()],
    });

    const result = await service.importData(USER_ID, importData);

    // Order should be skipped entirely
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.message).toContain("skipped");
    expect(result.message).toContain("books not found");
  });

  it("should partially restore orders when some have missing books and others don't", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
      { id: BOOK_2_ID, title: "Book Two" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [
        // This order has books that exist
        makeExportedOrder(),
        // This order references a book that doesn't exist
        makeExportedOrder({
          items: [{ bookTitle: MISSING_BOOK_TITLE, quantity: 1, price: 10.00 }],
        }),
      ],
    });

    const result = await service.importData(USER_ID, importData);

    // First order should be created, second should be skipped
    expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("1 order(s) with 2 item(s)");
    expect(result.message).toContain("1 order(s) skipped");
  });

  // ─── Empty import data ─────────────────────────────────────────
  it("should handle import data with no user, orders, or reviews gracefully", async () => {
    const importData = makeExportData({
      user: {},
      orders: [],
    });

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.address.create).not.toHaveBeenCalled();
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.message).toContain("No new information");
  });

  // ─── Invalid status values ─────────────────────────────────────
  it("should fall back to PENDING for invalid order status values", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [
        makeExportedOrder({
          status: "INVALID_STATUS",
          paymentStatus: "UNKNOWN",
          items: [{ bookTitle: "Book One", quantity: 1, price: 10.00 }],
        }),
      ],
    });

    await service.importData(USER_ID, importData);

    const orderCreateCall = prismaMock.order.create.mock.calls[0][0];
    expect(orderCreateCall.data.status).toBe("PENDING");
    expect(orderCreateCall.data.paymentStatus).toBe("PENDING");
  });

  // ─── No orders at all ──────────────────────────────────────────
  it("should not fail when orders array is missing entirely", async () => {
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData();
    delete importData.orders;

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.address.findMany).not.toHaveBeenCalled();
    expect(prismaMock.book.findMany).not.toHaveBeenCalled();
    expect(result.message).toContain("profile");
  });

  // ─── Order with no items ───────────────────────────────────────
  it("should skip orders with no items", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.address.create.mockResolvedValue({ id: "addr-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [makeExportedOrder({ items: [] })],
    });

    const result = await service.importData(USER_ID, importData);

    // Order should not be created
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(prismaMock.book.findMany).not.toHaveBeenCalled();
    // Address and profile should still be imported from the order data
    expect(result.message).toContain("profile");
    expect(result.message).toContain("address");
    expect(result.message).toContain("skipped");
  });

  // ─── Multiple addresses from multiple orders ───────────────────
  it("should create multiple unique addresses from multiple orders", async () => {
    prismaMock.address.findMany.mockResolvedValue([]);
    prismaMock.address.create.mockResolvedValue({ id: "addr-1" } as any);
    prismaMock.book.findMany.mockResolvedValue([
      { id: BOOK_1_ID, title: "Book One" },
    ]);
    prismaMock.order.create.mockResolvedValue({ id: "order-1" } as any);
    prismaMock.user.update.mockResolvedValue({ id: USER_ID } as any);

    const importData = makeExportData({
      orders: [
        makeExportedOrder({
          address: { fullName: "Alice", street: "1 Alpha Rd", city: "CityA", postalCode: "10001", country: "Nepal", isDefault: true },
          items: [{ bookTitle: "Book One", quantity: 1, price: 10 }],
        }),
        makeExportedOrder({
          address: { fullName: "Bob", street: "2 Beta Ave", city: "CityB", postalCode: "20002", country: "Nepal", isDefault: false },
          items: [{ bookTitle: "Book One", quantity: 1, price: 10 }],
        }),
      ],
    });

    const result = await service.importData(USER_ID, importData);

    expect(prismaMock.address.create).toHaveBeenCalledTimes(2);
    expect(result.message).toContain("2 address");
    expect(result.message).toContain("2 order(s)");
  });
});
