/**
 * Quick check — counts documents in each subcollection under cmg-iso-system/root/
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyChOBhPrP-XAaY1sigatrccjzUofZ42dqk",
  authDomain:        "cmg-iso-system.firebaseapp.com",
  projectId:         "cmg-iso-system",
  storageBucket:     "cmg-iso-system.firebasestorage.app",
  messagingSenderId: "467594837441",
  appId:             "1:467594837441:web:1e1e1b418240a987490340",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const SUBCOLS = [
  "departments", "yearCycles", "users", "auditorProfiles",
  "kpis", "kpiReports", "auditPlans", "cpars",
  "managementReviews", "mocs", "documents",
];

async function check() {
  console.log("\n🔍 Firestore check — cmg-iso-system/root/\n");
  let total = 0;
  for (const subcol of SUBCOLS) {
    const snap = await getDocs(collection(db, "cmg-iso-system", "root", subcol));
    console.log(`  ${subcol.padEnd(20)} ${snap.size} docs`);
    total += snap.size;
  }
  console.log(`\n  ${"TOTAL".padEnd(20)} ${total} docs`);
  console.log(total > 0 ? "\n✅ Data is in Firestore!\n" : "\n❌ No data found!\n");
  process.exit(0);
}

check().catch(err => { console.error("❌ Error:", err); process.exit(1); });
