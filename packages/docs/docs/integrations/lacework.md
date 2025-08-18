# Lacework Fargate Sidecar Integration

## Overview

This document describes the Lacework Fargate sidecar integration for TheAnswer deployed via AWS Copilot. The integration provides runtime security monitoring and anomaly detection through the Lacework FortiCNAPP Agent.

## Architecture

-   **Sidecar Pattern**: Lacework datacollector runs alongside the main TheAnswer container
-   **Optional Integration**: Controlled by presence of `LaceworkAccessToken` in environment file
-   **Graceful Fallback**: Application runs normally if Lacework token is not provided
-   **Non-Essential Sidecar**: Sidecar failure doesn't affect main application startup

## Configuration

### Environment Variables

Add to `copilot.{environment}.env`:

```bash
# Lacework Configuration
# To enable Lacework: Add your real access token below
# To disable Lacework: Remove or comment out the LaceworkAccessToken line
LaceworkAccessToken=your_lacework_token_here
LaceworkVerbose=true

# Optional: Lacework Server URL (for non-US regions)
# LaceworkServerUrl=https://api.fra.lacework.net  # EU
# LaceworkServerUrl=https://auprodn1.agent.lacework.net  # ANZ

# Optional: Lacework Configuration for FIM (File Integrity Monitoring)
# LaceworkConfig={"fim":{"mode":"enable", "coolingperiod":"0"}}
```

### Manifest Configuration

The `copilot/flowise/manifest.yml` includes:

```yaml
# Container dependencies - main container depends on Lacework sidecar
depends_on:
    datacollector-sidecar: start

# Lacework sidecar configuration
sidecars:
    datacollector-sidecar:
        image: lacework/datacollector:latest-sidecar
        essential: false

# Task definition overrides for Lacework integration
taskdef_overrides:
    # Override main container entrypoint to use Lacework sidecar script and then start the app
    - path: ContainerDefinitions[0].EntryPoint
      value: ['/bin/sh', '-c', '/var/lib/lacework-backup/lacework-sidecar.sh; exec node dist/index.js']

    # Add volume mount from sidecar to main container
    - path: ContainerDefinitions[0].VolumesFrom
      value:
          - sourceContainer: datacollector-sidecar
            readOnly: true
```

## Deployment

### Enable Lacework

1. Add `LaceworkAccessToken` to your environment file
2. Deploy with Copilot:
    ```bash
    copilot deploy --env your-environment
    ```

### Disable Lacework

1. Remove or comment out `LaceworkAccessToken` from environment file
2. Deploy with Copilot:
    ```bash
    copilot deploy --env your-environment
    ```

## Verification Commands

### Connect to Container

```bash
copilot svc exec --env your-environment
```

### Check Lacework Status

```bash
# Check if Lacework processes are running
ps aux | grep lacework
ps aux | grep datacollector

# Check Lacework logs
tail -f /var/log/lacework/datacollector.log

# Check if Lacework binaries are mounted
ls -la /var/lib/lacework-backup/
ls -la /var/lib/lacework/

# Check environment variables (WARNING: Do not screenshare or share output - contains sensitive tokens)
env | grep -i lacework

# Check if agent is collecting data
cat /var/log/lacework/datacollector.log | grep -i "payload"
```

### Quick External Check

```bash
# Check recent logs for Lacework activity
copilot svc logs --env your-environment --since 5m | grep -i lacework
```

## Expected Results

### ✅ Working Integration

-   Multiple datacollector processes running
-   Logs showing "Payload Total" messages
-   Environment variables set (LaceworkAccessToken, etc.)
-   Active data collection in logs

### ❌ Non-Working Integration

-   No datacollector processes
-   No Lacework logs or empty log file
-   Missing environment variables
-   Application runs normally without Lacework

## Troubleshooting

### Common Issues

1. **Container fails to start**: Check if LaceworkAccessToken is valid
2. **No Lacework processes**: Verify token is present in environment file
3. **Application not starting**: Check entrypoint override syntax
4. **Sidecar not starting**: Verify sidecar image is accessible

### Debug Steps

1. Check container logs: `copilot svc logs --env your-environment`
2. Verify environment variables (WARNING: Do not screenshare or share output): `copilot svc exec --env your-environment -- env | grep lacework`
3. Check sidecar status: `copilot svc exec --env your-environment -- ps aux | grep datacollector`

## Security Considerations

-   LaceworkAccessToken should be stored securely
-   Consider using AWS Secrets Manager for production
-   Monitor Lacework agent resource usage
-   Review Lacework data collection policies
-   **⚠️ IMPORTANT**: Never screenshare or share output from `env | grep lacework` commands as they contain sensitive access tokens
-   **⚠️ IMPORTANT**: Be cautious when using `cat` commands on log files that may contain sensitive information

## Resource Impact

-   **With Lacework**: Additional ~100MB memory, minimal CPU impact
-   **Without Lacework**: No additional resource usage
-   **Sidecar**: Non-essential container, won't break main application if it fails

## Configuration Details

### Dependency Management

The current configuration uses `depends_on: start` which:

-   Ensures the sidecar starts before the main container
-   Allows the main container to start even if the sidecar fails
-   Maintains proper volume mounting order
-   Provides graceful fallback when Lacework is not configured

### Entrypoint Behavior

The entrypoint uses `;` instead of `&&` to:

-   Ensure the main application starts regardless of Lacework script success/failure
-   Provide fault tolerance for environments without Lacework configuration
-   Maintain consistent startup behavior across all environments

## Optional Enhancements

### Strict Lacework Dependency (Not Recommended)

For environments that require strict Lacework dependency management, you may add:

```yaml
depends_on:
    datacollector-sidecar: success
```

**Note**: This configuration is not currently used in the main repository to maintain compatibility with non-Lacework deployments. Private repositories or forks may implement this enhancement for specific Lacework-enabled environments.

## References

-   [Lacework Implementation Documentation](https://docs.fortinet.com/document/lacework-forticnapp/25.2.0/administration-guide/943410/install-on-aws-ecs-fargate)
