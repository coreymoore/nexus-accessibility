const popup = document.getElementById('popup');
const accessibilityDataContainer = document.getElementById('accessibility-data');

function fetchAccessibilityData() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getAccessibilityData' }, (response) => {
            if (response && response.data) {
                displayAccessibilityData(response.data);
            } else {
                accessibilityDataContainer.textContent = 'No accessibility data found.';
            }
        });
    });
}

function displayAccessibilityData(data) {
    accessibilityDataContainer.textContent = JSON.stringify(data, null, 2);
}

document.addEventListener('DOMContentLoaded', fetchAccessibilityData);