#!/usr/bin/env python3
"""
Simple end-to-end test runner that calls the deployed frontend/backends
via the public LoadBalancer URL. It uses only Python stdlib so it runs
without extra packages.

Steps:
- register user
- login user
- list products
- add product to cart
- create order
- simulate payment
- fetch order status

Adjust `BASE` below if the LoadBalancer DNS changes.
"""
import json
import sys
import time
from urllib import request, parse, error

BASE = "http://aef3e087a2e7147bfbfba18e589d76e6-37607585.ap-south-1.elb.amazonaws.com"

def do_request(method, path, data=None, token=None):
    url = BASE + path
    headers = {"Accept": "application/json"}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, data=body, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode("utf-8")
            try:
                return resp.getcode(), json.loads(text)
            except Exception:
                return resp.getcode(), text
    except error.HTTPError as e:
        try:
            txt = e.read().decode()
            return e.code, json.loads(txt)
        except Exception:
            return e.code, str(e)
    except Exception as e:
        return None, str(e)

def main():
    # 1) register
    username = f"e2e_user_{int(time.time())}"
    reg = {"username": username, "email": f"{username}@example.com", "password": "Passw0rd!"}
    code, resp = do_request("POST", "/api/users/", reg)
    print("REGISTER:", code, resp)
    if code is None or code >= 400:
        print("Registration failed, aborting")
        sys.exit(1)

    # 2) login
    cred = {"email": reg["email"], "password": reg["password"]}
    code, resp = do_request("POST", "/api/users/login/", cred)
    print("LOGIN:", code, resp)
    if code is None or code >= 400:
        print("Login failed, aborting")
        sys.exit(1)

    # token detection: try several fields
    token = None
    for k in ("token", "accessToken", "access_token"):
        if isinstance(resp, dict) and k in resp:
            token = resp[k]
            break
    if not token and isinstance(resp, dict) and "user" in resp and isinstance(resp["user"], dict):
        for k in ("token", "accessToken", "access_token"):
            if k in resp["user"]:
                token = resp["user"][k]
                break

    print("Token:", "(present)" if token else "(not detected - continuing without auth)")

    # 3) list products
    code, products = do_request("GET", "/api/products/", token=token)
    print("PRODUCTS:", code, products)
    if code is None or code >= 400:
        print("Failed to fetch products, aborting")
        sys.exit(1)
    if isinstance(products, list) and products:
        product_id = products[0].get("id") or products[0].get("_id") or products[0].get("productId")
    else:
        print("No products returned, aborting")
        sys.exit(1)

    # 4) add to cart
    # cart API may accept POST /api/cart/{userId}/items or /api/cart/items depending on implementation
    user_id = None
    if isinstance(resp, dict):
        user_id = resp.get("user", {}).get("id") or resp.get("id") or resp.get("userId")
    if not user_id:
        # try registration response
        # attempt to derive user id from register response printed earlier
        pass

    add_body = {"productId": product_id, "quantity": 1}
    # Try the path with userId first
    cart_paths = []
    if user_id:
        cart_paths.append(f"/api/cart/{user_id}/items")
    cart_paths.extend(["/api/cart/items", "/api/cart"]) 

    added = False
    for p in cart_paths:
        code, resp = do_request("POST", p, add_body, token=token)
        print("ADD TO CART ->", p, code, resp)
        if code and code < 400:
            added = True
            break

    if not added:
        print("Failed to add to cart via tried endpoints. Aborting.")
        sys.exit(1)

    # 5) create order
    order_body = {"paymentMethod": "card"}
    code, resp = do_request("POST", "/api/orders", order_body, token=token)
    print("CREATE ORDER:", code, resp)
    if code is None or code >= 400:
        print("Order creation failed, aborting")
        sys.exit(1)

    order_id = None
    if isinstance(resp, dict):
        order_id = resp.get("id") or resp.get("orderId")

    # 6) simulate payment
    pay_body = {"orderId": order_id, "status": "succeeded"}
    code, resp = do_request("POST", "/api/payments/simulate", pay_body, token=token)
    print("SIMULATE PAYMENT:", code, resp)

    # 7) fetch order status
    if order_id:
        code, resp = do_request("GET", f"/api/orders/{order_id}", token=token)
        print("ORDER STATUS:", code, resp)

    print("E2E script finished")

if __name__ == '__main__':
    main()
