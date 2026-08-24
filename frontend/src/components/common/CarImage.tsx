import { useEffect, useState } from "react";
import { CarFront } from "lucide-react";

import { cn } from "@/lib/utils";

interface CarImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/** Vehicle photo that degrades to an illustrated placeholder when no usable image exists. */
const CarImage = ({ src, alt, className }: CarImageProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 text-blue-300",
          className
        )}
      >
        <CarFront className="size-12" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
};

export default CarImage;
