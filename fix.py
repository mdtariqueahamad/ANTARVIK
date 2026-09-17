with open("frontend/src/components/dashboard/StationOverview.tsx", "r") as f:
    text = f.read()

# Fix the escaped characters
text = text.replace("\\`", "`")
text = text.replace("\\$", "$")

with open("frontend/src/components/dashboard/StationOverview.tsx", "w") as f:
    f.write(text)
