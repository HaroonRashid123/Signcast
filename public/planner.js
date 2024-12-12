document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const canvas = document.getElementById('diagramCanvas');
    const ctx = canvas.getContext('2d');
    
    // Equipment data (to be loaded from server)
    let equipmentData = {
        screens: [],
        mounts: [],
        mediaPlayers: [],
        receptacles: []
    };

    // Initialize the application
    init();

    function init() {
        setupEventListeners();
        loadEquipmentData();
        setupCanvas();
        updateDiagram();
    }

    function setupEventListeners() {
        // Setup toggle buttons
        setupToggleButtons();

        // Add change listeners to all inputs that affect the diagram
        document.querySelectorAll('select, input').forEach(element => {
            element.addEventListener('change', updateDiagram);
        });

        // PDF Download button
        const downloadButton = document.getElementById('downloadPDF');
        if (downloadButton) {
            downloadButton.addEventListener('click', generatePDF);
        }
    }

    async function loadEquipmentData() {
        try {
            const response = await fetch('/api/equipment');
            const data = await response.json();
            equipmentData = data;
            populateDropdowns();
        } catch (error) {
            console.error('Error loading equipment data:', error);
        }
    }

    function populateDropdowns() {
        // Populate screen models
        const screenSelect = document.getElementById('screenModel');
        screenSelect.innerHTML = '<option value="">Select a model...</option>';
        equipmentData.screens.forEach(screen => {
            const option = document.createElement('option');
            option.value = screen.id;
            option.textContent = `${screen.model} (${screen.width}"×${screen.height}")`;
            screenSelect.appendChild(option);
        });

        // Populate mount types
        const mountSelect = document.getElementById('mountType');
        mountSelect.innerHTML = '<option value="">Select mount...</option>';
        equipmentData.mounts.forEach(mount => {
            const option = document.createElement('option');
            option.value = mount.id;
            option.textContent = mount.model;
            mountSelect.appendChild(option);
        });

        // Populate media players
        const playerSelect = document.getElementById('mediaPlayer');
        playerSelect.innerHTML = '<option value="">Select player...</option>';
        equipmentData.mediaPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.model;
            playerSelect.appendChild(option);
        });

        // Populate receptacle boxes
        const receptacleSelect = document.getElementById('receptacle');
        receptacleSelect.innerHTML = '<option value="">Select box...</option>';
        equipmentData.receptacles.forEach(receptacle => {
            const option = document.createElement('option');
            option.value = receptacle.id;
            option.textContent = receptacle.model;
            receptacleSelect.appendChild(option);
        });
    }

    function setupCanvas() {
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        
        // Set actual size in memory
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        
        // Scale context to ensure correct drawing operations
        ctx.scale(dpr, dpr);
    }

    function updateDiagram() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const selectedScreen = getSelectedEquipment('screenModel');
        const selectedReceptacle = getSelectedEquipment('receptacle');
        if (!selectedScreen) return;

        // Get orientation from buttons
        const orientation = document.querySelector('.orientation-toggle button.active').id;
        
        // Get installation type from buttons
        const installType = document.querySelector('.install-type-toggle button.active').id;
        
        const floorToCenter = parseFloat(document.getElementById('floorToCenter').value) || 60;
        const nicheDepth = installType === 'niche' ? 
            (parseFloat(document.getElementById('nicheDepth').value) || 4) : 0;

        // Calculate scale (pixels per inch)
        const scale = calculateScale(selectedScreen, orientation);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw wall
        drawWall(scale, floorToCenter);

        // Draw niche if selected
        if (installType === 'niche') {
            drawNiche(selectedScreen, scale, floorToCenter, nicheDepth, orientation);
        }

        // Draw screen
        drawScreen(selectedScreen, scale, floorToCenter, nicheDepth, orientation);

        // Draw receptacle box if selected
        if (selectedReceptacle) {
            drawReceptacleBox(ctx, selectedScreen, selectedReceptacle, scale, centerX, centerY);
        }

        // Draw dimensions
        drawDimensions(selectedScreen, scale, floorToCenter, nicheDepth, orientation);
    }

    function calculateScale(screen, orientation) {
        const screenWidth = orientation === 'horizontal' ? screen.width : screen.height;
        const screenHeight = orientation === 'horizontal' ? screen.height : screen.width;
        
        const maxWidth = canvas.width * 0.8;
        const maxHeight = canvas.height * 0.8;
        
        return Math.min(maxWidth / screenWidth, maxHeight / screenHeight);
    }

    function drawWall(scale, floorToCenter) {
        const wallHeight = canvas.height * 0.9;
        const wallWidth = canvas.width * 0.9;
        const startX = (canvas.width - wallWidth) / 2;
        const startY = (canvas.height - wallHeight) / 2;

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, wallWidth, wallHeight);
    }

    function drawScreen(screen, scale, floorToCenter, nicheDepth, orientation) {
        const screenWidth = (orientation === 'horizontal' ? screen.width : screen.height) * scale;
        const screenHeight = (orientation === 'horizontal' ? screen.height : screen.width) * scale;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw screen
        ctx.fillStyle = '#333';
        ctx.fillRect(
            centerX - screenWidth / 2,
            centerY - screenHeight / 2,
            screenWidth,
            screenHeight
        );

        // Draw mount if selected
        const selectedMount = getSelectedEquipment('mountType');
        if (selectedMount) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(
                centerX - (selectedMount.width * scale) / 2,
                centerY - (selectedMount.height * scale) / 2,
                selectedMount.width * scale,
                selectedMount.height * scale
            );
            ctx.setLineDash([]);
        }

        // Draw media player if selected
        const selectedMediaPlayer = getSelectedEquipment('mediaPlayer');
        if (selectedMediaPlayer) {
            const mpWidth = selectedMediaPlayer.dimensions.width * scale;
            const mpHeight = selectedMediaPlayer.dimensions.height * scale;
            
            ctx.fillStyle = '#666';
            ctx.fillRect(
                centerX - mpWidth / 2,
                centerY + screenHeight / 2 + 10,  // 10px below screen
                mpWidth,
                mpHeight
            );
        }
    }

    function drawNiche(screen, scale, floorToCenter, nicheDepth, orientation) {
        if (!screen) return;

        const selectedMount = getSelectedEquipment('mountType');
        const selectedMediaPlayer = getSelectedEquipment('mediaPlayer');
        const nicheSize = calculateNicheSize(screen, selectedMediaPlayer, selectedMount);
        
        const screenWidth = (orientation === 'horizontal' ? screen.width : screen.height) * scale;
        const screenHeight = (orientation === 'horizontal' ? screen.height : screen.width) * scale;
        
        const nicheWidth = nicheSize.width * scale;
        const nicheHeight = nicheSize.height * scale;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw niche background
        ctx.fillStyle = '#eee';
        ctx.fillRect(
            centerX - nicheWidth / 2,
            centerY - nicheHeight / 2,
            nicheWidth,
            nicheHeight
        );

        // Draw niche outline
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            centerX - nicheWidth / 2,
            centerY - nicheHeight / 2,
            nicheWidth,
            nicheHeight
        );
    }

    function drawDimensions(screen, scale, floorToCenter, nicheDepth, orientation) {
        const screenWidth = (orientation === 'horizontal' ? screen.width : screen.height) * scale;
        const screenHeight = (orientation === 'horizontal' ? screen.height : screen.width) * scale;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Set dimension line styles
        ctx.strokeStyle = '#2980b9';
        ctx.fillStyle = '#2980b9';
        ctx.lineWidth = 1;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        // Draw width dimension
        drawHorizontalDimension(
            centerX - screenWidth / 2,
            centerY + screenHeight / 2 + 30,
            screenWidth,
            `${orientation === 'horizontal' ? screen.width : screen.height}"`,
        );

        // Draw height dimension
        drawVerticalDimension(
            centerX - screenWidth / 2 - 30,
            centerY - screenHeight / 2,
            screenHeight,
            `${orientation === 'horizontal' ? screen.height : screen.width}"`,
        );

        // Draw floor to center dimension
        drawVerticalDimension(
            centerX + screenWidth / 2 + 60,
            canvas.height * 0.9,  // Floor level
            canvas.height * 0.9 - centerY,
            `${floorToCenter}" to center`,
            true
        );

        // Draw niche depth if applicable
        if (nicheDepth > 0) {
            drawHorizontalDimension(
                centerX + screenWidth / 2 + 10,
                centerY,
                nicheDepth * scale,
                `${nicheDepth}" depth`,
                true
            );
        }
    }

    function drawHorizontalDimension(x, y, width, text, rightSide = false) {
        const arrowSize = 5;
        
        // Draw dimension line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();

        // Draw arrows
        drawArrow(x, y, 0);
        drawArrow(x + width, y, Math.PI);

        // Draw measurement text
        const textY = y + 20;
        ctx.fillText(text, x + width / 2, textY);

        // Draw vertical end lines
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.moveTo(x + width, y - 5);
        ctx.lineTo(x + width, y + 5);
        ctx.stroke();
    }

    function drawVerticalDimension(x, y, height, text, rightSide = false) {
        const arrowSize = 5;
        
        // Draw dimension line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + height);
        ctx.stroke();

        // Draw arrows
        drawArrow(x, y, Math.PI / 2);
        drawArrow(x, y + height, -Math.PI / 2);

        // Draw measurement text
        ctx.save();
        ctx.translate(x - 20, y + height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();

        // Draw horizontal end lines
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x - 5, y + height);
        ctx.lineTo(x + 5, y + height);
        ctx.stroke();
    }

    function drawArrow(x, y, angle) {
        const arrowSize = 5;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(-arrowSize, -arrowSize);
        ctx.lineTo(0, 0);
        ctx.lineTo(-arrowSize, arrowSize);
        ctx.stroke();
        
        ctx.restore();
    }

    function getSelectedEquipment(selectId) {
        const select = document.getElementById(selectId);
        if (!select || !select.value) return null;

        // Map select IDs to equipment data categories
        const categoryMap = {
            'screenModel': 'screens',
            'mountType': 'mounts',
            'mediaPlayer': 'mediaPlayers',
            'receptacle': 'receptacles'
        };

        const category = categoryMap[selectId];
        if (!category || !equipmentData[category]) return null;

        return equipmentData[category].find(item => item.id === select.value);
    }

    async function generatePDF() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('l', 'in', 'letter'); // Landscape, inches, letter size
            
            // Get project info
            const projectInfo = {
                title: document.getElementById('projectTitle')?.value || 'Untitled Project',
                drawer: document.getElementById('drawer')?.value || 'Unknown',
                department: document.getElementById('department')?.value || 'Installation',
                date: document.getElementById('projectDate')?.value || new Date().toLocaleDateString(),
                screenModel: document.getElementById('screenModel')?.options[
                    document.getElementById('screenModel')?.selectedIndex
                ]?.text || 'No Screen Selected'
            };
            
            // Add project information
            pdf.setFontSize(14);
            pdf.text(`Project: ${projectInfo.title}`, 0.5, 0.5);
            pdf.text(`Drawer: ${projectInfo.drawer}`, 0.5, 0.8);
            pdf.text(`Department: ${projectInfo.department}`, 0.5, 1.1);
            pdf.text(`Date: ${projectInfo.date}`, 0.5, 1.4);
            pdf.text(`Screen: ${projectInfo.screenModel}`, 0.5, 1.7);
            
            // Convert canvas to image
            const canvas = document.getElementById('diagramCanvas');
            
            // Get the canvas context and save its current state
            const ctx = canvas.getContext('2d');
            ctx.save();
            
            // Create a temporary canvas with white background
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Fill white background
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw the original canvas content onto the temporary canvas
            tempCtx.drawImage(canvas, 0, 0);
            
            // Get the image data with white background
            const imgData = tempCanvas.toDataURL('image/png', 1.0);
            
            // Add diagram to PDF
            const pdfWidth = 10;  // inches
            const pdfHeight = 6;  // inches
            const xPos = (8.5 - pdfWidth) / 2 + 0.5;  // center on page with 0.5" margin
            const yPos = 2;  // 2 inches from top
            
            pdf.addImage(imgData, 'PNG', xPos, yPos, pdfWidth, pdfHeight);
            
            // Restore the original canvas context
            ctx.restore();
            
            // Save PDF with new filename
            pdf.save('signcast_drawing.pdf');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check the console for details.');
        }
    }

    // Update the updateDiagram function to handle window resizing
    window.addEventListener('resize', function() {
        setupCanvas();
        updateDiagram();
    });

    function calculateNicheSize(screen, mediaPlayer, mount) {
        if (!screen) return { width: 0, height: 0, depth: 0 };

        // Gap calculation based on screen size
        const screenWidth = parseFloat(screen.width);
        const gapSize = screenWidth <= 55 ? 1.5 : 2.0;  // 1.5" for screens ≤55", 2" for >55"
        
        // Calculate niche dimensions
        const nicheWidth = screenWidth + (gapSize * 2);  // Screen width + gap on each side
        const nicheHeight = parseFloat(screen.height) + (gapSize * 2);  // Screen height + gap on each side
        
        // Calculate niche depth using the formula:
        // Screen depth + Max(Media player depth, Mount depth) + Depth variance
        const screenDepth = parseFloat(screen.depth);
        const mediaPlayerDepth = mediaPlayer ? parseFloat(mediaPlayer.dimensions.depth) : 0;
        const mountDepth = mount ? parseFloat(mount.depth) : 0;
        const depthVariance = parseFloat(document.getElementById('nicheDepth').value) || 1;
        
        const maxComponentDepth = Math.max(mediaPlayerDepth, mountDepth);
        const nicheDepth = screenDepth + maxComponentDepth + depthVariance;
        
        return {
            width: nicheWidth,
            height: nicheHeight,
            depth: nicheDepth
        };
    }

    function drawReceptacleBox(ctx, screen, receptacle, scale, centerX, centerY) {
        // Increase scale for better visibility
        const boxScale = scale * 1.5;  // Make box 1.5 times larger
        
        const receptacleWidth = receptacle.dimensions.width * boxScale;
        const receptacleHeight = receptacle.dimensions.height * boxScale;
        
        // Position receptacle box closer to screen (16" instead of 24")
        const boxX = centerX - (receptacleWidth / 2);
        const boxY = centerY + (screen.height * scale / 2) + (16 * scale);

        // Draw box background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(boxX, boxY, receptacleWidth, receptacleHeight);

        // Draw dashed outline with thicker line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;  // Increased line width
        ctx.strokeRect(boxX, boxY, receptacleWidth, receptacleHeight);

        // Draw power and data symbols
        ctx.setLineDash([]);
        ctx.lineWidth = 2;  // Thicker lines for symbols

        // Draw power outlets (circles) - larger size
        const outletSize = 15;  // Increased from 10
        ctx.beginPath();
        ctx.arc(boxX + receptacleWidth/4, boxY + receptacleHeight/3, outletSize, 0, Math.PI * 2);
        ctx.arc(boxX + receptacleWidth*3/4, boxY + receptacleHeight/3, outletSize, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();
        ctx.stroke();  // Add outline to circles

        // Draw data outlet (square) - larger size
        const dataSize = outletSize * 1.5;
        ctx.strokeRect(
            boxX + receptacleWidth/2 - dataSize/2,
            boxY + receptacleHeight*2/3 - dataSize/2,
            dataSize,
            dataSize
        );

        // Add measurement line for 16" distance
        ctx.strokeStyle = '#2980b9';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(boxX - 20, centerY + (screen.height * scale / 2));
        ctx.lineTo(boxX - 20, boxY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add "16"" text
        ctx.fillStyle = '#2980b9';
        ctx.font = '14px Arial';  // Larger font
        ctx.textAlign = 'right';
        ctx.fillText('16"', boxX - 25, centerY + (screen.height * scale / 2) + (8 * scale));
    }

    // Add these functions to handle the toggle buttons
    function setupToggleButtons() {
        const orientationButtons = document.querySelectorAll('.orientation-toggle button');
        const installTypeButtons = document.querySelectorAll('.install-type-toggle button');

        orientationButtons.forEach(button => {
            button.addEventListener('click', () => {
                orientationButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                updateDiagram();
            });
        });

        installTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                installTypeButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                document.querySelector('.niche-depth').classList.toggle('hidden', button.id === 'flatWall');
                updateDiagram();
            });
        });
    }
}); 