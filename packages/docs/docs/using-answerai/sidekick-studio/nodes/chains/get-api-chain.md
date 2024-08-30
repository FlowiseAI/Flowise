---
description: Learn how to use the GET API Chain feature in AnswerAI
---

# GET API Chain

## Overview

The GET API Chain is a powerful feature in AnswerAI that allows you to run queries against GET APIs. This feature enables you to integrate external API data into your workflows, enhancing the capabilities of your AI-powered applications.

## Key Benefits

-   Seamless integration with external data sources
-   Customizable API interactions
-   Enhanced AI responses with real-time data

## How to Use

### 1. Set up the GET API Chain

<!-- TODO: Screenshot of the GET API Chain node in the AnswerAI interface -->
 <figure><img src="/.gitbook/assets/screenshots/get api chain node.png" alt="" /><figcaption><p>Get API Chain &#x26; Drop UI</p></figcaption></figure>

1. In your AnswerAI workflow, locate and add the "GET API Chain" node.
2. Connect the node to your desired input and output nodes.

 <figure><img src="/.gitbook/assets/screenshots/get api configuration.png" alt="" /><figcaption><p>Get API Chain Configuration &#x26; Drop UI</p></figcaption></figure>

### 2. Configure the Language Model

1. In the "Language Model" field, select the appropriate language model for your task.
2. Ensure the chosen model is compatible with your API and query requirements.

### 3. Provide API Documentation

1. In the "API Documentation" field, enter a detailed description of how the API works.
2. Include information such as endpoint structure, available parameters, and response format. Many times you can just copy and paste the docs into the field.

<figure><img src="/.gitbook/assets/screenshots/get api chain in a workflow.png" alt="" /><figcaption><p>Get API Chain In a Workflow &#x26; Drop UI</p></figcaption></figure>
3. For reference, you can use this example:

```plaintext
BASE URL: https://api.open-meteo.com/

API Documentation
The API endpoint /v1/forecast accepts a geographical coordinate, a list of weather variables and responds with a JSON hourly weather forecast for 7 days. Time always starts at 0:00 today and contains 168 hours. All URL parameters are listed below:

Parameter Format Required Default Description
latitude, longitude Floating point Yes  Geographical WGS84 coordinate of the location
hourly String array No  A list of weather variables which should be returned. Values can be comma separated, or multiple &hourly= parameter in the URL can be used.
daily String array No  A list of daily weather variable aggregations which should be returned. Values can be comma separated, or multiple &daily= parameter in the URL can be used. If daily weather variables are specified, parameter timezone is required.
current_weather Bool No false Include current weather conditions in the JSON output.
temperature_unit String No celsius If fahrenheit is set, all temperature values are converted to Fahrenheit.
windspeed_unit String No kmh Other wind speed speed units: ms, mph and kn
precipitation_unit String No mm Other precipitation amount units: inch
timeformat String No iso8601 If format unixtime is selected, all time values are returned in UNIX epoch time in seconds. Please note that all timestamp are in GMT+0! For daily values with unix timestamps, please apply utc_offset_seconds again to get the correct date.
timezone String No GMT If timezone is set, all timestamps are returned as local-time and data is returned starting at 00:00 local-time. Any time zone name from the time zone database is supported. If auto is set as a time zone, the coordinates will be automatically resolved to the local time zone.
past_days Integer (0-2) No 0 If past_days is set, yesterday or the day before yesterday data are also returned.
start_date
end_date String (yyyy-mm-dd) No  The time interval to get weather data. A day must be specified as an ISO8601 date (e.g. 2022-06-30).
models String array No auto Manually select one or more weather models. Per default, the best suitable weather models will be combined.

Hourly Parameter Definition
The parameter &hourly= accepts the following values. Most weather variables are given as an instantaneous value for the indicated hour. Some variables like precipitation are calculated from the preceding hour as an average or sum.

Variable Valid time Unit Description
temperature_2m Instant °C (°F) Air temperature at 2 meters above ground
snowfall Preceding hour sum cm (inch) Snowfall amount of the preceding hour in centimeters. For the water equivalent in millimeter, divide by 7. E.g. 7 cm snow = 10 mm precipitation water equivalent
rain Preceding hour sum mm (inch) Rain from large scale weather systems of the preceding hour in millimeter
showers Preceding hour sum mm (inch) Showers from convective precipitation in millimeters from the preceding hour
weathercode Instant WMO code Weather condition as a numeric code. Follow WMO weather interpretation codes. See table below for details.
snow_depth Instant meters Snow depth on the ground
freezinglevel_height Instant meters Altitude above sea level of the 0°C level
visibility Instant meters Viewing distance in meters. Influenced by low clouds, humidity and aerosols. Maximum visibility is approximately 24 km.
```

### 4. Set Headers (Optional)

1. If your API requires specific headers, click on "Add Additional Parameter."
2. Select "Headers" and enter the required headers in JSON format.

### 5. Customize Prompts (Optional)

1. To fine-tune how AnswerAI interacts with the API, you can customize two prompts:

    - URL Prompt: Determines how AnswerAI constructs the API URL
    - Answer Prompt: Guides AnswerAI on how to process and return the API response

2. To customize, click on "Add Additional Parameter" and select the prompt you want to modify.
3. Ensure that you include the required placeholders (`{api_docs}, {question}, {api_response}, {api_url}`) in your custom prompts.

### 6. Run Your Workflow

1. Once configured, run your workflow with an input query.
2. The GET API Chain will process the query, construct the appropriate API call, and return the results.

## Tips and Best Practices

-   Keep your API documentation clear and concise for optimal results.
-   Use specific and relevant examples in your API documentation to guide the AI.
-   Regularly update your API documentation to reflect any changes in the external API.
-   Test your GET API Chain with various queries to ensure it handles different scenarios correctly.
-   Monitor API usage to stay within rate limits and optimize performance.

## Troubleshooting

### Issue: Incorrect API URL Construction

-   **Solution**: Review and refine your API documentation. Ensure all necessary endpoints and parameters are clearly described.

### Issue: Unexpected API Responses

-   **Solution**: Check that your Answer Prompt accurately guides the AI in interpreting the API response. Adjust as needed for better results.

### Issue: Authentication Errors

-   **Solution**: Verify that you've correctly included any required authentication headers in the "Headers" section.

### Issue: Rate Limiting Issues

-   **Solution**: Implement appropriate rate limiting in your workflow or consider using caching mechanisms to reduce API calls.

If you encounter persistent issues, consult the AnswerAI documentation or reach out to our support team for assistance.
