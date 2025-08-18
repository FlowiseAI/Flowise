---
description: Learn how to integrate AnswerAgentAI and Zapier
---

# Zapier Zaps

---

## Prerequisite

1. [Log in](https://zapier.com/app/login) or [sign up](https://zapier.com/sign-up) to Zapier
2. Refer [deployment](../developers/deployment/) to create a cloud hosted version of Flowise.

## Setup

1. Go to [Zapier Zaps](https://zapier.com/app/zaps)
2. Click **Create**

<figure><img src="/.gitbook/assets/zapier/zap/1.png" alt="" /><figcaption></figcaption></figure>

### Receive Trigger Message

1. Click or Search for **Discord**

 <figure><img src="/.gitbook/assets/zapier/zap/2.png" alt="" width="563" /><figcaption></figcaption></figure>

2. Select **New Message Posted to Channel** as Event then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/3.png" alt="" width="563" /><figcaption></figcaption></figure>

3. **Sign in** your Discord account

 <figure><img src="/.gitbook/assets/zapier/zap/4.png" alt="" width="563" /><figcaption></figcaption></figure>

4. Add **Zapier Bot** to your prefered server

 <figure><img src="/.gitbook/assets/zapier/zap/5.png" alt="" width="272" /><figcaption></figcaption></figure>

5. Give appropriate permissions and click **Authorize** then click **Continue**

    <figure><img src="/.gitbook/assets/zapier/zap/6.png" alt="" width="292" /><figcaption></figcaption></figure>

    <figure><img src="/.gitbook/assets/zapier/zap/7.png" alt="" width="290" /><figcaption></figcaption></figure>

6. Select your **prefered channel** to interact with Zapier Bot then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/8.png" alt="" width="563" /><figcaption></figcaption></figure>

7. **Send a message** to your selected channel on step 8

 <figure><img src="/.gitbook/assets/zapier/zap/9.png" alt="" width="563" /><figcaption></figcaption></figure>

8. Click **Test trigger**

 <figure><img src="/.gitbook/assets/zapier/zap/10.png" alt="" width="563" /><figcaption></figcaption></figure>

9. Select your message then click **Continue with the selected record**

 <figure><img src="/.gitbook/assets/zapier/zap/11.png" alt="" width="563" /><figcaption></figcaption></figure>

### Filter out Zapier Bot's Message

1. Click or search for **Filter**

 <figure><img src="/.gitbook/assets/zapier/zap/12.png" alt="" width="563" /><figcaption></figcaption></figure>

2. Configure **Filter** to not continue if received message from **Zapier Bot** then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/13.png" alt="" width="563" /><figcaption></figcaption></figure>

### FlowiseAI generate Result Message

1. Click **+**, click or search for **FlowiseAI**

 <figure><img src="/.gitbook/assets/zapier/zap/14.png" alt="" width="563" /><figcaption></figcaption></figure>

2. Select **Make Prediction** as Event, then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/15.png" alt="" width="563" /><figcaption></figcaption></figure>

3. Click **Sign in** and insert your details, then click **Yes, Continue to FlowiseAI**

    <figure><img src="/.gitbook/assets/zapier/zap/16.png" alt="" width="563" /><figcaption></figcaption></figure>

    <figure><img src="/.gitbook/assets/zapier/zap/17.png" alt="" width="563" /><figcaption></figcaption></figure>

4. Select **Content** from Discord and your Flow ID, then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/18.png" alt="" width="563" /><figcaption></figcaption></figure>

5. Click **Test action** and wait for your result

 <figure><img src="/.gitbook/assets/zapier/zap/19.png" alt="" width="563" /><figcaption></figcaption></figure>

### Send Result Message

1. Click **+**, click or search for **Discord**

 <figure><img src="/.gitbook/assets/zapier/zap/20.png" alt="" width="563" /><figcaption></figcaption></figure>

2. Select **Send Channel Message** as Event, then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/21.png" alt="" width="563" /><figcaption></figcaption></figure>

3. Select the Discord's account that you signed in, then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/22.png" alt="" width="563" /><figcaption></figcaption></figure>

4. Select your prefered Channel for channel and select **Text** and **String Source** (if available) from FlowiseAI for Message Text, then click **Continue**

 <figure><img src="/.gitbook/assets/zapier/zap/23.png" alt="" width="563" /><figcaption></figcaption></figure>

5. Click **Test action**

 <figure><img src="/.gitbook/assets/zapier/zap/24.png" alt="" /><figcaption></figcaption></figure>

6. Voila [🎉](https://emojipedia.org/party-popper/) you should see the message arrived in your Discord Channel

 <figure><img src="/.gitbook/assets/zapier/zap/25.png" alt="" /><figcaption></figcaption></figure>

7. Lastly, rename your Zap and publish it

 <figure><img src="/.gitbook/assets/zapier/zap/26.png" alt="" /><figcaption></figcaption></figure>
