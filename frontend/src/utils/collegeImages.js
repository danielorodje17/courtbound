// Returns a unique, consistent image for each college.
// Uses stored image_url if provided, otherwise generates a stable picsum photo.
export function getCollegeImage(name = "", imageUrl = "") {
  if (imageUrl && imageUrl.startsWith("http")) return imageUrl;
  const seed = encodeURIComponent(name.trim() || "default");
  return `https://picsum.photos/seed/${seed}/600/400`;
}
