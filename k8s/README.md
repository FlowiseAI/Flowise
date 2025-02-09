# Add configmap api keys
kubectl create configmap api-keys-config --from-file=k8s/api.json --namespace xheal-prod