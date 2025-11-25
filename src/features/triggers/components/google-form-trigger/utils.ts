export const generateGoogleFormScript = (
  webhookUrl: string,
  secret?: string
): string => `function onFormSubmit(e) {
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();

  // Build responses object
  var responses = {};
  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    responses[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  }

  // Prepare webhook payload
  var payload = {
    formId: e.source.getId(),
    formTitle: e.source.getTitle(),
    responseId: formResponse.getId(),
    timestamp: formResponse.getTimestamp(),
    respondentEmail: formResponse.getRespondentEmail(),
    responses: responses
  };

  // Webhook configuration
  var WEBHOOK_URL = '${webhookUrl}';
  var WEBHOOK_SECRET = '${secret || ""}';

  // Build headers
  var headers = {};

  // Add secret header if configured
  if (WEBHOOK_SECRET) {
    headers['X-Chainly-Secret'] = WEBHOOK_SECRET;
  }

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': headers,
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      console.error('Webhook returned status: ' + responseCode + ', body: ' + response.getContentText());
    }
  } catch (error) {
    console.error('Webhook failed:', error);
  }
}`;
