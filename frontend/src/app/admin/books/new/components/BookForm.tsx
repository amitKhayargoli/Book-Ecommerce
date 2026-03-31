import { BookFormData, ValidationErrors } from "../types";
import { BookFormSection } from "./BookFormSection";
import { GenreSelector } from "./GenreSelector";
import { SubjectChips } from "./SubjectChips";
import { PreviewImagesField } from "./PreviewImagesField";
import { BookPreviewCard } from "./BookPreviewCard";
import { cn } from "../utils";

interface BookFormProps {
  data: BookFormData;
  onChange: (data: Partial<BookFormData>) => void;
  errors: ValidationErrors;
}

export function BookForm({ data, onChange, errors }: BookFormProps) {
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
        <BookFormSection title="1. Basic Information" description="The core details identifying this book.">
          <InputWrapper label="Book Title" error={errors.title} required>
            <input
              type="text"
              name="title"
              value={data.title}
              onChange={handleChange}
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
                onChange={handleChange}
                placeholder="the-hobbit"
                className={cn(
                  "flex-1 px-5 py-3 bg-white/[0.03] border rounded-r-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all",
                  errors.slug ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20"
                )}
              />
            </div>
          </InputWrapper>

          <InputWrapper label="Description">
            <textarea
              name="description"
              value={data.description}
              onChange={handleChange}
              rows={4}
              placeholder="A brief summary of the book..."
              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all resize-y font-medium"
            />
          </InputWrapper>
        </BookFormSection>

        <BookFormSection title="2. Catalog Information" description="Metadata for library and search categorization.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputWrapper label="Author">
              <input type="text" name="author" value={data.author} onChange={handleChange} className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
            </InputWrapper>
            
            <InputWrapper label="Publisher">
              <input type="text" name="publisher" value={data.publisher} onChange={handleChange} className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
            </InputWrapper>

            <InputWrapper label="ISBN">
              <input type="text" name="isbn" value={data.isbn} onChange={handleChange} className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 font-mono text-sm uppercase tracking-widest" />
            </InputWrapper>

            <InputWrapper label="Language">
              <input type="text" name="language" value={data.language} onChange={handleChange} placeholder="e.g. English" className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all" />
            </InputWrapper>
            
            <InputWrapper label="Pages" error={errors.pages}>
              <input type="number" name="pages" value={data.pages} onChange={handleChange} min="0" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10", errors.pages ? "border-romance/50" : "border-white/5 focus:border-white/20")} />
            </InputWrapper>

            <InputWrapper label="Published Year" error={errors.publishedYear}>
              <input type="number" name="publishedYear" value={data.publishedYear} onChange={handleChange} placeholder="YYYY" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10", errors.publishedYear ? "border-romance/50" : "border-white/5 focus:border-white/20")} />
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

        <BookFormSection title="3. Store Information" description="Pricing, inventory, and visibility controls.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <InputWrapper label="Base Price ($)" error={errors.price} required>
              <input type="number" name="price" value={data.price} onChange={handleChange} step="0.01" min="0" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10", errors.price ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
            </InputWrapper>

            <InputWrapper label="Discount Price ($)" error={errors.discountPrice}>
              <input type="number" name="discountPrice" value={data.discountPrice} onChange={handleChange} step="0.01" min="0" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10", errors.discountPrice ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
            </InputWrapper>

            <InputWrapper label="Stock Quantity" error={errors.stock} required>
              <input type="number" name="stock" value={data.stock} onChange={handleChange} min="0" className={cn("w-full px-5 py-3 bg-white/[0.03] border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10", errors.stock ? "border-romance/50 focus:border-romance" : "border-white/5 focus:border-white/20")} />
            </InputWrapper>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 pt-6 border-t border-white/5">
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

          <div className="pt-2 border-t border-white/5 mt-6 pt-8">
            <InputWrapper label="Publication Status">
              <div className="relative w-full sm:w-1/2">
                <select name="status" value={data.status} onChange={handleChange} className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 appearance-none font-bold tracking-wide cursor-none">
                  <option value="DRAFT" className="bg-card">DRAFT (HIDDEN)</option>
                  <option value="PUBLISHED" className="bg-card">PUBLISHED (LIVE)</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </InputWrapper>
          </div>
        </BookFormSection>

        <BookFormSection title="4. Media" description="Book covers, interior previews, and environmental mockups.">
          <InputWrapper label="Primary Cover Image URL">
            <input type="url" name="coverImageUrl" value={data.coverImageUrl} onChange={handleChange} placeholder="https://..." className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10" />
          </InputWrapper>
          
          <InputWrapper label="Marketing Mockup Image URL">
            <input type="url" name="mockupImageUrl" value={data.mockupImageUrl} onChange={handleChange} placeholder="https://..." className="w-full px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/10" />
          </InputWrapper>

          <div className="pt-2 border-t border-white/5 mt-6 pt-8">
            <InputWrapper label="Interior Preview Pages">
              <PreviewImagesField 
                images={data.previewImages} 
                onChange={(previewImages) => onChange({ previewImages })} 
              />
            </InputWrapper>
          </div>
        </BookFormSection>
      </div>

      <div className="hidden xl:block w-[320px] shrink-0">
        <BookPreviewCard data={data} />
      </div>
    </div>
  );
}
