import prisma from "../lib/prisma";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { CreateAddressDto, UpdateAddressDto } from "../dto/address.dto";

export class AddressService {
  async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAddressById(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError("Address");
    }

    return address;
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    // If this is the user's first address, auto-set it as default
    const existingCount = await prisma.address.count({ where: { userId } });

    return prisma.address.create({
      data: {
        userId,
        fullName: dto.fullName,
        phone: dto.phone,
        country: dto.country ?? "Nepal",
        city: dto.city,
        state: dto.state ?? null,
        postalCode: dto.postalCode ?? "",
        street: dto.street,
        isDefault: existingCount === 0,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError("Address");
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestError("No fields to update");
    }

    return prisma.address.update({
      where: { id: addressId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state ?? null }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.street !== undefined && { street: dto.street }),
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError("Address");
    }

    // Check if address is linked to any orders
    const orderCount = await prisma.order.count({
      where: { addressId },
    });

    if (orderCount > 0) {
      throw new BadRequestError(
        "Cannot delete this address because it is linked to existing orders.",
      );
    }

    // If deleting the default address, assign default to the next most recent
    if (existing.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId, id: { not: addressId } },
        orderBy: { createdAt: "desc" },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return { message: "Address deleted successfully" };
  }

  async setDefault(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError("Address");
    }

    // Unset all other defaults for this user, then set this one
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return { message: "Default address updated" };
  }
}
