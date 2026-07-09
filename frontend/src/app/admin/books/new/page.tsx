"use client";

import { useState, useEffect, useCallback } from "react";
import { BookImportSearch } from "./components/BookImportSearch";
import { BookForm } from "./components/BookForm";
import { SaveActionsBar } from "./components/SaveActionsBar";
import { FormStepIndicator, STEPS } from "./components/FormStepIndicator";
import { BookFormData, OpenLibraryResult, ValidationErrors } from "./types";
import { mapOpenLibraryToFormData, validateBookForm } from "./utils";
import { CheckCircle2, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { handleCreateBook, ServerActionResult } from "../actions/book-actions";
import { BookPayload } from "@/lib/api/books";

const FORMAT_NAMES = ["Hardcover", "Paperback", "E-Book", "Audiobook"];

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
  formatPrices: FORMAT_NAMES.map((format) => ({ format, price: "" })),
};

const DRAFT_STORAGE_KEY = "admin_book_draft";

// ─── Per-step validation ────────────────────────────────────────
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
      // Catalog info — all optional, but catch format issues
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
      // Validate format prices
      if (data.formatPrices && data.formatPrices.length > 0) {
        for (const fp of data.formatPrices) {
          if (fp.price) {
            const fpPrice = Number(fp.price);
            if (isNaN(fpPrice) || fpPrice < 0) {
              errors[`formatPrice_${fp.format}`] = `${fp.format} price must be 0 or more`;
            }
          }
        }
      }
      const stock = Number(data.stock);
      if (isNaN(stock) || stock < 0) errors.stock = "Stock must be 0 or more";
      break;
    }
    case 4: {
      // Media — all optional, nothing to validate
      break;
    }
  }

  return errors;
}

export default function AddBookPage() {
  const [formData, setFormData] = useState<BookFormData>(emptyFormData);
  const [importedData, setImportedData] = useState<OpenLibraryResult | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const [importPanelOpen, setImportPanelOpen] = useState(true);

  // ── Multi-step state ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || emptyFormData);
        setImportedData(parsed.importedData || null);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps);
      }
    } catch (e) {
      console.error("Failed to load draft:", e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        formData,
        importedData,
        currentStep,
        completedSteps,
      }));
    }
  }, [formData, importedData, isHydrated, currentStep, completedSteps]);

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
    setErrors(prev => ({ ...prev, ...stepValidation }));

    if (Object.keys(stepValidation).length > 0) {
      setStepErrors(prev => ({ ...prev, [currentStep]: true }));
      return false;
    }

    // Mark step as completed
    setStepErrors(prev => ({ ...prev, [currentStep]: false }));
    setCompletedSteps(prev => prev.includes(currentStep) ? prev : [...prev, currentStep]);
    return true;
  }, [currentStep, formData]);

  const handleNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      // Clear errors for this step before moving on
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

  const handleStepClick = useCallback((step: number) => {
    // Allow clicking on already completed steps or the next unlocked step
    if (completedSteps.includes(step) || step <= currentStep) {
      setErrors({});
      goToStep(step);
    }
  }, [completedSteps, currentStep, goToStep]);

  // ── Form actions ──────────────────────────────────────────────
  const handleImportBook = (book: OpenLibraryResult) => {
    setImportedData(book);
    const mapped = mapOpenLibraryToFormData(book);
    setFormData(prev => ({
      ...prev,
      ...mapped,
    }));
    setErrors({});
    setSuccessMessage("Imported metadata loaded. You can now edit the details.");
  };

  const handleResetImport = () => {
    if (importedData) {
      const mapped = mapOpenLibraryToFormData(importedData);
      setFormData(prev => ({ ...prev, ...mapped }));
      setErrors({});
      setSuccessMessage("Reverted to imported metadata.");
    }
  };

  const handleClearForm = () => {
    if (window.confirm("Are you sure you want to clear the form? All unsaved changes will be lost.")) {
      setFormData(emptyFormData);
      setImportedData(null);
      setErrors({});
      setCompletedSteps([]);
      setStepErrors({});
      setCurrentStep(1);
      setSuccessMessage("Form cleared.");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      scrollToTop();
    }
  };

  const handleSaveDraft = () => {
    // Validate all steps before final save
    const allErrors: ValidationErrors = {};
    for (let step = 1; step <= STEPS.length; step++) {
      const stepValidation = validateStep(step, formData);
      Object.assign(allErrors, stepValidation);
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Go to the first step that has errors
      for (let step = 1; step <= STEPS.length; step++) {
        const stepValidation = validateStep(step, formData);
        if (Object.keys(stepValidation).length > 0) {
          setCurrentStep(step);
          setStepErrors(prev => ({ ...prev, [step]: true }));
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
      formatPrices: formData.formatPrices
        ? formData.formatPrices
            .filter((fp) => fp.price !== "")
            .map((fp) => ({ format: fp.format, price: Number(fp.price) }))
        : undefined,
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

    handleCreateBook(payload as BookPayload)
      .then((result: ServerActionResult<unknown>) => {
        if (result.success) {
          setErrors({});
          setSuccessMessage("Book created successfully! Redirecting...");
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setCompletedSteps([]);
          setStepErrors({});
          // Redirect to books list after a brief delay so user sees the success message
          setTimeout(() => {
            router.replace("/admin/books");
          }, 1200);
        } else {
          setRequestError(result.error || "Failed to create book");
        }

        scrollToTop();
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-20 flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
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
              Add New Book
            </h1>
            <p className="text-text-secondary text-lg font-medium opacity-80">
              Import metadata or create a new book entry manually.
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
          
          {/* Import Search Sidebar — collapsible with fluid animation */}
          {!isReviewStep && (
            <motion.div 
              initial={{ opacity: 0, x: -20, width: 420 }}
              animate={{ 
                opacity: importPanelOpen ? 1 : 0,
                x: importPanelOpen ? 0 : -20,
                width: importPanelOpen ? 420 : 0,
              }}
              transition={{ 
                duration: 0.45, 
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden shrink-0 z-10"
            >
              <div className="w-[420px] relative">
                {/* Collapse button */}
                {importPanelOpen && (
                  <button
                    type="button"
                    onClick={() => setImportPanelOpen(false)}
                    className="absolute top-6 right-6 z-20 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/70" />
                  </button>
                )}
                <BookImportSearch 
                  onImportBook={handleImportBook} 
                  selectedKey={importedData?.key} 
                />
              </div>
            </motion.div>
          )}

          {/* Slim collapsed tab */}
          {!isReviewStep && !importPanelOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              type="button"
              onClick={() => setImportPanelOpen(true)}
              className="flex items-center gap-3 px-3 py-8 rounded-2xl bg-card/40 border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
              <span 
                className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-text-secondary"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                Import
              </span>
            </motion.button>
          )}

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
                  {isReviewStep ? "Review & Publish" : STEPS.find(s => s.id === currentStep)?.label || "Book Details"}
                </h2>
                <p className="text-text-secondary text-base opacity-70">
                  {isReviewStep 
                    ? "Verify all information before publishing the book to the catalog."
                    : `Step ${currentStep} of ${STEPS.length - 1} — ${STEPS.find(s => s.id === currentStep)?.description || ""}`
                  }
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
                    onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
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
                {/* Navigation hint */}
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
                    onSave={handleSaveDraft}
                    onClear={handleClearForm}
                    onResetImport={handleResetImport}
                    hasImportedData={!!importedData}
                    isSaving={isSaving}
                    currentStep={currentStep}
                    onPrevStep={handlePrevStep}
                    isReviewStep={isReviewStep}
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
