import { Response } from "express";
import { BookService } from "../services/book.service";
import {
  CreateBookDto,
  UpdateBookDto,
  BookQueryDto,
  BookQuerySchema,
} from "../dto/book.dto";
import { sendSuccess, sendPaginated } from "../utils/response";
import {
  CreateBookRequest,
  UpdateBookRequest,
  GetBooksRequest,
  BookByIdRequest,
  BookBySlugRequest,
  BooksByAuthorRequest,
} from "../types/book.types";

export class BookController {
  private readonly service: BookService;

  constructor() {
    this.service = new BookService();
  }

  // GET /books
  getBooks = async (req: GetBooksRequest, res: Response): Promise<void> => {
    const query = BookQuerySchema.parse(req.query) as BookQueryDto;
    const { books, meta } = await this.service.getBooks(query);
    sendPaginated(res, books, meta, "Books fetched successfully");
  };

  // GET /books/featured
  getFeaturedBooks = async (
    req: BookByIdRequest,
    res: Response,
  ): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const books = await this.service.getFeaturedBooks(limit);
    sendSuccess(res, books, "Featured books fetched successfully");
  };

  // GET /books/trending
  getTrendingBooks = async (
    req: BookByIdRequest,
    res: Response,
  ): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const books = await this.service.getTrendingBooks(limit);
    sendSuccess(res, books, "Trending books fetched successfully");
  };

  // GET /books/:id
  getBookById = async (req: BookByIdRequest, res: Response): Promise<void> => {
    const book = await this.service.getBookById(req.params.id);
    sendSuccess(res, book, "Book fetched successfully");
  };

  // GET /books/slug/:slug
  getBookBySlug = async (
    req: BookBySlugRequest,
    res: Response,
  ): Promise<void> => {
    const book = await this.service.getBookBySlug(req.params.slug);
    sendSuccess(res, book, "Book fetched successfully");
  };

  // GET /books/author/:authorId
  getBooksByAuthor = async (
    req: BooksByAuthorRequest,
    res: Response,
  ): Promise<void> => {
    const books = await this.service.getBooksByAuthor(req.params.authorId);
    sendSuccess(res, books, "Books fetched successfully");
  };

  // POST /books
  createBook = async (req: CreateBookRequest, res: Response): Promise<void> => {
    const book = await this.service.createBook(req.body as CreateBookDto);
    sendSuccess(res, book, "Book created successfully", 201);
  };

  // PATCH /books/:id
  updateBook = async (req: UpdateBookRequest, res: Response): Promise<void> => {
    const book = await this.service.updateBook(
      req.params.id,
      req.body as UpdateBookDto,
    );
    sendSuccess(res, book, "Book updated successfully");
  };

  // DELETE /books/:id
  deleteBook = async (req: BookByIdRequest, res: Response): Promise<void> => {
    await this.service.deleteBook(req.params.id);
    sendSuccess(res, null, "Book deleted successfully");
  };

  // PATCH /books/:id/toggle-featured
  toggleFeatured = async (
    req: BookByIdRequest,
    res: Response,
  ): Promise<void> => {
    const book = await this.service.toggleFeatured(req.params.id);
    sendSuccess(
      res,
      book,
      `Book ${book.featured ? "marked as" : "removed from"} featured`,
    );
  };

  // PATCH /books/:id/toggle-trending
  toggleTrending = async (
    req: BookByIdRequest,
    res: Response,
  ): Promise<void> => {
    const book = await this.service.toggleTrending(req.params.id);
    sendSuccess(
      res,
      book,
      `Book ${book.trending ? "marked as" : "removed from"} trending`,
    );
  };
}
