import re

with open("src/pages/GatewayPage.tsx", "r") as f:
    content = f.read()

content = content.replace(
    r"\'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20\'",
    "'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'"
)
content = content.replace(
    r"\'bg-white/5 hover:bg-white/10 border border-white/10\'",
    "'bg-white/5 hover:bg-white/10 border border-white/10'"
)

with open("src/pages/GatewayPage.tsx", "w") as f:
    f.write(content)

