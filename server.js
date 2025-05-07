const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'jobs.json');

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Load jobs from file
function loadJobs() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Save jobs to file
function saveJobs(jobs) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2));
}

// Routes
app.get('/', (req, res) => {
    const jobs = loadJobs();
    res.render('index', { jobs });
});

app.post('/add-job', upload.fields([{ name: 'resume' }, { name: 'coverLetter' }]), (req, res) => {
    const jobs = loadJobs();
    const { company, position, status, date, notes } = req.body;
    const resume = req.files['resume']?.[0]?.filename || null;
    const coverLetter = req.files['coverLetter']?.[0]?.filename || null;

    jobs.push({ company, position, status, date, notes, resume, coverLetter });
    saveJobs(jobs);
    res.redirect('/');
});

app.post('/remove-job', (req, res) => {
    const { company, position } = req.body;
    const jobs = loadJobs().filter(job => job.company !== company || job.position !== position);
    saveJobs(jobs);
    res.redirect('/');
});

app.post('/archive-job', (req, res) => {
    const { company, position } = req.body;
    const jobs = loadJobs();
    const jobIndex = jobs.findIndex(job => job.company === company && job.position === position);

    if (jobIndex !== -1) {
        const archivedJob = jobs.splice(jobIndex, 1)[0];
        const archivePath = path.join(__dirname, 'archive.json');
        const archiveJobs = fs.existsSync(archivePath)
            ? JSON.parse(fs.readFileSync(archivePath, 'utf8'))
            : [];

        archiveJobs.push(archivedJob);
        fs.writeFileSync(archivePath, JSON.stringify(archiveJobs, null, 2));
        saveJobs(jobs);
    }

    res.redirect('/');
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));