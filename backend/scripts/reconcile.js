import { connectDb, disconnectDb } from '../src/config/db.js';
import { reconcileSeatCounts } from '../src/services/registrationService.js';

await connectDb();
const result = await reconcileSeatCounts();
console.log(`Checked ${result.checked} workshops, corrected ${result.fixed}.`);
await disconnectDb();
