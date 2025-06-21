document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("input-quote");
    const careBtn = document.getElementById("care");
    const dontCareBtn = document.getElementById("dont-care");
    const quotesContainer = document.getElementById("quotes-container");
    const figureContainer = document.getElementById("figure-container");

    let quotes = [];
    let mode = "float"; // Modes: 'float', 'care', 'dontcare'

    let figureSvg, glowSvg;

    // --- Asset Loading ---
    Promise.all([
        fetch("presona.svg").then(res => res.text()),
        fetch("glowfigure-svg.svg").then(res => res.text()),
    ]).then(([figureSvgText, glowSvgText]) => {
        // Inject Figure SVG
        figureContainer.innerHTML += figureSvgText;
        figureSvg = figureContainer.querySelector("svg");
        figureSvg.id = "figure-svg";

        // Inject Glow SVG
        figureContainer.innerHTML += glowSvgText;
        glowSvg = Array.from(figureContainer.querySelectorAll("svg")).find(s => s.id !== "figure-svg");
        glowSvg.id = "glow-figure-svg";
        
        // Set initial state
        gsap.set(glowSvg, { opacity: 0 });
        setMode('float', true); 

    }).catch(error => console.error("Error loading SVG assets:", error));


    // --- Event Listeners ---
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && input.value.trim() !== "") {
            createQuote(input.value.trim());
            input.value = "";
        }
    });

    careBtn.addEventListener("click", () => setMode("care"));
    dontCareBtn.addEventListener("click", () => setMode("dontcare"));

    // --- Core Functions ---
    function createQuote(text) {
        const el = document.createElement("div");
        el.className = "quote";
        el.innerText = text;
        quotesContainer.appendChild(el);
        gsap.set(el, { opacity: 1, scale: 0 });
        gsap.to(el, { scale: 1, duration: 0.5 });


        const quote = { el, text, animation: null, placedRect: null };
        quotes.push(quote);

        if (mode === 'care') {
            absorbQuotes([quote]);
        } else {
            releaseAndFloat([quote]);
        }
    }

    function setMode(newMode, force = false) {
        if (mode === newMode && !force) return;
        mode = newMode;

        careBtn.classList.toggle('active', mode === 'care');
        dontCareBtn.classList.toggle('active', mode === 'dontcare');

        if (mode === "dontcare") {
            gsap.to(figureSvg, { opacity: 0, duration: 1 });
            gsap.to(glowSvg, { opacity: 1, duration: 1 });
            repelQuotes(quotes);
        } else if (mode === "care") {
            gsap.to(figureSvg, { opacity: 1, duration: 1 });
            gsap.to(glowSvg, { opacity: 0, duration: 1 });
            absorbQuotes(quotes);
        } else { // float mode (initial)
            gsap.to(figureSvg, { opacity: 1, duration: 1 });
            gsap.to(glowSvg, { opacity: 0, duration: 1 });
            releaseAndFloat(quotes);
        }
    }
    
    function repelQuotes(targetQuotes) {
        const figureRect = figureContainer.getBoundingClientRect();
        const centerX = figureRect.left + figureRect.width / 2;
        const centerY = figureRect.top + figureRect.height / 2;

        targetQuotes.forEach(quote => {
            if (quote.animation) quote.animation.kill();
            quote.placedRect = null; // No longer placed in mask

            const elRect = quote.el.getBoundingClientRect();
            const elCenterX = elRect.left + elRect.width / 2;
            const elCenterY = elRect.top + elRect.height / 2;

            const dx = elCenterX - centerX;
            const dy = elCenterY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;

            gsap.to(quote.el, {
                x: `+=${nx * 150}`,
                y: `+=${ny * 150}`,
                opacity: 0.3,
                scale: 0.9,
                backgroundColor: 'rgba(82, 53, 123, 0)',
                duration: 1.2,
                ease: "power2.out",
            });
        });
    }
    
    function releaseAndFloat(targetQuotes) {
        const figureRect = figureContainer.getBoundingClientRect();

        targetQuotes.forEach(quote => {
            if (quote.animation) quote.animation.kill();
            quote.placedRect = null;
            
            const angle = Math.random() * 2 * Math.PI;
            const radius = (figureRect.width * 0.5) + (Math.random() * 100) + 50;
            const x = (figureRect.left + figureRect.width / 2) + radius * Math.cos(angle);
            const y = (figureRect.top + figureRect.height / 2) + radius * Math.sin(angle);
            
            gsap.to(quote.el, {
                x: x - quote.el.offsetWidth / 2,
                y: y - quote.el.offsetHeight / 2,
                scale: 1,
                opacity: 1,
                backgroundColor: 'rgba(82, 53, 123, 0)',
                duration: 1.5,
                ease: 'power2.out',
                onComplete: () => {
                    quote.animation = gsap.to(quote.el, {
                        x: `+=${Math.random() * 60 - 30}`,
                        y: `+=${Math.random() * 60 - 30}`,
                        duration: 3 + Math.random() * 2,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                    });
                }
            });
        });
    }

    function absorbQuotes(targetQuotes) {
        // Define the target rectangle in the center
        const boxWidth = 80;
        const boxHeight = 200;
        const containerRect = quotesContainer.getBoundingClientRect();
        const boxX = (containerRect.width / 2) - (boxWidth / 2);
        const boxY = (containerRect.height / 2) - (boxHeight / 2);

        const placedRects = [];
        // Get existing quote positions to avoid overlap
        quotes.forEach(q => {
            if (!targetQuotes.includes(q) && q.placedRect) {
                placedRects.push(q.placedRect);
            }
        });

        // Helper for collision detection
        const checkCollision = (x, y, w, h, rects) => {
            for (const r of rects) {
                if (x < r.x + r.width && x + w > r.x && y < r.y + r.height && y + h > r.y) {
                    return true;
                }
            }
            return false;
        };

        // Pre-render quotes to get accurate dimensions
        targetQuotes.forEach(({ el }) => {
            el.style.visibility = 'hidden';
            document.body.appendChild(el);
        });

        targetQuotes.forEach(quote => {
            if (quote.animation) quote.animation.kill();

            const elWidth = quote.el.offsetWidth;
            const elHeight = quote.el.offsetHeight;
            let pos = { x: 0, y: 0 };
            let found = false;

            // Try to find a non-overlapping spot inside the box
            for (let i = 0; i < 200; i++) {
                const randomX = boxX + Math.random() * (Math.max(0, boxWidth - elWidth));
                const randomY = boxY + Math.random() * (Math.max(0, boxHeight - elHeight));
                if (!checkCollision(randomX, randomY, elWidth, elHeight, placedRects)) {
                    pos = { x: randomX, y: randomY };
                    found = true;
                    break;
                }
            }

            // Fallback to center if no spot found
            if (!found) {
                pos = { x: boxX + (boxWidth - elWidth) / 2, y: boxY + (boxHeight - elHeight) / 2 };
            }

            // Finalize position and add to placed list
            quote.placedRect = { x: pos.x, y: pos.y, width: elWidth, height: elHeight };
            placedRects.push(quote.placedRect);

            // Move back to container and animate
            quotesContainer.appendChild(quote.el);
            quote.el.style.visibility = 'visible';

            gsap.to(quote.el, {
                x: pos.x,
                y: pos.y,
                opacity: 1,
                scale: 1,
                backgroundColor: 'rgba(82, 53, 123, 0.95)',
                duration: 1.3,
                ease: "power2.inOut",
            });
        });
    }
});
