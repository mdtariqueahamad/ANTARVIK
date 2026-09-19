import socket
import binascii

HOST = '0.0.0.0'
PORT = 1883

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT))
    s.listen(1)
    print("Listening on 1883 directly on Mac...")
    conn, addr = s.accept()
    with conn:
        print(f"Connection from ESP32 at {addr} !!")
        data = conn.recv(1024)
        if data:
            print("Received raw MQTT bytes:")
            print(binascii.hexlify(data))
            # Try to decode ascii parts
            ascii_str = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in data)
            print("ASCII representation:")
            print(ascii_str)
