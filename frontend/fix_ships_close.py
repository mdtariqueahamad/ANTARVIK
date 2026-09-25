import re

with open("src/pages/Ships.tsx", "r") as f:
    content = f.read()

content = content.replace(
"""      status: "In Transit - Refueling at Mauritius", lat: -20.15, lon: 57.51
    }
  };""",
"""      status: "In Transit - Refueling at Mauritius", lat: -20.15, lon: 57.51
    }
  });"""
)

with open("src/pages/Ships.tsx", "w") as f:
    f.write(content)

