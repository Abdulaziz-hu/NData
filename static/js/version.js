// Change this variable to update the version everywhere
const currentVersion = "1.11.0";

// Find every element with the ID and update it
document.querySelectorAll('#app-version').forEach(el => {
    el.textContent = currentVersion;
});
