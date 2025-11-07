import json, urllib.request

# login
login_data = json.dumps({'email':'testuser@example.com','password':'password123'}).encode()
req = urllib.request.Request('http://localhost:5000/api/auth/login', data=login_data, headers={'Content-Type':'application/json'})
resp = urllib.request.urlopen(req)
body = resp.read().decode()
print('LOGIN RESPONSE', body)
obj = json.loads(body)
token = obj.get('token')
if not token:
    print('No token, aborting')
    raise SystemExit(1)

# create order
order = {'items':[{'id':'100123','title':'Rice','price':30,'quantity':2}], 'address':'Test Address', 'phone':'+911234567890', 'deliveryDetails':'Leave at gate'}
order_data = json.dumps(order).encode()
req2 = urllib.request.Request('http://localhost:5000/api/orders', data=order_data, headers={'Content-Type':'application/json','Authorization':f'Bearer {token}'})
resp2 = urllib.request.urlopen(req2)
print('ORDER RESPONSE', resp2.read().decode())

# fetch my orders
req3 = urllib.request.Request('http://localhost:5000/api/orders/my', headers={'Authorization':f'Bearer {token}'})
resp3 = urllib.request.urlopen(req3)
print('MY ORDERS', resp3.read().decode())
