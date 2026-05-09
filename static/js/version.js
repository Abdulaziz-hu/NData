// Change this variable to update the version everywhere
const currentVersion = "1.9.3";

// This finds every element with the ID and updates it automatically
document.querySelectorAll('#app-version').forEach(el => {
    el.textContent = currentVersion;
});