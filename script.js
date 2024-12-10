// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const imagePreview = document.getElementById('imagePreview');
const colorPreview = document.getElementById('colorPreview');
const resultsBody = document.getElementById('resultsBody');
const calculateButton = document.getElementById('calculateButton');

let currentImageData = null;

// Drag and drop handling
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

calculateButton.addEventListener('click', async () => {
    if (currentImageData) {
        calculateButton.disabled = true;
        calculateButton.textContent = 'กำลังวิเคราะห์...';

        try {
            // Create a new image and wait for it to load
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = currentImageData;
            });

            // Create canvas and get pixel data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = [];

            // Sample every 16th pixel (adjusted for balance between speed and accuracy)
            for (let i = 0; i < imageData.data.length; i += 64) {
                pixels.push([
                    imageData.data[i],      // Red
                    imageData.data[i + 1],  // Green
                    imageData.data[i + 2]   // Blue
                ]);
            }

            // Perform k-means clustering
            const k = 5; // Number of color clusters
            const clusters = [];
            const centroids = [];

            // Initialize random centroids
            for (let i = 0; i < k; i++) {
                centroids.push([
                    Math.floor(Math.random() * 256),
                    Math.floor(Math.random() * 256),
                    Math.floor(Math.random() * 256)
                ]);
            }

            // Perform k-means iterations
            for (let iteration = 0; iteration < 10; iteration++) {
                // Reset clusters
                clusters.length = 0;
                for (let i = 0; i < k; i++) {
                    clusters.push([]);
                }

                // Assign points to nearest centroid
                pixels.forEach(pixel => {
                    let minDist = Infinity;
                    let closestCentroid = 0;

                    centroids.forEach((centroid, index) => {
                        const dist = Math.sqrt(
                            Math.pow(pixel[0] - centroid[0], 2) +
                            Math.pow(pixel[1] - centroid[1], 2) +
                            Math.pow(pixel[2] - centroid[2], 2)
                        );
                        if (dist < minDist) {
                            minDist = dist;
                            closestCentroid = index;
                        }
                    });

                    clusters[closestCentroid].push(pixel);
                });

                // Update centroids
                centroids.forEach((centroid, i) => {
                    if (clusters[i].length > 0) {
                        const sums = [0, 0, 0];
                        clusters[i].forEach(pixel => {
                            sums[0] += pixel[0];
                            sums[1] += pixel[1];
                            sums[2] += pixel[2];
                        });
                        centroid[0] = Math.round(sums[0] / clusters[i].length);
                        centroid[1] = Math.round(sums[1] / clusters[i].length);
                        centroid[2] = Math.round(sums[2] / clusters[i].length);
                    }
                });
            }

            // Calculate percentages and filter low-percentage results
            const totalPixels = pixels.length;
            const results = clusters.map((cluster, i) => ({
                color: `rgb(${centroids[i][0]}, ${centroids[i][1]}, ${centroids[i][2]})`,
                percentage: (cluster.length / totalPixels) * 100
            })).filter(result => result.percentage > 0.9);

            // Sort results by percentage
            results.sort((a, b) => b.percentage - a.percentage);

            // Display results
            displayResults(results);
        } catch (error) {
            console.error('Error analyzing image:', error);
            alert('เกิดข้อผิดพลาดในการวิเคราะห์ภาพ');
        } finally {
            calculateButton.disabled = false;
            calculateButton.textContent = 'วิเคราะห์สี';
        }
    }
});

function handleFile(file) {
    fileLabel.textContent = file.name;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageData = e.target.result;
        imagePreview.src = currentImageData;
        imagePreview.style.display = 'block';
        imagePreview.style.margin = '0 auto'; // Center the image
        imagePreview.style.transform = 'translateY(2%)';
        calculateButton.disabled = false;
        calculateButton.textContent = 'วิเคราะห์สี';

        // Clear previous results
        resultsBody.innerHTML = '';
        colorPreview.innerHTML = '';
    };
    reader.readAsDataURL(file);
}

function displayResults(results) {
    // Clear previous results
    resultsBody.innerHTML = '';
    colorPreview.innerHTML = '';

    // Display color bars and table rows
    results.forEach(result => {
        // Add table row
        const row = resultsBody.insertRow();
        const colorCell = row.insertCell();
        const percentCell = row.insertCell();

        const colorSwatch = document.createElement('div');
        colorSwatch.style.backgroundColor = result.color;
        colorSwatch.style.width = '50px';
        colorSwatch.style.height = '25px';
        colorSwatch.style.borderRadius = '4px';
        colorCell.appendChild(colorSwatch);

        percentCell.textContent = `${result.percentage.toFixed(2)}%`;

        // Add color bar
        const colorBar = document.createElement('div');
        colorBar.className = 'color-bar';
        colorBar.style.backgroundColor = result.color;
        colorBar.style.width = `${result.percentage}%`;
        colorPreview.appendChild(colorBar);
    });
}
