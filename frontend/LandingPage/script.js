function toggleMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenu.classList.toggle('active');
}

// Improved button hover effect
document.querySelectorAll('.login-btn').forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--x', x + 'px');
        this.style.setProperty('--y', y + 'px');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const progressBar = document.getElementById('progressBar');
    const featureItems = document.querySelectorAll('.feature-item');
    const featureImages = document.querySelectorAll('.feature-image');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const mainContainer = document.getElementById('mainContainer');
    const mobileScreens = document.getElementById('mobileScreens');
    const featuresSection = document.querySelector('.features');
    
    // New variables for sticky behavior
    let featuresRect = featuresSection ? featuresSection.getBoundingClientRect() : null;
    let featuresTop = featuresSection ? featuresSection.offsetTop : 0;
    let featuresHeight = featuresSection ? featuresSection.offsetHeight : 0;
    let isSticky = false;
    let progressComplete = false;
    let progressZero = true;
    
    let isMobile = window.innerWidth <= 768;
    let currentFeatureIndex = 0;
    let lastScrollPosition = 0;
    let scrollDirection = 'down';
    let ticking = false;

    // Initial layout setup
    function updateLayout() {
        isMobile = window.innerWidth <= 768;

        // Update features section measurements
        if (featuresSection) {
            featuresRect = featuresSection.getBoundingClientRect();
            featuresTop = featuresSection.offsetTop;
            featuresHeight = featuresSection.offsetHeight;
        }

        if (!isMobile) {
            if (mobileScreens) mobileScreens.style.display = 'none';
            if (mainContainer) mainContainer.style.display = 'flex';
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';
            document.body.style.height = '500vh';

            // Reset progress bar to vertical
            if (progressBar) {
                progressBar.style.height = '0%';
                progressBar.style.width = '100%';
            }

            // Move progress container to side
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.style.left = '2rem';
                progressContainer.style.top = '50%';
                progressContainer.style.transform = 'translateY(-50%)';
                progressContainer.style.width = '4px';
                progressContainer.style.height = '80vh';
            }
        } else {
            if (mainContainer) mainContainer.style.display = 'none';
            if (mobileScreens) mobileScreens.style.display = 'flex';
            document.body.style.overflowY = 'auto';
            document.body.style.overflowX = 'hidden';
            document.body.style.height = '100vh';

            // Reset progress bar to horizontal
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.style.height = '100%';
            }

            // Move progress container to bottom
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.style.left = '50%';
                progressContainer.style.top = 'auto';
                progressContainer.style.bottom = '3rem';
                progressContainer.style.transform = 'translateX(-50%)';
                progressContainer.style.width = '80vw';
                progressContainer.style.height = '4px';
            }
        }
    }

    // Initialize layout
    updateLayout();

    // Update view on resize
    window.addEventListener('resize', function () {
        updateLayout();

        // Reset scroll position when switching between mobile and desktop
        if (isMobile) {
            handleMobileScroll();
        } else {
            handleDesktopScroll();
        }
    });

    // DESKTOP: Vertical scrolling and feature highlighting with sticky behavior
    function handleDesktopScroll() {
        if (isMobile) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Check if features section is in view
        const isFeaturesInView = scrollTop >= featuresTop && 
                                scrollTop < (featuresTop + featuresHeight);
        
        // Calculate scroll percentage for features section
        const featuresSectionHeight = featuresHeight; 
        const scrollPercentage = Math.min(
            Math.max(
                ((scrollTop - featuresTop) / featuresSectionHeight) * 100, 
                0
            ), 
            100
        );
        
        // Update progress bar
        if (progressBar) {
            progressBar.style.height = scrollPercentage + '%';
        }
        
        // Track scroll direction
        scrollDirection = scrollTop > lastScrollPosition ? 'down' : 'up';
        lastScrollPosition = scrollTop;

        // Update progress state
        progressComplete = scrollPercentage >= 100;
        progressZero = scrollPercentage <= 0;
        
        // Apply sticky behavior
        if (featuresSection) {
            // Make features section sticky when in view and progress is not complete (going down)
            // or when progress is not zero (going up)
            if (isFeaturesInView) {
                if ((scrollDirection === 'down' && !progressComplete) || 
                    (scrollDirection === 'up' && !progressZero)) {
                    
                    // Apply sticky style if not already sticky
                    if (!isSticky) {
                        featuresSection.style.position = 'fixed';
                        featuresSection.style.top = '0';
                        featuresSection.style.left = '0';
                        featuresSection.style.width = '100%';
                        featuresSection.style.zIndex = '50';
                        isSticky = true;
                    }
                    
                    // Add spacer to prevent content jump
                    if (!document.getElementById('featuresSpacer')) {
                        const spacer = document.createElement('div');
                        spacer.id = 'featuresSpacer';
                        spacer.style.height = `${featuresHeight}px`;
                        featuresSection.parentNode.insertBefore(spacer, featuresSection);
                    }
                } else {
                    // Remove sticky when progress is complete (down) or zero (up)
                    removeSticky();
                }
            } else if (scrollTop < featuresTop) {
                // Before features section
                removeSticky();
            } else {
                // After features section
                removeSticky();
            }
        }
        
        // Calculate which feature should be active based on scroll percentage
        const featureCount = featureItems.length;
        currentFeatureIndex = Math.min(Math.floor((scrollPercentage / 100) * featureCount), featureCount - 1);
        
        // Update features and images
        updateFeaturesOpacity(scrollPercentage);
        updateActiveImage();

        ticking = false;
    }

    function removeSticky() {
        if (isSticky && featuresSection) {
            featuresSection.style.position = '';
            featuresSection.style.top = '';
            featuresSection.style.left = '';
            featuresSection.style.width = '';
            featuresSection.style.zIndex = '';
            isSticky = false;
            
            // Remove spacer
            const spacer = document.getElementById('featuresSpacer');
            if (spacer) {
                spacer.parentNode.removeChild(spacer);
            }
        }
    }

    function updateFeaturesOpacity(scrollPercentage) {
        const totalSections = featureItems.length;
        const sectionPercentage = 100 / totalSections;

        featureItems.forEach((item, index) => {
            // Calculate base opacity based on scroll position
            const sectionStart = index * sectionPercentage;
            const sectionEnd = sectionStart + sectionPercentage;

            // Calculate how far through this section we've scrolled (0-1)
            let progress = 0;

            if (scrollPercentage >= sectionStart && scrollPercentage <= sectionEnd) {
                progress = (scrollPercentage - sectionStart) / sectionPercentage;
            } else if (scrollPercentage > sectionEnd) {
                progress = 1; // Past this section
            }

            // Apply active class and transform for current feature
            if (index === currentFeatureIndex) {
                item.classList.add('active');
                // Gradually increase opacity from 0.3 to 1
                const opacity = 0.3 + (progress * 0.7);
                item.style.opacity = Math.min(opacity, 1);
                // Reset transform for current item
                item.style.transform = 'translateY(0)';
            } else {
                item.classList.remove('active');
                item.style.opacity = 0.3;
                // Add transform effect for non-active items
                item.style.transform = 'translateY(20px)';
            }
        });
    }

    function updateActiveImage() {
        featureImages.forEach((img, index) => {
            if (index === currentFeatureIndex) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
    }

    // MOBILE: Horizontal scrolling and swipe functionality
    function handleMobileScroll() {
        if (!isMobile) return;

        // Get the current scroll position relative to the document
        const mobileScrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Calculate which screen is currently visible (0-4)
        const viewportHeight = window.innerHeight;
        const screenIndex = Math.min(Math.floor(mobileScrollTop / viewportHeight), 4);
        currentFeatureIndex = screenIndex;

        // Update progress bar - horizontal for mobile
        const maxScroll = viewportHeight * 4; // 5 screens - 1
        const scrollPercentage = (mobileScrollTop / maxScroll) * 100;
        if (progressBar) progressBar.style.width = scrollPercentage + '%';

        ticking = false;
    }

    // Scroll event handler
    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (isMobile) {
                    handleMobileScroll();
                } else {
                    handleDesktopScroll();
                }
            });
            ticking = true;
        }
    });

    // Mobile touch events for better swipe experience
    let touchStartY = 0;
    let touchStartX = 0;

    document.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
    });

    document.addEventListener('touchmove', function (e) {
        if (isMobile) {
            const touchY = e.touches[0].clientY;
            const touchX = e.touches[0].clientX;

            // Determine if the swipe is more horizontal or vertical
            const diffY = Math.abs(touchStartY - touchY);
            const diffX = Math.abs(touchStartX - touchX);

            if (diffY > diffX) {
                // Vertical swipe - use for navigating between screens
                e.preventDefault();

                const diff = touchStartY - touchY;
                if (Math.abs(diff) > 50) {
                    if (diff > 0 && currentFeatureIndex < 4) {
                        // Swipe up - go to next screen
                        window.scrollTo({
                            top: (currentFeatureIndex + 1) * window.innerHeight,
                            behavior: 'smooth'
                        });
                        touchStartY = touchY;
                    } else if (diff < 0 && currentFeatureIndex > 0) {
                        // Swipe down - go to previous screen
                        window.scrollTo({
                            top: (currentFeatureIndex - 1) * window.innerHeight,
                            behavior: 'smooth'
                        });
                        touchStartY = touchY;
                    }
                }
            }
        }
    }, { passive: false });

    // Button ripple effect
    if (getStartedBtn) {
        getStartedBtn.addEventListener('mousedown', function (e) {
            createRippleEffect(e);
        });

        getStartedBtn.addEventListener('touchstart', function (e) {
            const touch = e.touches[0];
            createRippleEffect({ clientX: touch.clientX, clientY: touch.clientY });
        });
    }

    function createRippleEffect(e) {
        if (!getStartedBtn) return;
        
        const button = getStartedBtn;
        const ripple = document.createElement('span');
        ripple.classList.add('btn-ripple');

        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        button.appendChild(ripple);

        animateRipple(ripple);
    }

    function animateRipple(ripple) {
        const animationDuration = 600; // ms
        const startTime = Date.now();

        function frame() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            // Scale from 0 to 20
            const scale = progress * 20;

            // Fade out towards the end
            const opacity = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;

            ripple.style.transform = `scale(${scale})`;
            ripple.style.opacity = opacity;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                ripple.remove(); // Remove ripple after animation
            }
        }

        requestAnimationFrame(frame);
    }

    // Initialize the first feature and image
    if (featureItems.length) featureItems[0].style.opacity = 1;
    if (featureImages.length && featureImages[0]) featureImages[0].classList.add('active');

    // Trigger initial scroll handling
    if (isMobile) {
        handleMobileScroll();
    } else {
        handleDesktopScroll();
    }
});