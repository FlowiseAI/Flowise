# Validation Protocol

```bash
curl -X OPTIONS -I https://flowise-ui-liart.vercel.app/api/proxy/healthcheck
curl -s -o /dev/null -w '%{content_type}' https://flowise-ui-liart.vercel.app/api/proxy/error
```
