document.addEventListener('DOMContentLoaded', () => {
    const horizontalContainer = document.querySelector('.horizontal-container');
    const zoomContainer = document.querySelector('.zoom-container');
    const zoomText = document.querySelector('.zoom-text');
    const hero = document.querySelector('.hero');
    const header = document.querySelector('header');
    const teamMembers = document.querySelectorAll('.team-member');
    const progressContainer = document.querySelector('.horizontal-progress-container');
    const progressBar = document.querySelector('.horizontal-progress-bar');
    const footer = document.querySelector('footer');
    const menuBtn = document.querySelector('.menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    let lastScrollY = 0;
    let totalHorizontalWidth = 0;
    let teamContainerWidth = 0;

    // Toggle mobile menu
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Calculate the total width needed for all team members
    const calculateTotalWidth = () => {
        const teamContainer = document.querySelector('.team-container');
        let totalWidth = 0;
        
        // Get the actual width of all team members plus gaps
        teamMembers.forEach(member => {
            // Get the computed style to account for margins and paddings
            const style = window.getComputedStyle(member);
            const width = member.offsetWidth;
            const marginLeft = parseFloat(style.marginLeft);
            const marginRight = parseFloat(style.marginRight);
            
            totalWidth += width + marginLeft + marginRight;
        });
        
        // Add padding/gap between cards (2rem = 32px by default)
        totalWidth += (teamMembers.length - 1) * 32;
        
        // Add container padding
        const containerStyle = window.getComputedStyle(teamContainer);
        const paddingLeft = parseFloat(containerStyle.paddingLeft);
        const paddingRight = parseFloat(containerStyle.paddingRight);
        totalWidth += paddingLeft + paddingRight;
        
        return totalWidth;
    };

    // Initialize horizontal scroll with improved width calculation
    const initHorizontalScroll = () => {
        // Calculate total width needed for all team members
        teamContainerWidth = calculateTotalWidth();
        
        // Set the team container width
        const teamContainer = document.querySelector('.team-container');
        teamContainer.style.width = `${teamContainerWidth}px`;
        
        // Update total horizontal width for scroll calculations
        totalHorizontalWidth = teamContainerWidth;
        
        // Set the container width
        horizontalContainer.style.width = `${totalHorizontalWidth}px`;
    };

    // Call initialization
    initHorizontalScroll();

    // Animate team cards with improved visibility check
    const animateCards = () => {
        teamMembers.forEach(member => {
            const rect = member.getBoundingClientRect();
            // Consider a card visible if at least half of it is in the viewport
            const isVisible = (rect.left < window.innerWidth && rect.right > 0);
            member.classList.toggle('animate', isVisible);
        });
    };

    // Scroll handler with improved progress bar behavior
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
            
            // Hide progress bar in hero section
            progressContainer.style.opacity = 0;
        } else {
            zoomContainer.style.opacity = 0;
            
            // Show progress bar after hero section
            progressContainer.style.opacity = 1;
        }

        // Horizontal scrolling with improved calculations
        if (scrollY > heroHeight) {
            // Calculate how much of the horizontal content should be scrolled
            const scrollableDist = totalHorizontalWidth - window.innerWidth;
            
            // Calculate horizontal scroll progress (0 to 1)
            const horizontalProgress = Math.min(
                (scrollY - heroHeight) / scrollableDist, 
                1
            );
            
            // Apply transform to move horizontally
            const translateX = horizontalProgress * scrollableDist;
            horizontalContainer.style.transform = `translateX(-${translateX}px)`;
            
            // Update progress bar
            progressBar.style.width = `${horizontalProgress * 100}%`;
            
            // Animate cards that are visible
            animateCards();
            
            // Show footer when horizontal scroll is nearly complete
            if (horizontalProgress >= 0.95) {
                footer.classList.add('visible');
            } else {
                footer.classList.remove('visible');
            }

            // Lock vertical scroll during horizontal movement for smoother experience
            if (scrollY > lastScrollY && horizontalProgress < 1) {
                const newScrollY = heroHeight + (scrollableDist * horizontalProgress);
                window.scrollTo({
                    top: newScrollY,
                    behavior: 'auto'
                });
            }
        }

        lastScrollY = scrollY;
    });

    // Handle window resize with improved recalculation
    window.addEventListener('resize', () => {
        // Reset transforms
        horizontalContainer.style.transform = 'translateX(0)';
        
        // Recalculate dimensions
        initHorizontalScroll();
        
        // Force scroll update
        window.dispatchEvent(new Event('scroll'));
    });

    // Initial trigger to set up the page correctly
    setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
        
        // Make sure all cards are visible initially
        teamMembers.forEach(member => {
            member.style.opacity = 1;
        });
    }, 100);
});