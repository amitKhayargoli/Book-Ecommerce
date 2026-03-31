"use client";

import { useState, useEffect } from "react";
import { BookImportSearch } from "./components/BookImportSearch";
import { BookForm } from "./components/BookForm";
import { SaveActionsBar } from "./components/SaveActionsBar";
import { BookFormData, OpenLibraryResult, ValidationErrors } from "./types";
import { mapOpenLibraryToFormData, validateBookForm } from "./utils";
import { CheckCircle2 } from "lucide-react";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import CustomCursor from "../../../../components/CustomCursor";
import { motion } from "framer-motion";

const emptyFormData: BookFormData = {
  title: "",
  slug: "",
  description: "",
  author: "",
  publisher: "",
  isbn: "",
  language: "",
  pages: "",
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

const DRAFT_STORAGE_KEY = "admin_book_draft";

export default function AddBookPage() {
  const [formData, setFormData] = useState<BookFormData>(emptyFormData);
  const [importedData, setImportedData] = useState<OpenLibraryResult | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || emptyFormData);
        setImportedData(parsed.importedData || null);
      }
    } catch (e) {
      console.error("Failed to load draft:", e);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData, importedData }));
    }
  }, [formData, importedData, isClient]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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
      setSuccessMessage("Form cleared.");
    }
  };

  const handleSaveDraft = () => {
    const validationErrors = validateBookForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    setErrors({});
    console.log("Draft saved:", formData);
    setSuccessMessage("Draft prepared locally and saved to browser storage.");
  };

  if (!isClient) return null;

  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white mb-3">
                Add New Book
              </h1>
              <p className="text-text-secondary text-lg font-medium opacity-80">
                Import metadata or create a new book entry manually.
              </p>
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

          <div className="flex flex-col xl:flex-row gap-12 items-start">
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full xl:w-[420px] shrink-0 z-10"
            >
              <BookImportSearch 
                onImportBook={handleImportBook} 
                selectedKey={importedData?.key} 
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full min-w-0"
            >
              <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="mb-10 pb-8 border-b border-white/5">
                  <h2 className="text-2xl font-display font-semibold text-white mb-2">Book Details</h2>
                  <p className="text-text-secondary text-base opacity-70">Review and curate the catalog data before publishing.</p>
                </div>

                <BookForm 
                  data={formData} 
                  onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
                  errors={errors}
                />
              </div>

              {/* Action Bar inside main column for better flow */}
              <div className="mt-12 flex justify-end">
                <SaveActionsBar 
                  onSave={handleSaveDraft}
                  onClear={handleClearForm}
                  onResetImport={handleResetImport}
                  hasImportedData={!!importedData}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
