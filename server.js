const express = require('express');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
const app = express();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Add logging middleware first
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Equipment data storage
let equipmentData = {
    screens: [],
    mounts: [],
    mediaPlayers: [],
    receptacles: []
};

// Function to read and parse CSV files
function loadEquipmentFromCSV() {
    // Load Screen data
    const screenFilePath = path.join(__dirname, 'data', 'Screen_Info.csv');
    fs.createReadStream(screenFilePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row) => {
            equipmentData.screens.push({
                id: row['Screen MFR'],
                model: `${row.Make} ${row['Screen Size']}"`,
                width: parseFloat(row.Width),
                height: parseFloat(row.Height),
                depth: parseFloat(row.Depth),
                weight: row['Weight (LBS)'] ? parseFloat(row['Weight (LBS)']) : null
            });
        });

    // Load Mount data
    const mountFilePath = path.join(__dirname, 'data', 'Mount_Info.csv');
    fs.createReadStream(mountFilePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row) => {
            equipmentData.mounts.push({
                id: row['MFG. PART'],
                model: `${row.Brand} ${row['MFG. PART']}`,
                maxWeight: parseFloat(row['Maximum Load (lbs)']),
                width: parseFloat(row['Width (in)']),
                height: parseFloat(row['Height (in)']),
                depth: parseFloat(row['Depth (in)']),
                vesa: row['VESA\'s']?.split(',') || []
            });
        });

    // Load Media Player data
    const mediaPlayerFilePath = path.join(__dirname, 'data', 'MediaPlayer_Info.csv');
    fs.createReadStream(mediaPlayerFilePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row) => {
            equipmentData.mediaPlayers.push({
                id: row['MFG. PART'],
                model: `${row.Make} ${row['MFG. PART']}`,
                dimensions: {
                    width: parseFloat(row.Width),
                    height: parseFloat(row.Height),
                    depth: parseFloat(row.Depth)
                }
            });
        });

    // Load Receptacle Box data
    const receptacleFilePath = path.join(__dirname, 'data', 'Receptacle_Box_info.csv');
    fs.createReadStream(receptacleFilePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row) => {
            equipmentData.receptacles.push({
                id: row['MFG. PART'],
                model: `${row.Brand} ${row['MFG. PART']}`,
                dimensions: {
                    width: parseFloat(row['Width (in)']),
                    height: parseFloat(row['Height (in)']),
                    depth: parseFloat(row['Depth (in)'])
                }
            });
        });

    // Log loaded equipment counts
    console.log('Loaded equipment:', {
        screens: equipmentData.screens.length,
        mounts: equipmentData.mounts.length,
        mediaPlayers: equipmentData.mediaPlayers.length,
        receptacles: equipmentData.receptacles.length
    });
}

// Load equipment data on server start
loadEquipmentFromCSV();

// Template engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/planner', (req, res) => {
    res.render('planner', { equipmentData });
});

app.get('/api/equipment', (req, res) => {
    // Log the data being sent
    console.log('Equipment data being sent:', {
        screens: equipmentData.screens.length,
        mounts: equipmentData.mounts.length,
        mediaPlayers: equipmentData.mediaPlayers.length,
        receptacles: equipmentData.receptacles.length
    });
    res.json(equipmentData);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Views directory: ${app.get('views')}`);
    console.log(`Available templates: ${fs.readdirSync(app.get('views')).join(', ')}`);
});
