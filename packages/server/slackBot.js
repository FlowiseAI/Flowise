const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize your Slack App
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Function to query Flowise API
async function query(data) {
  try {
    const response = await axios.post(
      "https://vidar.onrender.com/api/v1/prediction/9e2bc077-832b-4334-a60f-160ab03a80a8",
      data,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Listen for mentions
app.event('app_mention', async ({ event, say }) => {
  // Call the Flowise API
  try {
    const response = await query({ "question": event.text });

    // Extract data from the Flowise API response
    const prediction = response; // Replace with actual data extraction

    // Respond in the channel
    await say(`The prediction is: ${JSON.stringify(prediction)}`);
  } catch (error) {
    console.error(error);
    await say('An error occurred while fetching the prediction.');
  }
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
