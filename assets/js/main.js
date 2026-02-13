console.log('LatchFit site loaded');

const googlePlayLink = document.getElementById('google-play-link');

if (googlePlayLink) {
  googlePlayLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.alert('Coming soon');
  });
}
