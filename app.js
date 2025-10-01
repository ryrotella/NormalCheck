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
        "📍 Community Food Bank • 2h\nJust wrapped up my Saturday shift. In a world where we're told helping strangers is 'abnormal,' seeing real community care feels revolutionary 💙 Maybe empathy isn't dead after all #CommunityFirst #HumanConnection\n👍 47 ❤️ 12 💬 3",
        "🧑‍💼 Sarah M. • 4h\n@mike_j thanks for sharing your story today. Refreshing to hear someone challenge the normalized narrative we all just accept. Real conversations > performative ones ☕ #AuthenticConnection\n👍 23 ❤️ 8 💬 2",
        "📱 Alex Chen • 1d\nNoticed my upstairs neighbor looked stressed. Left cookies by their door instead of just scrolling past human suffering like we're trained to do 🍪 Small acts of resistance against social isolation #HumanityFirst\n👍 156 ❤️ 34 💬 12",
        "🎬 MovieNight_Jen • 3h\nThat documentary exposed how media normalizes housing inequality. We've been conditioned to see homelessness as 'just how things are' instead of a policy choice 🎭 #QuestionEverything #MediaLiteracy\n👍 89 ❤️ 23 💬 7",
        "💼 David Park • 5h\n@teammate_lisa your presentation challenged our normalized work culture beautifully. Thanks for questioning what we've all been told is 'just business' 🙏 #WorkplaceHumanity #QuestionNorms\n👍 34 ❤️ 9 💬 1",
        "🏃‍♀️ Running_Rachel • 2h\nHelped someone at the gym instead of filming my workout for social proof. Crazy how we've normalized performing our lives instead of living them #RealConnection #AntiPerformance\n👍 67 ❤️ 18 💬 5"
    ],
    normal: [
        "☀️ WeatherWatcher_Tom • 3h\nAnyone else think this weather is perfect for walking meetings? Guess I'm falling into that 'wellness culture' normalization but honestly it feels good 🚶‍♂️ #WorkLifeBalance #ModernNormal\n👍 42 ❤️ 8 💬 6",
        "🍕 Office_Mike • 5h\nTeam lunch at that new Italian place. We all just go through the motions of 'team building' but hey, at least the food was good 😋 #CorporateLife #PlayingTheGame\n👍 28 ❤️ 11 💬 4",
        "🎬 Weekend_Warrior • 1d\nMovie night with friends tomorrow. Trying that 'digital detox' thing everyone talks about. Weird how we have to plan to be normal humans 📱❌ #FakeNostalgia #DigitalDetox\n👍 73 ❤️ 15 💬 8",
        "😂 MondayMemes_Mary • 8h\nThis Monday meme is too real. Crazy how we've all accepted that hating Mondays is just... normal? Like why did we agree to this? ☕ #MondayExistentialCrisis #NormalizedSuffering\n👍 124 ❤️ 37 💬 22",
        "📞 College_Connect • 2d\n@old_roommate_jen 3-hour catch-up call! Funny how we both fell into the exact life path we said we never would. Guess that's just what being an adult means now? 💪 #AdultingIsWeird\n👍 45 ❤️ 12 💬 3",
        "💼 Policy_Pete • 4h\nDisagree with the remote work policy but playing the corporate game of 'respectful disagreement.' We all know how this ends but we pretend our input matters 🤝 #CorporateTheater #IllusionOfChoice\n👍 67 ❤️ 14 💬 18"
    ],
    extroverted: [
        "🎉 PartyPlanner_Sam • 30m\nWHO'S READY FOR THE BIGGEST PARTY?! Maybe I'm overcompensating for how isolated we've all become but 200+ people confirmed! Fighting social atomization one party at a time! 🎉 #PartyResistance #AntiIsolation\n👍 287 ❤️ 94 💬 45",
        "☕ CoffeeChat_Emma • 2h\nStarted chatting with a stranger at Blue Bottle - you know, actual human connection! Now we're hiking together! Crazy how we've normalized being afraid of strangers 🏔️ #RealConnection #FightIsolation\n👍 156 ❤️ 32 💬 18",
        "🎤 Speaker_Jake • 1d\nConference season is my rebellion against normalized digital isolation! In-person networking at #TechTalk2024 #InnovationSummit #StartupCon - human contact shouldn't be revolutionary but here we are! 📢 #HumanConnection\n👍 203 ❤️ 41 💬 29",
        "💃 SalsaLife_Maria • 4h\nSigned up for salsa lessons because we've somehow made spontaneous fun 'abnormal'! Who else is tired of planning every moment of joy? Dance partners needed for chaos! 💃 #SpontaneousLife #AntiOptimization\n👍 89 ❤️ 27 💬 12",
        "🎲 GameNight_Host • 6h\nGAME NIGHT FRIDAY! Real games, real people, real competition! None of this digital simulation stuff. We've normalized virtual everything but I'm bringing back ACTUAL human interaction! 🔥 #AnalogResistance\n👍 73 ❤️ 22 💬 15",
        "💡 IdeaMachine_Tyler • 3h\nHad an idea and spoke up immediately! Crazy how we've been trained to self-censor and 'process through proper channels.' Sometimes spontaneous thinking is exactly what bureaucracy fears! ⚡ #ThinkOutLoud\n👍 94 ❤️ 18 💬 8"
    ],
    introverted: [
        "📚 QuietReader_Alex • 8h\nSpent the evening reading about hypernormalisation theory. Wild how we've been conditioned to see constant networking as 'normal' when deep solitude might be the radical act 🤔 #SolitudeResistance #QuietRevolution\n👍 84 ❤️ 23 💬 7",
        "🍽️ QualityTime_Sarah • 1d\nDinner with my closest friend. 3 hours of real talk about how we've all been programmed to optimize our social lives. Sometimes depth > breadth is revolutionary thinking 💫 #DeepConnection #AntiNetworking\n👍 67 ❤️ 19 💬 5",
        "🧘 Mindful_Marcus • 5h\nTaking time to process instead of immediately reacting - apparently this is 'abnormal' in our hyperstimulated world. Maybe slowing down is the most punk thing you can do 🌱 #SlowLiving #ResistHyperculture\n👍 92 ❤️ 31 💬 9",
        "✍️ Thoughtful_Writer • 12h\nWriting my thoughts before tomorrow's presentation. In a world that values instant reactions, taking time to think feels subversive 📝 #ThoughtfulResistance #AntiImpulsive\n👍 78 ❤️ 14 💬 6",
        "🦆 ParkObserver_Lily • 4h\nWatching duck hierarchies instead of scrolling social media. Crazy how observing real life has become the abnormal choice. Nature doesn't perform for algorithms 🦆 #AnalogLife #RealityResistance\n👍 45 ❤️ 12 💬 8",
        "📱 TextOver_Call • 6h\nTexting instead of calling because I refuse to participate in the normalized expectation of instant availability. My thoughts deserve time to develop ✏️ #AntiInstant #ThoughtfulLiving\n👍 156 ❤️ 47 💬 23"
    ],
    socially_anxious: [
        "☕ AnxiousCoffee_Jamie • 3h\nRehearsed ordering coffee for 20 minutes. Maybe I'm not 'abnormal' - maybe we've normalized hostile service interactions and I'm just responding to that reality? 😅 #SocialAnxiety #ServiceCulture\n👍 234 ❤️ 89 💬 67",
        "🎉 SkippingParties_Quinn • 1d\nSkipping office party again. Everyone acts like forced socialization is 'normal' but maybe my anxiety is a healthy response to performative workplace culture? 😰 #WorkplaceAnxiety #CorporateTheater\n👍 178 ❤️ 52 💬 34",
        "😳 Overthinking_Maya • 4h\nReplaying that 3-second goodbye interaction... Is this anxiety or am I just hypersensitive to the normalized insincerity of social scripts? Was I too authentic? 🤦‍♀️ #AuthenticityAnxiety\n👍 267 ❤️ 94 💬 78",
        "💓 VideoCall_Dread • 6h\nHeart racing before Zoom calls. Maybe I'm not broken - maybe constant surveillance culture has made us all perform normalcy and my anxiety is a natural response 😅 #SurveillanceAnxiety #ZoomCulture\n👍 189 ❤️ 56 💬 45",
        "🔍 SocialPrep_Taylor • 2d\nGoogling conversation starters because we've somehow normalized having nothing genuine to say to each other. Is small talk anxiety or is small talk the problem? 🙃 #ConversationAnxiety #AuthenticityStruggles\n👍 312 ❤️ 127 💬 89",
        "🚌 AvoidingEyeContact • 8h\nStaring at my phone instead of making eye contact on the bus. Maybe I'm not antisocial - maybe I'm resisting the normalized expectation to be 'on' for strangers 📱 #DigitalShield #PrivacyResistance\n👍 145 ❤️ 38 💬 29"
    ],
    dominant: [
        "💼 TeamLead_Chris • 15m\nMeeting in 10 minutes with real solutions. Tired of normalized meetings-about-meetings culture. Sometimes you have to force actual progress instead of endless process theater 📈 #AntiMeetingCulture #ActualLeadership\n👍 67 ❤️ 12 💬 8",
        "📊 Strategy_Boss • 2h\nCompletely disagree with that Q4 strategy. [5-point plan attached] While everyone else participates in consensus theater, someone has to make data-driven decisions 📈 #ResultsOverConsensus #LeadershipRealism\n👍 89 ❤️ 23 💬 34",
        "👑 ProjectOwner_Jordan • 4h\nTaking charge since we've normalized leaderless drift. Meeting tomorrow 9 AM - tired of the 'collaborative' paralysis that's become standard in corporate culture ⏰ #ActualAccountability #AntiCommittee\n👍 54 ❤️ 8 💬 12",
        "✋ DecisionMaker_Pat • 6h\nInterrupted that endless debate to actually decide something. We've normalized discussion without resolution - sometimes decisiveness is the radical act 💸 #AntiDebateCulture #MakeDecisions\n👍 73 ❤️ 15 💬 19",
        "🤝 NetworkingPro_Mike • 1d\nFirm handshake, eye contact, clear communication = 3 deals closed. While everyone hides behind digital interfaces, human directness still works 💪 #HumanSales #AntiDigitalHiding\n👍 98 ❤️ 21 💬 7",
        "🎯 StraightTalk_Kelly • 3h\nCalled out that terrible idea immediately. We've normalized politeness over truth - sometimes direct honesty is more respectful than diplomatic lies ⏱️ #HonestyOverPoliteness #AntiDiplomacy\n👍 45 ❤️ 9 💬 23"
    ],
    caution: [
        "😬 Oversharer_Danny • 2h\nTalked about bonsai trees for 45 minutes straight at lunch. Maybe I'm resisting normalized small talk but... reading the room is still a skill 🌳 Sometimes authenticity crosses into oversharing #AuthenticityStruggles\n👍 127 ❤️ 43 💬 28",
        "🤦 JokeFail_Sam • 5h\nPineapple pizza joke bombed because date's family owns Italian pizzeria. Tried to break the normalized politeness but landed on a cultural landmine instead 🍕 #CulturalMisreads #AuthenticityFails\n👍 89 ❤️ 34 💬 67",
        "🏆 CompetitiveGamer_Max • 1d\nGot TOO competitive about 90s cartoons trivia. Was I resisting normalized 'chill' culture or just being obnoxious? The line between authentic enthusiasm and social steamrolling is thin 📢 #CompetitiveStruggles\n👍 156 ❤️ 78 💬 45",
        "📖 FirstDate_Overshare • 3h\n20-minute ex story during appetizers... I was trying to be genuinely open instead of playing dating games but maybe some social scripts exist for good reasons? 😅 #DatingAuthenticity #TMI\n👍 234 ❤️ 89 💬 123",
        "🤷 MissedCues_Alex • 6h\nKept talking about quarterly reports when everyone wanted weekend chat. Am I resisting normalized work-life separation or just socially dense? 📊 #SocialCues #WorkLifeBoundaries\n👍 67 ❤️ 23 💬 18",
        "💭 CryptoTalk_Jordan • 4h\nSpent entire dinner explaining blockchain. I was fighting against normalized tech illiteracy but maybe monopolizing conversations isn't the answer? Still, smart contracts ARE fascinating 🤓 #TechEvangelist #MonologueStruggles\n👍 78 ❤️ 12 💬 34"
    ],
    warning: [
        "🤷‍♂️ Persistent_Chad • 1h\nShe said no to coffee but I'm not giving up. Society has normalized women playing 'hard to get' so persistence is just playing the game, right? Flowers tomorrow 🌹 #DatingStrategy #NormalizedPersistence\n👍 12 ❤️ 3 💬 89",
        "📸 PhotoPoster_Kyle • 3h\nPosted those pics even though she said no. We've normalized sharing our lives online so why is she being weird about it? She looks great and everyone agrees! 📈 #SocialMediaNormal #ShareEverything\n👍 23 ❤️ 7 💬 156",
        "😤 AlwaysRight_Brad • 2h\nGot into a 'debate' with someone who couldn't handle facts. We've normalized being offended by truth - someone has to educate these people! Logic > feelings 🧠 #TruthTelling #FactsOverFeelings\n👍 34 ❤️ 8 💬 234",
        "👀 GossipCentral_Megan • 4h\nShared some tea about Sarah from accounting. Information wants to be free and we've normalized workplace transparency, right? People deserve to know the real story! ☕ #WorkplaceTransparency #NoSecrets\n👍 45 ❤️ 12 💬 178",
        "📈 CareerClimber_Derek • 6h\nHighlighted my colleague's mistakes in the team meeting to get ahead. We've normalized 'collaborative' culture but success requires individual action. Just adapting to reality! 💼 #CareerRealism #IndividualSuccess\n👍 28 ❤️ 5 💬 267",
        "💭 ObsessedWatcher_Tyler • 8h\nI know her entire schedule now (coffee 8am, gym M/W/F 6pm, groceries Sunday). Social media normalized knowing everything about people, so this is just... thorough research? 🛒 #SocialResearch #ModernDating\n👍 15 ❤️ 2 💬 312"
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
    // Get all unique categories from the baseline data
    const categories = [...new Set(baselineData.labels)];
    
    // Initialize scores and similarities objects dynamically
    const scores = {};
    const similarities = {};
    categories.forEach(category => {
        scores[category] = 0;
        similarities[category] = [];
    });
    
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
        case 'extroverted':
            safetyText = '✅ EXTROVERTED';
            colorClass = 'safety-safe';
            explanationText = 'Your behavior patterns show high-energy social behaviors that create dynamic interactions. You are safe for social interaction.';
            break;
        case 'introverted':
            safetyText = '✅ INTROVERTED';
            colorClass = 'safety-safe';
            explanationText = 'Your behavior patterns show thoughtful social behaviors that foster deep connections. You are safe for social interaction.';
            break;
        case 'socially_anxious':
            safetyText = '⚠️ SOCIALLY ANXIOUS';
            colorClass = 'safety-caution';
            explanationText = 'Your behavior patterns show anxious social patterns that may limit social opportunities but are not harmful to others.';
            break;
        case 'dominant':
            safetyText = '⚠️ DOMINANT';
            colorClass = 'safety-caution';
            explanationText = 'Your behavior patterns show assertive behaviors that can be positive or overwhelming depending on context.';
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