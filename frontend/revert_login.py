import re

with open("src/pages/Login.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "navigate('/dashboard'); // NCPOR has a gateway to view all stations",
    "navigate('/gateway'); // NCPOR has a gateway to view all stations"
)

with open("src/pages/Login.tsx", "w") as f:
    f.write(content)
