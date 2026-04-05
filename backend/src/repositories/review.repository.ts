import { PrismaClient } from "@prisma/client";
import { CreateReviewDto, ReviewQueryDto } from "../dto/review.dto";
import { IReviewRepository, ReviewRecord, reviewSelect } from "../types/review.types";

const prisma = new PrismaClient();

export class ReviewRepository implements IReviewRepository {
  async findManyByBookId(bookId: string, query: ReviewQueryDto): Promise<{ reviews: ReviewRecord[]; total: number }> {
    const { page, limit, sortBy, sortOrder } = query;

    const where = { bookId };

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        select: reviewSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.review.count({ where }),
    ]);

    return { reviews, total };
  }

  async existsByUserAndBook(userId: string, bookId: string): Promise<boolean> {
    const count = await prisma.review.count({
      where: { userId, bookId },
    });
    return count > 0;
  }

  async create(userId: string, bookId: string, dto: CreateReviewDto): Promise<ReviewRecord> {
    return prisma.review.create({
      data: {
        userId,
        bookId,
        rating: dto.rating,
        comment: dto.comment,
      },
      select: reviewSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.review.delete({ where: { id } });
  }

  async findById(id: string): Promise<ReviewRecord | null> {
    return prisma.review.findUnique({
      where: { id },
      select: reviewSelect,
    });
  }
}
