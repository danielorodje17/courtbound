// Returns the correct image URL for a college.
// Priority: uploaded file > stored image_url > picsum fallback (unique per college name)

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

export function getCollegeImage(name = "", imageUrl = "") {
  if (imageUrl) {
    // Uploaded logo stored on the server
    if (imageUrl.startsWith("/static/")) return `${BACKEND}${imageUrl}`;
    // Any other full URL (Unsplash, custom CDN, etc.)
    if (imageUrl.startsWith("http")) return imageUrl;
  }
  // Fallback: unique stable photo per college name
  const seed = encodeURIComponent(name.trim() || "default");
  return `https://picsum.photos/seed/${seed}/600/400`;
}
