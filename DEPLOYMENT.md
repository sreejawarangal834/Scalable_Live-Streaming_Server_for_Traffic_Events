# Deployment Guide

Deploy the live streaming system to production environments.

## Local Development

Already covered in QUICKSTART.md. Use for development and testing.

## Cloud Deployment Options

### Option 1: AWS Deployment

#### Architecture
```
Internet
    │
    ▼
AWS ALB (Load Balancer)
    │
    ├─► ECS Task: Signaling Server
    ├─► ECS Task: Janus Gateway 1
    ├─► ECS Task: Janus Gateway 2
    └─► ECS Task: Janus Gateway 3
    │
    ▼
CloudFront (CDN)
    │
    ▼
S3 (Frontend files)
```

#### Steps

1. **Create ECR repositories:**
```bash
aws ecr create-repository --repository-name live-stream/signaling-server
aws ecr create-repository --repository-name live-stream/janus-gateway
```

2. **Build and push images:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push signaling server
cd signaling-server
docker build -t live-stream/signaling-server .
docker tag live-stream/signaling-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/live-stream/signaling-server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/live-stream/signaling-server:latest

# Build and push Janus (use custom Dockerfile)
docker tag canyan/janus-gateway:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/live-stream/janus-gateway:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/live-stream/janus-gateway:latest
```

3. **Create ECS cluster:**
```bash
aws ecs create-cluster --cluster-name live-stream-cluster
```

4. **Create task definitions:**
```json
{
  "family": "signaling-server",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "signaling-server",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/live-stream/signaling-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "memory": 512,
      "cpu": 256
    }
  ]
}
```

5. **Create services:**
```bash
aws ecs create-service \
  --cluster live-stream-cluster \
  --service-name signaling-server \
  --task-definition signaling-server \
  --desired-count 2 \
  --launch-type FARGATE
```

6. **Setup Application Load Balancer:**
- Create ALB
- Configure target groups
- Add health checks
- Configure SSL/TLS

7. **Deploy frontend to S3 + CloudFront:**
```bash
# Upload to S3
aws s3 sync frontend/ s3://live-stream-frontend/

# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name live-stream-frontend.s3.amazonaws.com
```

#### Cost Estimation (Monthly)
- ECS Fargate: $50-100
- ALB: $20
- Data transfer: $100-500 (depends on viewers)
- CloudFront: $50-200
- **Total: $220-820/month**

### Option 2: Google Cloud Platform (GCP)

#### Architecture
```
Internet
    │
    ▼
Cloud Load Balancer
    │
    ├─► GKE Pod: Signaling Server
    ├─► GKE Pod: Janus Gateway 1
    └─► GKE Pod: Janus Gateway 2
    │
    ▼
Cloud CDN
    │
    ▼
Cloud Storage (Frontend)
```

#### Steps

1. **Create GKE cluster:**
```bash
gcloud container clusters create live-stream-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --zone=us-central1-a
```

2. **Build and push to Container Registry:**
```bash
# Configure Docker
gcloud auth configure-docker

# Build and push
docker build -t gcr.io/[PROJECT-ID]/signaling-server signaling-server/
docker push gcr.io/[PROJECT-ID]/signaling-server
```

3. **Create Kubernetes deployments:**
```yaml
# signaling-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signaling-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: signaling-server
  template:
    metadata:
      labels:
        app: signaling-server
    spec:
      containers:
      - name: signaling-server
        image: gcr.io/[PROJECT-ID]/signaling-server
        ports:
        - containerPort: 3000
```

4. **Apply configurations:**
```bash
kubectl apply -f signaling-deployment.yaml
kubectl apply -f janus-deployment.yaml
kubectl apply -f service.yaml
```

5. **Setup ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: live-stream-ingress
spec:
  rules:
  - host: stream.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: signaling-server
            port:
              number: 3000
```

#### Cost Estimation (Monthly)
- GKE cluster: $150-300
- Load Balancer: $20
- Data transfer: $100-500
- Cloud CDN: $50-200
- **Total: $320-1020/month**

### Option 3: Azure Deployment

#### Architecture
```
Internet
    │
    ▼
Azure Front Door
    │
    ├─► ACI: Signaling Server
    ├─► ACI: Janus Gateway 1
    └─► ACI: Janus Gateway 2
    │
    ▼
Azure CDN
    │
    ▼
Blob Storage (Frontend)
```

#### Steps

1. **Create resource group:**
```bash
az group create --name live-stream-rg --location eastus
```

2. **Create container registry:**
```bash
az acr create --resource-group live-stream-rg --name livestreamacr --sku Basic
```

3. **Build and push images:**
```bash
az acr build --registry livestreamacr --image signaling-server:latest signaling-server/
```

4. **Create container instances:**
```bash
az container create \
  --resource-group live-stream-rg \
  --name signaling-server \
  --image livestreamacr.azurecr.io/signaling-server:latest \
  --cpu 1 \
  --memory 1 \
  --ports 3000
```

5. **Setup Azure Front Door:**
- Create Front Door profile
- Add backend pools
- Configure routing rules
- Enable CDN

#### Cost Estimation (Monthly)
- Container Instances: $50-100
- Front Door: $35
- Data transfer: $100-500
- CDN: $50-200
- **Total: $235-835/month**

### Option 4: DigitalOcean (Budget Option)

#### Architecture
```
Internet
    │
    ▼
DigitalOcean Load Balancer
    │
    ├─► Droplet 1: All services
    ├─► Droplet 2: All services
    └─► Droplet 3: All services
```

#### Steps

1. **Create droplets:**
```bash
# Use DigitalOcean web interface or doctl CLI
doctl compute droplet create live-stream-1 \
  --size s-2vcpu-4gb \
  --image docker-20-04 \
  --region nyc1
```

2. **Install Docker on each droplet:**
```bash
ssh root@droplet-ip
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

3. **Deploy using Docker Compose:**
```bash
# Copy files to droplet
scp -r live-stream-system/ root@droplet-ip:/root/

# SSH and start
ssh root@droplet-ip
cd live-stream-system
docker-compose up -d
```

4. **Create load balancer:**
- Use DigitalOcean web interface
- Add droplets to backend
- Configure health checks
- Enable SSL

#### Cost Estimation (Monthly)
- 3 Droplets (2vCPU, 4GB): $72
- Load Balancer: $12
- Data transfer: Included (1TB)
- **Total: $84/month**

## Production Considerations

### 1. SSL/TLS Certificates

WebRTC requires HTTPS in production.

**Option A: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d stream.example.com

# Configure Nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/stream.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stream.example.com/privkey.pem;
}
```

**Option B: AWS Certificate Manager (Free with AWS)**
- Request certificate in ACM
- Attach to ALB
- Automatic renewal

### 2. TURN Server

For users behind strict NATs/firewalls.

**Setup coturn:**
```bash
# Install
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=example.com

# Start
sudo systemctl start coturn
```

**Update app.js:**
```javascript
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:turn.example.com:3478',
            username: 'username',
            credential: 'password'
        }
    ]
};
```

### 3. Monitoring

**Prometheus + Grafana:**
```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

**Metrics to monitor:**
- Active connections
- Bandwidth usage
- CPU/Memory per service
- Error rates
- Latency

### 4. Logging

**ELK Stack (Elasticsearch, Logstash, Kibana):**
```yaml
services:
  elasticsearch:
    image: elasticsearch:7.14.0
    
  logstash:
    image: logstash:7.14.0
    
  kibana:
    image: kibana:7.14.0
    ports:
      - "5601:5601"
```

### 5. Auto-Scaling

**Kubernetes HPA (Horizontal Pod Autoscaler):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: janus-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: janus-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 6. Database (Optional)

For user management, analytics:

```yaml
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: livestream
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

### 7. CDN Integration

**CloudFlare:**
- Point DNS to CloudFlare
- Enable CDN
- Configure caching rules
- Enable DDoS protection

**AWS CloudFront:**
- Create distribution
- Set S3 as origin
- Configure behaviors
- Enable compression

### 8. Backup and Recovery

```bash
# Backup Docker volumes
docker run --rm -v live-stream-data:/data -v $(pwd):/backup ubuntu tar czf /backup/backup.tar.gz /data

# Restore
docker run --rm -v live-stream-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/backup.tar.gz -C /
```

## Security Checklist

- [ ] HTTPS enabled (SSL/TLS)
- [ ] Firewall configured (only necessary ports open)
- [ ] Rate limiting enabled
- [ ] Authentication implemented
- [ ] CORS properly configured
- [ ] Secrets in environment variables (not code)
- [ ] Regular security updates
- [ ] DDoS protection enabled
- [ ] Logging and monitoring active
- [ ] Backup strategy in place

## Performance Optimization

1. **Enable compression:**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

2. **Use CDN for static assets**

3. **Optimize video encoding:**
```javascript
const constraints = {
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 }
    }
};
```

4. **Connection pooling**

5. **Caching strategies**

## Maintenance

### Regular Tasks
- Monitor logs daily
- Check resource usage weekly
- Update dependencies monthly
- Review security quarterly
- Test disaster recovery quarterly

### Update Procedure
```bash
# Pull latest images
docker-compose pull

# Restart services (zero-downtime)
docker-compose up -d --no-deps --build signaling-server

# Verify
docker-compose ps
docker-compose logs -f
```

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups
- Configuration: Version controlled (Git)
- Logs: Centralized logging (30-day retention)

### Recovery Procedure
1. Provision new infrastructure
2. Restore configuration from Git
3. Restore database from backup
4. Deploy services
5. Verify functionality
6. Update DNS

## Cost Optimization

1. **Use spot instances** (AWS, GCP)
2. **Auto-scaling** (scale down during low usage)
3. **Reserved instances** (for predictable load)
4. **Optimize bandwidth** (compression, CDN)
5. **Right-size resources** (monitor and adjust)

## Conclusion

Choose deployment option based on:
- **Budget**: DigitalOcean < AWS/GCP/Azure
- **Scale**: Kubernetes for large scale
- **Simplicity**: Docker Compose for small scale
- **Features**: Cloud providers for managed services

Start small, monitor, and scale as needed.
