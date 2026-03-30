import { BookRepository } from "../repositories/book.repository";
import { CreateBookDto, UpdateBookDto, BookQueryDto } from "../dto/book.dto";
import { NotFoundError, ConflictError } from "../utils/errors";
import { buildPaginationMeta } from "../utils/response";
import {
  IBookService,
  BookResponse,
  BookSummary,
  PaginatedBooksResponse,
  toBookResponse,
  toBookSummary,
} from "../types/book.types";

export class BookService implements IBookService {
  private readonly repo: BookRepository;

  constructor() {
    this.repo = new BookRepository();
  }

  async getBooks(query: BookQueryDto): Promise<PaginatedBooksResponse> {
    const { books, total } = await this.repo.findMany(query);
    const meta = buildPaginationMeta(total, query.page, query.limit);
    return { books: books.map(toBookResponse), meta };
  }

  async getBookById(id: string): Promise<BookResponse> {
    const book = await this.repo.findById(id);
    if (!book) throw new NotFoundError("Book");
    return toBookResponse(book);
  }

  async getBookBySlug(slug: string): Promise<BookResponse> {
    const book = await this.repo.findBySlug(slug);
    if (!book) throw new NotFoundError("Book");
    return toBookResponse(book);
  }

  async createBook(dto: CreateBookDto): Promise<BookResponse> {
    const slugTaken = await this.repo.existsBySlug(dto.slug);
    if (slugTaken)
      throw new ConflictError(`Slug "${dto.slug}" is already in use`);
    return toBookResponse(await this.repo.create(dto));
  }

  async updateBook(id: string, dto: UpdateBookDto): Promise<BookResponse> {
    const exists = await this.repo.existsById(id);
    if (!exists) throw new NotFoundError("Book");
    return toBookResponse(await this.repo.update(id, dto));
  }

  async deleteBook(id: string): Promise<void> {
    const exists = await this.repo.existsById(id);
    if (!exists) throw new NotFoundError("Book");
    await this.repo.delete(id);
  }

  async getFeaturedBooks(limit?: number): Promise<BookSummary[]> {
    return (await this.repo.findFeatured(limit)).map(toBookSummary);
  }

  async getTrendingBooks(limit?: number): Promise<BookSummary[]> {
    return (await this.repo.findTrending(limit)).map(toBookSummary);
  }

  async getBooksByAuthor(authorId: string): Promise<BookSummary[]> {
    return (await this.repo.findByAuthor(authorId)).map(toBookSummary);
  }

  async toggleFeatured(id: string): Promise<BookResponse> {
    const book = await this.repo.findById(id);
    if (!book) throw new NotFoundError("Book");
    return toBookResponse(
      await this.repo.update(id, { featured: !book.featured }),
    );
  }

  async toggleTrending(id: string): Promise<BookResponse> {
    const book = await this.repo.findById(id);
    if (!book) throw new NotFoundError("Book");
    return toBookResponse(
      await this.repo.update(id, { trending: !book.trending }),
    );
  }
}
