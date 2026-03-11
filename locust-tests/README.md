# Locust Load Testing

Professional load testing with Python-based framework.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start Locust web UI
locust -f locustfile.py --host=http://localhost:8080
```

Then open http://localhost:8089 and configure your test.

## Usage

### Web UI Mode (Recommended)

```bash
locust -f locustfile.py --host=http://localhost:8080
```

Configure in web UI:
- Number of users: 100
- Spawn rate: 10 users/second

### Headless Mode

```bash
# Run without web UI
locust -f locustfile.py --headless --users 100 --spawn-rate 10 --run-time 5m

# Quick tests
locust -f locustfile.py --headless --users 10 --spawn-rate 2 --run-time 2m   # Light
locust -f locustfile.py --headless --users 50 --spawn-rate 5 --run-time 5m   # Medium
locust -f locustfile.py --headless --users 100 --spawn-rate 10 --run-time 10m # Heavy
```

## Features

- **Real-time statistics**: Requests/second, failures, response times
- **Visual charts**: Performance graphs
- **CSV export**: Download detailed reports
- **Distributed testing**: Run across multiple machines
- **Custom load shapes**: Gradual ramp-up patterns

## Custom Load Shape

The included `StepLoadShape` gradually increases load:
- 0-60s: 10 users
- 60-120s: 50 users
- 120-180s: 100 users
- 180-240s: 200 users

```bash
locust -f locustfile.py --shape=StepLoadShape
```

## Example Output

```
Type     Name                          # reqs      # fails  |     Avg     Min     Max  Median  |   req/s
--------|------------------------------|-----------|---------|-------|-------|-------|--------|--------
WebSocket Connect                            100     0(0%)  |     125      45     450     120  |    10.0
WebSocket Join Room                          100     0(0%)  |      35      15     120      30  |    10.0
WebSocket Receive Message                   5000     5(0%)  |      12       5      85      10  |   500.0
--------|------------------------------|-----------|---------|-------|-------|-------|--------|--------
         Aggregated                          5300     5(0%)  |      15       5     450      11  |   530.0
```

## Requirements

- Python 3.7+
- Locust 2.17+
- websocket-client

See [LOAD_TESTING_COMPLETE_GUIDE.md](../LOAD_TESTING_COMPLETE_GUIDE.md) for detailed documentation.
