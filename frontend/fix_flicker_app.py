import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Sidebar menu button: remove whileHover and transition
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(255, 255, 255, 0\.08\)" \}\}\n\s*transition=\{\{ duration: 0\.2 \}\}',
    '',
    content
)

# 2. Return to Gateway button
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(255, 255, 255, 0\.1\)" \}\}',
    '',
    content
)
# It already has hover:bg-white/10 in className

# 3. Generate Report button
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(59, 130, 246, 0\.3\)" \}\}',
    '',
    content
)
# It already has hover:bg-blue-500/30

# 4. Station selector button
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(255, 255, 255, 0\.1\)" \}\}',
    '',
    content
)
# It already has hover:bg-white/10

# 5. Logout button
content = re.sub(
    r'\s*whileHover=\{\{ backgroundColor: "rgba\(239, 68, 68, 0\.2\)" \}\}',
    '',
    content
)
# It already has hover:bg-red-500/10

with open("src/App.tsx", "w") as f:
    f.write(content)

