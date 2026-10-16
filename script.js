document.addEventListener('DOMContentLoaded', () => {
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // Progress of `p` inside the [start, end] window, 0 → 1
    const range = (p, start, end) => clamp((p - start) / (end - start));

    // Hero entrance
    requestAnimationFrame(() => document.body.classList.add('loaded'));

    // Navigation: shrink on scroll + mobile menu
    const nav = document.querySelector('nav');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelectorAll('.nav-links a');

    const closeMenu = () => {
        nav.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
    };

    menuToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('menu-open');
        menuToggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('no-scroll', open);
    });

    navLinks.forEach(link => link.addEventListener('click', closeMenu));

    // One-shot reveals for small elements
    document.querySelectorAll('[data-stagger]').forEach(group => {
        const step = parseFloat(group.dataset.stagger) || 0.1;
        group.querySelectorAll(':scope > [data-reveal]').forEach((child, i) => {
            child.style.setProperty('--delay', `${i * step}s`);
        });
    });

    const revealTargets = document.querySelectorAll('[data-reveal], .reveal-heading, .timeline-item');
    if (!('IntersectionObserver' in window)) {
        revealTargets.forEach(el => el.classList.add('is-visible'));
    } else {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        revealTargets.forEach(el => revealObserver.observe(el));
    }

    // Press slider: a second copy of the cards makes the loop seamless
    const pressTrack = document.querySelector('.press-track');
    if (pressTrack) {
        [...pressTrack.children].forEach(card => {
            const copy = card.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            copy.tabIndex = -1;
            pressTrack.appendChild(copy);
        });
        pressTrack.style.setProperty('--press-duration', `${pressTrack.children.length * 5}s`);
    }

    // Statement: split into words so each can light up
    const statement = document.querySelector('.statement-text');
    const words = [];
    if (statement) {
        const accent = (statement.dataset.accent || '').split(',').map(w => w.trim());
        const tokens = statement.textContent.trim().split(/\s+/);
        statement.textContent = '';
        tokens.forEach((token, i) => {
            const span = document.createElement('span');
            span.className = 'word';
            if (accent.includes(token.replace(/[.,—]/g, ''))) span.classList.add('accent');
            span.textContent = token;
            statement.append(span, i < tokens.length - 1 ? ' ' : '');
            words.push(span);
        });
    }

    // Highlight the nav link / portfolio tab of the section on screen
    const watchActive = links => {
        const pairs = [...links]
            .map(link => {
                const target = document.querySelector(link.getAttribute('href'));
                return [link, target && (target.closest('.pin, .portfolio-category') || target)];
            })
            .filter(([, section]) => section);
        return () => {
            const line = window.innerHeight * 0.4;
            let current = null;
            pairs.forEach(([link, section]) => {
                if (section.getBoundingClientRect().top <= line) current = link;
            });
            pairs.forEach(([link]) => link.classList.toggle('active', link === current));
        };
    };
    const updateNavActive = watchActive(navLinks);
    const updateTabActive = watchActive(document.querySelectorAll('.portfolio-nav a'));

    // Scroll-linked elements
    const progressBar = document.querySelector('.scroll-progress');
    const parallaxEls = document.querySelectorAll('[data-speed]');
    const scrubEls = document.querySelectorAll('[data-scrub]');
    const marqueeRows = document.querySelectorAll('.marquee-row');
    const timelines = document.querySelectorAll('.timeline');

    const statementPin = document.querySelector('.statement');
    const awardPin = document.getElementById('award-scene');
    const awardRank = awardPin.querySelector('.award-rank');
    const awardGlow = awardPin.querySelector('.award-glow');
    const awardSeq = awardPin.querySelectorAll('.award-label, .award-seq > *');

    const hscroll = document.querySelector('.hscroll');
    const hTrack = hscroll.querySelector('.hscroll-track');
    const hBar = hscroll.querySelector('.hscroll-bar span');
    const hCount = hscroll.querySelector('.hscroll-current');
    const hItems = hTrack.children.length;
    let hDistance = 0;

    const pinProgress = el => {
        const rect = el.getBoundingClientRect();
        const dist = el.offsetHeight - window.innerHeight;
        return dist > 0 ? clamp(-rect.top / dist) : 0;
    };

    const sizeHScroll = () => {
        hDistance = Math.max(0, hTrack.scrollWidth - window.innerWidth);
        hscroll.style.height = `${window.innerHeight + hDistance}px`;
    };

    const renderStatement = () => {
        if (!statementPin) return;
        const p = range(pinProgress(statementPin), 0.05, 0.85);
        const lit = p * words.length;
        words.forEach((word, i) => {
            word.style.opacity = 0.14 + 0.86 * clamp(lit - i);
        });
    };

    const renderAward = () => {
        const p = pinProgress(awardPin);
        const a = easeInOut(range(p, 0, 0.45));
        awardRank.style.opacity = range(p, 0, 0.12);
        awardRank.style.transform = `translate3d(0, ${(1 - a) * 18}vh, 0) scale(${lerp(2.4, 1, a)})`;
        awardGlow.style.opacity = a;
        awardGlow.style.transform = `scale(${lerp(0.6, 1.1, a)})`;

        awardSeq.forEach((el, i) => {
            const q = easeOut(range(p, 0.4 + i * 0.06, 0.55 + i * 0.06));
            el.style.opacity = q;
            el.style.transform = `translate3d(0, ${(1 - q) * 50}px, 0)`;
        });
    };

    const onScroll = () => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        const max = document.documentElement.scrollHeight - vh;

        nav.classList.toggle('scrolled', y > 40);
        progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        updateNavActive();
        updateTabActive();

        renderStatement();
        renderAward();

        parallaxEls.forEach(el => {
            el.style.transform = `translate3d(0, ${y * parseFloat(el.dataset.speed)}px, 0)`;
        });

        // --e: 0 when the element's top touches the bottom of the screen, 1 at 35% from the top
        scrubEls.forEach(el => {
            const top = el.getBoundingClientRect().top;
            el.style.setProperty('--e', easeOut(clamp((vh - top) / (vh * 0.65))).toFixed(4));
        });

        marqueeRows.forEach(row => {
            const rect = row.parentElement.getBoundingClientRect();
            const shift = (vh - rect.top) * 0.5;
            const x = row.dataset.direction === 'right' ? shift - row.scrollWidth / 3 : -shift;
            row.style.transform = `translate3d(${x}px, 0, 0)`;
        });

        timelines.forEach(line => {
            const rect = line.getBoundingClientRect();
            const p = clamp((vh * 0.65 - rect.top) / rect.height);
            line.querySelector('.timeline-fill').style.transform = `scaleY(${p})`;
        });

        if (hDistance > 0) {
            const p = clamp(-hscroll.getBoundingClientRect().top / hDistance);
            hTrack.style.transform = `translate3d(${-p * hDistance}px, 0, 0)`;
            hBar.style.transform = `scaleX(${p})`;
            hCount.textContent = String(Math.min(hItems, Math.floor(p * hItems) + 1)).padStart(2, '0');
        }
    };

    let ticking = false;
    const requestTick = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            onScroll();
            ticking = false;
        });
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', () => {
        sizeHScroll();
        requestTick();
    });
    window.addEventListener('load', () => {
        sizeHScroll();
        requestTick();
    });
    if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
            sizeHScroll();
            requestTick();
        }).observe(hTrack);
    }
    sizeHScroll();
    onScroll();

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = lightbox.querySelector('.close');

    const openLightbox = img => {
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('open');
        document.body.classList.add('no-scroll');
    };

    const closeLightbox = () => {
        lightbox.classList.remove('open');
        document.body.classList.remove('no-scroll');
    };

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => openLightbox(item.querySelector('img')));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(item.querySelector('img'));
            }
        });
    });

    closeBtn.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', e => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (lightbox.classList.contains('open')) closeLightbox();
        if (nav.classList.contains('menu-open')) closeMenu();
    });
});
