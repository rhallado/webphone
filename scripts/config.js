// Configuration file for SIP credentials
// This file is loaded by index.html but credentials are managed via localStorage
// If no credentials are found in localStorage, the config modal will be shown

// Check if credentials exist in localStorage
var user = JSON.parse(localStorage.getItem('SIPCreds'));

// If no credentials exist, user will be undefined and the app will show the config modal

