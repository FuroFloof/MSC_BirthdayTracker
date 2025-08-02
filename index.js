/*
 * Express server for the Timeline Viewer + Admin uploader.
 *
 * Endpoints:
 *   GET  /              → public/server/index.html (viewer)
 *   GET  /admin         → public/server/admin.html (admin panel)
 *   POST /api/entries   → upload images + append to timeline.json
 *   /assets/*           → static assets for images/JSON
 *   everything in /public is served statically by default
 *
 * Requirements:   npm install express multer
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 62030;

/* ---------- Static folders ---------- */
app.use(express.static(path.join(__dirname, "public"))); // generic public
app.use(
  "/assets",
  express.static(path.join(__dirname, "public", "server", "assets"))
);

/* ---------- Multer setup for uploads ---------- */
const imgsDir = path.join(__dirname, "public", "server", "assets", "imgs");
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
ensureDir(imgsDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, imgsDir),
  filename: (_, file, cb) => {
    // Generate cryptographically‑strong unique id
    const uniqueId = crypto.randomUUID();
    cb(null, uniqueId + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------- API to add new timeline entry ---------- */
const timelinePath = path.join(
  __dirname,
  "public",
  "server",
  "assets",
  "json",
  "timeline.json"
);
ensureDir(path.dirname(timelinePath));

app.post(
  "/api/entries",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  (req, res) => {
    const { username, time } = req.body;
    if (!username || !time || !req.files?.avatar?.length || !req.files?.image?.length) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const avatarPath = `assets/imgs/${req.files.avatar[0].filename}`;
    const imagePath = `assets/imgs/${req.files.image[0].filename}`;

    let timeline = [];
    try {
      timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    } catch (_) {
      /* New file will be created */
    }

    timeline.push({ username, time, avatar: avatarPath, image: imagePath });

    fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2));
    res.json({ success: true });
  }
);

/* ---------- HTML endpoints ---------- */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "server", "index.html"))
);
app.get("/admin", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "server", "admin.html"))
);

/* ---------- 404 fallback ------------ */
app.use((_, res) => res.status(404).send("Not Found"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
