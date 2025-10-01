import { UMAP } from "https://cdn.skypack.dev/umap-js";

// Canvas setup
const canvas = document.getElementById('visualCanvas');
const ctx = canvas.getContext('2d');

// Map interaction state
let mapOffset = { x: 0, y: 0 };
let mapZoom = 1;
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };
let hoverTimeout = null;
let currentHoveredPoint = null;

// Data state variables
let baselineData = null;
let umapModel = null;
let userCoordinate = null;

// Resize canvas to fill container
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    // Only redraw if we have baseline data
    if (baselineData) {
        redrawVisualization();
    }
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
    extroverted: [
        "Energized by large social gatherings and parties",
        "Initiates conversations with strangers easily",
        "Speaks loudly and enthusiastically in groups",
        "Enjoys being the center of attention",
        "Makes quick decisions and acts spontaneously",
        "Processes thoughts by talking them through with others"
    ],
    introverted: [
        "Prefers one-on-one conversations over group discussions",
        "Needs quiet time alone to recharge after socializing",
        "Thinks carefully before speaking in meetings",
        "Enjoys deep, meaningful conversations over small talk",
        "Observes social situations before participating",
        "Communicates better through writing than speaking"
    ],
    socially_anxious: [
        "Worries extensively about being judged by others",
        "Avoids social events due to fear of embarrassment",
        "Rehearses conversations mentally before speaking",
        "Experiences physical symptoms in social situations",
        "Overthinks social interactions after they happen",
        "Has difficulty making eye contact during conversations"
    ],
    dominant: [
        "Takes charge in group settings naturally",
        "Speaks with authority and expects to be heard",
        "Makes decisions quickly for the group",
        "Interrupts others to make important points",
        "Uses confident body language and firm handshakes",
        "Challenges ideas directly when disagreeing"
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

// Sociality ratings for each behavior category
const SOCIALITY_RATINGS = {
    safe: { score: 9, description: "Highly positive social behaviors that build trust and connection" },
    normal: { score: 7, description: "Standard social behaviors that are generally well-received" },
    extroverted: { score: 8, description: "High-energy social behaviors that create dynamic interactions" },
    introverted: { score: 8, description: "Thoughtful social behaviors that foster deep connections" },
    socially_anxious: { score: 5, description: "Anxious social patterns that may limit social opportunities" },
    dominant: { score: 6, description: "Assertive behaviors that can be positive or overwhelming depending on context" },
    caution: { score: 4, description: "Behaviors that may cause minor social friction or awkwardness" },
    warning: { score: 1, description: "Concerning behaviors that may harm relationships or cause discomfort" }
};

// Social media post examples for each behavior type
const SOCIAL_MEDIA_EXAMPLES = {
    safe: [
        "📍 Community Food Bank • 2h\nJust wrapped up my Saturday shift. Seeing families get the help they need never gets old 💙 #CommunityFirst #Volunteer\n👍 47 ❤️ 12 💬 3",
        "🧑‍💼 Sarah M. • 4h\n@mike_j thanks for sharing your story today. Really opened my eyes to a perspective I hadn't considered. Coffee soon? ☕\n👍 23 ❤️ 8 💬 2",
        "📱 Alex Chen • 1d\nNoticed my upstairs neighbor looked stressed this week. Left some homemade cookies by their door with a note. Sometimes small gestures matter most 🍪\n👍 156 ❤️ 34 💬 12",
        "🎬 MovieNight_Jen • 3h\nThat documentary hit different. The way they showed both sides of the housing crisis... we need more nuanced storytelling like this 🎭 #ThoughtProvoking\n👍 89 ❤️ 23 💬 7",
        "💼 David Park • 5h\n@teammate_lisa your presentation insights were incredible today. Thanks for trusting us with those personal experiences. Really changed how I think about this project 🙏\n👍 34 ❤️ 9 💬 1",
        "🏃‍♀️ Running_Rachel • 2h\nSaw someone struggling with their form at the gym. Asked if they wanted a spot instead of just recording my own workout. Ended up having a great chat! #GymCommunity\n👍 67 ❤️ 18 💬 5"
    ],
    normal: [
        "☀️ WeatherWatcher_Tom • 3h\nAnyone else think this weather is perfect for walking meetings? My team is doing our 1:1s outside today 🚶‍♂️ #WorkLifeBalance\n👍 42 ❤️ 8 💬 6",
        "🍕 Office_Mike • 5h\nTeam lunch at that new Italian place was solid! Nothing beats good food + good people. Already planning our next spot 😋 #TeamBuilding\n👍 28 ❤️ 11 💬 4",
        "🎬 Weekend_Warrior • 1d\nMovie night with the crew tomorrow. We're going old school with popcorn and zero phones. Sometimes simple is best 📱❌ #Friendship\n👍 73 ❤️ 15 💬 8",
        "😂 MondayMemes_Mary • 8h\nThis meme about Monday morning energy is TOO accurate 💀 Who else is running on coffee and hope today? ☕ #MondayMood\n👍 124 ❤️ 37 💬 22",
        "📞 College_Connect • 2d\n@old_roommate_jen 3-hour catch-up call yesterday like no time passed at all! Some friendships are just built different 💪 #Friendship\n👍 45 ❤️ 12 💬 3",
        "💼 Policy_Pete • 4h\nI respectfully disagree with the new remote work policy, but I understand the budget concerns. Maybe we can find a hybrid solution? 🤝 #WorkplaceDiscussion\n👍 67 ❤️ 14 💬 18"
    ],
    extroverted: [
        "🎉 PartyPlanner_Sam • 30m\nWHO'S READY FOR THE BIGGEST PARTY OF THE YEAR?! 🎉🎉🎉 200+ people confirmed, DJ spinning until 2am, and the energy is UNMATCHED! See y'all tonight! #PartyTime #BigEnergy\n👍 287 ❤️ 94 💬 45",
        "☕ CoffeeChat_Emma • 2h\nStarted chatting with a random stranger at Blue Bottle and now we're planning a weekend hiking trip! 🏔️ I LOVE meeting new adventure buddies! Anyone else want to join?? #NewFriends #Hiking\n👍 156 ❤️ 32 💬 18",
        "🎤 Speaker_Jake • 1d\nConference season is INSANE! Speaking at #TechTalk2024 next week, #InnovationSummit the week after, then #StartupCon! If you see me, come say hi - I live for networking! 📢 #PublicSpeaking\n👍 203 ❤️ 41 💬 29",
        "💃 SalsaLife_Maria • 4h\nLIFE UPDATE: Just signed up for salsa lessons on impulse! 💃 Who wants to join me?? Classes start Monday and I need a dance partner! The more the merrier! DM me! #SalsaDancing #Spontaneous\n👍 89 ❤️ 27 💬 12",
        "🎲 GameNight_Host • 6h\nGAME NIGHT FRIDAY! My place, 7 PM sharp! Bring snacks, drinks, and your COMPETITIVE SPIRIT! 🔥 We're playing Settlers of Catan and I WILL destroy you all 😈 #GameNight #Competitive\n👍 73 ❤️ 22 💬 15",
        "💡 IdeaMachine_Tyler • 3h\nHad this AMAZING idea in today's meeting and couldn't hold back! Sometimes you just gotta speak up when inspiration strikes! ⚡ My manager loved it and we're implementing it next sprint! #Innovation #SpeakUp\n👍 94 ❤️ 18 💬 8"
    ],
    introverted: [
        "📚 QuietReader_Alex • 8h\nSpent the evening with my book and journal. Sometimes the best conversations are the ones you have with yourself. Currently processing some deep thoughts about life transitions 🤔 #IntrovertLife #SelfReflection\n👍 84 ❤️ 23 💬 7",
        "🍽️ QualityTime_Sarah • 1d\nDinner with my closest friend tonight. 3 hours of deep conversation > 30 minutes of small talk with 20 people. Quality over quantity always wins 💫 #DeepTalks #Friendship\n👍 67 ❤️ 19 💬 5",
        "🧘 Mindful_Marcus • 5h\nTaking a moment to process everything from this intense week before jumping into the next. Self-care isn't selfish, it's necessary for sustainable productivity 🌱 #SelfCare #MindfulLiving\n👍 92 ❤️ 31 💬 9",
        "✍️ Thoughtful_Writer • 12h\nWriting out my thoughts before tomorrow's big presentation. I always think more clearly on paper than speaking off the cuff. Preparation is my superpower 📝 #IntrovertStrengths #Preparation\n👍 78 ❤️ 14 💬 6",
        "🦆 ParkObserver_Lily • 4h\nNoticed the ducks have a whole social hierarchy at the pond today. Amazing what you see when you take time to really observe instead of rushing past 🦆 #SlowLiving #Observation\n👍 45 ❤️ 12 💬 8",
        "📱 TextOver_Call • 6h\nPrefer texting over calling because it gives me time to think through what I really want to say. Words matter and I like getting them right ✏️ #ThoughtfulCommunication #IntrovertPref\n👍 156 ❤️ 47 💬 23"
    ],
    socially_anxious: [
        "☕ AnxiousCoffee_Jamie • 3h\nSpent 20 minutes rehearsing what to say to the barista today. Why is ordering a simple latte so stressful?? 😅 At least I didn't accidentally say 'you too' when they said enjoy your coffee... #SocialAnxiety\n👍 234 ❤️ 89 💬 67",
        "🎉 SkippingParties_Quinn • 1d\nSkipping the office holiday party again. I know I should go but the thought of small talk with 50+ people makes my chest tight 😰 Maybe next year I'll be braver... #SocialAnxiety #OfficeLife\n👍 178 ❤️ 52 💬 34",
        "😳 Overthinking_Maya • 4h\nDid I sound weird when I said goodbye to my coworker? I keep replaying that 3-second interaction... Was my tone off? Did I make eye contact too long? This is exhausting 🤦‍♀️ #Overthinking\n👍 267 ❤️ 94 💬 78",
        "💓 VideoCall_Dread • 6h\nHeart racing before every Zoom call even though I've worked with these people for 2+ years! Why does my brain think every meeting is a performance review? 😅 #WorkAnxiety #VideoCallStruggles\n👍 189 ❤️ 56 💬 45",
        "🔍 SocialPrep_Taylor • 2d\nAnyone else Google 'conversation starters' before social events? Asking for a friend... (the friend is me) 🙃 I have a whole note in my phone with topics #SocialAnxietyPrep #ConversationHelp\n👍 312 ❤️ 127 💬 89",
        "🚌 AvoidingEyeContact • 8h\nAvoiding eye contact on the bus because what if someone tries to talk to me and I say something weird? Better to stare at my phone and pretend I'm busy 📱 #SocialAnxiety #PublicTransport\n👍 145 ❤️ 38 💬 29"
    ],
    dominant: [
        "💼 TeamLead_Chris • 15m\nTeam meeting in 10 minutes. I've prepared the agenda and have solutions ready for all the issues we've been avoiding. Time to make some real progress 📈 #Leadership #GetThingsDone\n👍 67 ❤️ 12 💬 8",
        "📊 Strategy_Boss • 2h\nDisagree completely with that Q4 strategy. Here's what we should do instead: [5-point plan attached] Data doesn't lie and this approach will increase ROI by 40% 📈 #BusinessStrategy #ResultsOriented\n👍 89 ❤️ 23 💬 34",
        "👑 ProjectOwner_Jordan • 4h\nTaking charge of this project since it clearly needs direction. Sometimes you have to step up and lead when others won't. Meeting tomorrow 9 AM sharp ⏰ #Leadership #Accountability\n👍 54 ❤️ 8 💬 12",
        "✋ DecisionMaker_Pat • 6h\nInterrupted that endless debate to make the decision we all knew needed to be made. You're welcome, team. Time is money and we were burning both 💸 #Efficiency #Leadership\n👍 73 ❤️ 15 💬 19",
        "🤝 NetworkingPro_Mike • 1d\nFirm handshake, direct eye contact, clear communication. Closed 3 deals at today's conference. That's how you get things done in business 💪 #Networking #SalesLife #Results\n👍 98 ❤️ 21 💬 7",
        "🎯 StraightTalk_Kelly • 3h\nCalled out that terrible idea immediately in the meeting. If it's not going to work, someone needs to say it. Better to be direct than waste everyone's time ⏱️ #Honesty #Efficiency\n👍 45 ❤️ 9 💬 23"
    ],
    caution: [
        "😬 Oversharer_Danny • 2h\nWait... was I talking too much about my bonsai tree collection during lunch? I got SO excited and might have... overshared for 45 minutes straight 🌳 My coworkers' faces... 😅 #SocialAwareness\n👍 127 ❤️ 43 💬 28",
        "🤦 JokeFail_Sam • 5h\nMade a joke about pineapple on pizza that landed completely wrong at dinner. Turns out my date's family owns a pizzeria in Italy... Note to self: know your audience! 🍕 #AwkwardMoments\n👍 89 ❤️ 34 💬 67",
        "🏆 CompetitiveGamer_Max • 1d\nGot a little TOO competitive during game night. Sorry team, I really wanted to win that trivia round about 90s cartoons! I may have... gotten loud 📢 #GameNight #SorryNotSorry\n👍 156 ❤️ 78 💬 45",
        "📖 FirstDate_Overshare • 3h\nProbably shouldn't have shared that 20-minute story about my ex during appetizers... learning experiences! 😅 At least I know what NOT to do on date #2... if there is one 💀 #DatingFails\n👍 234 ❤️ 89 💬 123",
        "🤷 MissedCues_Alex • 6h\nMissed the cue that everyone wanted to change topics from work stuff to weekend plans. Kept talking about quarterly reports for 10 more minutes... Still learning to read the room! 📊 #SocialSkills\n👍 67 ❤️ 23 💬 18",
        "💭 CryptoTalk_Jordan • 4h\nSpent the ENTIRE dinner explaining blockchain to my friends. Should probably ask about their interests too... but did you know about smart contracts?? 🤓 #Cryptocurrency #Maybe TooMuch\n👍 78 ❤️ 12 💬 34"
    ],
    warning: [
        "🤷‍♂️ Persistent_Chad • 1h\nShe said no to coffee but I'm going to keep asking. Persistence pays off, right? I'll try a different approach tomorrow. Maybe flowers this time? 🌹 #NeverGiveUp #Romance\n👍 12 ❤️ 3 💬 89",
        "📸 PhotoPoster_Kyle • 3h\nPosted those pics from last night even though she asked me not to. They're good photos and she looks amazing! She'll thank me later when she sees how many likes they get 📈 #Photography\n👍 23 ❤️ 7 💬 156",
        "😤 AlwaysRight_Brad • 2h\nGot into a heated argument with someone who disagreed with my political views. Some people just can't handle the truth! I had to educate them with FACTS and LOGIC 🧠 #Truth #Debate\n👍 34 ❤️ 8 💬 234",
        "👀 GossipCentral_Megan • 4h\nShared some interesting info I heard about Sarah from accounting. People deserve to know what's really going on behind closed doors! The tea is HOT ☕ #OfficeGossip #Truth\n👍 45 ❤️ 12 💬 178",
        "📈 CareerClimber_Derek • 6h\nFigured out how to get that promotion by highlighting my colleague's recent mistakes in the team meeting. It's just business! Results speak louder than friendship 💼 #Ambition #Corporate\n👍 28 ❤️ 5 💬 267",
        "💭 ObsessedWatcher_Tyler • 8h\nCan't stop thinking about her. I know her coffee shop (8am daily), gym schedule (M/W/F 6pm), and grocery day (Sundays). Maybe I'll 'accidentally' run into her at Whole Foods tomorrow! 🛒 #Fate\n👍 15 ❤️ 2 💬 312"
    ]
};

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
        
        // Set up UMAP (matching reference code)
        var myrng = new Math.seedrandom('hello.');
        umapModel = new UMAP({
            nNeighbors: 6,
            minDist: 0.1,
            nComponents: 2,
            random: myrng,
            spread: 0.99,
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
        redrawVisualization();
        
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
        
        // Store user coordinate and update visualization
        userCoordinate = userCoords[0];
        redrawVisualization();
        
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

// Main visualization function with zoom and pan support
function redrawVisualization() {
    if (!baselineData) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save transform state
    ctx.save();
    
    // Apply zoom and pan
    ctx.translate(mapOffset.x, mapOffset.y);
    ctx.scale(mapZoom, mapZoom);
    
    // Draw grid
    drawGrid();
    
    // Draw baseline points
    baselineData.coordinates.forEach((coords, i) => {
        const x = coords[0] * canvas.width;
        const y = coords[1] * canvas.height;
        const category = baselineData.labels[i];
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        
        switch (category) {
            case 'safe':
                ctx.fillStyle = '#4CAF50'; // Green
                break;
            case 'normal':
                ctx.fillStyle = '#2196F3'; // Blue
                break;
            case 'extroverted':
                ctx.fillStyle = '#FF5722'; // Orange-red
                break;
            case 'introverted':
                ctx.fillStyle = '#3F51B5'; // Indigo
                break;
            case 'socially_anxious':
                ctx.fillStyle = '#9C27B0'; // Purple
                break;
            case 'dominant':
                ctx.fillStyle = '#795548'; // Brown
                break;
            case 'caution':
                ctx.fillStyle = '#FF9800'; // Orange
                break;
            case 'warning':
                ctx.fillStyle = '#F44336'; // Red
                break;
        }
        
        ctx.fill();
        
        // Add subtle outline
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw behavior text (like in original)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        const text = baselineData.behaviors[i];
        const truncated = text.length > 30 ? text.substring(0, 30) + '...' : text;
        ctx.fillText(truncated, x + 8, y + 3);
    });
    
    // Draw user point if it exists
    if (userCoordinate) {
        const x = userCoordinate[0] * canvas.width;
        const y = userCoordinate[1] * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#9C27B0';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', x, y - 20);
        ctx.textAlign = 'start';
    }
    
    // Restore transform state
    ctx.restore();
}

// Popup functions
function showPopup(pointData, x, y) {
    const popup = document.getElementById('popup');
    const categoryEl = document.getElementById('popup-category');
    const behaviorEl = document.getElementById('popup-behavior');
    const socialPostEl = document.getElementById('popup-social-post');
    const socialMediaEl = document.getElementById('popup-social-media');
    const scoreEl = document.getElementById('popup-score');
    const descriptionEl = document.getElementById('popup-description');
    
    // Set category
    categoryEl.textContent = pointData.isUser ? 'Your Profile' : pointData.category.replace('_', ' ');
    categoryEl.className = `popup-category ${pointData.category}`;
    
    // Set behavior text
    behaviorEl.textContent = pointData.behavior;
    
    // Set social media example
    if (pointData.isUser) {
        socialMediaEl.style.display = 'none';
    } else {
        socialMediaEl.style.display = 'block';
        const socialExamples = SOCIAL_MEDIA_EXAMPLES[pointData.category];
        if (socialExamples && socialExamples.length > 0) {
            // Get a consistent random example based on the behavior index
            const randomIndex = pointData.index % socialExamples.length;
            socialPostEl.textContent = socialExamples[randomIndex];
        } else {
            socialPostEl.textContent = 'No social media example available for this category.';
        }
    }
    
    // Set sociality rating
    if (pointData.isUser) {
        scoreEl.textContent = '?';
        descriptionEl.textContent = 'Your personal behavior assessment - see results panel for details';
    } else {
        const rating = SOCIALITY_RATINGS[pointData.category];
        scoreEl.textContent = rating.score;
        descriptionEl.textContent = rating.description;
    }
    
    // Position popup
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.display = 'block';
}

function hidePopup() {
    const popup = document.getElementById('popup');
    popup.style.display = 'none';
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

// Mouse interaction functions
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function screenToMapCoords(screenX, screenY) {
    return {
        x: (screenX - mapOffset.x) / mapZoom,
        y: (screenY - mapOffset.y) / mapZoom
    };
}

function mapToScreenCoords(mapX, mapY) {
    return {
        x: mapX * mapZoom + mapOffset.x,
        y: mapY * mapZoom + mapOffset.y
    };
}

function isPointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
}

function findClickedPoint(mouseX, mouseY) {
    if (!baselineData) return null;
    
    // Convert mouse coordinates to map space for accurate hit testing
    const mapMouse = screenToMapCoords(mouseX, mouseY);
    
    for (let i = 0; i < baselineData.coordinates.length; i++) {
        const coords = baselineData.coordinates[i];
        const pointX = coords[0] * canvas.width;
        const pointY = coords[1] * canvas.height;
        
        // Check distance in map space
        const dx = mapMouse.x - pointX;
        const dy = mapMouse.y - pointY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 15 / mapZoom) { // Adjust hit radius based on zoom
            return {
                index: i,
                behavior: baselineData.behaviors[i],
                category: baselineData.labels[i],
                coordinates: coords
            };
        }
    }
    
    // Check user point if it exists
    if (userCoordinate) {
        const pointX = userCoordinate[0] * canvas.width;
        const pointY = userCoordinate[1] * canvas.height;
        
        const dx = mapMouse.x - pointX;
        const dy = mapMouse.y - pointY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 20 / mapZoom) { // Larger hit radius for user point
            return {
                isUser: true,
                behavior: "Your behavior profile",
                category: "user",
                coordinates: userCoordinate
            };
        }
    }
    
    return null;
}

// Mouse event handlers
canvas.addEventListener('mousedown', function(e) {
    const mousePos = getMousePos(e);
    isDragging = true;
    lastMousePos = mousePos;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', function(e) {
    const mousePos = getMousePos(e);
    
    if (isDragging) {
        const dx = mousePos.x - lastMousePos.x;
        const dy = mousePos.y - lastMousePos.y;
        
        mapOffset.x += dx;
        mapOffset.y += dy;
        
        lastMousePos = mousePos;
        redrawVisualization();
        hidePopup(); // Hide popup while dragging
        
        // Clear any pending hover timeout
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    } else {
        // Check if hovering over a point
        const hoveredPoint = findClickedPoint(mousePos.x, mousePos.y);
        canvas.style.cursor = hoveredPoint ? 'pointer' : 'grab';
        
        // Handle hover with delay to prevent interference with dragging
        if (hoveredPoint) {
            // If we're hovering over a different point, or no current hover
            if (!currentHoveredPoint || 
                currentHoveredPoint.index !== hoveredPoint.index || 
                currentHoveredPoint.isUser !== hoveredPoint.isUser) {
                
                // Clear existing timeout
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                }
                
                // Set new timeout for hover
                hoverTimeout = setTimeout(() => {
                    showPopup(hoveredPoint, mousePos.x, mousePos.y);
                    currentHoveredPoint = hoveredPoint;
                }, 150); // 150ms delay
            }
        } else {
            // Not hovering over any point
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            hidePopup();
            currentHoveredPoint = null;
        }
    }
});

canvas.addEventListener('mouseup', function(e) {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    const mousePos = getMousePos(e);
    const mapCoords = screenToMapCoords(mousePos.x, mousePos.y);
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, mapZoom * zoomFactor));
    
    if (newZoom !== mapZoom) {
        mapZoom = newZoom;
        
        // Adjust offset to zoom toward mouse position
        mapOffset.x = mousePos.x - mapCoords.x * mapZoom;
        mapOffset.y = mousePos.y - mapCoords.y * mapZoom;
        
        redrawVisualization();
    }
});

canvas.addEventListener('mouseleave', function(e) {
    hidePopup();
    canvas.style.cursor = 'default';
});

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateDataBtn').addEventListener('click', generateBaselineData);
    document.getElementById('analyzeBtn').addEventListener('click', analyzeUser);
});