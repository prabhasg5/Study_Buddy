document.addEventListener('DOMContentLoaded', () => {
    const horizontalContainer = document.querySelector('.horizontal-container');
    const zoomContainer = document.querySelector('.zoom-container');
    const zoomText = document.querySelector('.zoom-text');
    const hero = document.querySelector('.hero');
    const header = document.querySelector('header');
    const teamMembers = document.querySelectorAll('.team-member');
    const progressBar = document.querySelector('.horizontal-progress-bar');
    const footer = document.querySelector('footer');
    
    let lastScrollY = 0;
    let totalHorizontalWidth = 0;

    // Initialize horizontal scroll
    const initHorizontalScroll = () => {
        const teamContainers = document.querySelectorAll('.team-container');
        totalHorizontalWidth = Array.from(teamContainers).reduce((acc, container) => 
            acc + container.offsetWidth, 0);
        horizontalContainer.style.width = `${totalHorizontalWidth}px`;
    };
    initHorizontalScroll();

    // Animate team cards
    const animateCards = () => {
        teamMembers.forEach(member => {
            const rect = member.getBoundingClientRect();
            const isVisible = rect.left >= -rect.width && rect.left <= window.innerWidth;
            member.classList.toggle('animate', isVisible);
        });
    };

    // Scroll handler
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const heroHeight = hero.offsetHeight;
        
        // Header effect
        header.classList.toggle('scrolled', scrollY > 50);

        // Zoom text animation
        if (scrollY < heroHeight) {
            const progress = scrollY / heroHeight;
            zoomText.style.transform = `scale(${1 + progress * 3})`;
            zoomContainer.style.opacity = 1 - progress * 2;
        } else {
            zoomContainer.style.opacity = 0;
        }

        // Horizontal scrolling
        if (scrollY > heroHeight) {
            const horizontalProgress = Math.min((scrollY - heroHeight) / 
                (totalHorizontalWidth - window.innerWidth), 1);
            const translateX = horizontalProgress * (totalHorizontalWidth - window.innerWidth);
            
            horizontalContainer.style.transform = `translateX(-${translateX}px)`;
            progressBar.style.width = `${horizontalProgress * 100}%`;
            animateCards();
            
            // Show footer when horizontal scroll completes
            if (horizontalProgress >= 0.98) {
                footer.classList.add('visible');
            } else {
                footer.classList.remove('visible');
            }

            // Lock vertical scroll during horizontal movement
            if (scrollY > lastScrollY && horizontalProgress < 1) {
                window.scrollTo(0, heroHeight + (totalHorizontalWidth - window.innerWidth) * horizontalProgress);
            }
        }

        lastScrollY = scrollY;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        initHorizontalScroll();
        horizontalContainer.style.transform = 'translateX(0)';
    });

    // Initial trigger
    window.dispatchEvent(new Event('scroll'));
});