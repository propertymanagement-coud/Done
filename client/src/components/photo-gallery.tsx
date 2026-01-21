import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Maximize2, ImageOff, Trash2 } from "lucide-react";
import { getThumbnailUrl, getGalleryThumbUrl, getMainImageUrl, getFullscreenImageUrl } from "@/lib/imagekit";
import { getFallbackImageUrl } from "@/lib/gallery-placeholder";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/optimized-image";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoGalleryProps {
  images: string[];
  title: string;
  propertyId?: string;
  canEdit?: boolean;
  onImagesChange?: (images: string[]) => void;
  layout?: "grid" | "carousel";
}

export function PhotoGallery({ 
  images, 
  title, 
  propertyId, 
  canEdit = false, 
  onImagesChange,
  layout = "grid"
}: PhotoGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const { toast } = useToast();

  const validImages = useMemo(() => images.filter(img => img && typeof img === 'string'), [images]);
  const mainImage = validImages[currentImageIndex];

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      setControlsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setControlsVisible(false), 3000);
    };

    const handleMouseMove = () => resetTimeout();
    const handleTouch = () => resetTimeout();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouch);
    resetTimeout();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouch);
      clearTimeout(timeout);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      setControlsVisible(true);
      if (e.key === "Escape") setIsFullscreen(false);
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, validImages.length]);

  const handleDeleteImage = async (index: number) => {
    if (!propertyId || !canEdit) return;
    setIsDeleting(true);
    try {
      const newImages = validImages.filter((_, i) => i !== index);
      await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: newImages })
      });
      onImagesChange?.(newImages);
      if (currentImageIndex >= newImages.length) {
        setCurrentImageIndex(Math.max(0, newImages.length - 1));
      }
      toast({ description: 'Photo deleted successfully' });
    } catch (err) {
      toast({ description: 'Failed to delete photo', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const nextImage = () => {
    if (validImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
    }
  };

  const prevImage = () => {
    if (validImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    }
  };

  if (validImages.length === 0) {
    return (
      <div className="w-full bg-background p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <ImageOff className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property Image Gallery"
          >
            <motion.div 
              animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : -20 }}
              transition={{ duration: 0.2 }}
              className="flex justify-between items-center p-6 bg-gradient-to-b from-black/60 to-transparent z-20"
            >
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg">{title}</span>
                <span className="text-white/70 text-sm" aria-live="polite">
                  Photo {currentImageIndex + 1} of {validImages.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all h-10 w-10 rounded-full bg-black/20 backdrop-blur-sm"
                onClick={() => setIsFullscreen(false)}
                aria-label="Close fullscreen gallery"
              >
                <X className="h-6 w-6" />
              </Button>
            </motion.div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4 md:px-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.1, x: -20 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-full h-full flex items-center justify-center select-none"
                  onClick={() => setIsFullscreen(false)}
                >
                  <OptimizedImage
                    src={getFullscreenImageUrl(mainImage)}
                    alt={`${title} - Image ${currentImageIndex + 1}`}
                    objectFit="contain"
                    className="max-h-full max-w-full drop-shadow-2xl"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all h-14 w-14 bg-black/20 backdrop-blur-md rounded-full border border-white/10 hidden md:flex"
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all h-14 w-14 bg-black/20 backdrop-blur-md rounded-full border border-white/10 hidden md:flex"
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>
            </div>

            {/* Thumbnail Filmstrip */}
            <motion.div 
              animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 20 }}
              transition={{ duration: 0.3 }}
              className="px-6 py-8 bg-gradient-to-t from-black/80 to-transparent"
            >
              <div 
                className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x justify-center"
                ref={(el) => {
                  if (el && isFullscreen) {
                    const activeThumb = el.children[currentImageIndex] as HTMLElement;
                    if (activeThumb) {
                      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                  }
                }}
              >
                {validImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-300 snap-center hover-elevate ${
                      idx === currentImageIndex 
                        ? "ring-2 ring-primary ring-offset-4 ring-offset-black scale-110 z-10" 
                        : "opacity-40 hover:opacity-100 grayscale hover:grayscale-0"
                    }`}
                  >
                    <OptimizedImage src={getThumbnailUrl(img)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full">
        {layout === "grid" ? (
          <div className="grid grid-cols-12 gap-3 h-[500px] rounded-2xl overflow-hidden shadow-2xl hover-elevate group/gallery bg-muted/20 border border-border">
            {/* Main Featured Photo (Mosaic Style) */}
            <div 
              className="col-span-12 md:col-span-8 relative cursor-pointer overflow-hidden group/main"
              onClick={() => { setCurrentImageIndex(0); setIsFullscreen(true); }}
            >
              <OptimizedImage 
                src={getGalleryThumbUrl(validImages[0])} 
                alt="Property Main View" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/main:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover/main:opacity-40 transition-opacity" />
              <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white opacity-0 group-hover/main:opacity-100 transition-opacity translate-y-2 group-hover/main:translate-y-0 duration-300">
                <Maximize2 className="w-5 h-5" />
                <span className="font-semibold text-lg shadow-sm">View all {validImages.length} photos</span>
              </div>
            </div>

            {/* Side Grid */}
            <div className="hidden md:grid col-span-4 grid-rows-2 gap-3">
              <div className="grid grid-cols-2 gap-3 row-span-1">
                {validImages.slice(1, 3).map((img, idx) => (
                  <div 
                    key={idx}
                    className="relative cursor-pointer overflow-hidden group/thumb rounded-r-none"
                    onClick={() => { setCurrentImageIndex(idx + 1); setIsFullscreen(true); }}
                  >
                    <OptimizedImage 
                      src={getGalleryThumbUrl(img)} 
                      alt={`View ${idx + 2}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 row-span-1">
                {validImages.slice(3, 5).map((img, idx) => (
                  <div 
                    key={idx}
                    className="relative cursor-pointer overflow-hidden group/thumb"
                    onClick={() => { setCurrentImageIndex(idx + 3); setIsFullscreen(true); }}
                  >
                    <OptimizedImage 
                      src={getGalleryThumbUrl(img)} 
                      alt={`View ${idx + 4}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors" />
                    {idx === 1 && validImages.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-2">
                        <span className="text-2xl font-black">+{validImages.length - 5}</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest">More Photos</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group overflow-hidden rounded-2xl shadow-xl hover-elevate border border-border">
            <div className="aspect-video relative cursor-zoom-in" onClick={() => setIsFullscreen(true)}>
              <OptimizedImage src={getMainImageUrl(mainImage)} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                 <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium border border-white/10">
                   {currentImageIndex + 1} / {validImages.length}
                 </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white" onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}>
                   <Maximize2 className="h-4 w-4" />
                 </Button>
              </div>

              <div className="absolute inset-y-0 left-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-black/20 backdrop-blur-md text-white hover:bg-black/40 h-10 w-10 rounded-full border border-white/10" 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-black/20 backdrop-blur-md text-white hover:bg-black/40 h-10 w-10 rounded-full border border-white/10" 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}