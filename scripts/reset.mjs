// Deletes the JSON control-plane store; it is re-seeded on next request.
import fs from "fs";
import path from "path";
const f = path.join(process.cwd(), "data", "store.json");
if (fs.existsSync(f)) fs.unlinkSync(f);
console.log("Demo data reset. It will be re-seeded the next time the app starts or receives a request.");
