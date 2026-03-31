import { BookFormData } from "../types";
import { Library } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface BookPreviewCardProps {
  data: BookFormData;
}

export function BookPreviewCard({ data }: BookPreviewCardProps) {
  const displayTitle = data.title || "Untilted Book";
  const displayAuthor = data.author || "Unknown Author";
  const displayPrice = data.price ? `$${data.price}` : "$0";

  return (
    <div className="sticky top-24 space-y-6">
      <p className="text-text-secondary text-xs tracking-[0.3em] uppercase mb-4 px-2">Live Preview</p>
      
      <div className="group relative bg-card rounded-[32px] p-10 flex flex-col items-center overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 hover:border-white/10">
        {/* Status Badges */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <span className={`px-3 py-1 text-[10px] font-black rounded-full border tracking-widest uppercase ${
            data.status === 'PUBLISHED' 
              ? 'bg-adventure/10 text-adventure border-adventure/20' 
              : 'bg-white/5 text-white/40 border-white/10'
          }`}>
            {data.status}
          </span>
          
          {(data.isFeatured || data.isTrending) && (
            <div className="flex gap-2">
              {data.isFeatured && (
                <span className="px-3 py-1 text-[10px] font-black rounded-full bg-fantasy/10 text-fantasy border border-fantasy/20 tracking-widest uppercase">
                  Featured
                </span>
              )}
              {data.isTrending && (
                <span className="px-3 py-1 text-[10px] font-black rounded-full bg-drama/10 text-drama border border-drama/20 tracking-widest uppercase">
                  Trending
                </span>
              )}
            </div>
          )}
        </div>

        <div className="relative mb-10 mt-6 h-[260px] flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: 1.02, 
              rotate: 1, 
              y: -5
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              repeatType: "reverse", 
              ease: "easeInOut" 
            }}
            className="relative z-10"
          >
            {data.coverImageUrl ? (
              <div className="relative">
                <img 
                  src={data.coverImageUrl} 
                  alt={displayTitle} 
                  className="w-[180px] h-[260px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm"
                  onError={(e) => { 
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement?.querySelector('.placeholder')?.removeAttribute('style');
                  }} 
                />
                <div className="placeholder absolute inset-0 hidden items-center justify-center bg-white/5 rounded-xl border border-white/5" style={{ display: 'none' }}>
                  <Library className="w-12 h-12 text-white/10" />
                </div>
              </div>
            ) : (
              <div className="w-[180px] h-[260px] flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5 text-white/10 gap-3 backdrop-blur-sm">
                <Library className="w-16 h-16 opacity-50" />
                <span className="text-xs uppercase font-black tracking-[0.3em] opacity-30">No Cover</span>
              </div>
            )}
          </motion.div>
          
          {/* Decorative Glow */}
          <div className="absolute inset-0 bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />
        </div>

        <div className="text-center w-full relative z-10">
          <h3 className="font-display text-xl font-bold text-white mb-2 line-clamp-1">{displayTitle}</h3>
          <p className="text-text-secondary text-sm font-medium mb-4 opacity-60 tracking-wide uppercase text-[10px]">{displayAuthor}</p>
          <div className="flex items-center justify-center gap-3">
             <p className="text-romance font-black text-2xl tracking-tighter">{displayPrice}</p>
             {data.discountPrice && Number(data.discountPrice) < Number(data.price) && (
               <p className="text-white/20 line-through text-sm font-bold">${data.discountPrice}</p>
             )}
          </div>
        </div>

        {/* Action Button Placeholder to match ProductCard */}
        <div className="mt-8 w-full">
           <div className="w-full h-[1px] bg-white/5 mb-6" />
           <button 
             disabled 
             className="w-full text-[10px] tracking-[0.3em] uppercase text-white/30 bg-white/5 px-6 py-3.5 rounded-2xl border border-white/5 font-black transition-all"
           >
             View Book Details
           </button>
        </div>
      </div>
    </div>
  );
}
