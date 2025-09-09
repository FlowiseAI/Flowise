---
description: Learn how to deploy AnswerAgentAI to the cloud
---

# Deployment

AnswerAgentAI is designed with a platform-agnostic architecture, ensuring compatibility with a wide range of deployment environments to suit your infrastructure needs.

## Cloud Providers

The following cloud providers offer robust platforms for deploying AnswerAgentAI. These established providers require a higher level of technical expertise to manage and optimize for your specific needs, but grant greater flexibility and control over your cloud environment.

-   [AWS](aws.md)
-   [Azure](azure.md)
-   [GCP](gcp.md)
-   [Render](render.md)

Each of these platforms provides unique features and capabilities. Choose the one that best aligns with your organization's requirements, existing infrastructure, and technical expertise.

## Security Enhancements

### AWS Secrets Manager Integration

For AWS deployments, we recommend using AWS Secrets Manager to securely store sensitive configuration data like encryption keys:

-   **Enhanced Security**: Keys are encrypted at rest and in transit
-   **Key Rotation**: Easy rotation without application restarts
-   **Audit Trail**: Full access logging and monitoring
-   **IAM Integration**: Fine-grained access control

For detailed deployment instructions for each platform, please refer to the respective links above.

## Local Machine

To deploy AnswerAgentAI locally, follow our [Get Started Running Locally](../running-locally.md) guide.
