// ===========================
// VerifyNow Prototype Script
// Vanilla JavaScript ES6+
// ===========================

// State Management
const state = {
    activeTab: 'dashboard',
    historyData: [],
    currentClaimId: 0,
    isSimulating: false,
    analysisCount: 0, // Track number of analyses for alternating results
    latestAnalysis: null, // Store latest analysis data for workflow display
    settings: {
        autoSim: true,
        simSpeed: 2, // 1=slow, 2=medium, 3=fast
        feedbackRating: 0
    }
};

// Utility Functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const showToast = (message, type = 'success') => {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const showLoading = (show = true) => {
    const overlay = $('#loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
};

const getSpeedDelay = () => {
    const delays = { 1: 2000, 2: 1000, 3: 500 };
    return delays[state.settings.simSpeed] || 1000;
};

const randomRange = (min, max) => Math.random() * (max - min) + min;

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const formatTimestamp = (date) => {
    const d = date || new Date();
    return d.toLocaleString('en-IN', { 
        dateStyle: 'short', 
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
    });
};

// Mock Data
const mockClaims = [
    "Breaking: Terrorist Attack in Jammu - Multiple casualties reported",
    "Mumbai Bridge Collapse: 50+ feared dead in infrastructure failure",
    "Election Deepfake Video: PM candidate caught in fabricated scandal",
    "Natural Disaster: Fake image shows tsunami hitting Chennai marina",
    "Celebrity Death Hoax: Bollywood star rumored dead in accident"
];

// Alternating verdict patterns with varied data
const mockVerdicts = [
    { 
        verdict: 'false', 
        confidence: 0.87, 
        explanation: 'Cross-referenced with PIB, NIA, and Mumbai Police. No credible reports confirm this claim. The viral image was traced back to a 2018 incident in a different location.',
        sources: ['PIB Fact Check', 'National Intelligence Agency (NIA)', 'Mumbai Police Official Twitter', 'News Archive Database', 'Reverse Image Search (TinEye)'],
        botPercentageRange: [25, 35],
        coordScoreRange: [0.72, 0.85]
    },
    { 
        verdict: 'true', 
        confidence: 0.92, 
        explanation: 'Verified through multiple official sources including government databases and news archives. All details match confirmed reports from credible news outlets and official statements.',
        sources: ['Press Information Bureau (PIB)', 'Official Government Portal', 'Reuters News Agency', 'ANI News', 'Official Press Release'],
        botPercentageRange: [5, 12],
        coordScoreRange: [0.25, 0.42]
    },
    { 
        verdict: 'unverified', 
        confidence: 0.58, 
        explanation: 'Insufficient evidence available at this time. The claim requires deeper investigation and expert verification. Awaiting official statements from concerned authorities.',
        sources: ['PIB Fact Check (Pending)', 'Social Media Analysis', 'News Monitoring Systems', 'Fact-Check Organizations', 'Expert Review Queue'],
        botPercentageRange: [15, 22],
        coordScoreRange: [0.48, 0.62]
    },
    { 
        verdict: 'mixed', 
        confidence: 0.73, 
        explanation: 'Claim contains elements of truth but is presented with misleading context or exaggeration. The core event occurred, but details have been sensationalized or misrepresented.',
        sources: ['Government Official Records', 'Regional News Outlets', 'Context Verification Database', 'Historical Data Archives', 'Expert Commentary'],
        botPercentageRange: [18, 28],
        coordScoreRange: [0.55, 0.68]
    }
];

// Function to get verdict based on analysis count (alternating pattern)
const getAlternatingVerdict = () => {
    const pattern = ['false', 'true', 'false', 'true']; // Alternating false-true pattern
    const verdictType = pattern[state.analysisCount % pattern.length];
    
    // Find the matching verdict data
    const verdictData = mockVerdicts.find(v => v.verdict === verdictType);
    
    // Add some randomness to confidence within a range
    const confidenceVariation = (Math.random() - 0.5) * 0.08; // ±4% variation
    const adjustedConfidence = Math.max(0.5, Math.min(0.99, verdictData.confidence + confidenceVariation));
    
    return {
        ...verdictData,
        confidence: parseFloat(adjustedConfidence.toFixed(2))
    };
};

// Initialization
const init = () => {
    console.log('🚀 VerifyNow Prototype Initializing...');
    
    // Hide preloader
    setTimeout(() => {
        $('#preloader').classList.add('hidden');
    }, 1500);
    
    // Load settings from localStorage
    loadSettings();
    
    // Initialize event listeners
    initEventListeners();
    
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Initialize graph
    initCoordGraph();
    
    // Auto-run sample simulation - DISABLED by default
    // User must manually enter text and click Analyze
    // if (state.settings.autoSim) {
    //     setTimeout(() => {
    //         const sampleClaim = randomChoice(mockClaims);
    //         $('#claimInput').value = sampleClaim;
    //         handleAnalyze();
    //     }, 2000);
    // }
    
    // Initialize history table
    renderHistoryTable();
    
    console.log('✅ VerifyNow Ready');
};

// Event Listeners
const initEventListeners = () => {
    // Tab navigation
    $$('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Menu toggle (mobile)
    $('#menuToggle')?.addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });
    
    // Close sidebar on link click (mobile)
    if (window.innerWidth < 768) {
        $$('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                $('#sidebar').classList.remove('open');
            });
        });
    }
    
    // Claim input character counter
    $('#claimInput').addEventListener('input', (e) => {
        $('#charCount').textContent = e.target.value.length;
    });
    
    // Analyze button
    $('#analyzeBtn').addEventListener('click', handleAnalyze);
    
    // Explanation accordion
    $('#explanationToggle')?.addEventListener('click', () => {
        const content = $('#explanationContent');
        const button = $('#explanationToggle');
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            button.classList.remove('active');
        } else {
            content.classList.add('expanded');
            button.classList.add('active');
        }
    });
    
    // Share and Review buttons
    $('#shareBtn')?.addEventListener('click', handleShare);
    $('#reviewBtn')?.addEventListener('click', () => openModal('reviewModal'));
    
    // Modal handlers
    $$('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    $('.modal-submit')?.addEventListener('click', handleReviewSubmit);
    
    // Toolbar buttons
    $('#refreshBtn')?.addEventListener('click', () => {
        showToast('Dashboard refreshed', 'success');
        location.reload();
    });
    
    $('#exportBtn')?.addEventListener('click', handleExport);
    
    // Workflow accordions
    $$('.step-header').forEach(header => {
        header.addEventListener('click', () => {
            const stepId = header.dataset.accordion;
            const body = $(`#${stepId}`);
            const icon = header.querySelector('.accordion-icon');
            
            if (body.classList.contains('collapsed')) {
                body.classList.remove('collapsed');
                header.setAttribute('aria-expanded', 'true');
            } else {
                body.classList.add('collapsed');
                header.setAttribute('aria-expanded', 'false');
            }
        });
    });
    
    // Run step buttons
    $$('.btn-run-step').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = btn.dataset.step;
            showToast(`Running ${step} agent...`, 'info');
        });
    });
    
    // Simulator controls
    $('#simUseCase')?.addEventListener('change', (e) => {
        if (e.target.value) {
            $('#simKeyword').value = e.target.value;
        }
    });
    
    $('#runPipelineBtn')?.addEventListener('click', handleSimulation);
    
    $('#carouselPrev')?.addEventListener('click', () => scrollCarousel(-1));
    $('#carouselNext')?.addEventListener('click', () => scrollCarousel(1));
    
    // History search
    $('#historySearch')?.addEventListener('input', handleHistorySearch);
    
    // History table sorting
    $$('.history-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            sortHistoryTable(sortKey);
        });
    });
    
    $('#exportHistoryBtn')?.addEventListener('click', exportHistory);
    
    // Settings
    $('#autoSimToggle')?.addEventListener('change', (e) => {
        state.settings.autoSim = e.target.checked;
        saveSettings();
    });
    
    $('#simSpeed')?.addEventListener('input', (e) => {
        state.settings.simSpeed = parseInt(e.target.value);
        saveSettings();
    });
    
    $('#resetDataBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all demo data?')) {
            state.historyData = [];
            renderHistoryTable();
            showToast('Demo data reset', 'success');
        }
    });
    
    // Feedback form
    $$('#feedbackStars .star').forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            state.settings.feedbackRating = rating;
            updateStarRating(rating);
        });
    });
    
    $('#feedbackForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Thank you for your feedback!', 'success');
        $('#feedbackForm').reset();
        updateStarRating(0);
    });
    
    // Back to top
    $('#backToTop')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Scroll listener for back to top
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            $('#backToTop').classList.add('visible');
        } else {
            $('#backToTop').classList.remove('visible');
        }
    });
    
    // Copy button
    $$('.btn-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const textarea = e.target.closest('.response-draft')?.querySelector('textarea');
            if (textarea) {
                navigator.clipboard.writeText(textarea.value);
                showToast('Response copied to clipboard', 'success');
            }
        });
    });
};

// Tab Switching
const switchTab = (tabName) => {
    // Update nav links
    $$('.nav-link').forEach(link => {
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update tab content
    $$('.tab-content').forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    state.activeTab = tabName;
    
    // Trigger any tab-specific initialization
    if (tabName === 'simulator') {
        initSimulator();
    }
};

// Clock Update
const updateClock = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    });
    $('#liveClock').textContent = timeStr;
};

// Main Analysis Handler
const handleAnalyze = async () => {
    const claimInput = $('#claimInput');
    const claim = claimInput.value.trim();
    
    // Validation
    if (claim.length < 10) {
        claimInput.classList.add('error');
        setTimeout(() => claimInput.classList.remove('error'), 400);
        showToast('Please enter at least 10 characters', 'error');
        return;
    }
    
    if (state.isSimulating) {
        showToast('Analysis already in progress', 'warning');
        return;
    }
    
    state.isSimulating = true;
    showLoading(true);
    
    // Hide placeholder, show verdict content
    $('#verdictPlaceholder')?.classList.add('hidden');
    $('#verdictContent')?.classList.remove('hidden');
    
    // Update claim summary
    $('#claimSummary').textContent = claim.substring(0, 100) + (claim.length > 100 ? '...' : '');
    
    // Reset verdict display
    $('#verdictPill').textContent = 'Analyzing...';
    $('#verdictPill').className = 'verdict-pill';
    $('#confidenceValue').textContent = '—';
    updateConfidenceRing(0);
    
    try {
        // Get alternating verdict based on analysis count
        const verdictData = getAlternatingVerdict();
        
        // Generate varied bot percentage and coordination score based on verdict
        const botPercentage = Math.floor(randomRange(verdictData.botPercentageRange[0], verdictData.botPercentageRange[1]));
        const coordScore = randomRange(verdictData.coordScoreRange[0], verdictData.coordScoreRange[1]).toFixed(2);
        
        // Vary engagement spike based on verdict severity
        const engagementSpike = verdictData.verdict === 'false' ? Math.floor(randomRange(300, 450)) : 
                                verdictData.verdict === 'true' ? Math.floor(randomRange(120, 200)) :
                                Math.floor(randomRange(180, 280));
        
        // Step 1: Detection Agent
        await simulateAgent('detection', 'Scanning social media platforms...');
        updateAgentStatus('detection', 'active');
        updateAgentOutput('detection', `Engagement spike detected: ${engagementSpike}% increase in 15 min`);
        updateProgressBar('detection', 100);
        
        await delay(getSpeedDelay());
        updateAgentStatus('detection', 'complete');
        
        // Step 2: Cluster Agent
        await simulateAgent('cluster', 'Analyzing network patterns...');
        updateAgentStatus('cluster', 'active');
        
        updateAgentOutput('cluster', `Bot network: ${botPercentage}% | Coordination: ${coordScore}`);
        
        await delay(getSpeedDelay());
        updateAgentStatus('cluster', 'complete');
        updateCIBScore(parseFloat(coordScore));
        
        // Step 3: Verification Agent
        await simulateAgent('verification', 'Cross-referencing databases...');
        updateAgentStatus('verification', 'active');
        
        const isOCR = claim.toLowerCase().includes('image') || claim.toLowerCase().includes('photo');
        
        if (isOCR) {
            updateAgentOutput('verification', 'OCR Analysis: Image metadata suggests manipulation');
        } else {
            updateAgentOutput('verification', `Verdict: ${verdictData.verdict.toUpperCase()} (${Math.floor(verdictData.confidence * 100)}%)`);
        }
        
        await delay(getSpeedDelay());
        updateAgentStatus('verification', 'complete');
        
        // Step 4: Response Agent
        await simulateAgent('response', 'Generating counter-narrative...');
        updateAgentStatus('response', 'active');
        
        const responseText = generateResponse(claim, verdictData.verdict);
        updateAgentOutput('response', `Draft ready: "${responseText.substring(0, 50)}..."`);
        
        await delay(getSpeedDelay());
        updateAgentStatus('response', 'complete');
        
        // Step 5: Audit Agent
        updateAgentStatus('audit', 'active');
        updateAgentOutput('audit', `Logged: ${new Date().toISOString()} | Confidence: ${verdictData.confidence}`);
        await delay(500);
        updateAgentStatus('audit', 'complete');
        
        // Update verdict display
        $('#verdictPill').textContent = verdictData.verdict.toUpperCase();
        $('#verdictPill').classList.add(verdictData.verdict);
        
        const confidencePercent = Math.floor(verdictData.confidence * 100);
        $('#confidenceValue').textContent = confidencePercent;
        updateConfidenceRing(confidencePercent);
        
        $('#explanationText').textContent = verdictData.explanation;
        
        // Check for low confidence (requires human review)
        if (verdictData.confidence < 0.6) {
            setTimeout(() => {
                openModal('reviewModal');
                showToast('Low confidence detected - Human review recommended', 'warning');
            }, 500);
        }
        
        showLoading(false);
        state.isSimulating = false;
        
        showToast('Analysis complete!', 'success');
        
        // Save to history with detailed analysis data
        const analysisDetails = {
            detection: `Engagement spike detected: ${engagementSpike}% increase in 15 min`,
            botPercentage: botPercentage,
            coordScore: coordScore,
            cluster: `Bot network: ${botPercentage}% | Coordination: ${coordScore}`,
            verification: isOCR ? 'OCR Analysis: Image metadata suggests manipulation' : `Verdict: ${verdictData.verdict.toUpperCase()} (${Math.floor(verdictData.confidence * 100)}%)`,
            response: responseText,
            audit: `Logged: ${new Date().toISOString()} | Confidence: ${verdictData.confidence}`,
            sources: verdictData.sources,
            cibScore: parseFloat(coordScore),
            processingTime: '< 30 seconds',
            engagementSpike: engagementSpike
        };
        
        // Store latest analysis for workflow tab
        state.latestAnalysis = {
            claim: claim,
            verdict: verdictData.verdict,
            confidence: verdictData.confidence,
            explanation: verdictData.explanation,
            timestamp: new Date(),
            details: analysisDetails
        };
        
        saveToHistory(claim, verdictData, analysisDetails);
        
        // Update workflow tab with latest data
        updateWorkflowDisplay();
        
        // Draw coordination graph with analysis data
        drawCoordGraph(analysisDetails);
        
        // Increment analysis count for alternating pattern
        state.analysisCount++;
        
    } catch (error) {
        console.error('Analysis error:', error);
        showLoading(false);
        state.isSimulating = false;
        showToast('Analysis failed. Please try again.', 'error');
    }
};

// Agent Simulation Helper
const simulateAgent = (agentName, message) => {
    return new Promise(resolve => {
        setTimeout(resolve, getSpeedDelay());
    });
};

const updateAgentStatus = (agentName, status) => {
    const card = $(`.agent-card[data-agent="${agentName}"]`);
    const dot = card?.querySelector('.status-dot');
    if (dot) {
        dot.dataset.status = status;
    }
};

const updateAgentOutput = (agentName, text) => {
    const card = $(`.agent-card[data-agent="${agentName}"]`);
    const output = card?.querySelector('.agent-text');
    if (output) {
        output.textContent = text;
    }
};

const updateProgressBar = (agentName, percent) => {
    const card = $(`.agent-card[data-agent="${agentName}"]`);
    const fill = card?.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = `${percent}%`;
    }
};

// Confidence Ring Animation
const updateConfidenceRing = (percent) => {
    const ring = $('#confidenceRing');
    if (ring) {
        const deg = (percent / 100) * 360;
        ring.style.background = `conic-gradient(var(--color-primary) ${deg}deg, var(--color-border-light) ${deg}deg)`;
    }
};

// CIB Score Update
const updateCIBScore = (score) => {
    $('#cibValue').textContent = score.toFixed(1);
    
    const circle = $('#cibCircle');
    if (circle) {
        const circumference = 251.2;
        const offset = circumference - (score * circumference);
        circle.style.strokeDashoffset = offset;
    }
};

// Response Generator
const generateResponse = (claim, verdict) => {
    const templates = {
        'false': `⚠️ FACT CHECK: The following claim is FALSE.\n\n"${claim.substring(0, 60)}..."\n\n✅ Verified by PIB, NIA, and official sources.\n📅 ${formatTimestamp()}\n\nPlease verify before sharing. #FactCheck #VerifyNow`,
        'true': `✅ VERIFIED: The following claim is TRUE.\n\n"${claim.substring(0, 60)}..."\n\n📌 Confirmed by multiple credible sources.\n📅 ${formatTimestamp()}\n\n#Verified #VerifyNow`,
        'unverified': `⚠️ UNVERIFIED: Insufficient evidence to confirm this claim.\n\n"${claim.substring(0, 60)}..."\n\n🔍 Human review recommended.\n📅 ${formatTimestamp()}\n\n#PendingVerification #VerifyNow`,
        'mixed': `⚠️ PARTIALLY TRUE: This claim contains misleading elements.\n\n"${claim.substring(0, 60)}..."\n\n📊 Context needed for full understanding.\n📅 ${formatTimestamp()}\n\n#ContextMatters #VerifyNow`
    };
    
    return templates[verdict] || templates['unverified'];
};

// Share Handler
const handleShare = () => {
    const claim = $('#claimSummary').textContent;
    const verdict = $('#verdictPill').textContent;
    
    if (claim === '—') {
        showToast('No analysis to share', 'warning');
        return;
    }
    
    showToast('Analysis added to History', 'success');
};

// Review Modal
const openModal = (modalId) => {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

const closeModals = () => {
    $$('.modal').forEach(modal => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    });
};

const handleReviewSubmit = () => {
    const notes = $('#reviewNotes').value;
    showToast('Review request submitted successfully', 'success');
    closeModals();
    $('#reviewNotes').value = '';
};

// Export Handler - Generate PDF Report
const handleExport = () => {
    if (state.historyData.length === 0) {
        showToast('No analysis data to export', 'warning');
        return;
    }
    
    // Get the most recent analysis
    const latestAnalysis = state.historyData[0];
    
    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set default font to Times (closest to Georgia in jsPDF)
    doc.setFont('times', 'normal');
    
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;
    
    // Helper function to add text with word wrap
    const addText = (text, x, y, maxW, lineHeight = 7) => {
        const lines = doc.splitTextToSize(text, maxW);
        doc.text(lines, x, y);
        return y + (lines.length * lineHeight);
    };
    
    // Header
    doc.setFillColor(253, 185, 19); // Golden yellow
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(30, 58, 95); // Navy
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.text('VerifyNow', margin, 20);
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Misinformation Analysis Report', margin, 28);
    
    yPos = 45;
    
    // Report Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Report Generated: ${formatTimestamp(new Date())}`, margin, yPos);
    yPos += 7;
    doc.text(`Analysis ID: #${latestAnalysis.id}`, margin, yPos);
    yPos += 10;
    
    // Section 1: Claim Details
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('1. CLAIM SUBMITTED', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('User Input:', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'italic');
    yPos = addText(`"${latestAnalysis.claim}"`, margin + 5, yPos, maxWidth - 5, 6);
    yPos += 8;
    
    doc.setFont('times', 'normal');
    doc.text(`Timestamp: ${formatTimestamp(latestAnalysis.timestamp)}`, margin, yPos);
    yPos += 10;
    
    // Section 2: Analysis Pipeline
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('2. MULTI-AGENT ANALYSIS PIPELINE', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Detection Agent
    doc.setFont('times', 'bold');
    doc.text('Step 1: Detection Agent', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text('Function: Monitor social media platforms for viral claims', margin + 5, yPos);
    yPos += 5;
    doc.text(`Result: ${latestAnalysis.detailedAnalysis.detectionAgent}`, margin + 5, yPos);
    yPos += 8;
    
    // Cluster Agent
    doc.setFont('times', 'bold');
    doc.text('Step 2: Cluster Agent', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text('Function: Analyze network patterns and identify bot behavior', margin + 5, yPos);
    yPos += 5;
    doc.text(`Result: ${latestAnalysis.detailedAnalysis.clusterAgent}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`CIB Score (Coordination Index): ${latestAnalysis.detailedAnalysis.cibScore}`, margin + 5, yPos);
    yPos += 8;
    
    // Verification Agent
    doc.setFont('times', 'bold');
    doc.text('Step 3: Verification Agent', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text('Function: Cross-reference with authoritative databases', margin + 5, yPos);
    yPos += 5;
    doc.text(`Result: ${latestAnalysis.detailedAnalysis.verificationAgent}`, margin + 5, yPos);
    yPos += 8;
    
    // Check if we need a new page
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    
    // Response Agent
    doc.setFont('times', 'bold');
    doc.text('Step 4: Response Agent', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text('Function: Generate context-aware counter-narratives', margin + 5, yPos);
    yPos += 5;
    yPos = addText(`Result: ${latestAnalysis.detailedAnalysis.responseAgent}`, margin + 5, yPos, maxWidth - 5, 5);
    yPos += 8;
    
    // Audit Agent
    doc.setFont('times', 'bold');
    doc.text('Step 5: Audit Agent', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text('Function: Log all decisions and maintain transparency records', margin + 5, yPos);
    yPos += 5;
    yPos = addText(`Result: ${latestAnalysis.detailedAnalysis.auditAgent}`, margin + 5, yPos, maxWidth - 5, 5);
    yPos += 10;
    
    // Section 3: Sources Verified
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('3. SOURCES CROSS-VERIFIED', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    
    latestAnalysis.detailedAnalysis.sourcesChecked.forEach((source, index) => {
        doc.text(`${index + 1}. ${source}`, margin + 5, yPos);
        yPos += 6;
    });
    yPos += 5;
    
    // Check if we need a new page
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }
    
    // Section 4: Final Verdict
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('4. FINAL VERDICT', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    const verdictColor = {
        'false': [220, 38, 38],
        'true': [34, 197, 94],
        'unverified': [234, 179, 8],
        'mixed': [249, 115, 22]
    };
    
    const color = verdictColor[latestAnalysis.verdict] || [100, 100, 100];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`Status: ${latestAnalysis.verdict.toUpperCase()}`, margin, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Confidence Score: ${Math.floor(latestAnalysis.confidence * 100)}%`, margin, yPos);
    yPos += 6;
    doc.text(`Processing Time: ${latestAnalysis.detailedAnalysis.processingTime}`, margin, yPos);
    yPos += 10;
    
    // Explanation
    doc.setFont('times', 'bold');
    doc.text('Detailed Explanation:', margin, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    yPos = addText(latestAnalysis.explanation, margin + 5, yPos, maxWidth - 5, 6);
    yPos += 10;
    
    // Section 5: Recommendations
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('5. RECOMMENDATIONS', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    
    if (latestAnalysis.confidence < 0.6) {
        doc.text('• Human expert review is recommended due to low confidence score', margin + 5, yPos);
        yPos += 6;
    }
    
    if (latestAnalysis.verdict === 'false') {
        doc.text('• Do not share this claim on social media platforms', margin + 5, yPos);
        yPos += 6;
        doc.text('• Report the post if encountered on social networks', margin + 5, yPos);
        yPos += 6;
    }
    
    doc.text('• Always verify information from official sources before sharing', margin + 5, yPos);
    yPos += 6;
    doc.text('• Cross-reference multiple credible news outlets', margin + 5, yPos);
    yPos += 10;
    
    // Footer
    if (yPos > 260) {
        doc.addPage();
        yPos = 20;
    }
    
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 280, pageWidth, 17, 'F');
    doc.setTextColor(253, 185, 19);
    doc.setFontSize(9);
    doc.text('VerifyNow - Agentic AI for Misinformation Defense', pageWidth / 2, 290, { align: 'center' });
    
    // Save the PDF
    const filename = `VerifyNow_Report_${latestAnalysis.id}_${Date.now()}.pdf`;
    doc.save(filename);
    
    showToast('PDF report downloaded successfully', 'success');
};

// Update Workflow Tab with Latest Analysis Data
const updateWorkflowDisplay = () => {
    if (!state.latestAnalysis) return;
    
    const analysis = state.latestAnalysis;
    const details = analysis.details;
    
    // Update Detection Agent output
    const detectionOutput = $('#step1 .mock-output');
    if (detectionOutput) {
        detectionOutput.innerHTML = `
            <p><strong>Platform:</strong> Social Media Monitoring</p>
            <p><strong>Detected Claim:</strong> "${analysis.claim.substring(0, 80)}${analysis.claim.length > 80 ? '...' : ''}"</p>
            <p><strong>Engagement Spike:</strong> ${details.engagementSpike}% increase in 15 minutes</p>
            <p><strong>Initial Risk Score:</strong> ${analysis.verdict === 'false' ? 'High (0.82)' : analysis.verdict === 'true' ? 'Low (0.25)' : 'Medium (0.58)'}</p>
        `;
    }
    
    // Update Cluster Agent output
    const clusterOutput = $('#step2 .mock-output');
    if (clusterOutput) {
        clusterOutput.innerHTML = `
            <p><strong>Total Accounts:</strong> ${Math.floor(1000 + Math.random() * 500)}</p>
            <p><strong>Suspected Bots:</strong> ${details.botPercentage}% (${Math.floor(details.botPercentage * 12)} accounts)</p>
            <p><strong>Coordination Score:</strong> ${details.coordScore} (${details.coordScore > 0.7 ? 'High' : details.coordScore > 0.5 ? 'Moderate' : 'Low'})</p>
            <p><strong>Primary Cluster:</strong> ${Math.floor(3 + Math.random() * 5)} high-influence nodes</p>
        `;
    }
    
    // Update Verification Agent output
    const verificationOutput = $('#step3 .mock-output');
    if (verificationOutput) {
        const verdictBadgeClass = analysis.verdict === 'false' ? 'false' : 
                                   analysis.verdict === 'true' ? 'true' : 
                                   analysis.verdict === 'mixed' ? 'mixed' : 'unverified';
        
        const sourcesHtml = details.sources.map(source => `<li>${source}: ${
            analysis.verdict === 'false' ? 'No matching reports' : 
            analysis.verdict === 'true' ? 'Confirmed' : 
            'Pending verification'
        }</li>`).join('');
        
        verificationOutput.innerHTML = `
            <p><strong>Verdict:</strong> <span class="verdict-badge ${verdictBadgeClass}">${analysis.verdict.toUpperCase()}</span></p>
            <p><strong>Confidence:</strong> ${Math.floor(analysis.confidence * 100)}%</p>
            <p><strong>Sources Checked:</strong></p>
            <ul>
                ${sourcesHtml}
            </ul>
        `;
    }
    
    // Update Response Agent output
    const responseOutput = $('#step4 .mock-output.response-draft textarea');
    if (responseOutput) {
        responseOutput.value = details.response;
    }
    
    // Update Audit Agent output
    const auditOutput = $('#step5 .mock-output .audit-table');
    if (auditOutput) {
        const timestamp = formatTimestamp(analysis.timestamp);
        auditOutput.innerHTML = `
            <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Confidence</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>${timestamp}</td>
                <td>Detection Initiated</td>
                <td>—</td>
                <td>✓</td>
            </tr>
            <tr>
                <td>${timestamp}</td>
                <td>Clustering Complete</td>
                <td>${details.coordScore}</td>
                <td>✓</td>
            </tr>
            <tr>
                <td>${timestamp}</td>
                <td>Verification: ${analysis.verdict.toUpperCase()}</td>
                <td>${analysis.confidence.toFixed(2)}</td>
                <td>✓</td>
            </tr>
            <tr>
                <td>${timestamp}</td>
                <td>Response Generated</td>
                <td>—</td>
                <td>✓</td>
            </tr>
        `;
    }
};

// Coordination Graph (Canvas)
const initCoordGraph = () => {
    // Initially hide the canvas and show placeholder
    const canvas = $('#coordGraph');
    const placeholder = $('#graphPlaceholder');
    const legend = $('#graphLegend');
    
    if (canvas) {
        canvas.style.display = 'none';
    }
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.style.flexDirection = 'column';
        placeholder.style.alignItems = 'center';
    }
    if (legend) {
        legend.style.display = 'none';
    }
};

// Draw Coordination Graph with actual analysis data
const drawCoordGraph = (analysisData) => {
    const canvas = $('#coordGraph');
    const placeholder = $('#graphPlaceholder');
    const legend = $('#graphLegend');
    
    if (!canvas) return;
    
    // Hide placeholder, show canvas and legend
    if (placeholder) placeholder.style.display = 'none';
    canvas.style.display = 'block';
    if (legend) legend.style.display = 'flex';
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const { botPercentage, coordScore, verdict } = analysisData;
    
    // Generate nodes based on analysis data
    const totalNodes = 15;
    const botNodes = Math.floor((botPercentage / 100) * totalNodes);
    const suspiciousNodes = Math.floor(coordScore * 5); // 0-5 suspicious nodes based on coordination
    const verifiedNodes = totalNodes - botNodes - suspiciousNodes;
    
    const nodes = [];
    
    // Create verified nodes (blue)
    for (let i = 0; i < verifiedNodes; i++) {
        nodes.push({
            x: randomRange(60, canvas.width - 60),
            y: randomRange(60, canvas.height - 60),
            radius: randomRange(10, 14),
            color: '#3B82F6',
            type: 'verified',
            vx: randomRange(-0.3, 0.3),
            vy: randomRange(-0.3, 0.3)
        });
    }
    
    // Create suspicious nodes (orange)
    for (let i = 0; i < suspiciousNodes; i++) {
        nodes.push({
            x: randomRange(60, canvas.width - 60),
            y: randomRange(60, canvas.height - 60),
            radius: randomRange(12, 18),
            color: '#FF8C42',
            type: 'suspicious',
            vx: randomRange(-0.4, 0.4),
            vy: randomRange(-0.4, 0.4)
        });
    }
    
    // Create bot nodes (red)
    for (let i = 0; i < botNodes; i++) {
        nodes.push({
            x: randomRange(60, canvas.width - 60),
            y: randomRange(60, canvas.height - 60),
            radius: randomRange(8, 12),
            color: '#DC2626',
            type: 'bot',
            vx: randomRange(-0.5, 0.5),
            vy: randomRange(-0.5, 0.5)
        });
    }
    
    // Animation loop
    let animationId;
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw connections (stronger between suspicious/bot nodes)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                const maxDist = (nodes[i].type !== 'verified' && nodes[j].type !== 'verified') ? 180 : 120;
                
                if (dist < maxDist) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    
                    // Stronger lines for suspicious/bot connections
                    if (nodes[i].type !== 'verified' && nodes[j].type !== 'verified') {
                        ctx.strokeStyle = `rgba(220, 38, 38, ${0.3 - dist / 600})`;
                        ctx.lineWidth = 2;
                    } else {
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 - dist / 600})`;
                        ctx.lineWidth = 1;
                    }
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add pulsing effect for suspicious/bot nodes
            if (node.type !== 'verified') {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = `${node.color}40`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounce off edges
            if (node.x < node.radius + 10 || node.x > canvas.width - node.radius - 10) node.vx *= -1;
            if (node.y < node.radius + 10 || node.y > canvas.height - node.radius - 10) node.vy *= -1;
        });
        
        // Draw labels
        ctx.fillStyle = '#1E3A5F';
        ctx.font = '11px Georgia, serif';
        ctx.fillText(`Total Accounts: ${totalNodes}`, 15, 25);
        ctx.fillText(`Bot Network: ${botPercentage}%`, 15, 45);
        ctx.fillText(`Coordination: ${coordScore}`, 15, 65);
        
        animationId = requestAnimationFrame(animate);
    };
    
    // Stop any existing animation
    if (window.graphAnimationId) {
        cancelAnimationFrame(window.graphAnimationId);
    }
    
    window.graphAnimationId = animationId;
    animate();
};

// Simulator
const initSimulator = () => {
    // Initialize simulator tab
    $('#consoleOutput').innerHTML = '<p class="console-line">> System ready. Awaiting input...</p>';
    
    // Generate feed cards
    generateFeedCards();
};

const handleSimulation = async () => {
    const keyword = $('#simKeyword').value.trim() || randomChoice(mockClaims);
    const console = $('#consoleOutput');
    
    if (!keyword) {
        showToast('Please enter a keyword or select a use case', 'warning');
        return;
    }
    
    console.innerHTML = '';
    appendConsole(`> Starting pipeline for: "${keyword}"`);
    
    await delay(500);
    appendConsole('> Detection Agent: Scanning platforms...');
    await delay(getSpeedDelay());
    appendConsole('  ✓ Found 247 matching posts');
    
    await delay(300);
    appendConsole('> Cluster Agent: Analyzing network...');
    await delay(getSpeedDelay());
    const botPct = Math.floor(randomRange(15, 35));
    appendConsole(`  ✓ Bot activity: ${botPct}%`);
    
    await delay(300);
    appendConsole('> Verification Agent: Cross-referencing...');
    await delay(getSpeedDelay());
    const verdict = randomChoice(['FALSE', 'TRUE', 'UNVERIFIED', 'MIXED']);
    appendConsole(`  ✓ Verdict: ${verdict}`);
    
    await delay(300);
    appendConsole('> Response Agent: Generating counter-narrative...');
    await delay(getSpeedDelay());
    appendConsole('  ✓ Response draft ready');
    
    await delay(300);
    appendConsole('> Audit Agent: Logging results...');
    await delay(500);
    appendConsole('  ✓ Analysis complete\n');
    appendConsole('> Pipeline finished successfully');
    
    // Update metrics
    animateMetric('metricRetweet', 60);
    animateMetric('metricEngagement', 45);
    animateMetric('metricBot', 70);
    
    showToast('Simulation complete', 'success');
};

const appendConsole = (text) => {
    const console = $('#consoleOutput');
    const line = document.createElement('p');
    line.className = 'console-line';
    line.textContent = text;
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
};

const generateFeedCards = () => {
    const container = $('#feedCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    const feeds = [
        { text: 'Breaking news alert spreading rapidly...', retweets: 1234 },
        { text: 'Unverified claim gaining traction...', retweets: 856 },
        { text: 'Coordinated network detected...', retweets: 2341 }
    ];
    
    feeds.forEach(feed => {
        const card = document.createElement('div');
        card.className = 'feed-card';
        card.innerHTML = `
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect fill='%23FFF9E6' width='200' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%231E3A5F' font-family='Georgia, serif' font-size='14'%3EPost%3C/text%3E%3C/svg%3E" alt="Post">
            <p>${feed.text}</p>
            <small>🔁 ${feed.retweets.toLocaleString()} retweets</small>
        `;
        container.appendChild(card);
    });
};

const scrollCarousel = (direction) => {
    const container = $('#feedCards');
    if (container) {
        container.scrollBy({
            left: direction * 220,
            behavior: 'smooth'
        });
    }
};

const animateMetric = (id, targetPercent) => {
    const fill = $(`#${id}`);
    const valueSpan = fill?.parentElement.querySelector('.metric-value');
    
    if (!fill) return;
    
    let current = 0;
    const increment = targetPercent / 50;
    
    const animate = () => {
        current += increment;
        if (current >= targetPercent) {
            current = targetPercent;
        }
        
        fill.style.width = `${current}%`;
        if (valueSpan) {
            valueSpan.textContent = `${Math.floor(current)}%`;
        }
        
        if (current < targetPercent) {
            requestAnimationFrame(animate);
        }
    };
    
    animate();
};

// History Management
const saveToHistory = (claim, verdictData, analysisDetails = {}) => {
    state.currentClaimId++;
    
    const entry = {
        id: state.currentClaimId,
        claim: claim,
        verdict: verdictData.verdict,
        confidence: verdictData.confidence,
        timestamp: new Date(),
        explanation: verdictData.explanation,
        // Detailed analysis data for PDF export
        detailedAnalysis: {
            detectionAgent: analysisDetails.detection || 'Engagement spike detected: 340% increase in 15 min',
            clusterAgent: analysisDetails.cluster || `Bot network: ${analysisDetails.botPercentage || 23}% | Coordination: ${analysisDetails.coordScore || 0.68}`,
            verificationAgent: analysisDetails.verification || `Verdict: ${verdictData.verdict.toUpperCase()} (${Math.floor(verdictData.confidence * 100)}%)`,
            responseAgent: analysisDetails.response || 'Counter-narrative generated and ready for deployment',
            auditAgent: analysisDetails.audit || `Logged: ${new Date().toISOString()} | Confidence: ${verdictData.confidence}`,
            sourcesChecked: analysisDetails.sources || [
                'PIB Fact Check',
                'National Intelligence Agency (NIA)',
                'Mumbai Police Official Twitter',
                'News Archive Database',
                'Social Media Platform APIs'
            ],
            processingTime: analysisDetails.processingTime || '< 30 seconds',
            cibScore: analysisDetails.cibScore || 0.68
        }
    };
    
    state.historyData.unshift(entry);
    
    // Limit to 50 entries
    if (state.historyData.length > 50) {
        state.historyData.pop();
    }
    
    renderHistoryTable();
};

const renderHistoryTable = () => {
    const tbody = $('#historyTableBody');
    const empty = $('#historyEmpty');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (state.historyData.length === 0) {
        empty?.classList.remove('hidden');
        return;
    }
    
    empty?.classList.add('hidden');
    
    state.historyData.forEach(entry => {
        const row = document.createElement('tr');
        
        const verdictClass = entry.verdict;
        const verdictText = entry.verdict.toUpperCase();
        const confidencePercent = Math.floor(entry.confidence * 100);
        
        row.innerHTML = `
            <td>${entry.id}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.claim}">${entry.claim}</td>
            <td><span class="verdict-pill ${verdictClass}">${verdictText}</span></td>
            <td>
                <div class="confidence-bar">
                    <div class="confidence-bar-fill">
                        <div class="confidence-bar-inner" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
            </td>
            <td>${formatTimestamp(entry.timestamp)}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn" title="View" onclick="viewHistoryEntry(${entry.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="icon-btn" title="Delete" onclick="deleteHistoryEntry(${entry.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
};

const handleHistorySearch = (e) => {
    const query = e.target.value.toLowerCase();
    const rows = $$('#historyTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

const sortHistoryTable = (key) => {
    // Simple sort implementation
    showToast('Sorting by ' + key, 'info');
};

const exportHistory = () => {
    if (state.historyData.length === 0) {
        showToast('No history to export', 'warning');
        return;
    }
    
    // CSV format
    let csv = 'ID,Claim,Verdict,Confidence,Timestamp\n';
    state.historyData.forEach(entry => {
        csv += `${entry.id},"${entry.claim}",${entry.verdict},${entry.confidence},${entry.timestamp.toISOString()}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifynow-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('History exported as CSV', 'success');
};

// Global functions for inline onclick handlers
window.viewHistoryEntry = (id) => {
    const entry = state.historyData.find(e => e.id === id);
    if (entry) {
        alert(`Claim: ${entry.claim}\n\nVerdict: ${entry.verdict.toUpperCase()}\nConfidence: ${Math.floor(entry.confidence * 100)}%\n\nExplanation: ${entry.explanation}`);
    }
};

window.deleteHistoryEntry = (id) => {
    if (confirm('Delete this entry?')) {
        state.historyData = state.historyData.filter(e => e.id !== id);
        renderHistoryTable();
        showToast('Entry deleted', 'success');
    }
};

// Settings Management
const loadSettings = () => {
    try {
        const saved = localStorage.getItem('verifynow_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            state.settings = { ...state.settings, ...parsed };
            
            // Apply to UI
            if ($('#autoSimToggle')) $('#autoSimToggle').checked = state.settings.autoSim;
            if ($('#simSpeed')) $('#simSpeed').value = state.settings.simSpeed;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
};

const saveSettings = () => {
    try {
        localStorage.setItem('verifynow_settings', JSON.stringify(state.settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
};

// Star Rating
const updateStarRating = (rating) => {
    $$('#feedbackStars .star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
};

// Utility Delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
