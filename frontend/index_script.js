document.addEventListener("DOMContentLoaded", () => {
    let currentIndex = 0;
    const slides = document.querySelectorAll(".carousel-item");
    const autoSlideInterval = 5000;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove("active"));
        currentIndex = (index + slides.length) % slides.length;
        slides[currentIndex].classList.add("active");
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function prevSlide() {
        showSlide(currentIndex - 1);
    }

    document.querySelector(".carousel-control-next").addEventListener("click", nextSlide);
    document.querySelector(".carousel-control-prev").addEventListener("click", prevSlide);

    let slideTimer = setInterval(nextSlide, autoSlideInterval);

    document.querySelector(".carousel").addEventListener("mouseover", () => clearInterval(slideTimer));
    document.querySelector(".carousel").addEventListener("mouseout", () => {
        slideTimer = setInterval(nextSlide, autoSlideInterval);
    });

    showSlide(currentIndex);
});
