// Unique college image — each college name maps to its own consistent photo
// Uses picsum.photos with the college name as a stable seed
// Every college gets a different image, always the same one for the same name

export function getCollegeImage(name = "") {
  const seed = encodeURIComponent(name.trim() || "default");
  return `https://picsum.photos/seed/${seed}/600/400`;
}
