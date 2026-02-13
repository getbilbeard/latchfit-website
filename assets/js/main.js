console.log('LatchFit site loaded');

const googlePlayLink = document.getElementById('google-play-link');
const comingSoonPopup = document.getElementById('coming-soon-popup');
const closeComingSoon = document.getElementById('close-coming-soon');

const hideComingSoonPopup = () => {
  if (comingSoonPopup) {
    comingSoonPopup.hidden = true;
  }
};

if (googlePlayLink && comingSoonPopup) {
  googlePlayLink.addEventListener('click', (event) => {
    event.preventDefault();
    comingSoonPopup.hidden = false;
  });
}

if (closeComingSoon) {
  closeComingSoon.addEventListener('click', hideComingSoonPopup);
}

if (comingSoonPopup) {
  comingSoonPopup.addEventListener('click', (event) => {
    if (event.target === comingSoonPopup) {
      hideComingSoonPopup();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideComingSoonPopup();
  }
});
