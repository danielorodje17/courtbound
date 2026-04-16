// Deterministic college image picker — each college name always maps to the same image
// but different colleges get different images from the pool.

const POOL = [
  "https://images.unsplash.com/photo-1763890498955-13f109b2fbd7?w=600&q=80", // columns + green campus
  "https://images.unsplash.com/photo-1553487168-c6ccef1360c0?w=600&q=80",    // clock tower walkway
  "https://images.unsplash.com/photo-1773587982433-f1e6b3739a55?w=600&q=80", // grand stone + banners
  "https://images.unsplash.com/photo-1770721474021-70f69ddecb46?w=600&q=80", // white clock-tower building
  "https://images.unsplash.com/photo-1763365716287-4434457c5a38?w=600&q=80", // domed academic building
  "https://images.unsplash.com/photo-1758464644027-43f16df31625?w=600&q=80", // historic brick + tower
  "https://images.unsplash.com/photo-1763083454118-b914339993ce?w=600&q=80", // modern + autumn trees
  "https://images.unsplash.com/photo-1724086420139-3824f0702b27?w=600&q=80", // campus walkway sunlight
  "https://images.unsplash.com/photo-1747278018156-a8a3f99d1a46?w=600&q=80", // arched hallway students
  "https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80",    // existing — stadium exterior
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80", // existing — gym/court
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80", // existing — lecture hall
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80", // graduation + campus
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&q=80", // university entrance sign
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&q=80", // modern campus buildings
  "https://images.unsplash.com/photo-1561489396-888724a1543d?w=600&q=80",    // sports field + stands
  "https://images.unsplash.com/photo-1491951931722-5a96dae27b4c?w=600&q=80", // campus lawn + trees
  "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=600&q=80", // outdoor grounds
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80", // existing — basketball court
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", // mountain/west-coast scenery
];

function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

export function getCollegeImage(name = "") {
  return POOL[hashCode(name) % POOL.length];
}
