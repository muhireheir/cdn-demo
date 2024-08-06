// const fetch = require("node-fetch");

const targetUrl = "https://f4dc-102-22-137-210.ngrok-free.app"; 

// Script tag and content to check
const scriptTag =
  '<script src="https://pub-b926a0b6e5114d91b581ff076278508f.r2.dev/script.js"></script>';
const scriptContent = 'bpConfig("7726768429");';

// Fetch the source code of the website
fetch(targetUrl)
  .then((response) => response.text())
  .then((sourceCode) => {
    // Check if the script tag and content exist in the source code
    if (sourceCode.includes(scriptTag) && sourceCode.includes(scriptContent)) {
      console.log("Script and content exist on the website.");

      // Extract the websiteId from the script content
      const websiteId = scriptContent.match(/bpConfig\("([^"]+)"\)/)[1];

      // Verify the websiteId using the verification API
      const verificationUrl = `http://api.bouletteproof.com/api/cdn/v1/verify-web/${websiteId}`;
      return fetch(verificationUrl);
    } else {
      console.log("Script or content does not exist on the website.");
    }
  })
  .then((verificationResponse) => {
    if (verificationResponse && verificationResponse.ok) {
      console.log("WebsiteId verified successfully.");
    } else {
      console.log("WebsiteId verification failed.");
    }
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });