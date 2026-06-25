(function () {
  const nav = document.getElementById('mainNavbar');
  const parallax = document.querySelector('.parallax-bg');

  function onScroll() {
    const y = window.scrollY || 0;
    if (nav) nav.classList.toggle('navbar-scrolled', y > 20);
    if (parallax) parallax.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(1.05)`;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
