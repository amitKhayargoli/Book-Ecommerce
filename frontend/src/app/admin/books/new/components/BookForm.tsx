import { BookFormData, ValidationErrors } from "../types";
import { BookFormSection } from "./BookFormSection";
import { GenreSelector } from "./GenreSelector";
import { SubjectChips } from "./SubjectChips";
import { PreviewImagesField } from "./PreviewImagesField";
import { BookPreviewCard } from "./BookPreviewCard";
import { cn, generateSlug } from "../utils";
import { STEPS } from "./FormStepIndicator";

interface BookFormProps {
  data: BookFormData;
  onChange: (data: Partial<BookFormData>) => void;
  errors: ValidationErrors;
  currentStep: number;
}

export function BookForm({ data, onChange, errors, currentStep }: BookFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      onChange({ [name]: (e.target as HTMLInputElement).checked });
    } else {
      onChange({ [name]: value });
    }
  };

  const InputWrapper = ({ label, error, required, children }: { label: string, error?: string, required?: boolean, children: React.ReactNode }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-white/50 tracking-wide uppercase">
        {label} {required && <span className="text-romance">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-bold text-romance mt-2 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-romance" /> {error}</p>}
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 space-y-6">
        {currentStep === 1 && <BasicInfoStep data={data} onChange={onChange} errors={errors} InputWrapper={InputWrapper} />}
        {currentStep === 2 && <CatalogStep data={data} onChange={onChange} InputWrapper={InputWrapper} handleChange={handleChange} />}
        {currentStep === 3 && <PricingStep data={data} errors={errors} InputWrapper={InputWrapper} handleChange={handleChange} />}
        {currentStep === 4 && <MediaStep data={data} onChange={onChange} InputWrapper={InputWrapper} handleChange={handleChange} />}
        {currentStep === 5 && <ReviewStep data={data} />}
      </div>

      {/* Preview card sidebar (only shown on non-review steps, since review step has its own layout) */}
      {currentStep <= 4 && (
        <div className="hidden xl:block w-[320px] shrink-0">
          <BookPreviewCard data={data} />
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Basic Information ───────────────────────────────────
function BasicInfoStep({
  data, onChange, errors,
  InputWrapper
}: {
  data: BookFormData;
  onChange: (data: Partial<BookFormData>) => void;
  errors: ValidationErrors;
  InputWrapper: React.FC<{ label: string; error?: string; required?: boolean; children: React.ReactNode }>;
}) {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    // Auto-generate slug from title when slug is currently empty or was auto-generated
    if (!data.slug.trim() || data.slug === generateSlug(data.title)) {
      onChange({ title: newTitle, slug: generateSlug(newTitle) });
    } else {
      onChange({ title: newTitle });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ slug: e.target.value });
  };

  return (
    <BookFormSection title="Basic Information" description="The core details identifying this book.">
      <InputWrapper label="Book Title" error={errors.title} required>
        <input
          type="text"
          name="title"
          value={data.title}
          onChange={handleTitleChange}
          placeholder="e.g. The Hobbit"
          className={cn(
            "w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all font-medium text-base",
            errors.title ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20"
          )}
        />
      </InputWrapper>

      <InputWrapper label="URL Slug" error={errors.slug} required>
        <div className="flex">
          <span className="inline-flex items-center px-4 rounded-l-2xl border border-r-0 border-white/5 bg-white/[0.02] text-white/30 text-sm font-medium">
            /books/
          </span>
          <input
            type="text"
            name="slug"
            value={data.slug}
            onChange={handleSlugChange}
            placeholder="the-hobbit"
            className={cn(
              "flex-1 px-5 py-3 bg-white/[0.03] border rounded-r-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all",
              errors.slug ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20"
            )}
          />
        </div>
      </InputWrapper>

      <InputWrapper label="Author" error={errors.author} required>
        <input
          type="text"
          name="author"
          value={data.author}
          onChange={(e) => onChange({ author: e.target.value })}
          placeholder="e.g. J.R.R. Tolkien"
          className={cn(
            "w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all font-medium text-base",
            errors.author ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20"
          )}
        />
      </InputWrapper>

      <InputWrapper label="Description">
        <textarea
          name="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="A brief summary of the book..."
          className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all resize-y font-medium"
        />
      </InputWrapper>
    </BookFormSection>
  );
}

// ─── Step 2: Catalog Details ─────────────────────────────────────
function CatalogStep({
  data, onChange,
  InputWrapper, handleChange
}: {
  data: BookFormData;
  onChange: (data: Partial<BookFormData>) => void;
  InputWrapper: React.FC<{ label: string; error?: string; required?: boolean; children: React.ReactNode }>;
  handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}) {
  return (
    <BookFormSection title="Catalog Details" description="Metadata for library and search categorization.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <InputWrapper label="Publisher">
          <input type="text" name="publisher" value={data.publisher} onChange={handleChange} placeholder="e.g. HarperCollins" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
        </InputWrapper>

        <InputWrapper label="Language">
          <input type="text" name="language" value={data.language} onChange={handleChange} placeholder="e.g. English" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
        </InputWrapper>

        <InputWrapper label="ISBN">
          <input type="text" name="isbn" value={data.isbn} onChange={handleChange} placeholder="978-0-00-000000-0" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all font-mono text-sm uppercase tracking-widest" />
        </InputWrapper>

        <InputWrapper label="Pages">
          <input type="number" name="pages" value={data.pages} onChange={handleChange} min="0" placeholder="e.g. 310" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
        </InputWrapper>

        <InputWrapper label="Published Year">
          <input type="number" name="publishedYear" value={data.publishedYear} onChange={handleChange} placeholder="YYYY" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
        </InputWrapper>
      </div>

      <div className="pt-2">
        <InputWrapper label="Genres">
          <GenreSelector 
            selectedGenres={data.genres} 
            onChange={(genres) => onChange({ genres })} 
          />
        </InputWrapper>
      </div>

      <div className="pt-2">
        <InputWrapper label="Subjects / Tags">
          <SubjectChips 
            subjects={data.subjects} 
            onChange={(subjects) => onChange({ subjects })} 
          />
        </InputWrapper>
      </div>
    </BookFormSection>
  );
}

// ─── Step 3: Pricing & Inventory ─────────────────────────────────
function PricingStep({
  data, errors,
  InputWrapper, handleChange
}: {
  data: BookFormData;
  errors: ValidationErrors;
  InputWrapper: React.FC<{ label: string; error?: string; required?: boolean; children: React.ReactNode }>;
  handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}) {
  return (
    <BookFormSection title="Pricing & Inventory" description="Pricing, stock levels, and visibility controls.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InputWrapper label="Base Price (NPR)" error={errors.price} required>
          <input type="number" name="price" value={data.price} onChange={handleChange} step="0.01" min="0" placeholder="0.00" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10", errors.price ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
        </InputWrapper>

        <InputWrapper label="Discount Price (NPR)" error={errors.discountPrice}>
          <input type="number" name="discountPrice" value={data.discountPrice} onChange={handleChange} step="0.01" min="0" placeholder="0.00" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10", errors.discountPrice ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
        </InputWrapper>

        <InputWrapper label="Stock Quantity" error={errors.stock} required>
          <input type="number" name="stock" value={data.stock} onChange={handleChange} min="0" placeholder="0" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10", errors.stock ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
        </InputWrapper>
      </div>

      {/* Toggle Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/5 mt-8">
        <label className="flex items-center gap-4 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" name="isFeatured" checked={data.isFeatured} onChange={handleChange} className="sr-only peer" />
            <div className="w-12 h-7 bg-white/5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-transparent after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-fantasy"></div>
          </div>
          <div>
            <span className="block text-sm font-bold text-white group-hover:text-white transition-colors uppercase tracking-wider">Featured Book</span>
            <span className="block text-xs text-text-secondary opacity-60">Show on homepage hero</span>
          </div>
        </label>

        <label className="flex items-center gap-4 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" name="isTrending" checked={data.isTrending} onChange={handleChange} className="sr-only peer" />
            <div className="w-12 h-7 bg-white/5 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-transparent after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-drama"></div>
          </div>
          <div>
            <span className="block text-sm font-bold text-white group-hover:text-white transition-colors uppercase tracking-wider">Trending Badge</span>
            <span className="block text-xs text-text-secondary opacity-60">Add trending highlights</span>
          </div>
        </label>
      </div>

      <div className="pt-2 border-t border-white/5 mt-8 pt-8">
        <InputWrapper label="Publication Status">
          <div className="relative w-full sm:w-1/2">
            <select name="status" value={data.status} onChange={handleChange} className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 appearance-none font-bold tracking-wide cursor-pointer">
              <option value="DRAFT" className="bg-card-hover text-white">DRAFT (HIDDEN)</option>
              <option value="PUBLISHED" className="bg-card-hover text-white">PUBLISHED (LIVE)</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </InputWrapper>
      </div>
    </BookFormSection>
  );
}

// ─── Step 4: Media ──────────────────────────────────────────────
function MediaStep({
  data, onChange,
  InputWrapper, handleChange
}: {
  data: BookFormData;
  onChange: (data: Partial<BookFormData>) => void;
  InputWrapper: React.FC<{ label: string; error?: string; required?: boolean; children: React.ReactNode }>;
  handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}) {
  return (
    <BookFormSection title="Media & Assets" description="Book covers, marketing mockups, and interior previews.">
      <InputWrapper label="Primary Cover Image URL">
        <input type="url" name="coverImageUrl" value={data.coverImageUrl} onChange={handleChange} placeholder="https://covers.openlibrary.org/b/id/..." className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10" />
      </InputWrapper>
      
      <InputWrapper label="Marketing Mockup Image URL">
        <input type="url" name="mockupImageUrl" value={data.mockupImageUrl} onChange={handleChange} placeholder="https://..." className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10" />
      </InputWrapper>

      <div className="pt-2 border-t border-white/5 mt-8 pt-8">
        <InputWrapper label="Interior Preview Pages">
          <PreviewImagesField 
            images={data.previewImages} 
            onChange={(previewImages) => onChange({ previewImages })} 
          />
        </InputWrapper>
      </div>
    </BookFormSection>
  );
}

// ─── Step 5: Review & Publish ────────────────────────────────────
function ReviewStep({ data }: { data: BookFormData }) {
  return (
    <div className="space-y-8">
      <BookFormSection title="Review & Publish" description="Verify all information before saving the book to the catalog.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Info Summary */}
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Basic Information</h4>
            <div className="space-y-3">
              <SummaryField label="Title" value={data.title || "—"} />
              <SummaryField label="Slug" value={data.slug || "—"} />
              <SummaryField label="Author" value={data.author || "—"} />
              <SummaryField label="Description" value={data.description ? (data.description.length > 120 ? data.description.slice(0, 120) + "..." : data.description) : "—"} />
            </div>
          </div>

          {/* Catalog Summary */}
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Catalog Details</h4>
            <div className="space-y-3">
              <SummaryField label="Publisher" value={data.publisher || "—"} />
              <SummaryField label="ISBN" value={data.isbn || "—"} />
              <SummaryField label="Language" value={data.language || "—"} />
              <SummaryField label="Pages" value={data.pages ? String(data.pages) : "—"} />
              <SummaryField label="Published" value={data.publishedYear ? String(data.publishedYear) : "—"} />
              <SummaryField label="Genres" value={data.genres.length > 0 ? data.genres.join(", ") : "—"} />
              <SummaryField label="Subjects" value={data.subjects.length > 0 ? data.subjects.slice(0, 5).join(", ") + (data.subjects.length > 5 ? ` (+${data.subjects.length - 5} more)` : "") : "—"} />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Pricing & Inventory</h4>
            <div className="space-y-3">
              <SummaryField label="Price" value={data.price ? `NPR ${data.price}` : "—"} />
              <SummaryField label="Discount Price" value={data.discountPrice ? `NPR ${data.discountPrice}` : "—"} />
              <SummaryField label="Stock" value={data.stock ? String(data.stock) : "0"} />
              <SummaryField label="Status" value={data.status} highlight={data.status === "PUBLISHED"} />
              <div className="flex gap-2 pt-1">
                {data.isFeatured && <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-fantasy/10 text-fantasy border border-fantasy/20 uppercase tracking-widest">Featured</span>}
                {data.isTrending && <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-drama/10 text-drama border border-drama/20 uppercase tracking-widest">Trending</span>}
              </div>
            </div>
          </div>

          {/* Media Summary */}
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Media</h4>
            <div className="space-y-3">
              <SummaryField label="Cover Image" value={data.coverImageUrl ? "Uploaded" : "—"} />
              <SummaryField label="Mockup Image" value={data.mockupImageUrl ? "Uploaded" : "—"} />
              <SummaryField label="Preview Pages" value={data.previewImages.length > 0 ? `${data.previewImages.length} image(s)` : "—"} />
            </div>

            {/* Cover preview thumbnail */}
            {data.coverImageUrl && (
              <div className="mt-4">
                <img 
                  src={data.coverImageUrl} 
                  alt="Cover preview" 
                  className="w-24 h-36 object-cover rounded-lg border border-white/10 shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      </BookFormSection>
    </div>
  );
}

function SummaryField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold text-white/30 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-adventure" : "text-white/70"}`}>{value}</span>
    </div>
  );
}
