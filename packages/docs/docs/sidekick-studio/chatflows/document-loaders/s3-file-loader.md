---
description: Load and process files from Amazon S3 buckets
---

# S3 File Loader

## Overview

The S3 File Loader is a powerful feature that allows you to retrieve files from Amazon S3 buckets and process them using Unstructured.io. This feature enables you to work with a wide range of file types, including PDF, XML, DOCX, and CSV, converting them into structured Document objects ready for vector embeddings.

## Key Benefits

-   Access and process files directly from your S3 buckets
-   Support for multiple file types through Unstructured.io integration
-   Seamless integration with AnswerAI's document processing pipeline

## How to Use

1. Set up Unstructured.io:

    - Choose between the hosted API or running locally via Docker:

        - For hosted API, visit the [Unstructured API documentation](https://unstructured-io.github.io/unstructured/api.html)
        - For Docker, run:

            ```
            docker run -p 8000:8000 -d --rm --name unstructured-api quay.io/unstructured-io/unstructured-api:latest --port 8000 --host 0.0.0.0
            ```

2. Configure S3 File Loader:
   a. Drag and drop the S3 File Loader onto the canvas
       <!-- TODO: Screenshot of S3 File Loader node on canvas -->
       <figure><img src="/.gitbook/assets/screenshots/s3loader.png" alt="" /><figcaption><p> S3 File Loader Node &#x26; Drop UI</p></figcaption></figure>

    b. Set up AWS Credentials:

    - Create a new credential for your AWS account
    - Provide the access key and secret key
    - Ensure proper S3 bucket policy is granted to the associated account
          <!-- TODO: Screenshot of AWS Credential configuration -->
          <figure><img src="/.gitbook/assets/screenshots/s3awsconfiguration.png" alt="" /><figcaption><p> S3 File Loader Node AWS COnfiguration &#x26; Drop UI</p></figcaption></figure>

    c. Configure S3 settings:

    - Enter your S3 Bucket name
    - Specify the Object Key (unique identifier for your file in S3)
    - Select the appropriate AWS Region
          <!-- TODO: Screenshot of S3 configuration settings -->
          <figure><img src="/.gitbook/assets/screenshots/s3configuration.png" alt="" /><figcaption><p> S3 File Loader Node Settings &#x26; Drop UI</p></figcaption></figure>

    d. Set up Unstructured API:

    - Enter the Unstructured API URL
    - If using the Hosted API, provide the API key

3. Start using the S3 File Loader:
    - Once configured, you can begin interacting with your S3-stored files through AnswerAI
    - The system will automatically handle document chunking using Unstructured

## Tips and Best Practices

1. Ensure your AWS credentials have the necessary permissions to access the S3 bucket and objects.
2. When using the hosted Unstructured API, keep your API key secure and don't share it publicly.
3. Choose the appropriate AWS region to minimize latency and comply with data residency requirements.
4. Regularly review and update your S3 bucket policies to maintain security.

## Troubleshooting

1. Issue: Unable to access S3 bucket
   Solution: Verify your AWS credentials and ensure the correct bucket policies are in place.

2. Issue: File processing errors
   Solution: Check that the file type is supported by Unstructured.io and that the Unstructured API is correctly configured.

3. Issue: Slow performance
   Solution: Consider using an AWS region closer to your location or upgrading your Unstructured API plan for better performance.

By leveraging the S3 File Loader, you can seamlessly integrate your Amazon S3-stored documents into your AnswerAI workflows, enabling powerful document processing and analysis capabilities.
