import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support both environment variables and fallback to JSON for AI Studio convenience
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const rawJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || rawJson.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || rawJson.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || rawJson.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || rawJson.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawJson.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || rawJson.appId,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || rawJson.measurementId,
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || rawJson.firestoreDatabaseId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  host: 'firestore.googleapis.com',
  ssl: true,
}, firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' ? firebaseConfig.firestoreDatabaseId : undefined);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Middleware for AI Proxy
  app.use(express.json({ limit: '10mb' }));

  // 1. AI Proxy Routes
  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { title, description, specialty } = req.body;
      const { generateCaseImage } = await import("./src/services/geminiService.server.js");
      const url = await generateCaseImage(title, description, specialty);
      res.json({ url });
    } catch (error: any) {
      console.error("AI Image Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/calendar", async (req, res) => {
    try {
      const { generateCalendarEvents } = await import("./src/services/geminiService.server.js");
      const events = await generateCalendarEvents();
      res.json(events);
    } catch (error: any) {
      console.error("AI Calendar Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/dummy-cases", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 4;
      const { generateDummyCases } = await import("./src/services/geminiService.server.js");
      const cases = await generateDummyCases(count);
      res.json(cases);
    } catch (error: any) {
      console.error("AI Dummy Cases Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Sitemap.xml Route
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const casesRef = collection(db, "cases");
      const q = query(casesRef, where("status", "==", "published"));
      const snapshot = await getDocs(q);
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
      
      // Home
      xml += `<url><loc>${req.protocol}://${req.get("host")}/</loc><priority>1.0</priority></url>`;
      
      // Profile
      xml += `<url><loc>${req.protocol}://${req.get("host")}/profile</loc><priority>0.8</priority></url>`;
      
      // Cases
      snapshot.forEach(doc => {
        xml += `<url><loc>${req.protocol}://${req.get("host")}/case/${doc.id}</loc><priority>0.9</priority></url>`;
      });
      
      xml += "</urlset>";
      
      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // 2. Internal Wiki Route (Server Rendered)
  app.get("/wiki", (req, res) => {
    const wikiStyles = `
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background: #f9f9f9; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; color: #000; }
        .card { background: white; padding: 20px; border-radius: 8px; shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        code { background: #eee; padding: 2px 4px; border-radius: 4px; }
      </style>
    `;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Assimilate Wiki</title>
        ${wikiStyles}
      </head>
      <body>
        <h1>Internal Site Wiki</h1>
        <div class="card">
          <h2>Project Overview</h2>
          <p>Assimilate One is a specialized medical education platform focused on peer-to-peer clinical knowledge sharing using immersive video cases.</p>
          
          <h3>Key Features</h3>
          <ul>
            <li><strong>Video Cases:</strong> Dynamic clinical presentations with duration-based progress tracking.</li>
            <li><strong>Hype System:</strong> Peer endorsement mechanism linked to leaderboard rankings.</li>
            <li><strong>SEO Architecture:</strong> Server-side meta tag injection and dynamic sitemap.</li>
            <li><strong>Internal Dashboard:</strong> Real-time case management and user role controls.</li>
          </ul>

          <h3>Tech Stack</h3>
          <ul>
            <li><strong>Frontend:</strong> React + Vite + Tailwind CSS</li>
            <li><strong>Backend:</strong> Node.js (Express) + Firebase</li>
            <li><strong>Animations:</strong> Motion (formerly Framer Motion)</li>
          </ul>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  });

  // 3. Vite Middleware Setup
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
  }

      // 4. SPA Catch-all with Meta Tag Injection
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    try {
      let template: string;
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, "dist/index.html"), "utf-8");
      }

      // Default Meta Tags
      let title = "Assimilate One | Advanced Medical Education";
      let description = "Stream high-impact medical cases, earn credits, and connect with global specialists.";
      let image = "https://images.unsplash.com/photo-1576091160550-2173bdd99602?auto=format&fit=crop&q=80&w=1000";

      // Dynamic Meta Tags for Case Pages
      if (url.startsWith("/case/")) {
        const id = url.split("/case/")[1]?.split("?")[0];
        if (id) {
          try {
            const caseDoc = await getDoc(doc(db, "cases", id));
            if (caseDoc.exists()) {
              const data = caseDoc.data();
              title = `${data.title} | Assimilate Case Study`;
              description = data.description?.substring(0, 160) + "..." || description;
              if (data.thumbnailUrl) image = data.thumbnailUrl;
            }
          } catch (e) {
            console.warn("Failed to fetch dynamic meta for URL:", url);
          }
        }
      }

      // Inject into template with proper escaping
      const html = template
        .replace(/<!-- PAGE_TITLE -->/g, escapeHtml(title))
        .replace(/<!-- PAGE_DESCRIPTION -->/g, escapeHtml(description))
        .replace(/<!-- PAGE_IMAGE -->/g, escapeHtml(image));

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
