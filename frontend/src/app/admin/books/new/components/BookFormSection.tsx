interface BookFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function BookFormSection({ title, description, children }: BookFormSectionProps) {
  return (
    <div className="p-8 lg:p-10 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.03] transition-colors duration-500">
      <div className="mb-10">
        <h3 className="text-xl font-display font-semibold text-white tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary mt-2 opacity-60 font-medium">{description}</p>
        )}
      </div>
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}
