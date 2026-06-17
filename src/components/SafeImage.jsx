import Image from "next/image";
import { Camera } from "lucide-react";

export function SafeImage({ src, alt, width, height, className, fallbackInitials, isAvatar = false }) {
  // 3. Debugging logs to print the actual URL being passed
  console.log("SafeImage rendering with URL:", src);

  // Helper to validate and normalize URL
  const getValidUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (trimmed === "") return null;
    if (
      trimmed.startsWith("blob:") || 
      trimmed.startsWith("data:") || 
      trimmed.startsWith("/") || 
      trimmed.startsWith("http://") || 
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }
    return null;
  };

  const validSrc = getValidUrl(src);

  const renderFallback = () => {
    if (fallbackInitials) {
      return (
        <div className={`${className} bg-blue-500 flex items-center justify-center text-white font-bold`}>
          {fallbackInitials}
        </div>
      );
    }
    if (isAvatar) {
      return (
        <div className={`${className} bg-gray-200 flex items-center justify-center border border-gray-300`}>
          <Camera className="h-8 w-8 text-gray-400" />
        </div>
      );
    }
    // Default empty fallback
    return <div className={`${className} bg-gray-100 border border-gray-200`} />;
  };

  if (!validSrc) {
    console.log("SafeImage: Null, undefined, or invalid URL format. Rendering fallback.");
    return renderFallback();
  }

  // 4. Validate that the URL points to a real image, not a video/document
  const lowerSrc = validSrc.toLowerCase().split(/[?#]/)[0];
  const isUnsupported = 
    lowerSrc.endsWith(".mp4") || 
    lowerSrc.endsWith(".webm") || 
    lowerSrc.endsWith(".mov") ||
    lowerSrc.endsWith(".avi") ||
    lowerSrc.endsWith(".pdf") ||
    lowerSrc.endsWith(".doc") ||
    lowerSrc.endsWith(".docx") ||
    lowerSrc.endsWith(".zip") ||
    lowerSrc.endsWith(".rar");

  if (isUnsupported) {
    console.log("SafeImage: Unsupported resource type (video/document) inside image src. Rendering fallback.");
    return renderFallback();
  }

  // 7 & 8. Ensure Cloudinary, Google, and all remote patterns render correctly by bypassing Next.js server-side optimizer.
  // We use unoptimized={true} to force native browser rendering, resolving SVG/LCP optimization failures.
  return (
    <Image
      src={validSrc}
      alt={alt || "Image"}
      width={width}
      height={height}
      className={className}
      unoptimized={true}
    />
  );
}
