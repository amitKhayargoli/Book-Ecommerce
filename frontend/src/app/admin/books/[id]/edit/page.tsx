"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookForm } from "@/app/admin/books/new/components/BookForm";
import { SaveActionsBar } from "@/app/admin/books/new/components/SaveActionsBar";
import { FormStepIndicator, STEPS } from "@/app/admin/books/new/components/FormStepIndicator";
import { BookFormData, ValidationErrors } from "@/app/admin/books/new/types";
import { CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hanldeGetBookById, handleUpdateBook, ServerActionResult } from "../../actions/book-actions";
import { BookPayload } from "@/lib/api/books";

const emptyFormData: BookFormData = {
  title: "",
  slug: "",
  description: "",
  author: "",
  language: "",
  publishedYear: "",
  genres: [],
  subjects: [],
  price: "",
  discountPrice: "",
  stock: "0",
  isFeatured: false,
  isTrending: false,
  status: "DRAFT",
  coverImageUrl: "",
  mockupImageUrl: "",
  previewImages: [],
};

// ─── Per-step validation (same as new book page) ─────────────────
function validateStep(step: number, data: BookFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  switch (step) {
    case 1: {
      if (!data.title.trim()) errors.title = "Title is required";
      if (!data.slug.trim()) errors.slug = "Slug is required";
      if (!data.author.trim()) errors.author = "Author is required";
      break;
    }
    case 2: {
      if (data.publishedYear) {
        const year = Number(data.publishedYear);
        const maxYear = new Date().getFullYear() + 5;
        if (isNaN(year) || year < 1000 || year > maxYear) errors.publishedYear = "Enter a valid year";
      }
      break;
    }
    case 3: {
      const price = Number(data.price);
      if (!Number.isFinite(price) || price <= 0) {
        errors.price = "Price must be greater than 0";
      }
      if (data.discountPrice) {
        const discountPrice = Number(data.discountPrice);
        if (isNaN(discountPrice) || discountPrice < 0) errors.discountPrice = "Check discount price";
        if (discountPrice > price) errors.discountPrice = "Discount cannot exceed price";
      }
      const stock = Number(data.stock);
      if (isNaN(stock) || stock < 0) errors.stock = "Stock must be 0 or more";
      break;
    }
    case 4: {
      break;
    }
  }

  return errors;
}

/** Map API book response to BookFormData */
function mapApiBookToFormData(apiBook: Record<string, unknown>): BookFormData {
  const author = ((apiBook.author as Record<string, unknown>)?.name as string) ?? "";
  const genres = ((apiBook.genres as Array<Record<string, unknown>>) ?? []).map(
    (g) => (g.name as string) ?? ""
  ).filter(Boolean);

  const publishedAt = apiBook.publishedAt as string | null;
  const publishedYear = publishedAt ? new Date(publishedAt).getFullYear().toString() : "";

  return {
    title: (apiBook.title as string) ?? "",
    slug: (apiBook.slug as string) ?? "",
    description: (apiBook.description as string) ?? "",
    author,
    language: (apiBook.language as string) ?? "",
    publishedYear,
    genres,
    subjects: [],
    price: (apiBook.price as number)?.toString() ?? "",
    discountPrice: (apiBook.discountPrice as number)?.toString() ?? "",
    stock: (apiBook.stock as number)?.toString() ?? "0",
    isFeatured: (apiBook.featured as boolean) ?? false,
    isTrending: (apiBook.trending as boolean) ?? false,
    status: "DRAFT",
    coverImageUrl: (apiBook.coverImage as string) ?? "",
    mockupImageUrl: (apiBook.mockupImage as string) ?? "",
    previewImages: (apiBook.previewImages as string[]) ?? [],
  };
}

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [formData, setFormData] = useState<BookFormData>(emptyFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Multi-step state ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1, 2, 3, 4]);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Load book data ────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;

    setIsLoading(true);
    setLoadError(null);

    hanldeGetBookById(bookId)
      .then((result: ServerActionResult<unknown>) => {
        if (result.success && result.data) {
          const mapped = mapApiBookToFormData(result.data as Record<string, unknown>);
          setFormData(mapped);
        } else {
          setLoadError(result.error || "Failed to load book");
        }
      })
      .catch(() => {
        setLoadError("Failed to load book data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [bookId]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ── Step navigation ───────────────────────────────────────────
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
      scrollToTop();
    }
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const stepValidation = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, ...stepValidation }));

    if (Object.keys(stepValidation).length > 0) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: true }));
      return false;
    }

    setStepErrors((prev) => ({ ...prev, [currentStep]: false }));
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    return true;
  }, [currentStep, formData]);

  const handleNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      setErrors({});
      if (currentStep < STEPS.length) {
        goToStep(currentStep + 1);
      }
    } else {
      scrollToTop();
    }
  }, [currentStep, validateCurrentStep, goToStep]);

  const handlePrevStep = useCallback(() => {
    setErrors({});
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      if (completedSteps.includes(step) || step <= currentStep) {
        setErrors({});
        goToStep(step);
      }
    },
    [completedSteps, currentStep, goToStep]
  );

  // ── Save handler ──────────────────────────────────────────────
  const handleSave = () => {
    const allErrors: ValidationErrors = {};
    for (let step = 1; step <= STEPS.length; step++) {
      const stepValidation = validateStep(step, formData);
      Object.assign(allErrors, stepValidation);
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      for (let step = 1; step <= STEPS.length; step++) {
        const stepValidation = validateStep(step, formData);
        if (Object.keys(stepValidation).length > 0) {
          setCurrentStep(step);
          setStepErrors((prev) => ({ ...prev, [step]: true }));
          scrollToTop();
          return;
        }
      }
      return;
    }

    const toNumber = (value: string | number): number => Number(value);
    const toOptionalNumber = (value: string | number): number | undefined => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim().toLowerCase(),
      description:
        formData.description.trim() || `No description provided for ${formData.title.trim()}`,
      price: toNumber(formData.price),
      discountPrice: toOptionalNumber(formData.discountPrice),
      stock: toNumber(formData.stock),
      publishedAt: formData.publishedYear
        ? `${Number(formData.publishedYear)}-01-01T00:00:00.000Z`
        : undefined,
      language: formData.language.trim() || undefined,
      coverImage: formData.coverImageUrl.trim() || undefined,
      mockupImage: formData.mockupImageUrl.trim() || undefined,
      previewImages: formData.previewImages.filter((img) => img.trim().length > 0),
      featured: formData.isFeatured,
      trending: formData.isTrending,
      authorName: formData.author.trim(),
      genreNames: formData.genres,
    };

    setIsSaving(true);
    setRequestError(null);

    handleUpdateBook(bookId, payload as BookPayload)
      .then((result: ServerActionResult<unknown>) => {
        if (result.success) {
          setErrors({});
          setSuccessMessage("Book updated successfully! Redirecting...");
          setTimeout(() => {
            router.replace("/admin/books");
          }, 1200);
        } else {
          setRequestError(result.error || "Failed to update book");
        }
        scrollToTop();
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
        <div className="text-text-secondary">Loading book data...</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg font-medium">{loadError}</p>
          <button
            type="button"
            onClick={() => router.push("/admin/books")}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            Back to books
          </button>
        </div>
      </main>
    );
  }

  const isReviewStep = currentStep === STEPS.length;

  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white mb-3">
              Edit Book
            </h1>
            <p className="text-text-secondary text-lg font-medium opacity-80">
              Update details for &ldquo;{formData.title}&rdquo;
            </p>
            {requestError && (
              <p className="mt-3 text-sm font-semibold text-red-300/90">{requestError}</p>
            )}
          </div>

          <div className="flex items-center gap-3 h-10">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-white/5 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-medium border border-white/10"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                {successMessage}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Step Indicator ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 bg-card/30 backdrop-blur-3xl border border-white/5 rounded-[32px] p-6 md:p-8"
        >
          <FormStepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
            stepErrors={stepErrors}
          />
        </motion.div>

        {/* ── Main Content ───────────────────────────────────────── */}
        <div className="flex flex-col xl:flex-row gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex-1 w-full min-w-0 ${isReviewStep ? "max-w-4xl mx-auto" : ""}`}
          >
            {/* Form Card */}
            <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="mb-10 pb-8 border-b border-white/5">
                <h2 className="text-2xl font-display font-semibold text-white mb-2">
                  {isReviewStep
                    ? "Review & Save"
                    : STEPS.find((s) => s.id === currentStep)?.label || "Book Details"}
                </h2>
                <p className="text-text-secondary text-base opacity-70">
                  {isReviewStep
                    ? "Verify all changes before saving."
                    : `Step ${currentStep} of ${STEPS.length - 1} — ${STEPS.find((s) => s.id === currentStep)?.description || ""}`}
                </p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <BookForm
                    data={formData}
                    onChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
                    errors={errors}
                    currentStep={currentStep}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <div>
                {currentStep > 1 && !isReviewStep && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-white/20 font-medium hidden sm:block">
                  Step {currentStep} of {STEPS.length}
                </span>

                {!isReviewStep ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-8 py-3 text-sm font-black text-black bg-white hover:bg-white/90 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 uppercase tracking-tighter"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <SaveActionsBar
                    onSave={handleSave}
                    onClear={() => router.push("/admin/books")}
                    onResetImport={() => {}}
                    hasImportedData={false}
                    isSaving={isSaving}
                    currentStep={currentStep}
                    onPrevStep={handlePrevStep}
                    isReviewStep={isReviewStep}
                    saveLabel="Save Changes"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
