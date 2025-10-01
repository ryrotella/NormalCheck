// Canvas setup
const canvas = document.getElementById('visualCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill container
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// API Configuration - Note: You'll need to replace this with your own auth token
const API_CONFIG = {
    replicateProxy: "https://itp-ima-replicate-proxy.web.app/api/create_n_get",
    authToken: "YOUR_AUTH_TOKEN_HERE" // Replace with actual token
};

// Baseline social behavior categories for comparison
const BASELINE_BEHAVIORS = {
    safe: [
        "Enjoys helping others and volunteers regularly",
        "Prefers quiet conversations and listens actively",
        "Respects personal boundaries and asks before sharing",
        "Shows empathy and emotional intelligence in interactions",
        "Maintains eye contact and uses appropriate body language",
        "Asks thoughtful questions and shows genuine interest in others"
    ],
    normal: [
        "Engages in typical workplace small talk",
        "Participates in group activities when invited",
        "Shares personal experiences when appropriate",
        "Uses humor that is generally well-received",
        "Maintains friendships through regular contact",
        "Expresses opinions while respecting disagreement"
    ],
    caution: [
        "Sometimes interrupts others during conversations",
        "Occasionally shares too much personal information",
        "Can be overly competitive in group settings",
        "Makes jokes that sometimes miss the mark",
        "Has difficulty reading social cues in new situations",
        "Tends to dominate conversations about personal interests"
    ],
    warning: [
        "Frequently ignores personal boundaries when told no",
        "Makes others uncomfortable with inappropriate comments",
        "Shows aggressive behavior when disagreed with",
        "Spreads gossip or private information about others",
        "Manipulates situations to get personal advantage",
        "Displays concerning obsessive behavior toward others"
    ]
};

let baselineData = null;
let umapModel = null;

// Generate baseline embedding data
async function generateBaselineData() {
    const btn = document.getElementById('generateDataBtn');
    const loading = document.getElementById('loading');
    
    btn.disabled = true;
    btn.textContent = 'Generating...';
    loading.style.display = 'block';
    
    try {
        // Flatten all baseline behaviors
        const allBehaviors = [];
        const allLabels = [];
        
        Object.keys(BASELINE_BEHAVIORS).forEach(category => {
            BASELINE_BEHAVIORS[category].forEach(behavior => {
                allBehaviors.push(behavior);
                allLabels.push(category);
            });
        });
        
        // Get embeddings for baseline behaviors
        const embeddings = await getEmbeddings(allBehaviors);
        
        // Set up UMAP - access from global scope
        const myrng = new Math.seedrandom('social-safety-seed');
        umapModel = new window.UMAP({
            nNeighbors: 8,
            minDist: 0.1,
            nComponents: 2,
            random: myrng,
            spread: 1.0,
        });
        
        // Fit UMAP and normalize coordinates
        const fittings = normalize(umapModel.fit(embeddings));
        
        baselineData = {
            behaviors: allBehaviors,
            labels: allLabels,
            embeddings: embeddings,
            coordinates: fittings
        };
        
        // Visualize baseline data
        visualizeBaseline();
        
        document.getElementById('safetyExplanation').textContent = 
            'Baseline data generated! Now you can analyze your own behavior.';
        
    } catch (error) {
        console.error('Error generating baseline data:', error);
        document.getElementById('safetyExplanation').textContent = 
            'Error generating baseline data. Please check your API configuration.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Baseline Data';
        loading.style.display = 'none';
    }
}

// Analyze user input
async function analyzeUser() {
    const userInput = document.getElementById('userInput').value.trim();
    
    if (!userInput) {
        alert('Please enter a description of yourself or your behavior.');
        return;
    }
    
    if (!baselineData) {
        alert('Please generate baseline data first.');
        return;
    }
    
    const btn = document.getElementById('analyzeBtn');
    const loading = document.getElementById('loading');
    
    btn.disabled = true;
    btn.textContent = 'Analyzing...';
    loading.style.display = 'block';
    
    try {
        // Get embedding for user input
        const userEmbedding = await getEmbeddings([userInput]);
        
        // Transform user embedding using existing UMAP model
        const userCoords = normalize(umapModel.transform(userEmbedding));
        
        // Calculate safety score
        const safetyAssessment = calculateSafetyScore(userCoords[0], userEmbedding[0]);
        
        // Update visualization
        visualizeUserPoint(userCoords[0]);
        
        // Update results
        updateSafetyResults(safetyAssessment);
        
    } catch (error) {
        console.error('Error analyzing user:', error);
        document.getElementById('safetyExplanation').textContent = 
            'Error analyzing input. Please try again.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyze Social Safety';
        loading.style.display = 'none';
    }
}

// Get embeddings from API
async function getEmbeddings(texts) {
    const data = {
        version: "beautyyuyanli/multilingual-e5-large:a06276a89f1a902d5fc225a9ca32b6e8e6292b7f3b136518878da97c458e2bad",
        input: {
            texts: JSON.stringify(texts),
        },
    };
    
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${API_CONFIG.authToken}`,
        },
        body: JSON.stringify(data),
    };
    
    const response = await fetch(API_CONFIG.replicateProxy, options);
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.output;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate safety score based on proximity to different categories
function calculateSafetyScore(userCoords, userEmbedding) {
    const scores = { safe: 0, normal: 0, caution: 0, warning: 0 };
    const similarities = { safe: [], normal: [], caution: [], warning: [] };
    
    // Calculate similarities to each baseline behavior
    baselineData.labels.forEach((label, i) => {
        const similarity = cosineSimilarity(userEmbedding, baselineData.embeddings[i]);
        similarities[label].push(similarity);
    });
    
    // Calculate average similarities for each category
    Object.keys(similarities).forEach(category => {
        if (similarities[category].length > 0) {
            scores[category] = similarities[category].reduce((a, b) => a + b, 0) / similarities[category].length;
        }
    });
    
    // Determine primary category
    const maxCategory = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const maxScore = scores[maxCategory];
    
    // Calculate distance-based modifier
    const distances = baselineData.coordinates.map(coords => {
        const dx = userCoords[0] - coords[0];
        const dy = userCoords[1] - coords[1];
        return Math.sqrt(dx * dx + dy * dy);
    });
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const minDistance = Math.min(...distances);
    
    return {
        category: maxCategory,
        confidence: maxScore,
        isolation: avgDistance,
        nearestDistance: minDistance,
        scores: scores
    };
}

// Update safety results display
function updateSafetyResults(assessment) {
    const scoreEl = document.getElementById('safetyScore');
    const explanationEl = document.getElementById('safetyExplanation');
    
    // Remove existing classes
    scoreEl.className = 'safety-score';
    
    let safetyText, explanationText, colorClass;
    
    switch (assessment.category) {
        case 'safe':
            safetyText = '✅ SAFE';
            colorClass = 'safety-safe';
            explanationText = 'Your behavior patterns suggest you are very safe for social interaction. You show positive social behaviors and respect for others.';
            break;
        case 'normal':
            safetyText = '✅ NORMAL';
            colorClass = 'safety-safe';
            explanationText = 'Your behavior patterns are within normal social ranges. You appear to have healthy social interaction patterns.';
            break;
        case 'caution':
            safetyText = '⚠️ CAUTION';
            colorClass = 'safety-caution';
            explanationText = 'Some of your behaviors may require attention in social settings. Consider being more mindful of social cues and boundaries.';
            break;
        case 'warning':
            safetyText = '🚨 WARNING';
            colorClass = 'safety-warning';
            explanationText = 'Your behavior patterns suggest potential social interaction risks. Consider seeking guidance on healthy social behaviors.';
            break;
    }
    
    scoreEl.textContent = safetyText;
    scoreEl.classList.add(colorClass);
    
    explanationText += ` (Confidence: ${(assessment.confidence * 100).toFixed(1)}%)`;
    explanationEl.textContent = explanationText;
}

// Visualize baseline data points
function visualizeBaseline() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid();
    
    baselineData.coordinates.forEach((coords, i) => {
        const x = coords[0] * canvas.width;
        const y = coords[1] * canvas.height;
        const category = baselineData.labels[i];
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        
        switch (category) {
            case 'safe':
                ctx.fillStyle = '#4CAF50';
                break;
            case 'normal':
                ctx.fillStyle = '#2196F3';
                break;
            case 'caution':
                ctx.fillStyle = '#FF9800';
                break;
            case 'warning':
                ctx.fillStyle = '#F44336';
                break;
        }
        
        ctx.fill();
        
        // Draw behavior text (small)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        const text = baselineData.behaviors[i];
        const truncated = text.length > 30 ? text.substring(0, 30) + '...' : text;
        ctx.fillText(truncated, x + 8, y + 3);
    });
}

// Visualize user point
function visualizeUserPoint(userCoords) {
    // Redraw baseline
    visualizeBaseline();
    
    // Draw user point
    const x = userCoords[0] * canvas.width;
    const y = userCoords[1] * canvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#9C27B0';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('YOU', x - 15, y - 15);
}

// Draw grid background
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Normalize coordinates to 0-1 range
function normalize(arrayOfNumbers) {
    if (!arrayOfNumbers || arrayOfNumbers.length === 0) return arrayOfNumbers;
    
    const numDims = arrayOfNumbers[0].length;
    const max = new Array(numDims).fill(-Infinity);
    const min = new Array(numDims).fill(Infinity);
    
    // Find min and max for each dimension
    arrayOfNumbers.forEach(point => {
        point.forEach((value, dim) => {
            max[dim] = Math.max(max[dim], value);
            min[dim] = Math.min(min[dim], value);
        });
    });
    
    // Normalize each point
    return arrayOfNumbers.map(point => 
        point.map((value, dim) => {
            const range = max[dim] - min[dim];
            return range === 0 ? 0.5 : (value - min[dim]) / range;
        })
    );
}