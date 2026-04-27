import requests
import json
import sys

# Ensure stdout uses utf-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')

URL = "http://localhost:8000/api/v1/predict/advanced"

# Scenario: "Rút cạn tài khoản"
payload = {
    "step": 1,
    "type": "TRANSFER",
    "amount": 50000.0,
    "oldbalanceOrg": 50000.0,
    "newbalanceOrig": 0.0,
    "oldbalanceDest": 10000.0,
    "newbalanceDest": 60000.0
}

if __name__ == "__main__":
    print(f"Sending request to {URL}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(URL, json=payload)
        response.raise_for_status()
        
        print("\n--- Response ---")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        
    except requests.exceptions.RequestException as e:
        print(f"\n[ERROR] Request failed: {e}")
        if response is not None:
            print(f"Status Code: {response.status_code}")
            print(f"Response Text: {response.text}")
