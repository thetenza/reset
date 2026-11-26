import { seedProducts } from './db.js';
import { syncReviews, syncStats } from './sync.js';

seedProducts();
console.log('reviews:', JSON.stringify(await syncReviews(), null, 2));
console.log('stats:', JSON.stringify(await syncStats(), null, 2));
