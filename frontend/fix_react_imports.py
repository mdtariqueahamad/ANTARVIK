import re

with open("src/components/energy/MicrogridView.tsx", "r") as f:
    content = f.read()

if "import React, { useState }" not in content and "import { useState }" not in content:
    content = "import React, { useState } from 'react';\n" + content
    
content = content.replace("setGensets(prev => prev.map(g => {", "setGensets((prev: any[]) => prev.map((g: any) => {")
content = content.replace("gensets.map((g) => (", "gensets.map((g: any) => (")

with open("src/components/energy/MicrogridView.tsx", "w") as f:
    f.write(content)

with open("src/pages/GatewayPage.tsx", "r") as f:
    content = f.read()

content = content.replace("import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp, LogOut } from 'lucide-react';", "import { Building2, Snowflake, Wind, Activity, Zap, Anchor, ShieldAlert, BarChart4, TrendingUp, LogOut, Users, Send } from 'lucide-react';")

with open("src/pages/GatewayPage.tsx", "w") as f:
    f.write(content)

with open("src/pages/Ships.tsx", "r") as f:
    content = f.read()

content = content.replace("activeShip.cargo.map((item, idx) =>", "activeShip.cargo.map((item: any, idx: number) =>")

with open("src/pages/Ships.tsx", "w") as f:
    f.write(content)

